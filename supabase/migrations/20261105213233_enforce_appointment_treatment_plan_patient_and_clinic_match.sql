ALTER TABLE public.treatment_plans
  ADD CONSTRAINT treatment_plans_id_patient_clinic_key
  UNIQUE (id, patient_id, clinic_id);

ALTER TABLE public.appointments
  DROP CONSTRAINT appointments_treatment_plan_id_fkey,
  ADD CONSTRAINT appointments_treatment_plan_patient_clinic_fkey
  FOREIGN KEY (treatment_plan_id, patient_id, clinic_id)
  REFERENCES public.treatment_plans(id, patient_id, clinic_id)
  ON DELETE RESTRICT;
