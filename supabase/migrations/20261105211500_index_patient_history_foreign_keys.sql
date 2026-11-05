-- Add covering indexes for the patient foreign keys introduced with clinical history protection.
CREATE INDEX IF NOT EXISTS assessments_patient_id_idx ON public.assessments(patient_id);
CREATE INDEX IF NOT EXISTS discharges_patient_id_idx ON public.discharges(patient_id);
CREATE INDEX IF NOT EXISTS progress_tracking_patient_id_idx ON public.progress_tracking(patient_id);
CREATE INDEX IF NOT EXISTS treatment_plans_patient_id_idx ON public.treatment_plans(patient_id);
