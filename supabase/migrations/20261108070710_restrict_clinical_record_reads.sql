-- Limit reads of patient clinical records to clinicians and staff explicitly
-- granted patient-history access. Staff can still read their own attendance.

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
        THEN permission_key IN ('edit_emr', 'edit_patient', 'view_patient_history')
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

ALTER POLICY sessions_clinic_select ON public.sessions
  USING (
    clinic_id = public.get_my_clinic_id()
    AND (
      public.has_staff_permission('view_patient_history')
      OR public.has_staff_permission('edit_emr')
    )
  );

DO $migration$
DECLARE
  tbl text;
  clinical_tables text[] := ARRAY[
    'assessments','balance_tests','gait_tests','mmt_assessments',
    'patient_evaluations','patient_nutrition','patient_programs','patient_risks',
    'progress_tracking','rom_assessments','soap_notes','special_tests','treatment_plans'
  ];
BEGIN
  FOREACH tbl IN ARRAY clinical_tables LOOP
    EXECUTE pg_catalog.format(
      'ALTER POLICY %I ON public.%I USING (clinic_id = public.get_my_clinic_id() AND (public.has_staff_permission(''view_patient_history'') OR public.has_staff_permission(''edit_emr'')))',
      tbl || '_clinic_select', tbl
    );
  END LOOP;
END
$migration$;

ALTER POLICY hr_attendance_clinic_select ON public.hr_attendance
  USING (
    clinic_id = public.get_my_clinic_id()
    AND (
      staff_id = (SELECT s.id FROM public.staff s WHERE s.email = ((SELECT auth.jwt()) ->> 'email') AND s.status <> 'محذوف' LIMIT 1)
      OR public.has_staff_permission('manage_staff')
    )
  );
