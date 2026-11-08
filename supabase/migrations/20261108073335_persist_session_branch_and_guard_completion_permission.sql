ALTER TABLE public.sessions
  ADD COLUMN branch_id uuid NULL,
  ADD CONSTRAINT sessions_branch_clinic_fk
    FOREIGN KEY (branch_id, clinic_id) REFERENCES public.branches (id, clinic_id);
CREATE INDEX sessions_clinic_branch_idx ON public.sessions (clinic_id, branch_id);

-- Replaces the same RPC with branch propagation for newly completed sessions.
CREATE OR REPLACE FUNCTION public.complete_appointment_and_record_progress(
  p_appointment_id text, p_pain_before integer, p_pain_after integer,
  p_rom_status text, p_strength_status text, p_recovery_score integer,
  p_completed_exercises jsonb, p_notes text
)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'pg_catalog', 'public'
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
  IF auth.uid() IS NULL OR v_clinic_id IS NULL THEN RAISE EXCEPTION 'Authentication and clinic membership are required'; END IF;
  IF NOT public.has_staff_permission('edit_emr') THEN RAISE EXCEPTION 'Permission denied: edit_emr is required'; END IF;
  IF p_pain_before IS NULL OR p_pain_before NOT BETWEEN 0 AND 10 OR p_pain_after IS NULL OR p_pain_after NOT BETWEEN 0 AND 10 THEN RAISE EXCEPTION 'Pain scores must be between 0 and 10'; END IF;
  IF p_recovery_score IS NULL OR p_recovery_score NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Recovery score must be between 0 and 100'; END IF;
  IF jsonb_typeof(v_completed_exercises) <> 'array' THEN RAISE EXCEPTION 'Completed exercises must be a JSON array'; END IF;

  SELECT * INTO v_appointment FROM public.appointments WHERE id = p_appointment_id AND clinic_id = v_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;
  SELECT id INTO v_session_id FROM public.sessions WHERE appointment_id = p_appointment_id AND clinic_id = v_clinic_id;

  IF v_session_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.progress_tracking WHERE appointment_id = p_appointment_id AND clinic_id = v_clinic_id) THEN
      SELECT COALESCE("sessionsUsed", 0) INTO v_used FROM public.patients WHERE id = v_appointment.patient_id AND clinic_id = v_clinic_id;
      RETURN jsonb_build_object('already_completed', true, 'progress_recorded', true, 'session_id', v_session_id, 'sessions_used', v_used);
    END IF;
    UPDATE public.sessions SET branch_id = v_appointment.branch_id, intervention = v_appointment.session_intervention,
      session_objectives = v_appointment.session_objectives, target_exercises = COALESCE(v_appointment.target_exercises, '[]'::jsonb),
      completed_exercises = v_completed_exercises, pain_before = p_pain_before, pain_after = p_pain_after,
      "vasScore" = p_pain_after::text, rom_status = NULLIF(btrim(p_rom_status), ''),
      strength_status = NULLIF(btrim(p_strength_status), ''), recovery_score = p_recovery_score,
      notes = COALESCE(NULLIF(btrim(p_notes), ''), notes)
    WHERE id = v_session_id AND clinic_id = v_clinic_id;
    INSERT INTO public.progress_tracking (clinic_id, patient_id, appointment_id, session_id, pain_before, pain_level, rom_status, strength_status, recovery_score, completed_exercises, notes)
    VALUES (v_clinic_id, v_appointment.patient_id, p_appointment_id, v_session_id, p_pain_before, p_pain_after,
      NULLIF(btrim(p_rom_status), ''), NULLIF(btrim(p_strength_status), ''), p_recovery_score, v_completed_exercises, p_notes);
    SELECT COALESCE("sessionsUsed", 0) INTO v_used FROM public.patients WHERE id = v_appointment.patient_id AND clinic_id = v_clinic_id;
    RETURN jsonb_build_object('already_completed', true, 'progress_recorded', true, 'session_id', v_session_id, 'sessions_used', v_used);
  END IF;

  IF v_appointment.status IN ('منتهي', 'Completed') THEN RAISE EXCEPTION 'Appointment is already completed without a linked session; reconcile before retrying'; END IF;
  SELECT * INTO v_patient FROM public.patients WHERE id = v_appointment.patient_id AND clinic_id = v_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patient not found in the active clinic'; END IF;
  v_used := COALESCE(v_patient."sessionsUsed", 0);
  v_increment := CASE WHEN COALESCE(v_patient."sessionsTotal", 0) > 0 THEN 1 ELSE 0 END;
  IF v_increment = 1 AND v_used >= v_patient."sessionsTotal" THEN RAISE EXCEPTION 'No remaining sessions in the active package'; END IF;
  v_session_id := gen_random_uuid()::text;
  INSERT INTO public.sessions (id, clinic_id, branch_id, patient_id, appointment_id, date, diagnosis, "vasScore", notes, therapist,
    intervention, session_objectives, target_exercises, completed_exercises, pain_before, pain_after, rom_status, strength_status, recovery_score)
  VALUES (v_session_id, v_clinic_id, v_appointment.branch_id, v_patient.id, p_appointment_id, CURRENT_DATE::text,
    v_appointment.appointment_type, p_pain_after::text, p_notes, v_appointment.doctor_name, v_appointment.session_intervention,
    v_appointment.session_objectives, COALESCE(v_appointment.target_exercises, '[]'::jsonb), v_completed_exercises,
    p_pain_before, p_pain_after, NULLIF(btrim(p_rom_status), ''), NULLIF(btrim(p_strength_status), ''), p_recovery_score);
  UPDATE public.patients SET "sessionsUsed" = v_used + v_increment, status = 'نشط' WHERE id = v_patient.id AND clinic_id = v_clinic_id;
  UPDATE public.appointments SET status = 'منتهي', updated_at = now() WHERE id = p_appointment_id AND clinic_id = v_clinic_id;
  INSERT INTO public.progress_tracking (clinic_id, patient_id, appointment_id, session_id, pain_before, pain_level, rom_status, strength_status, recovery_score, completed_exercises, notes)
  VALUES (v_clinic_id, v_patient.id, p_appointment_id, v_session_id, p_pain_before, p_pain_after, NULLIF(btrim(p_rom_status), ''),
    NULLIF(btrim(p_strength_status), ''), p_recovery_score, v_completed_exercises, p_notes);
  RETURN jsonb_build_object('already_completed', false, 'progress_recorded', true, 'session_id', v_session_id,
    'sessions_used', v_used + v_increment, 'sessions_remaining', GREATEST(COALESCE(v_patient."sessionsTotal", 0) - (v_used + v_increment), 0));
END;
$function$;