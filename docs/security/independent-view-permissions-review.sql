-- REVIEW DRAFT ONLY — NOT A SUPABASE MIGRATION.
-- This script has NOT been applied to any database.
-- It creates private snapshots before replacing the permission function and RLS policies.
-- Existing patient, invoice, appointment, and staff records are not deleted or modified.

begin;

create schema if not exists private;

create table if not exists private.staff_permissions_backup_20261119 (
  staff_id uuid primary key,
  clinic_id uuid,
  email text,
  role text,
  status text,
  permissions text,
  backed_up_at timestamptz not null default now()
);

insert into private.staff_permissions_backup_20261119
  (staff_id, clinic_id, email, role, status, permissions)
select id, clinic_id, email, role, status, permissions
from public.staff
on conflict (staff_id) do nothing;

create table if not exists private.rls_policies_backup_20261119 as
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check,
       now() as backed_up_at
from pg_catalog.pg_policies
where false;

insert into private.rls_policies_backup_20261119
  (schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check, backed_up_at)
select p.schemaname, p.tablename, p.policyname, p.permissive, p.roles, p.cmd,
       p.qual, p.with_check, now()
from pg_catalog.pg_policies p
where p.schemaname = 'public'
  and p.tablename in (
    'patients', 'appointments', 'discharges', 'invoices',
    'insurance_claims', 'recovery_logs', 'daily_reports',
    'executive_reports', 'patient_medical_records',
    'subscriptions', 'payroll_drafts', 'clinic_bank_details'
  )
  and not exists (
    select 1
    from private.rls_policies_backup_20261119 b
    where b.schemaname = p.schemaname
      and b.tablename = p.tablename
      and b.policyname = p.policyname
  );

create table if not exists private.permission_function_backup_20261119 (
  function_name text primary key,
  definition text not null,
  backed_up_at timestamptz not null default now()
);

insert into private.permission_function_backup_20261119 (function_name, definition)
select 'public.has_staff_permission(text)', pg_catalog.pg_get_functiondef(
  'public.has_staff_permission(text)'::regprocedure
)
on conflict (function_name) do nothing;

revoke all on table private.staff_permissions_backup_20261119 from public, anon, authenticated;
revoke all on table private.rls_policies_backup_20261119 from public, anon, authenticated;
revoke all on table private.permission_function_backup_20261119 from public, anon, authenticated;

create or replace function public.has_staff_permission(permission_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_clinic_id uuid := public.get_my_clinic_id();
  v_role text;
  v_permissions text;
  v_permission_json jsonb;
begin
  if auth.uid() is null
     or v_email = ''
     or v_clinic_id is null
     or permission_key is null
     or pg_catalog.btrim(permission_key) = '' then
    return false;
  end if;

  -- A verified clinic owner retains owner-level access, including when no staff row exists.
  if exists (
    select 1
    from public.clinic_owners o
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

  if not found then
    return false;
  end if;

  -- A non-empty explicit list is authoritative for every role, including admin.
  -- Invalid JSON, a non-array JSON value, or non-string array members deny access.
  if v_permissions is not null and pg_catalog.btrim(v_permissions) <> '' then
    begin
      v_permission_json := v_permissions::jsonb;
    exception when others then
      return false;
    end;

    if pg_catalog.jsonb_typeof(v_permission_json) <> 'array' then
      return false;
    end if;

    if exists (
      select 1
      from pg_catalog.jsonb_array_elements(v_permission_json) as item(value)
      where pg_catalog.jsonb_typeof(item.value) <> 'string'
    ) then
      return false;
    end if;

    return v_permission_json ? permission_key;
  end if;

  -- Role defaults apply only when there is no explicit override.
  if v_role in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده', 'مدير العياره', 'مدير النظام') then
    return permission_key in (
      'view_patients', 'edit_patient', 'delete_patient',
      'view_appointments', 'edit_appointments',
      'view_invoices', 'create_invoice', 'delete_invoice',
      'refund_invoice', 'apply_discount', 'print_invoice',
      'view_patient_history', 'edit_emr', 'delete_emr',
      'send_messages', 'manage_staff', 'view_analytics',
      'export_data', 'manage_settings', 'manage_inventory',
      'manage_reports'
    );
  end if;

  if v_role in ('doctor', 'استشاري علاج طبيعي', 'أخصائي علاج طبيعي', 'ممارس علاج طبيعي') then
    return permission_key in (
      'view_patients', 'view_appointments', 'edit_emr',
      'edit_patient', 'view_patient_history'
    );
  end if;

  if v_role in ('receptionist', 'موظف استقبال', 'موظفة استقبال رئيسية') then
    return permission_key in (
      'view_patients', 'view_appointments', 'view_invoices',
      'create_invoice', 'edit_patient'
    );
  end if;

  return false;
end;
$function$;

-- Patients: read access is independent from edit/delete access.
drop policy if exists patients_clinic_select on public.patients;
create policy patients_clinic_select
on public.patients
for select
to authenticated
using (
  clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
);

-- Appointments: schedule visibility is independent from appointment editing.
drop policy if exists appointments_clinic_select on public.appointments;
create policy appointments_clinic_select
on public.appointments
for select
to authenticated
using (
  clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_appointments')
);

-- Invoices: financial visibility is independent from invoice creation/discount/refund/delete.
drop policy if exists invoices_clinic_select on public.invoices;
create policy invoices_clinic_select
on public.invoices
for select
to authenticated
using (
  clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_invoices')
);

-- Discharge records contain patient/clinical context.
drop policy if exists "Allow clinic staff to view their discharges" on public.discharges;
create policy "Allow clinic staff to view their discharges"
on public.discharges
for select
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and public.has_staff_permission('view_patient_history')
);

-- Insurance claims are financial records.
drop policy if exists "Allow clinic staff to view their insurance_claims" on public.insurance_claims;
create policy "Allow clinic staff to view their insurance_claims"
on public.insurance_claims
for select
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_invoices')
);

-- Recovery logs are clinical records.
drop policy if exists "Allow clinic staff to view their recovery_logs" on public.recovery_logs;
create policy "Allow clinic staff to view their recovery_logs"
on public.recovery_logs
for select
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patient_history')
);

-- Analytics reports contain revenue and clinic performance information.
drop policy if exists "Allow clinic staff to view their daily_reports" on public.daily_reports;
create policy "Allow clinic staff to view their daily_reports"
on public.daily_reports
for select
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_analytics')
);

drop policy if exists "Allow clinic staff to view their executive_reports" on public.executive_reports;
create policy "Allow clinic staff to view their executive_reports"
on public.executive_reports
for select
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_analytics')
);

-- Tighten clinic-staff write policies that were previously broad.
drop policy if exists "Allow clinic staff to insert discharges" on public.discharges;
create policy "Allow clinic staff to insert discharges"
on public.discharges
for insert
to authenticated
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('edit_patient')
);

drop policy if exists "Allow clinic staff to update discharges" on public.discharges;
create policy "Allow clinic staff to update discharges"
on public.discharges
for update
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('edit_patient')
)
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('edit_patient')
);

drop policy if exists "Allow clinic staff to insert insurance_claims" on public.insurance_claims;
create policy "Allow clinic staff to insert insurance_claims"
on public.insurance_claims
for insert
to authenticated
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('create_invoice')
);

drop policy if exists "Allow clinic staff to update insurance_claims" on public.insurance_claims;
create policy "Allow clinic staff to update insurance_claims"
on public.insurance_claims
for update
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('create_invoice')
)
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('create_invoice')
);

drop policy if exists "Allow clinic staff to insert recovery_logs" on public.recovery_logs;
create policy "Allow clinic staff to insert recovery_logs"
on public.recovery_logs
for insert
to authenticated
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('edit_emr')
);

drop policy if exists "Allow clinic staff to update recovery_logs" on public.recovery_logs;
create policy "Allow clinic staff to update recovery_logs"
on public.recovery_logs
for update
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('edit_emr')
)
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('edit_emr')
);

drop policy if exists "Allow clinic staff to insert daily_reports" on public.daily_reports;
create policy "Allow clinic staff to insert daily_reports"
on public.daily_reports
for insert
to authenticated
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('manage_reports')
);

drop policy if exists "Allow clinic staff to update daily_reports" on public.daily_reports;
create policy "Allow clinic staff to update daily_reports"
on public.daily_reports
for update
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('manage_reports')
)
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('manage_reports')
);

drop policy if exists "Allow clinic staff to insert executive_reports" on public.executive_reports;
create policy "Allow clinic staff to insert executive_reports"
on public.executive_reports
for insert
to authenticated
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('manage_reports')
);

drop policy if exists "Allow clinic staff to update executive_reports" on public.executive_reports;
create policy "Allow clinic staff to update executive_reports"
on public.executive_reports
for update
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('manage_reports')
)
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('manage_reports')
);

-- Intentionally unchanged:
-- * auth_session_expiry_guard restrictive policies
-- * patient_medical_records clinical-history policies
-- * subscriptions_self_read and service-role subscription policy
-- * clinic_bank_details admin-only policies
-- * payroll_drafts manage_staff policies
-- * platform-admin policies (their existing predicates remain intact)

commit;
