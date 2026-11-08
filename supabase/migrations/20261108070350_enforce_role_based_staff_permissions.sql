-- Role-aware authorization for clinic staff.
-- The session-expiry restrictive policies remain in place; these policies narrow
-- the existing clinic-scoped access to explicit staff permissions.

CREATE OR REPLACE FUNCTION public.has_staff_permission(permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT COALESCE((
    SELECT CASE
      WHEN s.role IN ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياره', 'مدير العياده', 'مدير النظام')
        THEN true
      WHEN s.permissions IS NOT NULL
        AND pg_catalog.btrim(s.permissions) <> ''
        AND pg_catalog.left(pg_catalog.btrim(s.permissions), 1) = '['
        THEN COALESCE((s.permissions::jsonb ? permission_key), false)
      WHEN s.role IN ('doctor', 'استشاري علاج طبيعي', 'أخصائي علاج طبيعي', 'ممارس علاج طبيعي')
        THEN permission_key IN ('edit_emr', 'edit_patient')
      WHEN s.role IN ('receptionist', 'موظف استقبال', 'موظفة استقبال رئيسية')
        THEN permission_key IN ('create_invoice', 'edit_patient')
      ELSE false
    END
    FROM public.staff AS s
    WHERE s.email = ((SELECT auth.jwt()) ->> 'email')
      AND s.status <> 'محذوف'
    LIMIT 1
  ), false);
$function$;

REVOKE ALL ON FUNCTION public.has_staff_permission(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_staff_permission(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_staff_permission(text) TO authenticated;

DROP POLICY IF EXISTS clinic_access ON public.patients;
CREATE POLICY patients_clinic_select ON public.patients
  FOR SELECT TO authenticated USING (clinic_id = public.get_my_clinic_id());
CREATE POLICY patients_clinic_insert ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_patient'));
CREATE POLICY patients_clinic_update ON public.patients
  FOR UPDATE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_patient'))
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_patient'));
CREATE POLICY patients_clinic_delete ON public.patients
  FOR DELETE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('delete_patient'));

DROP POLICY IF EXISTS clinic_access ON public.appointments;
CREATE POLICY appointments_clinic_select ON public.appointments
  FOR SELECT TO authenticated USING (clinic_id = public.get_my_clinic_id());
CREATE POLICY appointments_clinic_insert ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_appointments'));
CREATE POLICY appointments_clinic_update ON public.appointments
  FOR UPDATE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_appointments'))
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_appointments'));
CREATE POLICY appointments_clinic_delete ON public.appointments
  FOR DELETE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_appointments'));

DROP POLICY IF EXISTS invoices_tenant_access ON public.invoices;
CREATE POLICY invoices_clinic_select ON public.invoices
  FOR SELECT TO authenticated USING (clinic_id = public.get_my_clinic_id());
CREATE POLICY invoices_clinic_insert ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('create_invoice'));
CREATE POLICY invoices_clinic_update ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    clinic_id = public.get_my_clinic_id()
    AND (
      public.has_staff_permission('create_invoice')
      OR public.has_staff_permission('apply_discount')
      OR public.has_staff_permission('refund_invoice')
      OR public.has_staff_permission('delete_invoice')
    )
  )
  WITH CHECK (
    clinic_id = public.get_my_clinic_id()
    AND (
      public.has_staff_permission('create_invoice')
      OR public.has_staff_permission('apply_discount')
      OR public.has_staff_permission('refund_invoice')
      OR public.has_staff_permission('delete_invoice')
    )
  );
CREATE POLICY invoices_clinic_delete ON public.invoices
  FOR DELETE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('delete_invoice'));

DROP POLICY IF EXISTS sessions_tenant_access ON public.sessions;
CREATE POLICY sessions_clinic_select ON public.sessions
  FOR SELECT TO authenticated USING (clinic_id = public.get_my_clinic_id());
CREATE POLICY sessions_clinic_insert ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_emr'));
CREATE POLICY sessions_clinic_update ON public.sessions
  FOR UPDATE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_emr'))
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_emr'));
CREATE POLICY sessions_clinic_delete ON public.sessions
  FOR DELETE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('delete_emr'));

DO $migration$
DECLARE
  tbl text;
  pol text;
  clinical_tables text[] := ARRAY[
    'assessments','balance_tests','gait_tests','mmt_assessments',
    'patient_evaluations','patient_nutrition','patient_programs','patient_risks',
    'progress_tracking','rom_assessments','soap_notes','special_tests','treatment_plans'
  ];
BEGIN
  FOREACH tbl IN ARRAY clinical_tables LOOP
    FOR pol IN
      SELECT policyname
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND permissive = 'PERMISSIVE'
        AND roles @> ARRAY['authenticated']::name[]
        AND policyname NOT LIKE 'platform_admin%'
        AND policyname NOT LIKE 'service_role%'
    LOOP
      EXECUTE pg_catalog.format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
    END LOOP;

    EXECUTE pg_catalog.format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (clinic_id = public.get_my_clinic_id())',
      tbl || '_clinic_select', tbl
    );
    EXECUTE pg_catalog.format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission(''edit_emr''))',
      tbl || '_clinical_insert', tbl
    );
    EXECUTE pg_catalog.format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission(''edit_emr'')) WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission(''edit_emr''))',
      tbl || '_clinical_update', tbl
    );
    EXECUTE pg_catalog.format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission(''delete_emr''))',
      tbl || '_clinical_delete', tbl
    );
  END LOOP;
END
$migration$;

DO $migration$
DECLARE
  pol text;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exercises'
      AND permissive = 'PERMISSIVE'
      AND roles @> ARRAY['authenticated']::name[]
  LOOP
    EXECUTE pg_catalog.format('DROP POLICY IF EXISTS %I ON public.exercises', pol);
  END LOOP;
END
$migration$;
CREATE POLICY exercises_clinic_select ON public.exercises
  FOR SELECT TO authenticated
  USING (clinic_id = public.get_my_clinic_id() OR public.is_platform_admin());
CREATE POLICY exercises_clinic_insert ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK ((clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_emr')) OR public.is_platform_admin());
CREATE POLICY exercises_clinic_update ON public.exercises
  FOR UPDATE TO authenticated
  USING ((clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_emr')) OR public.is_platform_admin())
  WITH CHECK ((clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_emr')) OR public.is_platform_admin());
CREATE POLICY exercises_clinic_delete ON public.exercises
  FOR DELETE TO authenticated
  USING ((clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_emr')) OR public.is_platform_admin());

DROP POLICY IF EXISTS "Users can delete clinical_protocols for their clinic" ON public.clinical_protocols;
DROP POLICY IF EXISTS "Users can insert clinical_protocols for their clinic" ON public.clinical_protocols;
DROP POLICY IF EXISTS "Users can update clinical_protocols for their clinic" ON public.clinical_protocols;
CREATE POLICY clinical_protocols_clinic_insert ON public.clinical_protocols
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'));
CREATE POLICY clinical_protocols_clinic_update ON public.clinical_protocols
  FOR UPDATE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'))
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'));
CREATE POLICY clinical_protocols_clinic_delete ON public.clinical_protocols
  FOR DELETE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'));

DROP POLICY IF EXISTS clinic_access_branches ON public.branches;
DROP POLICY IF EXISTS branches_self_read ON public.branches;
CREATE POLICY branches_clinic_select ON public.branches
  FOR SELECT TO authenticated USING (clinic_id = public.get_my_clinic_id());
CREATE POLICY branches_clinic_insert ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'));
CREATE POLICY branches_clinic_update ON public.branches
  FOR UPDATE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'))
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'));
CREATE POLICY branches_clinic_delete ON public.branches
  FOR DELETE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'));

DROP POLICY IF EXISTS "Allow clinic staff to insert hr_attendance" ON public.hr_attendance;
DROP POLICY IF EXISTS "Allow clinic staff to update hr_attendance" ON public.hr_attendance;
DROP POLICY IF EXISTS "Allow clinic staff to view their hr_attendance" ON public.hr_attendance;
CREATE POLICY hr_attendance_clinic_select ON public.hr_attendance
  FOR SELECT TO authenticated USING (clinic_id = public.get_my_clinic_id());
CREATE POLICY hr_attendance_clinic_insert ON public.hr_attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    clinic_id = public.get_my_clinic_id()
    AND (
      staff_id = (SELECT s.id FROM public.staff s WHERE s.email = ((SELECT auth.jwt()) ->> 'email') AND s.status <> 'محذوف' LIMIT 1)
      OR public.has_staff_permission('manage_staff')
    )
  );
CREATE POLICY hr_attendance_clinic_update ON public.hr_attendance
  FOR UPDATE TO authenticated
  USING (
    clinic_id = public.get_my_clinic_id()
    AND (
      staff_id = (SELECT s.id FROM public.staff s WHERE s.email = ((SELECT auth.jwt()) ->> 'email') AND s.status <> 'محذوف' LIMIT 1)
      OR public.has_staff_permission('manage_staff')
    )
  )
  WITH CHECK (
    clinic_id = public.get_my_clinic_id()
    AND (
      staff_id = (SELECT s.id FROM public.staff s WHERE s.email = ((SELECT auth.jwt()) ->> 'email') AND s.status <> 'محذوف' LIMIT 1)
      OR public.has_staff_permission('manage_staff')
    )
  );
CREATE POLICY hr_attendance_clinic_delete ON public.hr_attendance
  FOR DELETE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_staff'));

DROP POLICY IF EXISTS "Allow clinic staff to insert payroll_drafts" ON public.payroll_drafts;
DROP POLICY IF EXISTS "Allow clinic staff to update payroll_drafts" ON public.payroll_drafts;
DROP POLICY IF EXISTS "Allow clinic staff to view their payroll_drafts" ON public.payroll_drafts;
CREATE POLICY payroll_drafts_clinic_select ON public.payroll_drafts
  FOR SELECT TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_staff'));
CREATE POLICY payroll_drafts_clinic_insert ON public.payroll_drafts
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_staff'));
CREATE POLICY payroll_drafts_clinic_update ON public.payroll_drafts
  FOR UPDATE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_staff'))
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_staff'));
CREATE POLICY payroll_drafts_clinic_delete ON public.payroll_drafts
  FOR DELETE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_staff'));
