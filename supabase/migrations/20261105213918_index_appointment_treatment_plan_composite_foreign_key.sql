CREATE INDEX IF NOT EXISTS appointments_treatment_plan_patient_clinic_idx
  ON public.appointments(treatment_plan_id, patient_id, clinic_id)
  WHERE treatment_plan_id IS NOT NULL;

DROP INDEX IF EXISTS public.appointments_treatment_plan_id_idx;
