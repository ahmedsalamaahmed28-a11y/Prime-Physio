ALTER TABLE public.appointments
  ADD COLUMN treatment_plan_id uuid,
  ADD COLUMN session_intervention text,
  ADD COLUMN session_objectives text,
  ADD COLUMN target_exercises jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_treatment_plan_id_fkey
  FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id) ON DELETE RESTRICT,
  ADD CONSTRAINT appointments_target_exercises_array_check
  CHECK (jsonb_typeof(target_exercises) = 'array');

ALTER TABLE public.sessions
  ADD COLUMN intervention text,
  ADD COLUMN target_exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN completed_exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN pain_before integer,
  ADD COLUMN pain_after integer,
  ADD COLUMN rom_status text,
  ADD COLUMN strength_status text,
  ADD COLUMN recovery_score integer,
  ADD CONSTRAINT sessions_target_exercises_array_check CHECK (jsonb_typeof(target_exercises) = 'array'),
  ADD CONSTRAINT sessions_completed_exercises_array_check CHECK (jsonb_typeof(completed_exercises) = 'array'),
  ADD CONSTRAINT sessions_pain_before_range_check CHECK (pain_before IS NULL OR pain_before BETWEEN 0 AND 10),
  ADD CONSTRAINT sessions_pain_after_range_check CHECK (pain_after IS NULL OR pain_after BETWEEN 0 AND 10),
  ADD CONSTRAINT sessions_recovery_score_range_check CHECK (recovery_score IS NULL OR recovery_score BETWEEN 0 AND 100);

ALTER TABLE public.progress_tracking
  ADD COLUMN appointment_id text,
  ADD COLUMN session_id text,
  ADD COLUMN pain_before integer,
  ADD COLUMN completed_exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT progress_tracking_appointment_id_fkey
    FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE RESTRICT,
  ADD CONSTRAINT progress_tracking_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT progress_tracking_pain_before_range_check
    CHECK (pain_before IS NULL OR pain_before BETWEEN 0 AND 10),
  ADD CONSTRAINT progress_tracking_completed_exercises_array_check
    CHECK (jsonb_typeof(completed_exercises) = 'array');

CREATE UNIQUE INDEX progress_tracking_appointment_id_uidx
  ON public.progress_tracking(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE UNIQUE INDEX progress_tracking_session_id_uidx
  ON public.progress_tracking(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX appointments_treatment_plan_id_idx
  ON public.appointments(treatment_plan_id) WHERE treatment_plan_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_appointment_with_care_plan(
  p_appointment_id text,
  p_patient_id text,
  p_patient_name text,
  p_doctor_name text,
  p_appointment_type text,
  p_status text,
  p_start_time text,
  p_end_time text,
  p_invoice_id text,
  p_invoice_description text,
  p_invoice_amount text,
  p_invoice_status text,
  p_payment_method text,
  p_invoice_date text,
  p_treatment_plan_id uuid,
  p_session_intervention text,
  p_session_objectives text,
  p_target_exercises jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_clinic_id uuid;
  v_result jsonb;
  v_target_exercises jsonb := COALESCE(p_target_exercises, '[]'::jsonb);
BEGIN
  v_clinic_id := public.get_my_clinic_id();
  IF auth.uid() IS NULL OR v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Authentication and clinic membership are required';
  END IF;
  IF jsonb_typeof(v_target_exercises) <> 'array' THEN
    RAISE EXCEPTION 'Target exercises must be a JSON array';
  END IF;
  IF p_treatment_plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.treatment_plans
    WHERE id = p_treatment_plan_id
      AND patient_id = p_patient_id
      AND clinic_id = v_clinic_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Treatment plan is not active or does not belong to this patient and clinic';
  END IF;

  v_result := public.create_appointment_with_invoice(
    p_appointment_id, p_patient_id, p_patient_name, p_doctor_name,
    p_appointment_type, p_status, p_start_time, p_end_time,
    p_invoice_id, p_invoice_description, p_invoice_amount,
    p_invoice_status, p_payment_method, p_invoice_date
  );

  UPDATE public.appointments
  SET treatment_plan_id = p_treatment_plan_id,
      session_intervention = NULLIF(btrim(p_session_intervention), ''),
      session_objectives = NULLIF(btrim(p_session_objectives), ''),
      target_exercises = v_target_exercises
  WHERE id = p_appointment_id AND clinic_id = v_clinic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment could not be linked to its treatment plan';
  END IF;

  RETURN v_result || jsonb_build_object(
    'treatment_plan_id', p_treatment_plan_id,
    'target_exercise_count', jsonb_array_length(v_target_exercises)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_appointment_and_record_progress(
  p_appointment_id text,
  p_pain_before integer,
  p_pain_after integer,
  p_rom_status text,
  p_strength_status text,
  p_recovery_score integer,
  p_completed_exercises jsonb,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_clinic_id uuid;
  v_appointment public.appointments%ROWTYPE;
  v_patient public.patients%ROWTYPE;
  v_session_id text;
  v_used integer;
  v_increment integer;
  v_completed_exercises jsonb := COALESCE(p_completed_exercises, '[]'::jsonb);
BEGIN
  v_clinic_id := public.get_my_clinic_id();
  IF auth.uid() IS NULL OR v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Authentication and clinic membership are required';
  END IF;
  IF p_pain_before IS NULL OR p_pain_before NOT BETWEEN 0 AND 10
     OR p_pain_after IS NULL OR p_pain_after NOT BETWEEN 0 AND 10 THEN
    RAISE EXCEPTION 'Pain scores must be between 0 and 10';
  END IF;
  IF p_recovery_score IS NULL OR p_recovery_score NOT BETWEEN 0 AND 100 THEN
    RAISE EXCEPTION 'Recovery score must be between 0 and 100';
  END IF;
  IF jsonb_typeof(v_completed_exercises) <> 'array' THEN
    RAISE EXCEPTION 'Completed exercises must be a JSON array';
  END IF;

  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id AND clinic_id = v_clinic_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  SELECT id INTO v_session_id
  FROM public.sessions
  WHERE appointment_id = p_appointment_id AND clinic_id = v_clinic_id;

  IF v_session_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.progress_tracking
      WHERE appointment_id = p_appointment_id AND clinic_id = v_clinic_id
    ) THEN
      SELECT COALESCE("sessionsUsed", 0) INTO v_used
      FROM public.patients
      WHERE id = v_appointment.patient_id AND clinic_id = v_clinic_id;
      RETURN jsonb_build_object(
        'already_completed', true,
        'progress_recorded', true,
        'session_id', v_session_id,
        'sessions_used', v_used
      );
    END IF;

    UPDATE public.sessions
    SET intervention = v_appointment.session_intervention,
        target_exercises = COALESCE(v_appointment.target_exercises, '[]'::jsonb),
        completed_exercises = v_completed_exercises,
        pain_before = p_pain_before,
        pain_after = p_pain_after,
        "vasScore" = p_pain_after::text,
        rom_status = NULLIF(btrim(p_rom_status), ''),
        strength_status = NULLIF(btrim(p_strength_status), ''),
        recovery_score = p_recovery_score,
        notes = COALESCE(NULLIF(btrim(p_notes), ''), notes)
    WHERE id = v_session_id AND clinic_id = v_clinic_id;

    INSERT INTO public.progress_tracking (
      clinic_id, patient_id, appointment_id, session_id, pain_before,
      pain_level, rom_status, strength_status, recovery_score,
      completed_exercises, notes
    )
    VALUES (
      v_clinic_id, v_appointment.patient_id, p_appointment_id, v_session_id,
      p_pain_before, p_pain_after, NULLIF(btrim(p_rom_status), ''),
      NULLIF(btrim(p_strength_status), ''), p_recovery_score,
      v_completed_exercises, p_notes
    );

    SELECT COALESCE("sessionsUsed", 0) INTO v_used
    FROM public.patients
    WHERE id = v_appointment.patient_id AND clinic_id = v_clinic_id;

    RETURN jsonb_build_object(
      'already_completed', true,
      'progress_recorded', true,
      'session_id', v_session_id,
      'sessions_used', v_used
    );
  END IF;

  IF v_appointment.status IN ('منتهي', 'Completed') THEN
    RAISE EXCEPTION 'Appointment is already completed without a linked session; reconcile before retrying';
  END IF;

  SELECT * INTO v_patient
  FROM public.patients
  WHERE id = v_appointment.patient_id AND clinic_id = v_clinic_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found in the active clinic';
  END IF;

  v_used := COALESCE(v_patient."sessionsUsed", 0);
  v_increment := CASE WHEN COALESCE(v_patient."sessionsTotal", 0) > 0 THEN 1 ELSE 0 END;
  IF v_increment = 1 AND v_used >= v_patient."sessionsTotal" THEN
    RAISE EXCEPTION 'No remaining sessions in the active package';
  END IF;

  v_session_id := gen_random_uuid()::text;
  INSERT INTO public.sessions (
    id, clinic_id, patient_id, appointment_id, date, diagnosis,
    "vasScore", notes, therapist, intervention, target_exercises,
    completed_exercises, pain_before, pain_after, rom_status,
    strength_status, recovery_score
  )
  VALUES (
    v_session_id, v_clinic_id, v_patient.id, p_appointment_id,
    CURRENT_DATE::text, v_appointment.appointment_type, p_pain_after::text,
    p_notes, v_appointment.doctor_name, v_appointment.session_intervention,
    COALESCE(v_appointment.target_exercises, '[]'::jsonb),
    v_completed_exercises, p_pain_before, p_pain_after,
    NULLIF(btrim(p_rom_status), ''), NULLIF(btrim(p_strength_status), ''),
    p_recovery_score
  );

  UPDATE public.patients
  SET "sessionsUsed" = v_used + v_increment, status = 'نشط'
  WHERE id = v_patient.id AND clinic_id = v_clinic_id;

  UPDATE public.appointments
  SET status = 'منتهي', updated_at = now()
  WHERE id = p_appointment_id AND clinic_id = v_clinic_id;

  INSERT INTO public.progress_tracking (
    clinic_id, patient_id, appointment_id, session_id, pain_before,
    pain_level, rom_status, strength_status, recovery_score,
    completed_exercises, notes
  )
  VALUES (
    v_clinic_id, v_patient.id, p_appointment_id, v_session_id, p_pain_before,
    p_pain_after, NULLIF(btrim(p_rom_status), ''),
    NULLIF(btrim(p_strength_status), ''), p_recovery_score,
    v_completed_exercises, p_notes
  );

  RETURN jsonb_build_object(
    'already_completed', false,
    'progress_recorded', true,
    'session_id', v_session_id,
    'sessions_used', v_used + v_increment,
    'sessions_remaining', GREATEST(COALESCE(v_patient."sessionsTotal", 0) - (v_used + v_increment), 0)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_appointment_with_care_plan(text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_appointment_with_care_plan(text,text,text,text,text,text,text,text,text,text,text,text,text,text,uuid,text,text,jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.complete_appointment_and_record_progress(text,integer,integer,text,text,integer,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_appointment_and_record_progress(text,integer,integer,text,text,integer,jsonb,text) TO authenticated;
