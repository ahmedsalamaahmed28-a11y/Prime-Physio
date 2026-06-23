-- ============================================
-- Migration: Center-Setup Onboarding Flow
-- ============================================
-- This migration supports the new onboarding flow:
--   Signup (user only, no clinic) → Plans → Center Setup → Dashboard
-- ============================================

-- 1. Add pending_plan_id to staff (stores plan selected before center creation)
alter table public.staff add column if not exists pending_plan_id text;

-- 2. Make branches.slug globally unique (for center URL like primephysio.vercel.app/erada)
-- Drop existing per-clinic unique constraint
alter table public.branches drop constraint if exists branches_clinic_id_slug_key;
-- Add globally unique constraint on slug
alter table public.branches add constraint branches_slug_unique unique (slug);
-- Ensure no null slugs
alter table public.branches alter column slug set not null;

-- 3. Add specializations to branches (e.g. ["تأهيل أطفال", "إصابات ملاعب", "علاج طبيعي"])
alter table public.branches add column if not exists specializations jsonb not null default '[]'::jsonb;

-- 4. Create function to check slug availability (used by center-setup page)
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

-- 5. Create function to create center (clinic + branch + link staff + subscription in one go)
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
  v_staff_id uuid;
begin
  -- Validate slug availability
  if exists (select 1 from public.branches where slug = p_slug) then
    return jsonb_build_object('error', 'Slug already taken');
  end if;

  -- Create clinic
  insert into public.clinics (name, name_en, admin_email, status)
  values (p_short_name, p_short_name, p_email, 'active')
  returning id into v_clinic_id;

  -- Create primary branch (center)
  insert into public.branches (clinic_id, short_name, full_name, slug, specializations, logo_url, status)
  values (v_clinic_id, p_short_name, p_full_name, p_slug, p_specializations, p_logo_url, 'active')
  returning id into v_branch_id;

  -- Link staff to clinic
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
