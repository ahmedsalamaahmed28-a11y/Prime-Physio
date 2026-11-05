ALTER TABLE public.treatment_plans
  ADD COLUMN target_exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT treatment_plans_target_exercises_array_check
    CHECK (jsonb_typeof(target_exercises) = 'array');

CREATE OR REPLACE FUNCTION public.create_patient_care_plan(
  p_patient_id text,
  p_evaluation_type text,
  p_vas_score integer,
  p_symptoms text,
  p_rom_data jsonb,
  p_mmt_data jsonb,
  p_special_tests jsonb,
  p_potential_diagnoses text,
  p_red_flags text,
  p_clinical_summary text,
  p_goals text,
  p_session_plan text,
  p_frequency text,
  p_duration text,
  p_home_program text,
  p_program_title text,
  p_exercises jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_clinic_id uuid;
  v_assessment_id uuid;
  v_evaluation_id uuid;
  v_plan_id uuid;
  v_program_id uuid;
  v_exercises jsonb := COALESCE(p_exercises, '[]'::jsonb);
BEGIN
  v_clinic_id := public.get_my_clinic_id();
  IF auth.uid() IS NULL OR v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Authentication and clinic membership are required';
  END IF;
  IF p_vas_score IS NOT NULL AND (p_vas_score < 0 OR p_vas_score > 10) THEN
    RAISE EXCEPTION 'VAS score must be between 0 and 10';
  END IF;
  IF jsonb_typeof(v_exercises) <> 'array' THEN
    RAISE EXCEPTION 'Treatment plan exercises must be a JSON array';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.patients
    WHERE id = p_patient_id AND clinic_id = v_clinic_id
  ) THEN
    RAISE EXCEPTION 'Patient not found in the active clinic';
  END IF;
  IF NULLIF(trim(p_goals), '') IS NULL OR NULLIF(trim(p_session_plan), '') IS NULL THEN
    RAISE EXCEPTION 'Treatment goals and session plan are required';
  END IF;

  INSERT INTO public.assessments (
    clinic_id, patient_id, symptoms, rom, strength, special_tests,
    potential_diagnoses, red_flags, clinical_summary
  )
  VALUES (
    v_clinic_id, p_patient_id, p_symptoms,
    COALESCE(p_rom_data, '{}'::jsonb)::text,
    COALESCE(p_mmt_data, '{}'::jsonb)::text,
    COALESCE(p_special_tests, '[]'::jsonb)::text,
    p_potential_diagnoses, p_red_flags, p_clinical_summary
  )
  RETURNING id INTO v_assessment_id;

  INSERT INTO public.patient_evaluations (
    patient_id, clinic_id, evaluation_type, vas_score, rom_data,
    mmt_data, special_tests, notes
  )
  VALUES (
    p_patient_id, v_clinic_id,
    COALESCE(NULLIF(trim(p_evaluation_type), ''), 'Initial'),
    p_vas_score, COALESCE(p_rom_data, '{}'::jsonb),
    COALESCE(p_mmt_data, '{}'::jsonb),
    COALESCE(p_special_tests, '[]'::jsonb), p_clinical_summary
  )
  RETURNING id INTO v_evaluation_id;

  INSERT INTO public.treatment_plans (
    clinic_id, patient_id, assessment_id, goals, session_plan,
    frequency, duration, home_program, status, target_exercises
  )
  VALUES (
    v_clinic_id, p_patient_id, v_assessment_id, p_goals, p_session_plan,
    p_frequency, p_duration, p_home_program, 'active', v_exercises
  )
  RETURNING id INTO v_plan_id;

  INSERT INTO public.patient_programs (clinic_id, patient_id, title, exercises)
  VALUES (
    v_clinic_id, p_patient_id,
    COALESCE(NULLIF(trim(p_program_title), ''), 'Home Exercise Program'),
    v_exercises
  )
  RETURNING id INTO v_program_id;

  RETURN jsonb_build_object(
    'assessment_id', v_assessment_id,
    'evaluation_id', v_evaluation_id,
    'treatment_plan_id', v_plan_id,
    'program_id', v_program_id
  );
END;
$function$;
