ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurrence_id text,
  ADD COLUMN IF NOT EXISTS recurrence_index smallint,
  ADD COLUMN IF NOT EXISTS recurrence_total smallint,
  ADD COLUMN IF NOT EXISTS is_group_session boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_id_clinic_unique
  ON public.appointments (id, clinic_id);
CREATE UNIQUE INDEX IF NOT EXISTS patients_id_clinic_unique
  ON public.patients (id, clinic_id);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_id_clinic_unique
  ON public.invoices (id, clinic_id);

CREATE TABLE IF NOT EXISTS public.appointment_group_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  appointment_id text NOT NULL,
  patient_id text NOT NULL,
  invoice_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_group_participants_unique UNIQUE (clinic_id, appointment_id, patient_id),
  CONSTRAINT appointment_group_participants_appointment_fk
    FOREIGN KEY (appointment_id, clinic_id) REFERENCES public.appointments(id, clinic_id) ON DELETE CASCADE,
  CONSTRAINT appointment_group_participants_patient_fk
    FOREIGN KEY (patient_id, clinic_id) REFERENCES public.patients(id, clinic_id) ON DELETE RESTRICT,
  CONSTRAINT appointment_group_participants_invoice_fk
    FOREIGN KEY (invoice_id, clinic_id) REFERENCES public.invoices(id, clinic_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS appointment_group_participants_patient_idx
  ON public.appointment_group_participants (clinic_id, patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS appointment_group_participants_appointment_idx
  ON public.appointment_group_participants (clinic_id, appointment_id);

ALTER TABLE public.appointment_group_participants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_group_participants FROM anon, authenticated;
GRANT ALL ON public.appointment_group_participants TO service_role;
