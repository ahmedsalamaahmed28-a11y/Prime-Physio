CREATE POLICY appointment_group_participants_deny_authenticated
  ON public.appointment_group_participants
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS appointment_group_participants_appointment_fk_idx
  ON public.appointment_group_participants (appointment_id, clinic_id);
CREATE INDEX IF NOT EXISTS appointment_group_participants_patient_fk_idx
  ON public.appointment_group_participants (patient_id, clinic_id);
CREATE INDEX IF NOT EXISTS appointment_group_participants_invoice_fk_idx
  ON public.appointment_group_participants (invoice_id);
