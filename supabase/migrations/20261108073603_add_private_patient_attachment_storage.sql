ALTER TABLE public.staff
  ADD CONSTRAINT staff_id_clinic_id_unique UNIQUE (id, clinic_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('patient-files', 'patient-files', false, 20971520,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE public.patient_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  branch_id uuid NULL,
  patient_id text NOT NULL,
  uploaded_by_staff_id uuid NULL,
  file_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 20971520),
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('imaging','lab','report','other')),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_attachments_patient_clinic_fk
    FOREIGN KEY (patient_id, clinic_id) REFERENCES public.patients(id, clinic_id) ON DELETE CASCADE,
  CONSTRAINT patient_attachments_branch_clinic_fk
    FOREIGN KEY (branch_id, clinic_id) REFERENCES public.branches(id, clinic_id),
  CONSTRAINT patient_attachments_staff_clinic_fk
    FOREIGN KEY (uploaded_by_staff_id, clinic_id) REFERENCES public.staff(id, clinic_id)
);

CREATE INDEX patient_attachments_patient_created_idx
  ON public.patient_attachments (clinic_id, patient_id, created_at DESC);

ALTER TABLE public.patient_attachments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_attachments TO authenticated;

CREATE POLICY patient_attachments_clinic_select ON public.patient_attachments
  FOR SELECT TO authenticated USING (
    clinic_id = public.get_my_clinic_id()
    AND (public.has_staff_permission('view_patient_history') OR public.has_staff_permission('edit_emr'))
  );
CREATE POLICY patient_attachments_clinic_insert ON public.patient_attachments
  FOR INSERT TO authenticated WITH CHECK (
    clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_emr')
  );
CREATE POLICY patient_attachments_clinic_update ON public.patient_attachments
  FOR UPDATE TO authenticated USING (
    clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_emr')
  ) WITH CHECK (
    clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_emr')
  );
CREATE POLICY patient_attachments_clinic_delete ON public.patient_attachments
  FOR DELETE TO authenticated USING (
    clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('delete_emr')
  );

DROP POLICY IF EXISTS patient_files_clinic_read ON storage.objects;
DROP POLICY IF EXISTS patient_files_clinic_upload ON storage.objects;
DROP POLICY IF EXISTS patient_files_clinic_update ON storage.objects;
DROP POLICY IF EXISTS patient_files_clinic_delete ON storage.objects;

CREATE POLICY patient_files_clinic_read ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = public.get_my_clinic_id()::text
    AND (public.has_staff_permission('view_patient_history') OR public.has_staff_permission('edit_emr'))
  );
CREATE POLICY patient_files_clinic_upload ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = public.get_my_clinic_id()::text
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = (storage.foldername(name))[2] AND p.clinic_id = public.get_my_clinic_id()
    )
    AND public.has_staff_permission('edit_emr')
  );
CREATE POLICY patient_files_clinic_update ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = public.get_my_clinic_id()::text
    AND public.has_staff_permission('edit_emr')
  ) WITH CHECK (
    bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = public.get_my_clinic_id()::text
    AND public.has_staff_permission('edit_emr')
  );
CREATE POLICY patient_files_clinic_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = public.get_my_clinic_id()::text
    AND public.has_staff_permission('delete_emr')
  );