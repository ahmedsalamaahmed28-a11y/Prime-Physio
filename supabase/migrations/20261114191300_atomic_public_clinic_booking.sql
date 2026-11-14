CREATE OR REPLACE FUNCTION public.create_public_clinic_booking(
  p_clinic_id uuid,
  p_patient_name text,
  p_age integer,
  p_phone text,
  p_address text,
  p_local_date text,
  p_local_time text
)
RETURNS TABLE(patient_id text, appointment_id text, reused_patient boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_patient_id text;
  v_appointment_id text;
  v_reused boolean := false;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_phone_digits text;
  v_category text;
BEGIN
  IF p_clinic_id IS NULL
     OR length(btrim(coalesce(p_patient_name, ''))) < 2
     OR length(btrim(coalesce(p_patient_name, ''))) > 120
     OR p_age IS NULL OR p_age < 1 OR p_age > 120
     OR length(btrim(coalesce(p_phone, ''))) < 7
     OR length(btrim(coalesce(p_phone, ''))) > 20
     OR length(btrim(coalesce(p_address, ''))) < 3
     OR p_local_date !~ '^\d{4}-\d{2}-\d{2}$'
     OR p_local_time !~ '^([01]\d|2[0-3]):[0-5]\d$'
  THEN
    RAISE EXCEPTION 'INVALID_PUBLIC_BOOKING_DATA' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clinics c
    WHERE c.id = p_clinic_id AND c.is_active = true AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'CLINIC_NOT_AVAILABLE' USING ERRCODE = 'P0002';
  END IF;

  IF p_local_date::date <> (pg_catalog.clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date THEN
    RAISE EXCEPTION 'BOOKING_DATE_EXPIRED' USING ERRCODE = '22023';
  END IF;

  v_start_at := (p_local_date::date + p_local_time::time) AT TIME ZONE 'Africa/Cairo';
  v_end_at := v_start_at + interval '30 minutes';

  IF v_start_at <= pg_catalog.now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'BOOKING_TIME_EXPIRED' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clinic_appointment_schedule:' || p_clinic_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.clinic_id = p_clinic_id
      AND pg_catalog.lower(coalesce(a.status, '')) NOT IN
        ('cancelled', 'canceled', 'ملغي', 'ملغى', 'rejected', 'منتهي', 'completed')
      AND (
        (a.starts_at IS NOT NULL
          AND a.starts_at < v_end_at
          AND coalesce(a.ends_at, a.starts_at + interval '30 minutes') > v_start_at)
        OR
        (a.starts_at IS NULL
          AND a.date = p_local_date
          AND (
            a.time = p_local_time
            OR pg_catalog.lower(pg_catalog.btrim(a.time)) =
               pg_catalog.lower(pg_catalog.to_char(v_start_at AT TIME ZONE 'Africa/Cairo', 'HH12:MI AM'))
            OR pg_catalog.lower(pg_catalog.btrim(a.time)) =
               pg_catalog.lower(pg_catalog.to_char(v_start_at AT TIME ZONE 'Africa/Cairo', 'HH24:MI'))
          ))
      )
  ) THEN
    RAISE EXCEPTION 'PUBLIC_BOOKING_TIME_CONFLICT' USING ERRCODE = '23P01';
  END IF;

  v_phone_digits := pg_catalog.regexp_replace(p_phone, '[^0-9]', '', 'g');
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clinic_patient_phone:' || p_clinic_id::text || ':' || v_phone_digits, 0)
  );

  SELECT p.id INTO v_patient_id
  FROM public.patients p
  WHERE p.clinic_id = p_clinic_id
    AND pg_catalog.lower(pg_catalog.btrim(p.nameAr)) = pg_catalog.lower(pg_catalog.btrim(p_patient_name))
    AND pg_catalog.regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = v_phone_digits
  ORDER BY p.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_patient_id IS NULL THEN
    v_patient_id :=
      pg_catalog.left(pg_catalog.upper(pg_catalog.replace(p_clinic_id::text, '-', '')), 4)
      || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 10));

    INSERT INTO public.patients (
      id, clinic_id, "nameAr", phone, age, address, status, "sessionsUsed", "sessionsTotal"
    )
    VALUES (
      v_patient_id, p_clinic_id, pg_catalog.btrim(p_patient_name),
      pg_catalog.btrim(p_phone), p_age, pg_catalog.btrim(p_address), 'نشط', 0, 0
    );
  ELSE
    v_reused := true;
  END IF;

  v_appointment_id := pg_catalog.gen_random_uuid()::text;
  v_category := CASE WHEN p_age < 18 THEN 'قسم الأطفال' ELSE 'قسم الكبار' END;

  INSERT INTO public.appointments (
    id, clinic_id, patient_id, patient_name, appointment_type,
    date, time, status, duration, start_time, end_time
  )
  VALUES (
    v_appointment_id, p_clinic_id, v_patient_id, pg_catalog.btrim(p_patient_name),
    'حجز من الموقع', p_local_date, p_local_time, 'مؤكد', '30',
    v_start_at::text, v_end_at::text
  );

  INSERT INTO public.notifications (
    clinic_id, user_id, title_ar, title_en, body_ar, body_en, type, action_url
  )
  VALUES (
    p_clinic_id, NULL,
    'تم تأكيد حجز جديد من الموقع',
    'New website appointment confirmed',
    'تم إنشاء موعد مؤكد من صفحة المركز. المريض: ' || pg_catalog.btrim(p_patient_name)
      || ' • السن: ' || p_age::text || ' • الهاتف: ' || pg_catalog.btrim(p_phone)
      || ' • الموعد: ' || p_local_date || ' الساعة ' || p_local_time
      || ' • ملف المريض: ' || v_patient_id,
    'A confirmed appointment was created from the clinic website. Patient: ' || pg_catalog.btrim(p_patient_name)
      || ' • Age: ' || p_age::text || ' • Phone: ' || pg_catalog.btrim(p_phone)
      || ' • Appointment: ' || p_local_date || ' at ' || p_local_time
      || ' • Patient record: ' || v_patient_id,
    'appointment', '/notifications'
  );

  RETURN QUERY SELECT v_patient_id, v_appointment_id, v_reused;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_public_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_start_at timestamptz;
  v_end_at timestamptz;
BEGIN
  IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
    RETURN NEW;
  END IF;

  v_start_at := NEW.start_time::timestamptz;
  v_end_at := NEW.end_time::timestamptz;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clinic_appointment_schedule:' || NEW.clinic_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.clinic_id = NEW.clinic_id
      AND a.id <> NEW.id
      AND pg_catalog.lower(coalesce(a.status, '')) NOT IN
        ('cancelled', 'canceled', 'ملغي', 'ملغى', 'rejected', 'منتهي', 'completed')
      AND (
        NEW.appointment_type = 'حجز من الموقع'
        OR a.appointment_type = 'حجز من الموقع'
      )
      AND a.starts_at IS NOT NULL
      AND a.starts_at < v_end_at
      AND coalesce(a.ends_at, a.starts_at + interval '30 minutes') > v_start_at
  ) THEN
    RAISE EXCEPTION 'PUBLIC_BOOKING_TIME_CONFLICT' USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_public_booking_overlap_before_write ON public.appointments;
CREATE TRIGGER prevent_public_booking_overlap_before_write
BEFORE INSERT OR UPDATE OF start_time, end_time, appointment_type, status
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_public_booking_overlap();

REVOKE ALL ON FUNCTION public.create_public_clinic_booking(uuid, text, integer, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_clinic_booking(uuid, text, integer, text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.prevent_public_booking_overlap() FROM PUBLIC, anon, authenticated;
