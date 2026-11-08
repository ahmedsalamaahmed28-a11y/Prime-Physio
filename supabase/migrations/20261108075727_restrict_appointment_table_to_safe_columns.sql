REVOKE SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.appointments FROM authenticated;

GRANT SELECT (
  id, clinic_id, patient_id, patient_name, doctor_name, appointment_type,
  date, time, status, price, therapist, duration, created_at, updated_at,
  start_time, end_time, therapist_id, room_id, branch_id, starts_at, ends_at
)
ON TABLE public.appointments TO authenticated;