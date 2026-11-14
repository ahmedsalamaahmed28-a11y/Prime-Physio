
CREATE TABLE IF NOT EXISTS public.group_booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id text NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  group_code text NOT NULL CHECK (group_code IN ('A','B')),
  selected_times jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  sessions_total smallint,
  recurrence_id text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT group_booking_selected_times_shape CHECK (
    jsonb_typeof(selected_times) = 'object'
    AND selected_times ?& CASE WHEN group_code = 'A'
      THEN ARRAY['saturday','monday','wednesday']
      ELSE ARRAY['sunday','tuesday','thursday'] END
  )
);

CREATE INDEX IF NOT EXISTS group_booking_requests_clinic_status_created_idx
  ON public.group_booking_requests (clinic_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS group_booking_requests_patient_idx
  ON public.group_booking_requests (clinic_id, patient_id);

ALTER TABLE public.group_booking_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.group_booking_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.group_booking_requests TO service_role;

CREATE OR REPLACE FUNCTION public._group_booking_time_minutes(p_value text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_value,'')));
  h integer;
  m integer;
BEGIN
  IF v ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' THEN
    h := split_part(v,':',1)::integer;
    m := split_part(v,':',2)::integer;
    RETURN h*60+m;
  END IF;
  IF v ~ '^[0-9]{1,2}:[0-5][0-9]\s*(AM|PM)$' THEN
    h := split_part(v,':',1)::integer;
    m := substring(v from ':([0-5][0-9])')::integer;
    IF v ~ 'PM$' AND h < 12 THEN h := h+12; END IF;
    IF v ~ 'AM$' AND h = 12 THEN h := 0; END IF;
    IF h > 23 THEN RETURN NULL; END IF;
    RETURN h*60+m;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_public_group_booking_request(
  p_clinic_id uuid,
  p_patient_name text,
  p_age integer,
  p_phone text,
  p_address text,
  p_group_code text,
  p_selected_times jsonb
)
RETURNS TABLE(request_id uuid, patient_id text, reused_patient boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_patient_id text;
  v_request_id uuid;
  v_reused boolean := false;
  v_phone_digits text;
  v_required text[];
  v_key text;
  v_time text;
  v_time_min integer;
BEGIN
  IF p_clinic_id IS NULL
     OR length(btrim(coalesce(p_patient_name,''))) NOT BETWEEN 2 AND 120
     OR p_age IS NULL OR p_age NOT BETWEEN 1 AND 120
     OR length(btrim(coalesce(p_phone,''))) NOT BETWEEN 7 AND 20
     OR p_phone !~ '^[+0-9()\s.-]+$'
     OR length(btrim(coalesce(p_address,''))) NOT BETWEEN 3 AND 300
     OR p_group_code NOT IN ('A','B')
     OR jsonb_typeof(p_selected_times) <> 'object'
  THEN RAISE EXCEPTION 'INVALID_GROUP_BOOKING_DATA' USING ERRCODE='22023'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clinics c WHERE c.id=p_clinic_id AND c.is_active=true AND c.status='active') THEN
    RAISE EXCEPTION 'CLINIC_NOT_AVAILABLE' USING ERRCODE='P0002';
  END IF;

  v_required := CASE WHEN p_group_code='A'
    THEN ARRAY['saturday','monday','wednesday']
    ELSE ARRAY['sunday','tuesday','thursday'] END;

  FOREACH v_key IN ARRAY v_required LOOP
    v_time := p_selected_times->>v_key;
    v_time_min := public._group_booking_time_minutes(v_time);
    IF v_time_min IS NULL OR v_time_min % 30 <> 0 THEN
      RAISE EXCEPTION 'INVALID_GROUP_DAY_TIME' USING ERRCODE='22023';
    END IF;
  END LOOP;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clinic_patient_phone:'||p_clinic_id::text||':'||pg_catalog.regexp_replace(p_phone,'[^0-9]','','g'),0)
  );

  v_phone_digits := pg_catalog.regexp_replace(p_phone,'[^0-9]','','g');
  SELECT p.id INTO v_patient_id
  FROM public.patients p
  WHERE p.clinic_id=p_clinic_id
    AND pg_catalog.lower(pg_catalog.btrim(p."nameAr"))=pg_catalog.lower(pg_catalog.btrim(p_patient_name))
    AND pg_catalog.regexp_replace(coalesce(p.phone,''),'[^0-9]','','g')=v_phone_digits
  ORDER BY p.created_at DESC LIMIT 1 FOR UPDATE;

  IF v_patient_id IS NULL THEN
    v_patient_id := pg_catalog.left(pg_catalog.upper(pg_catalog.replace(p_clinic_id::text,'-','')),4)
      ||'-'||pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-',''),1,10));
    INSERT INTO public.patients(id,clinic_id,"nameAr",phone,age,address,status,"sessionsUsed","sessionsTotal")
    VALUES(v_patient_id,p_clinic_id,btrim(p_patient_name),btrim(p_phone),p_age,btrim(p_address),'نشط',0,0);
  ELSE
    v_reused := true;
  END IF;

  INSERT INTO public.group_booking_requests(clinic_id,patient_id,group_code,selected_times)
  VALUES(p_clinic_id,v_patient_id,p_group_code,p_selected_times)
  RETURNING id INTO v_request_id;

  INSERT INTO public.notifications(clinic_id,user_id,title_ar,title_en,body_ar,body_en,type,action_url)
  VALUES(
    p_clinic_id,NULL,
    'طلب انضمام جديد لمجموعة علاجية','New group booking request',
    'طلب المريض '||btrim(p_patient_name)||' الانضمام للمجموعة '||p_group_code||'. يلزم تقييم الأخصائي قبل اعتماد عدد الجلسات.',
    'Patient '||btrim(p_patient_name)||' requested group '||p_group_code||'. A specialist evaluation is required before setting the session count.',
    'appointment','/group-bookings'
  );

  RETURN QUERY SELECT v_request_id,v_patient_id,v_reused;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_group_booking_request(
  p_request_id uuid,
  p_clinic_id uuid,
  p_sessions_total integer,
  p_approved_by text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_req public.group_booking_requests%ROWTYPE;
  v_settings public.clinic_settings%ROWTYPE;
  v_patient public.patients%ROWTYPE;
  v_hours jsonb;
  v_required text[];
  v_day_keys text[];
  v_dow integer[];
  v_key text;
  v_idx integer;
  v_date date;
  v_today date := (pg_catalog.clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date;
  v_time text;
  v_start_min integer;
  v_open_min integer;
  v_close_min integer;
  v_duration integer := 30;
  v_start timestamptz;
  v_end timestamptz;
  v_count integer := 0;
  v_scan integer := 0;
  v_recurrence text := pg_catalog.gen_random_uuid()::text;
  v_day_name text;
  v_hours_row jsonb;
  v_from text;
  v_to text;
  v_open boolean;
BEGIN
  IF p_sessions_total IS NULL OR p_sessions_total NOT BETWEEN 1 AND 150 THEN
    RAISE EXCEPTION 'INVALID_SESSION_COUNT' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_req FROM public.group_booking_requests
    WHERE id=p_request_id AND clinic_id=p_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_REQUEST_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'GROUP_REQUEST_NOT_PENDING' USING ERRCODE='22023'; END IF;

  SELECT * INTO v_patient FROM public.patients
    WHERE id=v_req.patient_id AND clinic_id=p_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_PATIENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.patient_evaluations e
    WHERE e.patient_id=v_req.patient_id AND e.clinic_id=p_clinic_id
  ) THEN
    RAISE EXCEPTION 'SPECIALIST_EVALUATION_REQUIRED' USING ERRCODE='22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clinic_appointment_schedule:'||p_clinic_id::text,0)
  );

  SELECT * INTO v_settings FROM public.clinic_settings WHERE clinic_id=p_clinic_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'CLINIC_HOURS_NOT_CONFIGURED' USING ERRCODE='22023'; END IF;

  v_hours := CASE
    WHEN jsonb_typeof(v_settings.branches)='array' AND jsonb_array_length(v_settings.branches)>0
      AND jsonb_typeof(v_settings.branches->0->'hours')='array' THEN v_settings.branches->0->'hours'
    WHEN pg_catalog.btrim(coalesce(v_settings.working_hours,'')) LIKE '[%' THEN v_settings.working_hours::jsonb
    ELSE '[]'::jsonb END;

  IF v_req.group_code='A' THEN
    v_day_keys:=ARRAY['saturday','monday','wednesday'];
    v_dow:=ARRAY[6,1,3];
  ELSE
    v_day_keys:=ARRAY['sunday','tuesday','thursday'];
    v_dow:=ARRAY[0,2,4];
  END IF;

  UPDATE public.patients SET "sessionsTotal"=p_sessions_total, updated_at=now()
    WHERE id=v_req.patient_id AND clinic_id=p_clinic_id;

  FOR v_idx IN 1..p_sessions_total LOOP
    v_key := v_day_keys[((v_idx-1)%3)+1];
    v_time := v_req.selected_times->>v_key;
    v_start_min := public._group_booking_time_minutes(v_time);
    v_date := v_today;
    v_scan := 0;
    WHILE extract(dow FROM v_date)::integer <> v_dow[((v_idx-1)%3)+1]
       OR ((v_date=v_today) AND ((v_start_min <= extract(hour FROM (pg_catalog.clock_timestamp() AT TIME ZONE 'Africa/Cairo'))::integer*60
          + extract(minute FROM (pg_catalog.clock_timestamp() AT TIME ZONE 'Africa/Cairo'))::integer + 15))) LOOP
      v_date := v_date + 1;
      v_scan := v_scan + 1;
      IF v_scan > 14 THEN RAISE EXCEPTION 'COULD_NOT_FIND_NEXT_GROUP_DAY' USING ERRCODE='22023'; END IF;
    END LOOP;

    v_day_name := CASE v_dow[((v_idx-1)%3)+1]
      WHEN 0 THEN 'sunday' WHEN 1 THEN 'monday' WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday' WHEN 4 THEN 'thursday' WHEN 6 THEN 'saturday' END;
    SELECT item INTO v_hours_row FROM jsonb_array_elements(v_hours) item
      WHERE pg_catalog.lower(pg_catalog.btrim(item->>'day')) IN (
        v_day_name,
        CASE v_day_name WHEN 'sunday' THEN 'الأحد' WHEN 'monday' THEN 'الاثنين'
          WHEN 'tuesday' THEN 'الثلاثاء' WHEN 'wednesday' THEN 'الأربعاء'
          WHEN 'thursday' THEN 'الخميس' WHEN 'saturday' THEN 'السبت' END
      )
      LIMIT 1;
    v_open := coalesce((v_hours_row->>'isOpen')::boolean,false);
    v_from := v_hours_row->>'from';
    v_to := v_hours_row->>'to';
    v_open_min := public._group_booking_time_minutes(v_from);
    v_close_min := public._group_booking_time_minutes(v_to);
    IF NOT v_open OR v_open_min IS NULL OR v_close_min IS NULL
       OR v_start_min < v_open_min OR v_start_min+v_duration > v_close_min THEN
      RAISE EXCEPTION 'GROUP_DAY_OUTSIDE_WORKING_HOURS: %',v_day_name USING ERRCODE='22023';
    END IF;

    v_start := (v_date + v_time::time) AT TIME ZONE 'Africa/Cairo';
    v_end := v_start + make_interval(mins=>v_duration);
    IF EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.clinic_id=p_clinic_id
        AND pg_catalog.lower(coalesce(a.status,'')) NOT IN ('cancelled','canceled','ملغي','ملغى','rejected','منتهي','completed')
        AND (
          (a.starts_at IS NOT NULL AND a.starts_at < v_end AND coalesce(a.ends_at,a.starts_at+interval '30 minutes') > v_start)
          OR
          (a.starts_at IS NULL AND a.date=v_date::text
            AND public._group_booking_time_minutes(a.time) < v_start_min+v_duration
            AND public._group_booking_time_minutes(a.time)
              + greatest(30,least(480,coalesce(nullif(pg_catalog.regexp_replace(a.duration,'[^0-9]','','g'),''),'30')::integer)) > v_start_min)
        )
    ) THEN
      RAISE EXCEPTION 'GROUP_BOOKING_TIME_CONFLICT: % %',v_date,v_time USING ERRCODE='23P01';
    END IF;

    INSERT INTO public.appointments(
      id,clinic_id,patient_id,patient_name,appointment_type,date,time,status,duration,
      start_time,end_time,starts_at,ends_at,recurrence_id,recurrence_index,recurrence_total,is_group_session
    ) VALUES (
      pg_catalog.gen_random_uuid()::text,p_clinic_id,v_req.patient_id,v_patient."nameAr",
      'جلسة مجموعة',v_date::text,v_time,'مؤكد','30',
      v_start::text,v_end::text,v_start,v_end,v_recurrence,v_idx,p_sessions_total,true
    );
    v_count:=v_count+1;
    v_today:=v_date+1;
  END LOOP;

  UPDATE public.group_booking_requests SET status='approved',sessions_total=p_sessions_total,
    recurrence_id=v_recurrence,approved_by=p_approved_by,approved_at=now(),updated_at=now()
    WHERE id=p_request_id AND clinic_id=p_clinic_id;

  INSERT INTO public.notifications(clinic_id,user_id,title_ar,title_en,body_ar,body_en,type,action_url)
  VALUES(p_clinic_id,NULL,'تم اعتماد المجموعة العلاجية','Group booking approved',
    'تم اعتماد طلب المريض '||v_patient."nameAr"||' وإنشاء '||p_sessions_total::text||' جلسة متكررة.',
    'Group request for '||v_patient."nameAr"||' approved with '||p_sessions_total::text||' recurring sessions.',
    'appointment','/appointments');

  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public._group_booking_time_minutes(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._group_booking_time_minutes(text) TO service_role;
REVOKE ALL ON FUNCTION public.create_public_group_booking_request(uuid,text,integer,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_group_booking_request(uuid,text,integer,text,text,text,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.approve_group_booking_request(uuid,uuid,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_group_booking_request(uuid,uuid,integer,text) TO service_role;
