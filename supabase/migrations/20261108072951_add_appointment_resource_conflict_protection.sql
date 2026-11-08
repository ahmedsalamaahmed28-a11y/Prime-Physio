CREATE TABLE public.appointment_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  branch_id uuid NULL REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_rooms_clinic_name_unique UNIQUE (clinic_id, name),
  CONSTRAINT appointment_rooms_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE
);

ALTER TABLE public.appointments
  ADD COLUMN therapist_id uuid NULL REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN room_id uuid NULL REFERENCES public.appointment_rooms(id) ON DELETE SET NULL,
  ADD COLUMN branch_id uuid NULL REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN starts_at timestamptz NULL,
  ADD COLUMN ends_at timestamptz NULL;

ALTER TABLE public.appointment_rooms ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_rooms TO authenticated;

CREATE POLICY appointment_rooms_clinic_select
  ON public.appointment_rooms FOR SELECT TO authenticated
  USING (clinic_id = public.get_my_clinic_id());
CREATE POLICY appointment_rooms_clinic_insert
  ON public.appointment_rooms FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'));
CREATE POLICY appointment_rooms_clinic_update
  ON public.appointment_rooms FOR UPDATE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'))
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'));
CREATE POLICY appointment_rooms_clinic_delete
  ON public.appointment_rooms FOR DELETE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('manage_settings'));

CREATE OR REPLACE FUNCTION public.enforce_appointment_schedule()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $function$
DECLARE
  therapist_clinic uuid;
  room_clinic uuid;
  room_branch uuid;
BEGIN
  IF TG_OP = 'UPDATE'
    AND ROW(NEW.start_time, NEW.end_time, NEW.therapist_id, NEW.room_id, NEW.branch_id)
      IS NOT DISTINCT FROM ROW(OLD.start_time, OLD.end_time, OLD.therapist_id, OLD.room_id, OLD.branch_id)
  THEN RETURN NEW; END IF;

  IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
    RAISE EXCEPTION 'Appointment start and end times are required' USING ERRCODE = '22007';
  END IF;
  BEGIN
    NEW.starts_at := NEW.start_time::timestamptz;
    NEW.ends_at := NEW.end_time::timestamptz;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Appointment times must be valid ISO date-time values' USING ERRCODE = '22007';
  END;
  IF NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'Appointment end must be later than its start' USING ERRCODE = '22007';
  END IF;

  IF NEW.branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = NEW.branch_id AND b.clinic_id = NEW.clinic_id AND b.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Appointment branch does not belong to this clinic' USING ERRCODE = '23514';
  END IF;

  IF NEW.therapist_id IS NOT NULL THEN
    SELECT s.clinic_id INTO therapist_clinic
    FROM public.staff s WHERE s.id = NEW.therapist_id AND s.status <> 'محذوف';
    IF therapist_clinic IS NULL OR therapist_clinic <> NEW.clinic_id THEN
      RAISE EXCEPTION 'Therapist does not belong to this clinic' USING ERRCODE = '23503';
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('therapist:' || NEW.clinic_id::text || ':' || NEW.therapist_id::text, 0)
    );
    IF EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.clinic_id = NEW.clinic_id AND a.therapist_id = NEW.therapist_id
        AND a.id <> NEW.id
        AND a.status NOT IN ('ملغي', 'Cancelled', 'منتهي', 'Completed')
        AND a.starts_at < NEW.ends_at AND a.ends_at > NEW.starts_at
    ) THEN RAISE EXCEPTION 'THERAPIST_TIME_CONFLICT' USING ERRCODE = '23P01'; END IF;
  END IF;

  IF NEW.room_id IS NOT NULL THEN
    SELECT r.clinic_id, r.branch_id INTO room_clinic, room_branch
    FROM public.appointment_rooms r WHERE r.id = NEW.room_id AND r.is_active = true;
    IF room_clinic IS NULL OR room_clinic <> NEW.clinic_id
      OR (room_branch IS NOT NULL AND NEW.branch_id IS DISTINCT FROM room_branch)
    THEN RAISE EXCEPTION 'Room does not belong to this clinic or branch' USING ERRCODE = '23503'; END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('room:' || NEW.clinic_id::text || ':' || NEW.room_id::text, 0)
    );
    IF EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.clinic_id = NEW.clinic_id AND a.room_id = NEW.room_id
        AND a.id <> NEW.id
        AND a.status NOT IN ('ملغي', 'Cancelled', 'منتهي', 'Completed')
        AND a.starts_at < NEW.ends_at AND a.ends_at > NEW.starts_at
    ) THEN RAISE EXCEPTION 'ROOM_TIME_CONFLICT' USING ERRCODE = '23P01'; END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER enforce_appointment_schedule_before_write
BEFORE INSERT OR UPDATE OF start_time, end_time, therapist_id, room_id, branch_id
ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.enforce_appointment_schedule();

CREATE INDEX appointments_clinic_starts_at_idx ON public.appointments (clinic_id, starts_at);
CREATE INDEX appointments_therapist_schedule_idx ON public.appointments (clinic_id, therapist_id, starts_at)
  WHERE therapist_id IS NOT NULL AND status NOT IN ('ملغي', 'Cancelled', 'منتهي', 'Completed');
CREATE INDEX appointments_room_schedule_idx ON public.appointments (clinic_id, room_id, starts_at)
  WHERE room_id IS NOT NULL AND status NOT IN ('ملغي', 'Cancelled', 'منتهي', 'Completed');