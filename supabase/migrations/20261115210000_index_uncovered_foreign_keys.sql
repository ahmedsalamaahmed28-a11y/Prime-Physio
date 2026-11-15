-- Add indexes for foreign keys not covered by a leading-column index.
-- These support parent-row updates/deletes and common clinic-scoped lookups.
CREATE INDEX IF NOT EXISTS appointment_rooms_branch_clinic_fk_idx
  ON public.appointment_rooms (branch_id, clinic_id);

CREATE INDEX IF NOT EXISTS appointments_branch_clinic_fk_idx
  ON public.appointments (branch_id, clinic_id);
CREATE INDEX IF NOT EXISTS appointments_room_id_fk_idx
  ON public.appointments (room_id);
CREATE INDEX IF NOT EXISTS appointments_therapist_id_fk_idx
  ON public.appointments (therapist_id);

CREATE INDEX IF NOT EXISTS group_booking_requests_patient_clinic_fk_idx
  ON public.group_booking_requests (patient_id, clinic_id);

CREATE INDEX IF NOT EXISTS invoices_branch_clinic_fk_idx
  ON public.invoices (branch_id, clinic_id);

CREATE INDEX IF NOT EXISTS patient_attachments_branch_clinic_fk_idx
  ON public.patient_attachments (branch_id, clinic_id);
CREATE INDEX IF NOT EXISTS patient_attachments_patient_clinic_fk_idx
  ON public.patient_attachments (patient_id, clinic_id);
CREATE INDEX IF NOT EXISTS patient_attachments_staff_clinic_fk_idx
  ON public.patient_attachments (uploaded_by_staff_id, clinic_id);

CREATE INDEX IF NOT EXISTS patient_medical_records_patient_clinic_fk_idx
  ON public.patient_medical_records (patient_id, clinic_id);

CREATE INDEX IF NOT EXISTS patients_branch_clinic_fk_idx
  ON public.patients (branch_id, clinic_id);

CREATE INDEX IF NOT EXISTS sessions_branch_clinic_fk_idx
  ON public.sessions (branch_id, clinic_id);
