-- Protect patient-linked clinical history and provide atomic clinical workflows.
-- All preflight checks run before changing constraints; existing clinical rows are preserved.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.treatment_plans tp
    LEFT JOIN public.patients p ON p.id = tp.patient_id AND p.clinic_id = tp.clinic_id
    WHERE p.id IS NULL
  ) THEN RAISE EXCEPTION 'Orphaned/cross-clinic treatment_plans rows exist'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.progress_tracking pt
    LEFT JOIN public.patients p ON p.id = pt.patient_id AND p.clinic_id = pt.clinic_id
    WHERE p.id IS NULL
  ) THEN RAISE EXCEPTION 'Orphaned/cross-clinic progress_tracking rows exist'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.assessments a
    LEFT JOIN public.patients p ON p.id = a.patient_id AND p.clinic_id = a.clinic_id
    WHERE p.id IS NULL
  ) THEN RAISE EXCEPTION 'Orphaned/cross-clinic assessments rows exist'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.discharges d
    LEFT JOIN public.patients p ON p.id = d.patient_id AND p.clinic_id = d.clinic_id
    WHERE p.id IS NULL
  ) THEN RAISE EXCEPTION 'Orphaned/cross-clinic discharges rows exist'; END IF;
END $$;

-- Change all patient-history foreign keys from CASCADE to RESTRICT.
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_patient_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_patient_id_fkey;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;
ALTER TABLE public.patient_evaluations DROP CONSTRAINT IF EXISTS patient_evaluations_patient_id_fkey;
ALTER TABLE public.patient_evaluations ADD CONSTRAINT patient_evaluations_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;
ALTER TABLE public.patient_programs DROP CONSTRAINT IF EXISTS patient_programs_patient_id_fkey;
ALTER TABLE public.patient_programs ADD CONSTRAINT patient_programs_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;
ALTER TABLE public.peer_reviews DROP CONSTRAINT IF EXISTS peer_reviews_patient_id_fkey;
ALTER TABLE public.peer_reviews ADD CONSTRAINT peer_reviews_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'treatment_plans_patient_id_fkey' AND conrelid = 'public.treatment_plans'::regclass) THEN
    ALTER TABLE public.treatment_plans ADD CONSTRAINT treatment_plans_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'progress_tracking_patient_id_fkey' AND conrelid = 'public.progress_tracking'::regclass) THEN
    ALTER TABLE public.progress_tracking ADD CONSTRAINT progress_tracking_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assessments_patient_id_fkey' AND conrelid = 'public.assessments'::regclass) THEN
    ALTER TABLE public.assessments ADD CONSTRAINT assessments_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discharges_patient_id_fkey' AND conrelid = 'public.discharges'::regclass) THEN
    ALTER TABLE public.discharges ADD CONSTRAINT discharges_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Treatment plans must not disappear when their source assessment is removed.
ALTER TABLE public.treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_assessment_id_fkey;
ALTER TABLE public.treatment_plans ADD CONSTRAINT treatment_plans_assessment_id_fkey
  FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE RESTRICT;

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS appointment_id text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_appointment_id_fkey' AND conrelid = 'public.sessions'::regclass) THEN
    ALTER TABLE public.sessions ADD CONSTRAINT sessions_appointment_id_fkey
      FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS sessions_appointment_id_unique
  ON public.sessions(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS patient_programs_active_protocol_unique
  ON public.patient_programs(clinic_id, patient_id)
  WHERE title = '__prime_physio_active_protocol_state__';

-- Clinical records are append/update only for browser sessions; preserve their history.
REVOKE DELETE ON public.sessions, public.patient_evaluations, public.assessments,
  public.treatment_plans, public.progress_tracking, public.discharges FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sessions, public.patient_evaluations, public.assessments,
  public.treatment_plans, public.progress_tracking, public.discharges TO authenticated;

CREATE OR REPLACE FUNCTION public.create_appointment_with_invoice(
  p_appointment_id text, p_patient_id text, p_patient_name text, p_doctor_name text,
  p_appointment_type text, p_status text, p_start_time text, p_end_time text,
  p_invoice_id text, p_invoice_description text, p_invoice_amount text,
  p_invoice_status text, p_payment_method text, p_invoice_date text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE v_clinic_id uuid;
BEGIN
  v_clinic_id := public.get_my_clinic_id();
  IF auth.uid() IS NULL OR v_clinic_id IS NULL THEN RAISE EXCEPTION 'Authentication and clinic membership are required'; END IF;
  IF p_appointment_id IS NULL OR p_invoice_id IS NULL OR p_patient_id IS NULL THEN RAISE EXCEPTION 'Appointment, invoice and patient identifiers are required'; END IF;
  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time::timestamptz <= p_start_time::timestamptz THEN RAISE EXCEPTION 'Appointment end time must be after start time'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id = p_patient_id AND clinic_id = v_clinic_id) THEN RAISE EXCEPTION 'Patient does not belong to the active clinic'; END IF;

  INSERT INTO public.appointments (id, clinic_id, patient_id, patient_name, doctor_name, appointment_type, status, start_time, end_time)
  VALUES (p_appointment_id, v_clinic_id, p_patient_id, p_patient_name, p_doctor_name, p_appointment_type, p_status, p_start_time, p_end_time);
  INSERT INTO public.invoices (id, clinic_id, patient_id, patient_name, description, amount, status, payment_method, date)
  VALUES (p_invoice_id, v_clinic_id, p_patient_id, p_patient_name, p_invoice_description, p_invoice_amount, p_invoice_status, p_payment_method, p_invoice_date);
  RETURN jsonb_build_object('appointment_id', p_appointment_id, 'invoice_id', p_invoice_id, 'created', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_appointment_and_consume_session(
  p_appointment_id text, p_diagnosis text DEFAULT NULL, p_vas_score integer DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE
  v_clinic_id uuid; v_appointment public.appointments%ROWTYPE; v_patient public.patients%ROWTYPE;
  v_session_id text; v_used integer;
BEGIN
  v_clinic_id := public.get_my_clinic_id();
  IF auth.uid() IS NULL OR v_clinic_id IS NULL THEN RAISE EXCEPTION 'Authentication and clinic membership are required'; END IF;
  IF p_vas_score IS NOT NULL AND (p_vas_score < 0 OR p_vas_score > 10) THEN RAISE EXCEPTION 'VAS score must be between 0 and 10'; END IF;

  SELECT * INTO v_appointment FROM public.appointments
  WHERE id = p_appointment_id AND clinic_id = v_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;

  SELECT id INTO v_session_id FROM public.sessions
  WHERE appointment_id = p_appointment_id AND clinic_id = v_clinic_id;
  IF v_session_id IS NOT NULL THEN
    SELECT COALESCE("sessionsUsed", 0) INTO v_used FROM public.patients
    WHERE id = v_appointment.patient_id AND clinic_id = v_clinic_id;
    RETURN jsonb_build_object('already_completed', true, 'session_id', v_session_id, 'sessions_used', v_used);
  END IF;
  IF v_appointment.status IN ('منتهي', 'Completed') THEN
    RAISE EXCEPTION 'Appointment is already completed without a linked session; reconcile before retrying';
  END IF;

  SELECT * INTO v_patient FROM public.patients
  WHERE id = v_appointment.patient_id AND clinic_id = v_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patient not found in the active clinic'; END IF;
  v_used := COALESCE(v_patient."sessionsUsed", 0);
  IF COALESCE(v_patient."sessionsTotal", 0) > 0 AND v_used >= v_patient."sessionsTotal" THEN RAISE EXCEPTION 'No remaining sessions in the active package'; END IF;

  v_session_id := gen_random_uuid()::text;
  INSERT INTO public.sessions (id, clinic_id, patient_id, appointment_id, date, diagnosis, "vasScore", notes, therapist)
  VALUES (v_session_id, v_clinic_id, v_patient.id, p_appointment_id, CURRENT_DATE::text,
    COALESCE(p_diagnosis, v_appointment.appointment_type), p_vas_score::text, p_notes, v_appointment.doctor_name);
  UPDATE public.patients SET "sessionsUsed" = v_used + 1, status = 'نشط'
  WHERE id = v_patient.id AND clinic_id = v_clinic_id;
  UPDATE public.appointments SET status = 'منتهي', updated_at = now()
  WHERE id = p_appointment_id AND clinic_id = v_clinic_id;
  RETURN jsonb_build_object('already_completed', false, 'session_id', v_session_id,
    'sessions_used', v_used + 1, 'sessions_remaining', GREATEST(COALESCE(v_patient."sessionsTotal", 0) - (v_used + 1), 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_patient_session(p_patient_id text, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE v_clinic_id uuid; v_patient public.patients%ROWTYPE; v_used integer; v_session_id text;
BEGIN
  v_clinic_id := public.get_my_clinic_id();
  IF auth.uid() IS NULL OR v_clinic_id IS NULL THEN RAISE EXCEPTION 'Authentication and clinic membership are required'; END IF;
  SELECT * INTO v_patient FROM public.patients WHERE id = p_patient_id AND clinic_id = v_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patient not found in the active clinic'; END IF;
  v_used := COALESCE(v_patient."sessionsUsed", 0);
  IF COALESCE(v_patient."sessionsTotal", 0) <= v_used THEN RAISE EXCEPTION 'No remaining sessions in the active package'; END IF;
  v_session_id := gen_random_uuid()::text;
  INSERT INTO public.sessions (id, clinic_id, patient_id, date, diagnosis, notes)
  VALUES (v_session_id, v_clinic_id, v_patient.id, CURRENT_DATE::text, 'جلسة مستهلكة من الباقة', p_notes);
  UPDATE public.patients SET "sessionsUsed" = v_used + 1, status = 'نشط'
  WHERE id = v_patient.id AND clinic_id = v_clinic_id;
  RETURN jsonb_build_object('session_id', v_session_id, 'sessions_used', v_used + 1,
    'sessions_remaining', GREATEST(COALESCE(v_patient."sessionsTotal", 0) - (v_used + 1), 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_patient_care_plan(
  p_patient_id text, p_evaluation_type text, p_vas_score integer, p_symptoms text,
  p_rom_data jsonb, p_mmt_data jsonb, p_special_tests jsonb, p_potential_diagnoses text,
  p_red_flags text, p_clinical_summary text, p_goals text, p_session_plan text,
  p_frequency text, p_duration text, p_home_program text, p_program_title text, p_exercises jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE v_clinic_id uuid; v_assessment_id uuid; v_evaluation_id uuid; v_plan_id uuid; v_program_id uuid;
BEGIN
  v_clinic_id := public.get_my_clinic_id();
  IF auth.uid() IS NULL OR v_clinic_id IS NULL THEN RAISE EXCEPTION 'Authentication and clinic membership are required'; END IF;
  IF p_vas_score IS NOT NULL AND (p_vas_score < 0 OR p_vas_score > 10) THEN RAISE EXCEPTION 'VAS score must be between 0 and 10'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id = p_patient_id AND clinic_id = v_clinic_id) THEN RAISE EXCEPTION 'Patient not found in the active clinic'; END IF;
  IF NULLIF(trim(p_goals), '') IS NULL OR NULLIF(trim(p_session_plan), '') IS NULL THEN RAISE EXCEPTION 'Treatment goals and session plan are required'; END IF;

  INSERT INTO public.assessments (clinic_id, patient_id, symptoms, rom, strength, special_tests, potential_diagnoses, red_flags, clinical_summary)
  VALUES (v_clinic_id, p_patient_id, p_symptoms, COALESCE(p_rom_data, '{}'::jsonb)::text,
    COALESCE(p_mmt_data, '{}'::jsonb)::text, COALESCE(p_special_tests, '[]'::jsonb)::text,
    p_potential_diagnoses, p_red_flags, p_clinical_summary)
  RETURNING id INTO v_assessment_id;

  INSERT INTO public.patient_evaluations (patient_id, clinic_id, evaluation_type, vas_score, rom_data, mmt_data, special_tests, notes)
  VALUES (p_patient_id, v_clinic_id, COALESCE(NULLIF(trim(p_evaluation_type), ''), 'Initial'),
    p_vas_score, COALESCE(p_rom_data, '{}'::jsonb), COALESCE(p_mmt_data, '{}'::jsonb),
    COALESCE(p_special_tests, '[]'::jsonb), p_clinical_summary)
  RETURNING id INTO v_evaluation_id;

  INSERT INTO public.treatment_plans (clinic_id, patient_id, assessment_id, goals, session_plan, frequency, duration, home_program, status)
  VALUES (v_clinic_id, p_patient_id, v_assessment_id, p_goals, p_session_plan, p_frequency, p_duration, p_home_program, 'active')
  RETURNING id INTO v_plan_id;

  INSERT INTO public.patient_programs (clinic_id, patient_id, title, exercises)
  VALUES (v_clinic_id, p_patient_id, COALESCE(NULLIF(trim(p_program_title), ''), 'Home Exercise Program'), COALESCE(p_exercises, '[]'::jsonb))
  RETURNING id INTO v_program_id;

  RETURN jsonb_build_object('assessment_id', v_assessment_id, 'evaluation_id', v_evaluation_id,
    'treatment_plan_id', v_plan_id, 'program_id', v_program_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_patient_progress(
  p_patient_id text, p_pain_level integer, p_rom_status text, p_strength_status text, p_recovery_score integer, p_notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE v_clinic_id uuid; v_progress_id uuid;
BEGIN
  v_clinic_id := public.get_my_clinic_id();
  IF auth.uid() IS NULL OR v_clinic_id IS NULL THEN RAISE EXCEPTION 'Authentication and clinic membership are required'; END IF;
  IF p_pain_level IS NOT NULL AND (p_pain_level < 0 OR p_pain_level > 10) THEN RAISE EXCEPTION 'Pain level must be between 0 and 10'; END IF;
  IF p_recovery_score IS NOT NULL AND (p_recovery_score < 0 OR p_recovery_score > 100) THEN RAISE EXCEPTION 'Recovery score must be between 0 and 100'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.patients WHERE id = p_patient_id AND clinic_id = v_clinic_id) THEN RAISE EXCEPTION 'Patient not found in the active clinic'; END IF;
  INSERT INTO public.progress_tracking (clinic_id, patient_id, pain_level, rom_status, strength_status, recovery_score, notes)
  VALUES (v_clinic_id, p_patient_id, p_pain_level, p_rom_status, p_strength_status, p_recovery_score, p_notes)
  RETURNING id INTO v_progress_id;
  RETURN v_progress_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_appointment_with_invoice(text,text,text,text,text,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_appointment_and_consume_session(text,text,integer,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_patient_session(text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_patient_care_plan(text,text,integer,text,jsonb,jsonb,jsonb,text,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_patient_progress(text,integer,text,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_appointment_with_invoice(text,text,text,text,text,text,text,text,text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_appointment_and_consume_session(text,text,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_patient_session(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_patient_care_plan(text,text,integer,text,jsonb,jsonb,jsonb,text,text,text,text,text,text,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_patient_progress(text,integer,text,text,integer,text) TO authenticated;
