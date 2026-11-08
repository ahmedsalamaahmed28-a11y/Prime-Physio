ALTER TABLE public.patients
  ADD CONSTRAINT patients_id_clinic_id_unique UNIQUE (id, clinic_id);

CREATE TABLE public.patient_medical_records (
  patient_id text PRIMARY KEY,
  clinic_id uuid NOT NULL,
  medical_history jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_medical_records_patient_clinic_fk
    FOREIGN KEY (patient_id, clinic_id)
    REFERENCES public.patients (id, clinic_id)
    ON DELETE CASCADE
);

INSERT INTO public.patient_medical_records (patient_id, clinic_id, medical_history)
SELECT
  p.id,
  p.clinic_id,
  COALESCE(p.medical_history, '{}'::jsonb)
    || pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'bloodType', p."bloodType",
      'allergies', p.allergies,
      'dvt', p.dvt
    ))
FROM public.patients p
ON CONFLICT (patient_id) DO UPDATE
SET medical_history = EXCLUDED.medical_history,
    updated_at = now();

ALTER TABLE public.patient_medical_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_medical_records TO authenticated;

CREATE POLICY patient_medical_records_select
  ON public.patient_medical_records
  FOR SELECT TO authenticated
  USING (
    clinic_id = public.get_my_clinic_id()
    AND (
      public.has_staff_permission('view_patient_history')
      OR public.has_staff_permission('edit_emr')
    )
  );

CREATE POLICY patient_medical_records_insert
  ON public.patient_medical_records
  FOR INSERT TO authenticated
  WITH CHECK (
    clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('edit_emr')
  );

CREATE POLICY patient_medical_records_update
  ON public.patient_medical_records
  FOR UPDATE TO authenticated
  USING (
    clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('edit_emr')
  )
  WITH CHECK (
    clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('edit_emr')
  );

CREATE POLICY patient_medical_records_delete
  ON public.patient_medical_records
  FOR DELETE TO authenticated
  USING (
    clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('delete_emr')
  );

CREATE INDEX patient_medical_records_clinic_id_idx
  ON public.patient_medical_records (clinic_id);
