-- REVIEW DRAFT ONLY — DO NOT RUN unless reverting the approved permissions migration.
-- Restores the previous has_staff_permission(text) definition and every backed-up policy
-- for the tables included in independent-view-permissions-review.sql.
-- Staff permission values were not modified by that migration, so no staff-row restore is needed.

begin;

-- Remove every policy introduced by the forward script first. This is required
-- because policies that did not exist before the migration are absent from the backup.
do $drop_new_policies$
begin
  execute 'drop policy if exists clinic_bank_details_admin_select on public.clinic_bank_details';
  execute 'drop policy if exists clinic_bank_details_admin_insert on public.clinic_bank_details';
  execute 'drop policy if exists clinic_bank_details_admin_update on public.clinic_bank_details';
  execute 'drop policy if exists clinic_bank_details_admin_delete on public.clinic_bank_details';
  execute 'drop policy if exists clinic_settings_admin_write on public.clinic_settings';
  execute 'drop policy if exists clinic_logo_upload_own_center on storage.objects';
  execute 'drop policy if exists clinic_logo_delete_own_center on storage.objects';
  execute 'drop policy if exists staff_clinic_write on public.staff';
  execute 'drop policy if exists patients_clinic_select on public.patients';
  execute 'drop policy if exists appointments_clinic_select on public.appointments';
  execute 'drop policy if exists invoices_clinic_select on public.invoices';
  execute 'drop policy if exists "Allow clinic staff to view their discharges" on public.discharges';
  execute 'drop policy if exists "Allow clinic staff to view their insurance_claims" on public.insurance_claims';
  execute 'drop policy if exists "Allow clinic staff to view their daily_reports" on public.daily_reports';
  execute 'drop policy if exists "Allow clinic staff to view their executive_reports" on public.executive_reports';
  execute 'drop policy if exists "Allow clinic staff to insert discharges" on public.discharges';
  execute 'drop policy if exists "Allow clinic staff to update discharges" on public.discharges';
  execute 'drop policy if exists "Allow clinic staff to insert insurance_claims" on public.insurance_claims';
  execute 'drop policy if exists "Allow clinic staff to update insurance_claims" on public.insurance_claims';
  execute 'drop policy if exists "Allow clinic staff to insert recovery_logs" on public.recovery_logs';
  execute 'drop policy if exists "Allow clinic staff to update recovery_logs" on public.recovery_logs';
  execute 'drop policy if exists "Allow clinic staff to insert daily_reports" on public.daily_reports';
  execute 'drop policy if exists "Allow clinic staff to update daily_reports" on public.daily_reports';
  execute 'drop policy if exists "Allow clinic staff to insert executive_reports" on public.executive_reports';
  execute 'drop policy if exists "Allow clinic staff to update executive_reports" on public.executive_reports';
  execute 'drop policy if exists patient_files_clinic_read on storage.objects';
  execute 'drop policy if exists patient_files_clinic_upload on storage.objects';
  execute 'drop policy if exists patient_files_clinic_update on storage.objects';
  execute 'drop policy if exists patient_files_clinic_delete on storage.objects';
  execute 'drop policy if exists assessments_clinic_select on public.assessments';
  execute 'drop policy if exists balance_tests_clinic_select on public.balance_tests';
  execute 'drop policy if exists gait_tests_clinic_select on public.gait_tests';
  execute 'drop policy if exists mmt_assessments_clinic_select on public.mmt_assessments';
  execute 'drop policy if exists patient_attachments_clinic_select on public.patient_attachments';
  execute 'drop policy if exists patient_evaluations_clinic_select on public.patient_evaluations';
  execute 'drop policy if exists patient_medical_records_select on public.patient_medical_records';
  execute 'drop policy if exists patient_nutrition_clinic_select on public.patient_nutrition';
  execute 'drop policy if exists patient_programs_clinic_select on public.patient_programs';
  execute 'drop policy if exists patient_risks_clinic_select on public.patient_risks';
  execute 'drop policy if exists progress_tracking_clinic_select on public.progress_tracking';
  execute 'drop policy if exists rom_assessments_clinic_select on public.rom_assessments';
  execute 'drop policy if exists sessions_clinic_select on public.sessions';
  execute 'drop policy if exists soap_notes_clinic_select on public.soap_notes';
  execute 'drop policy if exists special_tests_clinic_select on public.special_tests';
  execute 'drop policy if exists treatment_plans_clinic_select on public.treatment_plans';
  execute 'drop policy if exists "Allow clinic staff to view their recovery_logs" on public.recovery_logs';
  execute 'drop policy if exists "Users can view peer_reviews for their clinic" on public.peer_reviews';
  execute 'drop policy if exists "Users can insert peer_reviews for their clinic" on public.peer_reviews';
  execute 'drop policy if exists "Users can update peer_reviews for their clinic" on public.peer_reviews';
  execute 'drop policy if exists "Allow clinic staff to view their waitlist" on public.waitlist';
  execute 'drop policy if exists "Allow clinic staff to insert waitlist" on public.waitlist';
  execute 'drop policy if exists "Allow clinic staff to update waitlist" on public.waitlist';
  execute 'drop policy if exists chat_conversations_participant_read on public.chat_conversations';
  execute 'drop policy if exists chat_messages_participant_read on public.chat_messages';
  execute 'drop policy if exists appointments_clinic_insert on public.appointments';
  execute 'drop policy if exists appointments_clinic_update on public.appointments';
  execute 'drop policy if exists appointments_clinic_delete on public.appointments';
end;
$drop_new_policies$;

do $rollback$
declare
  p record;
  v_roles text;
  v_sql text;
  v_function_definition text;
begin
  for p in
    select *
    from private.rls_policies_backup_20261119
    order by tablename, policyname
  loop
    execute pg_catalog.format(
      'drop policy if exists %I on %I.%I',
      p.policyname,
      p.schemaname,
      p.tablename
    );

    select pg_catalog.string_agg(
      case
        when role_name::text = 'public' then 'PUBLIC'
        else pg_catalog.format('%I', role_name::text)
      end,
      ', '
    )
    into v_roles
    from pg_catalog.unnest(p.roles) as roles(role_name);

    if v_roles is null or v_roles = '' then
      v_roles := 'PUBLIC';
    end if;

    v_sql := pg_catalog.format(
      'create policy %I on %I.%I as %s for %s to %s',
      p.policyname,
      p.schemaname,
      p.tablename,
      p.permissive,
      p.cmd,
      v_roles
    );

    if p.qual is not null then
      v_sql := v_sql || pg_catalog.format(' using (%s)', p.qual);
    end if;

    if p.with_check is not null then
      v_sql := v_sql || pg_catalog.format(' with check (%s)', p.with_check);
    end if;

    execute v_sql;
  end loop;

  select definition
    into v_function_definition
  from private.permission_function_backup_20261119
  where function_name = 'public.has_staff_permission(text)';

  if v_function_definition is null then
    raise exception 'Rollback stopped: previous has_staff_permission(text) definition was not found in the backup.';
  end if;

  execute v_function_definition;
end;
$rollback$;

commit;
