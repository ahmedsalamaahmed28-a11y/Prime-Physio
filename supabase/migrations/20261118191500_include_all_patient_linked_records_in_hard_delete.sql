CREATE OR REPLACE FUNCTION public.hard_delete_patient_with_records(
  p_clinic_id uuid,
  p_patient_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_deleted_patient_id text;
BEGIN
  IF p_clinic_id IS NULL OR p_patient_id IS NULL OR btrim(p_patient_id) = '' THEN
    RAISE EXCEPTION 'Clinic and patient identifiers are required';
  END IF;

  SELECT id INTO v_deleted_patient_id
  FROM public.patients
  WHERE id = p_patient_id AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF v_deleted_patient_id IS NULL THEN
    RAISE EXCEPTION 'Patient not found in the selected clinic';
  END IF;

  PERFORM set_config('app.allow_patient_hard_delete', 'on', true);

  DELETE FROM public.appointment_group_participants
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.progress_tracking
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.sessions
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.appointments
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.invoices
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;

  DELETE FROM public.patient_evaluations
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.patient_programs
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.peer_reviews
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.discharges
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.treatment_plans
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.assessments
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;

  -- Additional clinical and operational records that use patient_id
  -- but do not declare a foreign key to patients.
  DELETE FROM public.balance_tests WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.gait_tests WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.insurance_claims WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.mmt_assessments WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.patient_nutrition WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.patient_risks WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.recovery_logs WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.rom_assessments WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.soap_notes WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.special_tests WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;
  DELETE FROM public.waitlist WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;

  DELETE FROM public.group_booking_requests
  WHERE clinic_id = p_clinic_id AND patient_id = p_patient_id;

  DELETE FROM public.patients
  WHERE id = p_patient_id AND clinic_id = p_clinic_id;

  RETURN jsonb_build_object('success', true, 'patient_id', p_patient_id);
END;
$$;

REVOKE ALL ON FUNCTION public.hard_delete_patient_with_records(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hard_delete_patient_with_records(uuid, text) TO service_role;
