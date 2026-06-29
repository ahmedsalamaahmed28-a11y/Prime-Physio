-- ============================================================
-- Center-Setup Onboarding: Full Setup (DDL + RLS + Functions)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PART 1: Schema Changes
-- ============================================================

-- 1.1. Add pending_plan_id to staff
alter table public.staff add column if not exists pending_plan_id text;

-- 1.2. Drop existing per-clinic slug unique constraint
alter table public.branches drop constraint if exists branches_clinic_id_slug_key;
-- Drop constraint if already exists (idempotent)
alter table public.branches drop constraint if exists branches_slug_unique;
-- Add globally unique slug constraint
alter table public.branches add constraint branches_slug_unique unique (slug);
-- Ensure slug is not null
alter table public.branches alter column slug set not null;

-- 1.3. Add specializations column to branches
alter table public.branches add column if not exists specializations jsonb not null default '[]'::jsonb;


-- ============================================================
-- PART 2: RLS Policies for branches
-- ============================================================

-- 2.1. Drop old branches policies
drop policy if exists "clinic_access_branches" on public.branches;
drop policy if exists "platform_admin_bypass_branches" on public.branches;

-- 2.2. Enable RLS on branches (idempotent)
alter table public.branches enable row level security;

-- 2.3. Platform admin bypass
create policy "platform_admin_bypass_branches" on public.branches
  for all using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

-- 2.4. Clinic-scoped access (uses current_setting for consistency)
create policy "clinic_access_branches" on public.branches
  for all using (
    clinic_id = (
      select clinic_id from public.staff
      where email = current_setting('request.jwt.claims', true)::json ->> 'email'
      limit 1
    )
  )
  with check (
    clinic_id = (
      select clinic_id from public.staff
      where email = current_setting('request.jwt.claims', true)::json ->> 'email'
      limit 1
    )
  );


-- ============================================================
-- PART 3: Helper Functions
-- ============================================================

-- 3.1. Slug availability check
create or replace function public.is_slug_available(check_slug text)
returns boolean
language sql
stable
security definer
as $$
  select not exists (
    select 1 from public.branches where slug = check_slug
  );
$$;

-- 3.2. Grant execute to anon and authenticated roles
grant execute on function public.is_slug_available(text) to anon, authenticated, service_role;


-- 3.3. Complete center creation (clinic + branch + subscription + staff link)
create or replace function public.create_center(
  p_email text,
  p_plan_id text,
  p_short_name text,
  p_full_name text,
  p_slug text,
  p_specializations jsonb default '[]'::jsonb,
  p_logo_url text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_clinic_id uuid;
  v_branch_id uuid;
  v_existing_staff_id uuid;
  v_existing_clinic_id uuid;
begin
  -- Validate slug availability
  if exists (select 1 from public.branches where slug = p_slug) then
    return jsonb_build_object('error', 'Slug already taken');
  end if;

  -- Check if staff record exists
  select id into v_existing_staff_id
  from public.staff
  where email = p_email;

  if v_existing_staff_id is null then
    return jsonb_build_object('error', 'No staff record found for this email');
  end if;

  select id into v_existing_clinic_id
  from public.clinics
  where lower(admin_email) = lower(p_email)
  limit 1;

  if v_existing_clinic_id is not null then
    return jsonb_build_object(
      'error', 'This email already has a clinic',
      'code', 'CLINIC_EMAIL_EXISTS',
      'clinicId', v_existing_clinic_id
    );
  end if;

  -- Create clinic
  insert into public.clinics (name, name_en, admin_email, status)
  values (p_short_name, p_short_name, p_email, 'active')
  returning id into v_clinic_id;

  -- Create primary branch (center)
  insert into public.branches (clinic_id, short_name, full_name, slug, specializations, logo_url, status)
  values (v_clinic_id, p_short_name, p_full_name, p_slug, p_specializations, p_logo_url, 'active')
  returning id into v_branch_id;

  -- Link staff to clinic and clear pending_plan_id
  update public.staff
  set clinic_id = v_clinic_id,
      pending_plan_id = null
  where email = p_email;

  -- Create clinic_settings
  insert into public.clinic_settings (clinic_id, clinic_name, logo_url)
  values (v_clinic_id, p_short_name, p_logo_url)
  on conflict (clinic_id) do nothing;

  -- Create subscription for the selected plan
  insert into public.subscriptions (clinic_id, user_email, plan_name, plan_price, status, start_date)
  values (v_clinic_id, p_email,
    case p_plan_id
      when 'basic' then 'basic'
      when 'silver' then 'silver'
      when 'gold' then 'gold'
      else p_plan_id
    end,
    case p_plan_id
      when 'basic' then 0
      when 'silver' then 1000
      when 'gold' then 1500
      else 0
    end,
    'active', now()
  );

  return jsonb_build_object(
    'clinic_id', v_clinic_id,
    'branch_id', v_branch_id
  );
end;
$$;

-- 3.4. Grant execute to service_role only (this should only be called from server-side API)
grant execute on function public.create_center(text, text, text, text, text, jsonb, text) to service_role;


-- 3.5. Multi-center onboarding transaction used by /api/setup/submit
drop function if exists public.setup_clinic_transaction(text, text, jsonb);

create or replace function public.setup_clinic_transaction(
  p_email text,
  p_name text,
  p_branches jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_clinic_id uuid;
  v_branch jsonb;
  v_branch_id uuid;
  v_branch_slug text;
  v_branches jsonb := '[]'::jsonb;
  v_staff_exists boolean;
  v_existing_clinic_id uuid;
  v_sqlstate text;
  v_message text;
  v_detail text;
  v_hint text;
begin
  if p_email is null or btrim(p_email) = '' then
    return jsonb_build_object('error', 'Email is required');
  end if;

  if p_branches is null or jsonb_array_length(p_branches) = 0 then
    return jsonb_build_object('error', 'At least one center is required');
  end if;

  select exists(
    select 1 from public.staff where email = p_email
  ) into v_staff_exists;

  if not v_staff_exists then
    return jsonb_build_object('error', 'No staff record found for this email');
  end if;

  select id into v_existing_clinic_id
  from public.clinics
  where lower(admin_email) = lower(p_email)
  limit 1;

  if v_existing_clinic_id is not null then
    return jsonb_build_object(
      'error', 'This email already has a clinic',
      'code', 'CLINIC_EMAIL_EXISTS',
      'clinicId', v_existing_clinic_id
    );
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_branches) as branch_a,
         jsonb_array_elements(p_branches) as branch_b
    where branch_a <> branch_b
      and lower(branch_a->>'slug') = lower(branch_b->>'slug')
  ) then
    return jsonb_build_object('error', 'Duplicate branch slugs are not allowed');
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (p_name, p_name, p_email, 'active')
  returning id into v_clinic_id;

  update public.staff
  set clinic_id = v_clinic_id,
      pending_plan_id = null
  where email = p_email;

  insert into public.clinic_settings (clinic_id, clinic_name)
  values (v_clinic_id, p_name)
  on conflict (clinic_id) do nothing;

  for v_branch in
    select * from jsonb_array_elements(p_branches)
  loop
    v_branch_slug := lower(btrim(coalesce(v_branch->>'slug', '')));

    if v_branch_slug = '' then
      return jsonb_build_object('error', 'Branch slug is required');
    end if;

    if exists (select 1 from public.branches where slug = v_branch_slug) then
      return jsonb_build_object('error', format('Slug already taken: %s', v_branch_slug));
    end if;

    insert into public.branches (
      clinic_id,
      short_name,
      full_name,
      slug,
      status
    )
    values (
      v_clinic_id,
      btrim(coalesce(v_branch->>'shortName', '')),
      nullif(btrim(coalesce(v_branch->>'fullName', '')), ''),
      v_branch_slug,
      'active'
    )
    returning id into v_branch_id;

    v_branches := v_branches || jsonb_build_array(
      jsonb_build_object(
        'id', v_branch_id,
        'slug', v_branch_slug,
        'shortName', v_branch->>'shortName',
        'fullName', v_branch->>'fullName'
      )
    );
  end loop;

  return jsonb_build_object(
    'clinicId', v_clinic_id,
    'branches', v_branches
  );
exception when others then
  get stacked diagnostics
    v_sqlstate = returned_sqlstate,
    v_message = message_text,
    v_detail = pg_exception_detail,
    v_hint = pg_exception_hint;

  return jsonb_build_object(
    'error', 'setup_clinic_transaction failed',
    'code', coalesce(v_sqlstate, ''),
    'message', coalesce(v_message, ''),
    'detail', coalesce(v_detail, ''),
    'hint', coalesce(v_hint, '')
  );
end;
$$;

grant execute on function public.setup_clinic_transaction(text, text, jsonb) to service_role;

-- ============================================================
-- PART 4: Verify RLS Policies
-- ============================================================

-- Check branches policies
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename = 'branches'
order by policyname;
