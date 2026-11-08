CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  current_user_email text;
  clinic uuid;
  old_row jsonb := '{}'::jsonb;
  new_row jsonb := '{}'::jsonb;
  entity_identifier text;
  event_details jsonb;
BEGIN
  BEGIN
    current_user_email := current_setting('request.jwt.claims', true)::json ->> 'email';
  EXCEPTION WHEN OTHERS THEN
    current_user_email := 'system';
  END;
  IF TG_OP <> 'INSERT' THEN old_row := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_row := to_jsonb(NEW); END IF;
  clinic := COALESCE(NULLIF(new_row ->> 'clinic_id', '')::uuid, NULLIF(old_row ->> 'clinic_id', '')::uuid);
  entity_identifier := COALESCE(new_row ->> 'id', new_row ->> 'patient_id', new_row ->> 'staff_id', old_row ->> 'id', old_row ->> 'patient_id', old_row ->> 'staff_id');
  event_details := CASE
    WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('message', 'تم تعديل السجل بنجاح')
    WHEN TG_OP = 'DELETE' THEN jsonb_build_object('message', 'تم حذف السجل')
    ELSE jsonb_build_object('message', 'تم إنشاء سجل جديد')
  END;
  -- Narrow audit snapshots: never copy clinical notes, diagnoses, medical history,
  -- attachments, salary values, or patient PII.
  IF TG_TABLE_NAME = 'appointments' THEN
    event_details := event_details || jsonb_build_object(
      'before', CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE jsonb_strip_nulls(jsonb_build_object(
        'status', old_row -> 'status', 'start_time', old_row -> 'start_time', 'end_time', old_row -> 'end_time',
        'doctor_name', old_row -> 'doctor_name', 'therapist_id', old_row -> 'therapist_id',
        'room_id', old_row -> 'room_id', 'branch_id', old_row -> 'branch_id')) END,
      'after', CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE jsonb_strip_nulls(jsonb_build_object(
        'status', new_row -> 'status', 'start_time', new_row -> 'start_time', 'end_time', new_row -> 'end_time',
        'doctor_name', new_row -> 'doctor_name', 'therapist_id', new_row -> 'therapist_id',
        'room_id', new_row -> 'room_id', 'branch_id', new_row -> 'branch_id')) END
    );
  ELSIF TG_TABLE_NAME = 'invoices' THEN
    event_details := event_details || jsonb_build_object(
      'before', CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE jsonb_strip_nulls(jsonb_build_object(
        'status', old_row -> 'status', 'payment_method', old_row -> 'payment_method', 'date', old_row -> 'date')) END,
      'after', CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE jsonb_strip_nulls(jsonb_build_object(
        'status', new_row -> 'status', 'payment_method', new_row -> 'payment_method', 'date', new_row -> 'date')) END
    );
  END IF;
  INSERT INTO public.audit_logs (user_email, user_name, action, module, entity, entity_id, details, clinic_id)
  VALUES (COALESCE(current_user_email, 'system@primephysio.com'), 'موظف العيادة', TG_OP, TG_TABLE_NAME,
          TG_TABLE_NAME, entity_identifier, event_details, clinic);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS audit_staff_trigger ON public.staff;
CREATE TRIGGER audit_staff_trigger AFTER INSERT OR UPDATE OR DELETE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
DROP TRIGGER IF EXISTS audit_payroll_drafts_trigger ON public.payroll_drafts;
CREATE TRIGGER audit_payroll_drafts_trigger AFTER INSERT OR UPDATE OR DELETE ON public.payroll_drafts FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
DROP TRIGGER IF EXISTS audit_hr_attendance_trigger ON public.hr_attendance;
CREATE TRIGGER audit_hr_attendance_trigger AFTER INSERT OR UPDATE OR DELETE ON public.hr_attendance FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
DROP TRIGGER IF EXISTS audit_treatment_plans_trigger ON public.treatment_plans;
CREATE TRIGGER audit_treatment_plans_trigger AFTER INSERT OR UPDATE OR DELETE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
DROP TRIGGER IF EXISTS audit_patient_medical_records_trigger ON public.patient_medical_records;
CREATE TRIGGER audit_patient_medical_records_trigger AFTER INSERT OR UPDATE OR DELETE ON public.patient_medical_records FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
DROP TRIGGER IF EXISTS audit_patient_attachments_trigger ON public.patient_attachments;
CREATE TRIGGER audit_patient_attachments_trigger AFTER INSERT OR UPDATE OR DELETE ON public.patient_attachments FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();