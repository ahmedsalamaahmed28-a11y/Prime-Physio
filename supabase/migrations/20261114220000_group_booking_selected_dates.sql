
ALTER TABLE public.group_booking_requests
  ADD COLUMN IF NOT EXISTS selected_dates jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP FUNCTION IF EXISTS public.create_public_group_booking_request(uuid,text,integer,text,text,text,jsonb);

CREATE OR REPLACE FUNCTION public.create_public_group_booking_request(
  p_clinic_id uuid,
  p_patient_name text,
  p_age integer,
  p_phone text,
  p_address text,
  p_group_code text,
  p_selected_times jsonb,
  p_selected_dates jsonb
)
RETURNS TABLE(request_id uuid, patient_id text, reused_patient boolean)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_patient_id text;
  v_request_id uuid;
  v_reused boolean := false;
  v_phone_digits text;
  v_required text[];
  v_offsets integer[];
  v_key text;
  v_pos integer;
  v_time text;
  v_time_min integer;
  v_date date;
  v_base date;
  v_today date := (pg_catalog.clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date;
BEGIN
  IF p_clinic_id IS NULL OR length(btrim(coalesce(p_patient_name,''))) NOT BETWEEN 2 AND 120
     OR p_age IS NULL OR p_age NOT BETWEEN 1 AND 120
     OR length(btrim(coalesce(p_phone,''))) NOT BETWEEN 7 AND 20
     OR p_phone !~ '^[+0-9()\s.-]+$'
     OR length(btrim(coalesce(p_address,''))) NOT BETWEEN 3 AND 300
     OR p_group_code NOT IN ('A','B')
     OR jsonb_typeof(p_selected_times) <> 'object'
     OR jsonb_typeof(p_selected_dates) <> 'object'
  THEN RAISE EXCEPTION 'INVALID_GROUP_BOOKING_DATA' USING ERRCODE='22023'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clinics c WHERE c.id=p_clinic_id AND c.is_active=true AND c.status='active') THEN
    RAISE EXCEPTION 'CLINIC_NOT_AVAILABLE' USING ERRCODE='P0002';
  END IF;

  IF p_group_code='A' THEN
    v_required:=ARRAY['saturday','monday','wednesday']; v_offsets:=ARRAY[0,2,4];
  ELSE
    v_required:=ARRAY['sunday','tuesday','thursday']; v_offsets:=ARRAY[0,2,4];
  END IF;
  FOREACH v_key IN ARRAY v_required LOOP
    v_time:=p_selected_times->>v_key;
    v_time_min:=public._group_booking_time_minutes(v_time);
    IF v_time_min IS NULL OR v_time_min%30<>0 THEN RAISE EXCEPTION 'INVALID_GROUP_DAY_TIME' USING ERRCODE='22023'; END IF;
  END LOOP;
  v_base := (p_selected_dates->>v_required[1])::date;
  IF v_base IS NULL OR v_base <= v_today THEN RAISE EXCEPTION 'GROUP_DATE_MUST_BE_FUTURE' USING ERRCODE='22023'; END IF;
  FOR v_pos IN 1..3 LOOP
    v_key:=v_required[v_pos];
    IF coalesce(p_selected_dates->>v_key,'') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'INVALID_GROUP_DATE' USING ERRCODE='22023'; END IF;
    v_date:=(p_selected_dates->>v_key)::date;
    IF v_date<>v_base+v_offsets[v_pos] OR extract(dow FROM v_date)::integer <>
      CASE v_key WHEN 'sunday' THEN 0 WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'saturday' THEN 6 END
    THEN RAISE EXCEPTION 'GROUP_DATES_MUST_MATCH_FIXED_WEEK' USING ERRCODE='22023'; END IF;
  END LOOP;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'clinic_patient_phone:'||p_clinic_id::text||':'||pg_catalog.regexp_replace(p_phone,'[^0-9]','','g'),0));
  v_phone_digits:=pg_catalog.regexp_replace(p_phone,'[^0-9]','','g');
  SELECT p.id INTO v_patient_id FROM public.patients p
    WHERE p.clinic_id=p_clinic_id AND pg_catalog.lower(pg_catalog.btrim(p."nameAr"))=pg_catalog.lower(pg_catalog.btrim(p_patient_name))
      AND pg_catalog.regexp_replace(coalesce(p.phone,''),'[^0-9]','','g')=v_phone_digits
    ORDER BY p.created_at DESC LIMIT 1 FOR UPDATE;
  IF v_patient_id IS NULL THEN
    v_patient_id:=pg_catalog.left(pg_catalog.upper(pg_catalog.replace(p_clinic_id::text,'-','')),4)||'-'
      ||pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-',''),1,10));
    INSERT INTO public.patients(id,clinic_id,"nameAr",phone,age,address,status,"sessionsUsed","sessionsTotal")
    VALUES(v_patient_id,p_clinic_id,btrim(p_patient_name),btrim(p_phone),p_age,btrim(p_address),'نشط',0,0);
  ELSE v_reused:=true; END IF;

  INSERT INTO public.group_booking_requests(clinic_id,patient_id,group_code,selected_times,selected_dates)
  VALUES(p_clinic_id,v_patient_id,p_group_code,p_selected_times,p_selected_dates) RETURNING id INTO v_request_id;
  INSERT INTO public.notifications(clinic_id,user_id,title_ar,title_en,body_ar,body_en,type,action_url)
  VALUES(p_clinic_id,NULL,'طلب انضمام جديد لمجموعة علاجية','New group booking request',
    'طلب المريض '||btrim(p_patient_name)||' الانضمام للمجموعة '||p_group_code||'. يلزم تقييم الأخصائي قبل اعتماد عدد الجلسات.',
    'Patient '||btrim(p_patient_name)||' requested group '||p_group_code||'. A specialist evaluation is required before setting the session count.',
    'appointment','/group-bookings');
  RETURN QUERY SELECT v_request_id,v_patient_id,v_reused;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_group_booking_request(
  p_request_id uuid,p_clinic_id uuid,p_sessions_total integer,p_approved_by text
)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_req public.group_booking_requests%ROWTYPE;
  v_settings public.clinic_settings%ROWTYPE;
  v_patient public.patients%ROWTYPE;
  v_hours jsonb;
  v_day_keys text[];
  v_dow integer[];
  v_key text;
  v_pos integer;
  v_idx integer;
  v_date date;
  v_current_date date := (pg_catalog.clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date;
  v_last_dates date[] := ARRAY[NULL::date,NULL::date,NULL::date];
  v_time text;
  v_start_min integer;
  v_open_min integer;
  v_close_min integer;
  v_duration integer := 30;
  v_start timestamptz;
  v_end timestamptz;
  v_count integer := 0;
  v_recurrence text := pg_catalog.gen_random_uuid()::text;
  v_hours_row jsonb;
  v_from text;
  v_to text;
  v_open boolean;
  v_group_type text;
  v_now_min integer := extract(hour FROM (pg_catalog.clock_timestamp() AT TIME ZONE 'Africa/Cairo'))::integer*60
    + extract(minute FROM (pg_catalog.clock_timestamp() AT TIME ZONE 'Africa/Cairo'))::integer;
BEGIN
  IF p_sessions_total IS NULL OR p_sessions_total NOT BETWEEN 1 AND 150 THEN RAISE EXCEPTION 'INVALID_SESSION_COUNT' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_req FROM public.group_booking_requests WHERE id=p_request_id AND clinic_id=p_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_REQUEST_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v_req.status<>'pending' THEN RAISE EXCEPTION 'GROUP_REQUEST_NOT_PENDING' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_patient FROM public.patients WHERE id=v_req.patient_id AND clinic_id=p_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'GROUP_PATIENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.patient_evaluations e WHERE e.patient_id=v_req.patient_id AND e.clinic_id=p_clinic_id) THEN
    RAISE EXCEPTION 'SPECIALIST_EVALUATION_REQUIRED' USING ERRCODE='22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('clinic_appointment_schedule:'||p_clinic_id::text,0));
  SELECT * INTO v_settings FROM public.clinic_settings WHERE clinic_id=p_clinic_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'CLINIC_HOURS_NOT_CONFIGURED' USING ERRCODE='22023'; END IF;
  SELECT branch->'hours' INTO v_hours FROM jsonb_array_elements(coalesce(v_settings.branches,'[]'::jsonb)) branch
    WHERE branch->>'id'='main' AND jsonb_typeof(branch->'hours')='array' LIMIT 1;
  IF v_hours IS NULL THEN
    SELECT branch->'hours' INTO v_hours FROM jsonb_array_elements(coalesce(v_settings.branches,'[]'::jsonb)) branch
      WHERE jsonb_typeof(branch->'hours')='array' LIMIT 1;
  END IF;
  IF v_hours IS NULL AND pg_catalog.btrim(coalesce(v_settings.working_hours,'')) LIKE '[%' THEN v_hours:=v_settings.working_hours::jsonb; END IF;
  v_hours:=coalesce(v_hours,'[]'::jsonb);

  IF v_req.group_code='A' THEN
    v_day_keys:=ARRAY['saturday','monday','wednesday']; v_dow:=ARRAY[6,1,3];
  ELSE
    v_day_keys:=ARRAY['sunday','tuesday','thursday']; v_dow:=ARRAY[0,2,4];
  END IF;
  v_group_type:='جلسة مجموعة '||v_req.group_code;

  FOR v_idx IN 1..p_sessions_total LOOP
    v_pos:=((v_idx-1)%3)+1;
    v_key:=v_day_keys[v_pos];
    v_time:=v_req.selected_times->>v_key;
    v_start_min:=public._group_booking_time_minutes(v_time);
    IF v_idx<=3 THEN
      v_date:=(v_req.selected_dates->>v_key)::date;
    ELSE
      v_date:=v_last_dates[v_pos]+7;
    END IF;
    IF v_date IS NULL OR v_date<=v_current_date OR extract(dow FROM v_date)::integer<>v_dow[v_pos] THEN
      RAISE EXCEPTION 'INVALID_GROUP_DATE_FOR_SERIES' USING ERRCODE='22023';
    END IF;
    IF v_date=v_current_date AND v_start_min<=v_now_min+15 THEN RAISE EXCEPTION 'GROUP_BOOKING_TIME_EXPIRED' USING ERRCODE='22023'; END IF;

    v_hours_row:=NULL;
    SELECT item INTO v_hours_row FROM jsonb_array_elements(v_hours) item
      WHERE pg_catalog.lower(pg_catalog.btrim(item->>'day')) IN (
        v_key,
        CASE v_key WHEN 'sunday' THEN 'الأحد' WHEN 'monday' THEN 'الاثنين'
          WHEN 'tuesday' THEN 'الثلاثاء' WHEN 'wednesday' THEN 'الأربعاء'
          WHEN 'thursday' THEN 'الخميس' WHEN 'saturday' THEN 'السبت' END
      ) LIMIT 1;
    v_open:=coalesce((v_hours_row->>'isOpen')::boolean,false);
    v_from:=v_hours_row->>'from'; v_to:=v_hours_row->>'to';
    v_open_min:=public._group_booking_time_minutes(v_from);
    v_close_min:=public._group_booking_time_minutes(v_to);
    IF NOT v_open OR v_open_min IS NULL OR v_close_min IS NULL OR v_start_min<v_open_min OR v_start_min+v_duration>v_close_min THEN
      RAISE EXCEPTION 'GROUP_DAY_OUTSIDE_WORKING_HOURS: %',v_key USING ERRCODE='22023';
    END IF;

    v_start:=(v_date+v_time::time) AT TIME ZONE 'Africa/Cairo';
    v_end:=v_start+make_interval(mins=>v_duration);
    IF EXISTS(
      SELECT 1 FROM public.appointments a WHERE a.clinic_id=p_clinic_id
        AND pg_catalog.lower(coalesce(a.status,'')) NOT IN ('cancelled','canceled','ملغي','ملغى','rejected','منتهي','completed')
        AND NOT(coalesce(a.is_group_session,false)=true AND a.appointment_type=v_group_type AND a.patient_id<>v_req.patient_id)
        AND (
          (a.starts_at IS NOT NULL AND a.starts_at<v_end AND coalesce(a.ends_at,a.starts_at+interval '30 minutes')>v_start)
          OR (a.starts_at IS NULL AND a.date=v_date::text
            AND public._group_booking_time_minutes(a.time)<v_start_min+v_duration
            AND public._group_booking_time_minutes(a.time)
              +greatest(30,least(480,coalesce(nullif(pg_catalog.regexp_replace(a.duration,'[^0-9]','','g'),''),'30')::integer))>v_start_min)
        )
    ) THEN RAISE EXCEPTION 'GROUP_BOOKING_TIME_CONFLICT: % %',v_date,v_time USING ERRCODE='23P01'; END IF;

    INSERT INTO public.appointments(
      id,clinic_id,patient_id,patient_name,appointment_type,date,time,status,duration,
      start_time,end_time,starts_at,ends_at,recurrence_id,recurrence_index,recurrence_total,is_group_session
    ) VALUES(
      pg_catalog.gen_random_uuid()::text,p_clinic_id,v_req.patient_id,v_patient."nameAr",v_group_type,
      v_date::text,v_time,'مؤكد','30',v_start::text,v_end::text,v_start,v_end,v_recurrence,v_idx,p_sessions_total,true
    );
    v_count:=v_count+1;
    v_last_dates[v_pos]:=v_date;
  END LOOP;

  UPDATE public.patients SET "sessionsTotal"=p_sessions_total,updated_at=now() WHERE id=v_req.patient_id AND clinic_id=p_clinic_id;
  UPDATE public.group_booking_requests SET status='approved',sessions_total=p_sessions_total,recurrence_id=v_recurrence,
    approved_by=p_approved_by,approved_at=now(),updated_at=now() WHERE id=p_request_id AND clinic_id=p_clinic_id;
  INSERT INTO public.notifications(clinic_id,user_id,title_ar,title_en,body_ar,body_en,type,action_url)
  VALUES(p_clinic_id,NULL,'تم اعتماد المجموعة العلاجية','Group booking approved',
    'تم اعتماد طلب المريض '||v_patient."nameAr"||' وإنشاء '||p_sessions_total::text||' جلسة متكررة.',
    'Group request for '||v_patient."nameAr"||' approved with '||p_sessions_total::text||' recurring sessions.',
    'appointment','/appointments');
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_public_group_booking_request(uuid,text,integer,text,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_group_booking_request(uuid,text,integer,text,text,text,jsonb,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.approve_group_booking_request(uuid,uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.approve_group_booking_request(uuid,uuid,integer,text) TO service_role;
