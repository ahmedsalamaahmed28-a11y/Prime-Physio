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
where (
    (
      p.schemaname = 'public'
      and p.tablename in (
        'patients', 'appointments', 'discharges', 'invoices',
        'insurance_claims', 'recovery_logs', 'daily_reports',
        'executive_reports', 'assessments', 'balance_tests',
        'gait_tests', 'mmt_assessments', 'patient_attachments',
        'patient_evaluations', 'patient_medical_records', 'patient_nutrition',
        'patient_programs', 'patient_risks', 'progress_tracking',
        'rom_assessments', 'sessions', 'soap_notes', 'special_tests',
        'treatment_plans', 'subscriptions', 'payroll_drafts',
        'clinic_bank_details', 'peer_reviews', 'waitlist',
        'chat_conversations', 'chat_messages'
      )
    )
    or (
      p.schemaname = 'storage'
      and p.tablename = 'objects'
      and p.policyname = 'patient_files_clinic_read'
    )
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

    return (v_permission_json ? permission_key) or (v_permission_json ? '*');
  end if;

  -- Role defaults apply only when there is no explicit override.
  if v_role in ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده', 'مدير العياره', 'مدير النظام') then
    return true;
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
  and (
    public.has_staff_permission('view_patient_history')
    or public.has_staff_permission('edit_emr')
  )
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

-- Private patient-file storage must enforce the same independent patient/history scope.
drop policy if exists patient_files_clinic_read on storage.objects;
create policy patient_files_clinic_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'patient-files'
  and (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
  and public.has_staff_permission('view_patients')
  and (
    public.has_staff_permission('view_patient_history')
    or public.has_staff_permission('edit_emr')
  )
);

-- Patient-linked clinical tables: clinical-history visibility also requires patient visibility.
-- This prevents a user with history-only access from enumerating patient IDs/records through the Data API.

drop policy if exists assessments_clinic_select on public.assessments;
create policy assessments_clinic_select on public.assessments
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists balance_tests_clinic_select on public.balance_tests;
create policy balance_tests_clinic_select on public.balance_tests
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists gait_tests_clinic_select on public.gait_tests;
create policy gait_tests_clinic_select on public.gait_tests
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists mmt_assessments_clinic_select on public.mmt_assessments;
create policy mmt_assessments_clinic_select on public.mmt_assessments
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists patient_attachments_clinic_select on public.patient_attachments;
create policy patient_attachments_clinic_select on public.patient_attachments
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists patient_evaluations_clinic_select on public.patient_evaluations;
create policy patient_evaluations_clinic_select on public.patient_evaluations
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists patient_medical_records_select on public.patient_medical_records;
create policy patient_medical_records_select on public.patient_medical_records
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists patient_nutrition_clinic_select on public.patient_nutrition;
create policy patient_nutrition_clinic_select on public.patient_nutrition
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists patient_programs_clinic_select on public.patient_programs;
create policy patient_programs_clinic_select on public.patient_programs
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists patient_risks_clinic_select on public.patient_risks;
create policy patient_risks_clinic_select on public.patient_risks
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists progress_tracking_clinic_select on public.progress_tracking;
create policy progress_tracking_clinic_select on public.progress_tracking
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists rom_assessments_clinic_select on public.rom_assessments;
create policy rom_assessments_clinic_select on public.rom_assessments
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists sessions_clinic_select on public.sessions;
create policy sessions_clinic_select on public.sessions
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists soap_notes_clinic_select on public.soap_notes;
create policy soap_notes_clinic_select on public.soap_notes
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists special_tests_clinic_select on public.special_tests;
create policy special_tests_clinic_select on public.special_tests
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

drop policy if exists treatment_plans_clinic_select on public.treatment_plans;
create policy treatment_plans_clinic_select on public.treatment_plans
for select to authenticated
using (clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (public.has_staff_permission('view_patient_history')
       or public.has_staff_permission('edit_emr')));

-- Recovery logs are patient-linked clinical/financial records and require both scopes.
drop policy if exists "Allow clinic staff to view their recovery_logs" on public.recovery_logs;
create policy "Allow clinic staff to view their recovery_logs"
on public.recovery_logs
for select
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (
    public.has_staff_permission('view_patient_history')
    or public.has_staff_permission('edit_emr')
  )
);

-- Patient-linked quality reviews and waitlist records.
drop policy if exists "Users can view peer_reviews for their clinic" on public.peer_reviews;
create policy "Users can view peer_reviews for their clinic"
on public.peer_reviews
for select
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
  and (
    public.has_staff_permission('view_patient_history')
    or public.has_staff_permission('edit_emr')
  )
);

drop policy if exists "Users can insert peer_reviews for their clinic" on public.peer_reviews;
create policy "Users can insert peer_reviews for their clinic"
on public.peer_reviews
for insert
to authenticated
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('edit_emr')
);

drop policy if exists "Users can update peer_reviews for their clinic" on public.peer_reviews;
create policy "Users can update peer_reviews for their clinic"
on public.peer_reviews
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

drop policy if exists "Allow clinic staff to view their waitlist" on public.waitlist;
create policy "Allow clinic staff to view their waitlist"
on public.waitlist
for select
to authenticated
using (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('view_patients')
);

drop policy if exists "Allow clinic staff to insert waitlist" on public.waitlist;
create policy "Allow clinic staff to insert waitlist"
on public.waitlist
for insert
to authenticated
with check (
  auth.uid() is not null
  and clinic_id = public.get_my_clinic_id()
  and public.has_staff_permission('edit_patient')
);

drop policy if exists "Allow clinic staff to update waitlist" on public.waitlist;
create policy "Allow clinic staff to update waitlist"
on public.waitlist
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

-- Patient-linked chat conversations are hidden unless the caller can view patients.
drop policy if exists chat_conversations_participant_read on public.chat_conversations;
create policy chat_conversations_participant_read
on public.chat_conversations
for select
to authenticated
using (
  clinic_id = public.get_my_clinic_id()
  and (kind <> 'patient' or public.has_staff_permission('view_patients'))
  and exists (
    select 1
    from public.chat_participants p
    where p.conversation_id = chat_conversations.id
      and p.clinic_id = chat_conversations.clinic_id
      and p.email = pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists chat_messages_participant_read on public.chat_messages;
create policy chat_messages_participant_read
on public.chat_messages
for select
to authenticated
using (
  clinic_id = public.get_my_clinic_id()
  and exists (
    select 1
    from public.chat_participants p
    where p.conversation_id = chat_messages.conversation_id
      and p.clinic_id = chat_messages.clinic_id
      and p.email = pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  and exists (
    select 1
    from public.chat_conversations c
    where c.id = chat_messages.conversation_id
      and c.clinic_id = chat_messages.clinic_id
      and coalesce(c.kind, 'team') <> 'patient'
        or (
          c.id = chat_messages.conversation_id
          and c.clinic_id = chat_messages.clinic_id
          and c.kind = 'patient'
          and public.has_staff_permission('view_patients')
        )
  )
);

-- Intentionally unchanged:
-- * auth_session_expiry_guard restrictive policies
-- * patient clinical write policies remain mapped to edit_emr/delete_emr; SELECT policies above require view_patients
-- * subscriptions_self_read and service-role subscription policy
-- * clinic_bank_details admin-only policies
-- * payroll_drafts manage_staff policies
-- * platform-admin policies (their existing predicates remain intact)

commit;
