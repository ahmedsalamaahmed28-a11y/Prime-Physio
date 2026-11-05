-- Preserve completed appointments and paid financial records.
-- Session records remain linked to the appointment that generated them.
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_appointment_id_fkey;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.prevent_paid_invoice_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF lower(trim(COALESCE(OLD.status, ''))) IN ('مدفوع', 'paid', 'completed') THEN
    RAISE EXCEPTION 'Paid invoices cannot be deleted. Mark the invoice as cancelled or record a refund instead.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_paid_invoice_delete_trigger ON public.invoices;
CREATE TRIGGER prevent_paid_invoice_delete_trigger
BEFORE DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.prevent_paid_invoice_delete();

REVOKE ALL ON FUNCTION public.prevent_paid_invoice_delete() FROM PUBLIC, anon, authenticated;

-- A completed treatment is always recorded, but only consumes a package credit
-- when the patient actually has a package with a positive session allowance.
CREATE OR REPLACE FUNCTION public.complete_appointment_and_consume_session(
  p_appointment_id text, p_diagnosis text DEFAULT NULL, p_vas_score integer DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE
  v_clinic_id uuid;
  v_appointment public.appointments%ROWTYPE;
  v_patient public.patients%ROWTYPE;
  v_session_id text;
  v_used integer;
  v_increment integer;
BEGIN
  v_clinic_id := public.get_my_clinic_id();
  IF auth.uid() IS NULL OR v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Authentication and clinic membership are required';
  END IF;
  IF p_vas_score IS NOT NULL AND (p_vas_score < 0 OR p_vas_score > 10) THEN
    RAISE EXCEPTION 'VAS score must be between 0 and 10';
  END IF;

  SELECT * INTO v_appointment FROM public.appointments
  WHERE id = p_appointment_id AND clinic_id = v_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;

  SELECT id INTO v_session_id FROM public.sessions
  WHERE appointment_id = p_appointment_id AND clinic_id = v_clinic_id;
  IF v_session_id IS NOT NULL THEN
    SELECT COALESCE("sessionsUsed", 0) INTO v_used FROM public.patients
    WHERE id = v_appointment.patient_id AND clinic_id = v_clinic_id;
    RETURN jsonb_build_object('already_completed', true, 'session_id', v_session_id, 'sessions_used', v_used);
  END IF;
  IF v_appointment.status IN ('منتهي', 'Completed') THEN
    RAISE EXCEPTION 'Appointment is already completed without a linked session; reconcile before retrying';
  END IF;

  SELECT * INTO v_patient FROM public.patients
  WHERE id = v_appointment.patient_id AND clinic_id = v_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Patient not found in the active clinic'; END IF;

  v_used := COALESCE(v_patient."sessionsUsed", 0);
  v_increment := CASE WHEN COALESCE(v_patient."sessionsTotal", 0) > 0 THEN 1 ELSE 0 END;
  IF v_increment = 1 AND v_used >= v_patient."sessionsTotal" THEN
    RAISE EXCEPTION 'No remaining sessions in the active package';
  END IF;

  v_session_id := gen_random_uuid()::text;
  INSERT INTO public.sessions (id, clinic_id, patient_id, appointment_id, date, diagnosis, "vasScore", notes, therapist)
  VALUES (v_session_id, v_clinic_id, v_patient.id, p_appointment_id, CURRENT_DATE::text,
    COALESCE(p_diagnosis, v_appointment.appointment_type), p_vas_score::text, p_notes, v_appointment.doctor_name);

  UPDATE public.patients
  SET "sessionsUsed" = v_used + v_increment, status = 'نشط'
  WHERE id = v_patient.id AND clinic_id = v_clinic_id;

  UPDATE public.appointments
  SET status = 'منتهي', updated_at = now()
  WHERE id = p_appointment_id AND clinic_id = v_clinic_id;

  RETURN jsonb_build_object(
    'already_completed', false,
    'session_id', v_session_id,
    'sessions_used', v_used + v_increment,
    'sessions_remaining', GREATEST(COALESCE(v_patient."sessionsTotal", 0) - (v_used + v_increment), 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_appointment_and_consume_session(text,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_appointment_and_consume_session(text,text,integer,text) TO authenticated;
