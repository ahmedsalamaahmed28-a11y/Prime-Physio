-- Independent Supabase Auth identities for each canonical account + clinic pair.
-- Drafted on fix/clinic-session-isolation. Do not apply to production until reviewed
-- together with the browser session-storage integration and end-to-end isolation tests.

create table if not exists public.clinic_auth_identities (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  canonical_email text not null,
  shadow_email text not null,
  shadow_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (clinic_id, canonical_email),
  constraint clinic_auth_identities_email_normalized
    check (canonical_email = lower(btrim(canonical_email)) and length(canonical_email) between 3 and 254),
  constraint clinic_auth_identities_shadow_email_unique unique (shadow_email),
  constraint clinic_auth_identities_shadow_user_unique unique (shadow_user_id)
);

alter table public.clinic_auth_identities enable row level security;
revoke all on public.clinic_auth_identities from public, anon, authenticated;
grant all on public.clinic_auth_identities to service_role;

-- Supabase app_metadata is server-managed. user_metadata is deliberately never
-- consulted for canonical identity or tenant authorization.
create or replace function public.get_auth_email()
returns text
language sql
stable
security invoker
set search_path = ''
as $function$
  select case
    when auth.uid() is null then null::text
    when auth.jwt() -> 'app_metadata' ->> 'auth_source' = 'clinic-scoped-shadow'
      then nullif(pg_catalog.lower(pg_catalog.btrim(
        coalesce(auth.jwt() -> 'app_metadata' ->> 'canonical_email', '')
      )), '')
    else nullif(pg_catalog.lower(pg_catalog.btrim(
      coalesce(auth.jwt() ->> 'email', '')
    )), '')
  end;
$function$;

create or replace function public.is_valid_auth_session()
returns boolean
language sql
stable
security invoker
set search_path = 'pg_catalog', 'public'
as $function$
  select case
    when auth.jwt() -> 'app_metadata' ->> 'auth_source'
      in ('nextauth-shadow', 'clinic-scoped-shadow')
    then case
      when (auth.jwt() -> 'app_metadata' ->> 'nextauth_expires_at') ~ '^[0-9]{1,12}$'
      then (auth.jwt() -> 'app_metadata' ->> 'nextauth_expires_at')::bigint
           > floor(extract(epoch from now()))::bigint
      else false
    end
    else auth.uid() is not null
  end;
$function$;

create or replace function public.get_my_clinic_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_email text := public.get_auth_email();
  v_source text := auth.jwt() -> 'app_metadata' ->> 'auth_source';
  v_active_text text;
  v_active_id uuid;
  v_count bigint;
  v_only_id uuid;
begin
  if auth.uid() is null or v_email is null or not public.is_valid_auth_session() then
    return null;
  end if;

  -- A clinic-scoped token can access exactly the clinic embedded in its
  -- server-issued app_metadata. URL parameters and mutable active-clinic claims
  -- cannot widen or switch this scope.
  if v_source = 'clinic-scoped-shadow' then
    v_active_text := nullif(auth.jwt() -> 'app_metadata' ->> 'clinic_id', '');
    if v_active_text is null or v_active_text !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then
      return null;
    end if;
    v_active_id := v_active_text::uuid;

    if not exists (
      select 1 from public.clinics c
      where c.id = v_active_id and c.is_active = true and c.status = 'active'
    ) then
      return null;
    end if;

    if exists (
      select 1 from public.clinic_owners o
      where o.clinic_id = v_active_id and pg_catalog.lower(o.owner_email) = v_email
    ) or exists (
      select 1 from public.staff s
      where s.clinic_id = v_active_id
        and pg_catalog.lower(s.email) = v_email
        and pg_catalog.lower(pg_catalog.btrim(coalesce(s.status, ''))) not in
          ('محذوف', 'deleted', 'inactive', 'غير نشط')
    ) then
      return v_active_id;
    end if;
    return null;
  end if;

  -- Compatibility for existing NextAuth-shadow sessions while the frontend
  -- migration is rolled out. This branch is not used by new clinic identities.
  v_active_text := nullif(auth.jwt() -> 'app_metadata' ->> 'active_clinic_id', '');
  if v_active_text is not null then
    begin
      v_active_id := v_active_text::uuid;
    exception when invalid_text_representation then
      return null;
    end;

    if exists (
      select 1 from public.clinic_owners o
      where o.clinic_id = v_active_id and pg_catalog.lower(o.owner_email) = v_email
    ) or exists (
      select 1 from public.staff s
      where s.clinic_id = v_active_id
        and pg_catalog.lower(s.email) = v_email
        and pg_catalog.lower(pg_catalog.btrim(coalesce(s.status, ''))) not in
          ('محذوف', 'deleted', 'inactive', 'غير نشط')
    ) then
      return v_active_id;
    end if;
    return null;
  end if;

  select count(distinct membership.clinic_id), (pg_catalog.array_agg(distinct membership.clinic_id))[1]
    into v_count, v_only_id
  from (
    select s.clinic_id from public.staff s
    where pg_catalog.lower(s.email) = v_email
      and s.clinic_id is not null
      and pg_catalog.lower(pg_catalog.btrim(coalesce(s.status, ''))) not in
        ('محذوف', 'deleted', 'inactive', 'غير نشط')
    union
    select o.clinic_id from public.clinic_owners o
    where pg_catalog.lower(o.owner_email) = v_email
  ) membership;

  if v_count = 1 then return v_only_id; end if;
  return null;
end;
$function$;

create or replace function public.get_clinic_id_for_email(target_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when auth.uid() is not null
      and pg_catalog.lower(pg_catalog.btrim(coalesce(target_email, ''))) = public.get_auth_email()
      then public.get_my_clinic_id()
    else null::uuid
  end;
$function$;

create or replace function public.is_clinic_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and public.get_my_clinic_id() is not null
    and (
      exists (
        select 1 from public.clinic_owners o
        where o.clinic_id = public.get_my_clinic_id()
          and pg_catalog.lower(o.owner_email) = public.get_auth_email()
      )
      or exists (
        select 1 from public.staff s
        where s.clinic_id = public.get_my_clinic_id()
          and pg_catalog.lower(s.email) = public.get_auth_email()
          and pg_catalog.lower(pg_catalog.btrim(coalesce(s.status, ''))) not in
            ('محذوف', 'deleted', 'inactive', 'غير نشط')
          and pg_catalog.lower(pg_catalog.btrim(s.role)) in
            ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
      )
    );
$function$;

create or replace function public.has_staff_permission(permission_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_email text := public.get_auth_email();
  v_clinic_id uuid := public.get_my_clinic_id();
  v_role text;
  v_permissions text;
  v_permission_json jsonb;
begin
  if auth.uid() is null or v_email is null or v_clinic_id is null
     or permission_key is null or pg_catalog.btrim(permission_key) = '' then
    return false;
  end if;

  if exists (
    select 1 from public.clinic_owners o
    where o.clinic_id = v_clinic_id
      and pg_catalog.lower(pg_catalog.btrim(o.owner_email)) = v_email
  ) then
    return true;
  end if;

  select pg_catalog.lower(pg_catalog.btrim(s.role)), s.permissions
    into v_role, v_permissions
  from public.staff s
  where s.clinic_id = v_clinic_id
    and pg_catalog.lower(pg_catalog.btrim(s.email)) = v_email
    and pg_catalog.lower(pg_catalog.btrim(coalesce(s.status, ''))) not in
      ('محذوف', 'deleted', 'inactive', 'غير نشط')
  limit 1;

  if not found then return false; end if;

  if v_permissions is not null and pg_catalog.btrim(v_permissions) <> '' then
    begin
      v_permission_json := v_permissions::jsonb;
    exception when others then
      return false;
    end;
    if pg_catalog.jsonb_typeof(v_permission_json) <> 'array' then return false; end if;
    if exists (
      select 1 from pg_catalog.jsonb_array_elements(v_permission_json) as item(value)
      where pg_catalog.jsonb_typeof(item.value) <> 'string'
    ) then return false; end if;
    return (v_permission_json ? permission_key) or (v_permission_json ? '*');
  end if;

  if v_role in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده', 'مدير العياره', 'مدير النظام') then
    return true;
  end if;
  if v_role in ('doctor', 'استشاري علاج طبيعي', 'أخصائي علاج طبيعي', 'ممارس علاج طبيعي') then
    return permission_key in ('view_patients', 'view_appointments', 'edit_emr', 'edit_patient', 'view_patient_history');
  end if;
  if v_role in ('receptionist', 'موظف استقبال', 'موظفة استقبال رئيسية') then
    return permission_key in ('view_patients', 'view_appointments', 'view_invoices', 'create_invoice', 'edit_patient');
  end if;
  return false;
end;
$function$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and public.is_valid_auth_session()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'auth_source', '') <> 'clinic-scoped-shadow'
    and exists (
      select 1 from public.platform_admins pa
      where pg_catalog.lower(pa.email) = public.get_auth_email()
    );
$function$;

create or replace function public.enforce_clinic_admin_email_matches_session()
returns trigger
language plpgsql
set search_path = 'pg_catalog', 'public'
as $function$
begin
  if auth.uid() is not null and (not public.is_valid_auth_session() or public.get_auth_email() is distinct from lower(trim(new.admin_email))) then
    raise exception 'Clinic admin email must match the authenticated account'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

-- Direct-email policies must use the canonical identity, never the synthetic
-- Supabase shadow email. Every policy remains constrained to the token clinic.
drop policy if exists clinic_owners_owner_read on public.clinic_owners;
create policy clinic_owners_owner_read on public.clinic_owners
for select to authenticated
using (
  public.is_valid_auth_session()
  and lower(owner_email) = public.get_auth_email()
  and (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'auth_source', '') <> 'clinic-scoped-shadow'
    or clinic_id = public.get_my_clinic_id()
  )
);

drop policy if exists staff_self_read on public.staff;
drop policy if exists self_access_staff on public.staff;
create policy self_access_staff on public.staff
for select to authenticated
using (
  lower(email) = public.get_auth_email()
  and (
    clinic_id = public.get_my_clinic_id()
    or (clinic_id is null and public.get_my_clinic_id() is null)
  )
);

drop policy if exists audit_logs_tenant_insert on public.audit_logs;
create policy audit_logs_tenant_insert on public.audit_logs
for insert to authenticated
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and lower(user_email) = public.get_auth_email()
);

drop policy if exists chat_conversations_participant_read on public.chat_conversations;
create policy chat_conversations_participant_read on public.chat_conversations
for select to authenticated
using (
  clinic_id = public.get_my_clinic_id()
  and (coalesce(kind, 'team') <> 'patient' or public.has_staff_permission('view_patients'))
  and exists (
    select 1 from public.chat_participants p
    where p.conversation_id = chat_conversations.id
      and p.clinic_id = chat_conversations.clinic_id
      and lower(p.email) = public.get_auth_email()
  )
);

drop policy if exists chat_messages_participant_read on public.chat_messages;
create policy chat_messages_participant_read on public.chat_messages
for select to authenticated
using (
  clinic_id = public.get_my_clinic_id()
  and exists (
    select 1 from public.chat_participants p
    where p.conversation_id = chat_messages.conversation_id
      and p.clinic_id = chat_messages.clinic_id
      and lower(p.email) = public.get_auth_email()
  )
  and exists (
    select 1 from public.chat_conversations c
    where c.id = chat_messages.conversation_id
      and c.clinic_id = chat_messages.clinic_id
      and (coalesce(c.kind, 'team') <> 'patient' or public.has_staff_permission('view_patients'))
  )
);

drop policy if exists chat_participants_self_read on public.chat_participants;
create policy chat_participants_self_read on public.chat_participants
for select to authenticated
using (
  clinic_id = public.get_my_clinic_id()
  and lower(email) = public.get_auth_email()
);

drop policy if exists hr_attendance_clinic_insert on public.hr_attendance;
create policy hr_attendance_clinic_insert on public.hr_attendance
for insert to authenticated
with check (
  clinic_id = public.get_my_clinic_id()
  and (
    staff_id = (
      select s.id from public.staff s
      where lower(s.email) = public.get_auth_email()
        and s.clinic_id = public.get_my_clinic_id()
        and lower(coalesce(s.status, '')) not in ('محذوف', 'deleted', 'inactive', 'غير نشط')
      limit 1
    )
    or public.has_staff_permission('manage_staff')
  )
);

drop policy if exists hr_attendance_clinic_select on public.hr_attendance;
create policy hr_attendance_clinic_select on public.hr_attendance
for select to authenticated
using (
  clinic_id = public.get_my_clinic_id()
  and (
    staff_id = (
      select s.id from public.staff s
      where lower(s.email) = public.get_auth_email()
        and s.clinic_id = public.get_my_clinic_id()
        and lower(coalesce(s.status, '')) not in ('محذوف', 'deleted', 'inactive', 'غير نشط')
      limit 1
    )
    or public.has_staff_permission('manage_staff')
  )
);

drop policy if exists hr_attendance_clinic_update on public.hr_attendance;
create policy hr_attendance_clinic_update on public.hr_attendance
for update to authenticated
using (
  clinic_id = public.get_my_clinic_id()
  and (
    staff_id = (
      select s.id from public.staff s
      where lower(s.email) = public.get_auth_email()
        and s.clinic_id = public.get_my_clinic_id()
        and lower(coalesce(s.status, '')) not in ('محذوف', 'deleted', 'inactive', 'غير نشط')
      limit 1
    )
    or public.has_staff_permission('manage_staff')
  )
)
with check (
  clinic_id = public.get_my_clinic_id()
  and (
    staff_id = (
      select s.id from public.staff s
      where lower(s.email) = public.get_auth_email()
        and s.clinic_id = public.get_my_clinic_id()
        and lower(coalesce(s.status, '')) not in ('محذوف', 'deleted', 'inactive', 'غير نشط')
      limit 1
    )
    or public.has_staff_permission('manage_staff')
  )
);

-- Setup/onboarding RPCs must compare the caller-supplied human email to the
-- canonical claim too. Scoped shadow users have synthetic Supabase Auth emails.
create or replace function public.create_center(
  p_email text,
  p_plan_id text,
  p_short_name text,
  p_full_name text,
  p_slug text,
  p_specializations jsonb default '[]'::jsonb,
  p_logo_url text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
declare
  v_clinic_id uuid;
  v_branch_id uuid;
  v_staff_id uuid;
  v_existing_clinic_id uuid;
  v_plan_name text;
  v_plan_price integer;
  v_slug text;
begin
  if auth.uid() is null
     or not public.is_valid_auth_session()
     or public.get_auth_email() is distinct from lower(trim(coalesce(p_email, ''))) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug !~ '^[a-z0-9-]{3,50}
    return jsonb_build_object('error', 'Invalid clinic slug');
  end if;

  select name, price_monthly into v_plan_name, v_plan_price
  from public.subscription_plans
  where is_active = true
    and (lower(name) = lower(trim(coalesce(p_plan_id, ''))) or id::text = trim(coalesce(p_plan_id, '')))
  limit 1;

  if v_plan_name is null then
    return jsonb_build_object('error', 'Selected subscription plan is unavailable');
  end if;

  select id into v_staff_id
  from public.staff
  where lower(email) = lower(trim(p_email))
    and clinic_id is null
    and lower(btrim(role)) in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  limit 1
  for update;

  if v_staff_id is null then
    return jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  end if;

  select id into v_existing_clinic_id
  from public.clinics
  where lower(admin_email) = lower(trim(p_email))
  limit 1
  for update;

  if v_existing_clinic_id is not null then
    return jsonb_build_object('error', 'This email already has a clinic', 'code', 'CLINIC_EMAIL_EXISTS', 'clinicId', v_existing_clinic_id);
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_short_name), btrim(p_short_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  insert into public.branches (clinic_id, short_name, full_name, slug, specializations, logo_url, status)
  values (v_clinic_id, btrim(p_short_name), nullif(btrim(coalesce(p_full_name, '')), ''), v_slug,
          coalesce(p_specializations, '[]'::jsonb), p_logo_url, 'active')
  returning id into v_branch_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name, logo_url)
  values (v_clinic_id, btrim(p_short_name), p_logo_url)
  on conflict (clinic_id) do nothing;

  insert into public.subscriptions (clinic_id, user_email, plan_name, plan_price, status, start_date)
  values (v_clinic_id, lower(trim(p_email)), v_plan_name, v_plan_price, 'active', now());

  return jsonb_build_object('clinic_id', v_clinic_id, 'branch_id', v_branch_id);
end;
$function$;

create or replace function public.setup_clinic_transaction(
  p_email text,
  p_name text,
  p_branches jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
declare
  v_clinic_id uuid;
  v_branch jsonb;
  v_branch_id uuid;
  v_branch_slug text;
  v_branches jsonb := '[]'::jsonb;
  v_staff_id uuid;
begin
  if auth.uid() is null
     or public.get_auth_email() is distinct from lower(trim(coalesce(p_email, ''))) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if p_name is null or btrim(p_name) = '' or length(p_name) > 160
     or p_branches is null or jsonb_typeof(p_branches) <> 'array'
     or jsonb_array_length(p_branches) < 1 or jsonb_array_length(p_branches) > 5 then
    return jsonb_build_object('error', 'Invalid clinic setup details');
  end if;

  select id into v_staff_id
  from public.staff
  where lower(email) = lower(trim(p_email))
    and clinic_id is null
    and lower(btrim(role)) in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  limit 1
  for update;

  if v_staff_id is null then
    return jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    where jsonb_typeof(b.value) <> 'object'
       or btrim(coalesce(b.value->>'shortName', '')) = ''
       or lower(btrim(coalesce(b.value->>'slug', ''))) !~ '^[a-z0-9-]{3,50}
  end if;

  if exists (
    select lower(btrim(value->>'slug'))
    from jsonb_array_elements(p_branches)
    group by lower(btrim(value->>'slug'))
    having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    join public.branches existing on lower(existing.slug) = lower(btrim(b.value->>'slug'))
  ) then
    return jsonb_build_object('error', 'Duplicate or unavailable center slug');
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_name), btrim(p_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name)
  values (v_clinic_id, btrim(p_name))
  on conflict (clinic_id) do nothing;

  for v_branch in select value from jsonb_array_elements(p_branches)
  loop
    v_branch_slug := lower(btrim(v_branch->>'slug'));
    insert into public.branches (clinic_id, short_name, full_name, slug, status)
    values (v_clinic_id, btrim(v_branch->>'shortName'),
            nullif(btrim(coalesce(v_branch->>'fullName', '')), ''), v_branch_slug, 'active')
    returning id into v_branch_id;

    v_branches := v_branches || jsonb_build_array(
      jsonb_build_object('id', v_branch_id, 'slug', v_branch_slug,
        'shortName', v_branch->>'shortName', 'fullName', v_branch->>'fullName')
    );
  end loop;

  return jsonb_build_object('clinicId', v_clinic_id, 'branches', v_branches);
end;
$function$;

revoke all on function public.get_auth_email() from public, anon;
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;
 then
    return jsonb_build_object('error', 'Invalid clinic slug');
  end if;

  select name, price_monthly into v_plan_name, v_plan_price
  from public.subscription_plans
  where is_active = true
    and (lower(name) = lower(trim(coalesce(p_plan_id, ''))) or id::text = trim(coalesce(p_plan_id, '')))
  limit 1;

  if v_plan_name is null then
    return jsonb_build_object('error', 'Selected subscription plan is unavailable');
  end if;

  select id into v_staff_id
  from public.staff
  where lower(email) = lower(trim(p_email))
    and clinic_id is null
    and lower(btrim(role)) in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  limit 1
  for update;

  if v_staff_id is null then
    return jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  end if;

  select id into v_existing_clinic_id
  from public.clinics
  where lower(admin_email) = lower(trim(p_email))
  limit 1
  for update;

  if v_existing_clinic_id is not null then
    return jsonb_build_object('error', 'This email already has a clinic', 'code', 'CLINIC_EMAIL_EXISTS', 'clinicId', v_existing_clinic_id);
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_short_name), btrim(p_short_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  insert into public.branches (clinic_id, short_name, full_name, slug, specializations, logo_url, status)
  values (v_clinic_id, btrim(p_short_name), nullif(btrim(coalesce(p_full_name, '')), ''), v_slug,
          coalesce(p_specializations, '[]'::jsonb), p_logo_url, 'active')
  returning id into v_branch_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name, logo_url)
  values (v_clinic_id, btrim(p_short_name), p_logo_url)
  on conflict (clinic_id) do nothing;

  insert into public.subscriptions (clinic_id, user_email, plan_name, plan_price, status, start_date)
  values (v_clinic_id, lower(trim(p_email)), v_plan_name, v_plan_price, 'active', now());

  return jsonb_build_object('clinic_id', v_clinic_id, 'branch_id', v_branch_id);
end;
$function$;

create or replace function public.setup_clinic_transaction(
  p_email text,
  p_name text,
  p_branches jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
declare
  v_clinic_id uuid;
  v_branch jsonb;
  v_branch_id uuid;
  v_branch_slug text;
  v_branches jsonb := '[]'::jsonb;
  v_staff_id uuid;
begin
  if auth.uid() is null
     or public.get_auth_email() is distinct from lower(trim(coalesce(p_email, ''))) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if p_name is null or btrim(p_name) = '' or length(p_name) > 160
     or p_branches is null or jsonb_typeof(p_branches) <> 'array'
     or jsonb_array_length(p_branches) < 1 or jsonb_array_length(p_branches) > 5 then
    return jsonb_build_object('error', 'Invalid clinic setup details');
  end if;

  select id into v_staff_id
  from public.staff
  where lower(email) = lower(trim(p_email))
    and clinic_id is null
    and lower(btrim(role)) in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  limit 1
  for update;

  if v_staff_id is null then
    return jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    where jsonb_typeof(b.value) <> 'object'
       or btrim(coalesce(b.value->>'shortName', '')) = ''
       or lower(btrim(coalesce(b.value->>'slug', ''))) !~ '^[a-z0-9-]{3,50}
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;

  ) then
    return jsonb_build_object('error', 'Invalid center details or slug');
  end if;

  if exists (
    select lower(btrim(value->>'slug'))
    from jsonb_array_elements(p_branches)
    group by lower(btrim(value->>'slug'))
    having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    join public.branches existing on lower(existing.slug) = lower(btrim(b.value->>'slug'))
  ) then
    return jsonb_build_object('error', 'Duplicate or unavailable center slug');
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_name), btrim(p_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name)
  values (v_clinic_id, btrim(p_name))
  on conflict (clinic_id) do nothing;

  for v_branch in select value from jsonb_array_elements(p_branches)
  loop
    v_branch_slug := lower(btrim(v_branch->>'slug'));
    insert into public.branches (clinic_id, short_name, full_name, slug, status)
    values (v_clinic_id, btrim(v_branch->>'shortName'),
            nullif(btrim(coalesce(v_branch->>'fullName', '')), ''), v_branch_slug, 'active')
    returning id into v_branch_id;

    v_branches := v_branches || jsonb_build_array(
      jsonb_build_object('id', v_branch_id, 'slug', v_branch_slug,
        'shortName', v_branch->>'shortName', 'fullName', v_branch->>'fullName')
    );
  end loop;

  return jsonb_build_object('clinicId', v_clinic_id, 'branches', v_branches);
end;
$function$;

revoke all on function public.get_auth_email() from public, anon;
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;

  ) then
    return jsonb_build_object('error', 'Invalid center details or slug');
  end if;

  if exists (
    select lower(btrim(value->>'slug'))
    from jsonb_array_elements(p_branches)
    group by lower(btrim(value->>'slug'))
    having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    join public.branches existing on lower(existing.slug) = lower(btrim(b.value->>'slug'))
  ) then
    return jsonb_build_object('error', 'Duplicate or unavailable center slug');
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_name), btrim(p_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name)
  values (v_clinic_id, btrim(p_name))
  on conflict (clinic_id) do nothing;

  for v_branch in select value from jsonb_array_elements(p_branches)
  loop
    v_branch_slug := lower(btrim(v_branch->>'slug'));
    insert into public.branches (clinic_id, short_name, full_name, slug, status)
    values (v_clinic_id, btrim(v_branch->>'shortName'),
            nullif(btrim(coalesce(v_branch->>'fullName', '')), ''), v_branch_slug, 'active')
    returning id into v_branch_id;

    v_branches := v_branches || jsonb_build_array(
      jsonb_build_object('id', v_branch_id, 'slug', v_branch_slug,
        'shortName', v_branch->>'shortName', 'fullName', v_branch->>'fullName')
    );
  end loop;

  return jsonb_build_object('clinicId', v_clinic_id, 'branches', v_branches);
end;
$function$;

revoke all on function public.get_auth_email() from public, anon;
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;
 then
    return jsonb_build_object('error', 'Invalid clinic slug');
  end if;

  select name, price_monthly into v_plan_name, v_plan_price
  from public.subscription_plans
  where is_active = true
    and (lower(name) = lower(trim(coalesce(p_plan_id, ''))) or id::text = trim(coalesce(p_plan_id, '')))
  limit 1;

  if v_plan_name is null then
    return jsonb_build_object('error', 'Selected subscription plan is unavailable');
  end if;

  select id into v_staff_id
  from public.staff
  where lower(email) = lower(trim(p_email))
    and clinic_id is null
    and lower(btrim(role)) in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  limit 1
  for update;

  if v_staff_id is null then
    return jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  end if;

  select id into v_existing_clinic_id
  from public.clinics
  where lower(admin_email) = lower(trim(p_email))
  limit 1
  for update;

  if v_existing_clinic_id is not null then
    return jsonb_build_object('error', 'This email already has a clinic', 'code', 'CLINIC_EMAIL_EXISTS', 'clinicId', v_existing_clinic_id);
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_short_name), btrim(p_short_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  insert into public.branches (clinic_id, short_name, full_name, slug, specializations, logo_url, status)
  values (v_clinic_id, btrim(p_short_name), nullif(btrim(coalesce(p_full_name, '')), ''), v_slug,
          coalesce(p_specializations, '[]'::jsonb), p_logo_url, 'active')
  returning id into v_branch_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name, logo_url)
  values (v_clinic_id, btrim(p_short_name), p_logo_url)
  on conflict (clinic_id) do nothing;

  insert into public.subscriptions (clinic_id, user_email, plan_name, plan_price, status, start_date)
  values (v_clinic_id, lower(trim(p_email)), v_plan_name, v_plan_price, 'active', now());

  return jsonb_build_object('clinic_id', v_clinic_id, 'branch_id', v_branch_id);
end;
$function$;

create or replace function public.setup_clinic_transaction(
  p_email text,
  p_name text,
  p_branches jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
declare
  v_clinic_id uuid;
  v_branch jsonb;
  v_branch_id uuid;
  v_branch_slug text;
  v_branches jsonb := '[]'::jsonb;
  v_staff_id uuid;
begin
  if auth.uid() is null
     or public.get_auth_email() is distinct from lower(trim(coalesce(p_email, ''))) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if p_name is null or btrim(p_name) = '' or length(p_name) > 160
     or p_branches is null or jsonb_typeof(p_branches) <> 'array'
     or jsonb_array_length(p_branches) < 1 or jsonb_array_length(p_branches) > 5 then
    return jsonb_build_object('error', 'Invalid clinic setup details');
  end if;

  select id into v_staff_id
  from public.staff
  where lower(email) = lower(trim(p_email))
    and clinic_id is null
    and lower(btrim(role)) in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  limit 1
  for update;

  if v_staff_id is null then
    return jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    where jsonb_typeof(b.value) <> 'object'
       or btrim(coalesce(b.value->>'shortName', '')) = ''
       or lower(btrim(coalesce(b.value->>'slug', ''))) !~ '^[a-z0-9-]{3,50}
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;

  ) then
    return jsonb_build_object('error', 'Invalid center details or slug');
  end if;

  if exists (
    select lower(btrim(value->>'slug'))
    from jsonb_array_elements(p_branches)
    group by lower(btrim(value->>'slug'))
    having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    join public.branches existing on lower(existing.slug) = lower(btrim(b.value->>'slug'))
  ) then
    return jsonb_build_object('error', 'Duplicate or unavailable center slug');
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_name), btrim(p_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name)
  values (v_clinic_id, btrim(p_name))
  on conflict (clinic_id) do nothing;

  for v_branch in select value from jsonb_array_elements(p_branches)
  loop
    v_branch_slug := lower(btrim(v_branch->>'slug'));
    insert into public.branches (clinic_id, short_name, full_name, slug, status)
    values (v_clinic_id, btrim(v_branch->>'shortName'),
            nullif(btrim(coalesce(v_branch->>'fullName', '')), ''), v_branch_slug, 'active')
    returning id into v_branch_id;

    v_branches := v_branches || jsonb_build_array(
      jsonb_build_object('id', v_branch_id, 'slug', v_branch_slug,
        'shortName', v_branch->>'shortName', 'fullName', v_branch->>'fullName')
    );
  end loop;

  return jsonb_build_object('clinicId', v_clinic_id, 'branches', v_branches);
end;
$function$;

revoke all on function public.get_auth_email() from public, anon;
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;

       or lower(btrim(coalesce(b.value->>'slug', ''))) in ('api', 'dashboard', 'login', 'signup', 'admin', 'www') then
    return jsonb_build_object('error', 'Invalid center details or slug');
  end if;

  if exists (
    select lower(btrim(value->>'slug'))
    from jsonb_array_elements(p_branches)
    group by lower(btrim(value->>'slug'))
    having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    join public.branches existing on lower(existing.slug) = lower(btrim(b.value->>'slug'))
  ) then
    return jsonb_build_object('error', 'Duplicate or unavailable center slug');
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_name), btrim(p_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name)
  values (v_clinic_id, btrim(p_name))
  on conflict (clinic_id) do nothing;

  for v_branch in select value from jsonb_array_elements(p_branches)
  loop
    v_branch_slug := lower(btrim(v_branch->>'slug'));
    insert into public.branches (clinic_id, short_name, full_name, slug, status)
    values (v_clinic_id, btrim(v_branch->>'shortName'),
            nullif(btrim(coalesce(v_branch->>'fullName', '')), ''), v_branch_slug, 'active')
    returning id into v_branch_id;

    v_branches := v_branches || jsonb_build_array(
      jsonb_build_object('id', v_branch_id, 'slug', v_branch_slug,
        'shortName', v_branch->>'shortName', 'fullName', v_branch->>'fullName')
    );
  end loop;

  return jsonb_build_object('clinicId', v_clinic_id, 'branches', v_branches);
end;
$function$;

revoke all on function public.get_auth_email() from public, anon;
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;
 then
    return jsonb_build_object('error', 'Invalid clinic slug');
  end if;

  select name, price_monthly into v_plan_name, v_plan_price
  from public.subscription_plans
  where is_active = true
    and (lower(name) = lower(trim(coalesce(p_plan_id, ''))) or id::text = trim(coalesce(p_plan_id, '')))
  limit 1;

  if v_plan_name is null then
    return jsonb_build_object('error', 'Selected subscription plan is unavailable');
  end if;

  select id into v_staff_id
  from public.staff
  where lower(email) = lower(trim(p_email))
    and clinic_id is null
    and lower(btrim(role)) in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  limit 1
  for update;

  if v_staff_id is null then
    return jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  end if;

  select id into v_existing_clinic_id
  from public.clinics
  where lower(admin_email) = lower(trim(p_email))
  limit 1
  for update;

  if v_existing_clinic_id is not null then
    return jsonb_build_object('error', 'This email already has a clinic', 'code', 'CLINIC_EMAIL_EXISTS', 'clinicId', v_existing_clinic_id);
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_short_name), btrim(p_short_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  insert into public.branches (clinic_id, short_name, full_name, slug, specializations, logo_url, status)
  values (v_clinic_id, btrim(p_short_name), nullif(btrim(coalesce(p_full_name, '')), ''), v_slug,
          coalesce(p_specializations, '[]'::jsonb), p_logo_url, 'active')
  returning id into v_branch_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name, logo_url)
  values (v_clinic_id, btrim(p_short_name), p_logo_url)
  on conflict (clinic_id) do nothing;

  insert into public.subscriptions (clinic_id, user_email, plan_name, plan_price, status, start_date)
  values (v_clinic_id, lower(trim(p_email)), v_plan_name, v_plan_price, 'active', now());

  return jsonb_build_object('clinic_id', v_clinic_id, 'branch_id', v_branch_id);
end;
$function$;

create or replace function public.setup_clinic_transaction(
  p_email text,
  p_name text,
  p_branches jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
declare
  v_clinic_id uuid;
  v_branch jsonb;
  v_branch_id uuid;
  v_branch_slug text;
  v_branches jsonb := '[]'::jsonb;
  v_staff_id uuid;
begin
  if auth.uid() is null
     or public.get_auth_email() is distinct from lower(trim(coalesce(p_email, ''))) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if p_name is null or btrim(p_name) = '' or length(p_name) > 160
     or p_branches is null or jsonb_typeof(p_branches) <> 'array'
     or jsonb_array_length(p_branches) < 1 or jsonb_array_length(p_branches) > 5 then
    return jsonb_build_object('error', 'Invalid clinic setup details');
  end if;

  select id into v_staff_id
  from public.staff
  where lower(email) = lower(trim(p_email))
    and clinic_id is null
    and lower(btrim(role)) in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  limit 1
  for update;

  if v_staff_id is null then
    return jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    where jsonb_typeof(b.value) <> 'object'
       or btrim(coalesce(b.value->>'shortName', '')) = ''
       or lower(btrim(coalesce(b.value->>'slug', ''))) !~ '^[a-z0-9-]{3,50}
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;

  ) then
    return jsonb_build_object('error', 'Invalid center details or slug');
  end if;

  if exists (
    select lower(btrim(value->>'slug'))
    from jsonb_array_elements(p_branches)
    group by lower(btrim(value->>'slug'))
    having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    join public.branches existing on lower(existing.slug) = lower(btrim(b.value->>'slug'))
  ) then
    return jsonb_build_object('error', 'Duplicate or unavailable center slug');
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_name), btrim(p_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name)
  values (v_clinic_id, btrim(p_name))
  on conflict (clinic_id) do nothing;

  for v_branch in select value from jsonb_array_elements(p_branches)
  loop
    v_branch_slug := lower(btrim(v_branch->>'slug'));
    insert into public.branches (clinic_id, short_name, full_name, slug, status)
    values (v_clinic_id, btrim(v_branch->>'shortName'),
            nullif(btrim(coalesce(v_branch->>'fullName', '')), ''), v_branch_slug, 'active')
    returning id into v_branch_id;

    v_branches := v_branches || jsonb_build_array(
      jsonb_build_object('id', v_branch_id, 'slug', v_branch_slug,
        'shortName', v_branch->>'shortName', 'fullName', v_branch->>'fullName')
    );
  end loop;

  return jsonb_build_object('clinicId', v_clinic_id, 'branches', v_branches);
end;
$function$;

revoke all on function public.get_auth_email() from public, anon;
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;

  ) then
    return jsonb_build_object('error', 'Invalid center details or slug');
  end if;

  if exists (
    select lower(btrim(value->>'slug'))
    from jsonb_array_elements(p_branches)
    group by lower(btrim(value->>'slug'))
    having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    join public.branches existing on lower(existing.slug) = lower(btrim(b.value->>'slug'))
  ) then
    return jsonb_build_object('error', 'Duplicate or unavailable center slug');
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_name), btrim(p_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name)
  values (v_clinic_id, btrim(p_name))
  on conflict (clinic_id) do nothing;

  for v_branch in select value from jsonb_array_elements(p_branches)
  loop
    v_branch_slug := lower(btrim(v_branch->>'slug'));
    insert into public.branches (clinic_id, short_name, full_name, slug, status)
    values (v_clinic_id, btrim(v_branch->>'shortName'),
            nullif(btrim(coalesce(v_branch->>'fullName', '')), ''), v_branch_slug, 'active')
    returning id into v_branch_id;

    v_branches := v_branches || jsonb_build_array(
      jsonb_build_object('id', v_branch_id, 'slug', v_branch_slug,
        'shortName', v_branch->>'shortName', 'fullName', v_branch->>'fullName')
    );
  end loop;

  return jsonb_build_object('clinicId', v_clinic_id, 'branches', v_branches);
end;
$function$;

revoke all on function public.get_auth_email() from public, anon;
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;
 then
    return jsonb_build_object('error', 'Invalid clinic slug');
  end if;

  select name, price_monthly into v_plan_name, v_plan_price
  from public.subscription_plans
  where is_active = true
    and (lower(name) = lower(trim(coalesce(p_plan_id, ''))) or id::text = trim(coalesce(p_plan_id, '')))
  limit 1;

  if v_plan_name is null then
    return jsonb_build_object('error', 'Selected subscription plan is unavailable');
  end if;

  select id into v_staff_id
  from public.staff
  where lower(email) = lower(trim(p_email))
    and clinic_id is null
    and lower(btrim(role)) in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  limit 1
  for update;

  if v_staff_id is null then
    return jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  end if;

  select id into v_existing_clinic_id
  from public.clinics
  where lower(admin_email) = lower(trim(p_email))
  limit 1
  for update;

  if v_existing_clinic_id is not null then
    return jsonb_build_object('error', 'This email already has a clinic', 'code', 'CLINIC_EMAIL_EXISTS', 'clinicId', v_existing_clinic_id);
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_short_name), btrim(p_short_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  insert into public.branches (clinic_id, short_name, full_name, slug, specializations, logo_url, status)
  values (v_clinic_id, btrim(p_short_name), nullif(btrim(coalesce(p_full_name, '')), ''), v_slug,
          coalesce(p_specializations, '[]'::jsonb), p_logo_url, 'active')
  returning id into v_branch_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name, logo_url)
  values (v_clinic_id, btrim(p_short_name), p_logo_url)
  on conflict (clinic_id) do nothing;

  insert into public.subscriptions (clinic_id, user_email, plan_name, plan_price, status, start_date)
  values (v_clinic_id, lower(trim(p_email)), v_plan_name, v_plan_price, 'active', now());

  return jsonb_build_object('clinic_id', v_clinic_id, 'branch_id', v_branch_id);
end;
$function$;

create or replace function public.setup_clinic_transaction(
  p_email text,
  p_name text,
  p_branches jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
declare
  v_clinic_id uuid;
  v_branch jsonb;
  v_branch_id uuid;
  v_branch_slug text;
  v_branches jsonb := '[]'::jsonb;
  v_staff_id uuid;
begin
  if auth.uid() is null
     or public.get_auth_email() is distinct from lower(trim(coalesce(p_email, ''))) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if p_name is null or btrim(p_name) = '' or length(p_name) > 160
     or p_branches is null or jsonb_typeof(p_branches) <> 'array'
     or jsonb_array_length(p_branches) < 1 or jsonb_array_length(p_branches) > 5 then
    return jsonb_build_object('error', 'Invalid clinic setup details');
  end if;

  select id into v_staff_id
  from public.staff
  where lower(email) = lower(trim(p_email))
    and clinic_id is null
    and lower(btrim(role)) in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  limit 1
  for update;

  if v_staff_id is null then
    return jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    where jsonb_typeof(b.value) <> 'object'
       or btrim(coalesce(b.value->>'shortName', '')) = ''
       or lower(btrim(coalesce(b.value->>'slug', ''))) !~ '^[a-z0-9-]{3,50}
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;

  ) then
    return jsonb_build_object('error', 'Invalid center details or slug');
  end if;

  if exists (
    select lower(btrim(value->>'slug'))
    from jsonb_array_elements(p_branches)
    group by lower(btrim(value->>'slug'))
    having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_branches) as b(value)
    join public.branches existing on lower(existing.slug) = lower(btrim(b.value->>'slug'))
  ) then
    return jsonb_build_object('error', 'Duplicate or unavailable center slug');
  end if;

  insert into public.clinics (name, name_en, admin_email, status)
  values (btrim(p_name), btrim(p_name), lower(trim(p_email)), 'active')
  returning id into v_clinic_id;

  update public.staff set clinic_id = v_clinic_id, pending_plan_id = null
  where id = v_staff_id and clinic_id is null;

  insert into public.clinic_settings (clinic_id, clinic_name)
  values (v_clinic_id, btrim(p_name))
  on conflict (clinic_id) do nothing;

  for v_branch in select value from jsonb_array_elements(p_branches)
  loop
    v_branch_slug := lower(btrim(v_branch->>'slug'));
    insert into public.branches (clinic_id, short_name, full_name, slug, status)
    values (v_clinic_id, btrim(v_branch->>'shortName'),
            nullif(btrim(coalesce(v_branch->>'fullName', '')), ''), v_branch_slug, 'active')
    returning id into v_branch_id;

    v_branches := v_branches || jsonb_build_array(
      jsonb_build_object('id', v_branch_id, 'slug', v_branch_slug,
        'shortName', v_branch->>'shortName', 'fullName', v_branch->>'fullName')
    );
  end loop;

  return jsonb_build_object('clinicId', v_clinic_id, 'branches', v_branches);
end;
$function$;

revoke all on function public.get_auth_email() from public, anon;
revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.get_auth_email() to authenticated, service_role;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;
