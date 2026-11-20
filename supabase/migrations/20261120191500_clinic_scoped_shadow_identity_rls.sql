-- Independent Supabase Auth identities for each canonical account + clinic pair.
-- Drafted on fix/clinic-session-isolation. Do not apply to production until reviewed
-- together with the browser session-storage integration and end-to-end isolation tests.

create table if not exists public.clinic_auth_identities (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  canonical_email text not null,
  shadow_email text not null,
  shadow_user_id uuid,
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

  select count(distinct membership.clinic_id), min(membership.clinic_id)
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
  if auth.uid() is not null and public.get_auth_email() <> lower(trim(new.admin_email)) then
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
using (public.is_valid_auth_session() and lower(owner_email) = public.get_auth_email());

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
