create or replace function public.log_audit_event()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
  claims jsonb;
  actor_email text;
  actor_name text;
  affected_clinic uuid;
  old_row jsonb := '{}'::jsonb;
  new_row jsonb := '{}'::jsonb;
  record_id text;
  event_details jsonb;
begin
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    claims := '{}'::jsonb;
  end;

  actor_email := lower(coalesce(claims ->> 'email', ''));
  actor_name := coalesce(
    claims -> 'user_metadata' ->> 'full_name',
    claims -> 'user_metadata' ->> 'name',
    claims -> 'app_metadata' ->> 'full_name'
  );

  if tg_op <> 'INSERT' then old_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_row := to_jsonb(new); end if;

  affected_clinic := coalesce(
    nullif(new_row ->> 'clinic_id', '')::uuid,
    nullif(old_row ->> 'clinic_id', '')::uuid
  );
  record_id := coalesce(
    new_row ->> 'id', old_row ->> 'id',
    new_row ->> 'patient_id', old_row ->> 'patient_id',
    new_row ->> 'user_id', old_row ->> 'user_id'
  );

  if affected_clinic is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if auth.uid() is not null then
    if actor_email = '' or affected_clinic is distinct from public.get_my_clinic_id() then
      if tg_op = 'DELETE' then return old; else return new; end if;
    end if;
  end if;

  event_details := case tg_op
    when 'INSERT' then jsonb_build_object('message', 'تم إنشاء سجل جديد')
    when 'UPDATE' then jsonb_build_object('message', 'تم تعديل السجل')
    when 'DELETE' then jsonb_build_object('message', 'تم حذف السجل')
    else '{}'::jsonb
  end;

  if tg_table_name = 'appointments' then
    event_details := event_details || jsonb_build_object(
      'before', case when tg_op = 'INSERT' then '{}'::jsonb else
        jsonb_strip_nulls(jsonb_build_object(
          'status', old_row -> 'status',
          'start_time', old_row -> 'start_time',
          'end_time', old_row -> 'end_time',
          'therapist_id', old_row -> 'therapist_id',
          'room_id', old_row -> 'room_id',
          'branch_id', old_row -> 'branch_id'
        )) end,
      'after', case when tg_op = 'DELETE' then '{}'::jsonb else
        jsonb_strip_nulls(jsonb_build_object(
          'status', new_row -> 'status',
          'start_time', new_row -> 'start_time',
          'end_time', new_row -> 'end_time',
          'therapist_id', new_row -> 'therapist_id',
          'room_id', new_row -> 'room_id',
          'branch_id', new_row -> 'branch_id'
        )) end
    );
  elsif tg_table_name = 'invoices' then
    event_details := event_details || jsonb_build_object(
      'before', case when tg_op = 'INSERT' then '{}'::jsonb else
        jsonb_strip_nulls(jsonb_build_object(
          'status', old_row -> 'status',
          'payment_method', old_row -> 'payment_method',
          'date', old_row -> 'date'
        )) end,
      'after', case when tg_op = 'DELETE' then '{}'::jsonb else
        jsonb_strip_nulls(jsonb_build_object(
          'status', new_row -> 'status',
          'payment_method', new_row -> 'payment_method',
          'date', new_row -> 'date'
        )) end
    );
  end if;

  insert into public.audit_logs (
    user_email, user_name, action, module, entity, entity_id, details, clinic_id
  ) values (
    coalesce(nullif(actor_email, ''), 'system@primephysio.com'),
    coalesce(nullif(actor_name, ''), 'موظف النظام'),
    tg_op,
    tg_table_name,
    tg_table_name,
    record_id,
    event_details,
    affected_clinic
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'subscriptions',
    'clinic_owners',
    'appointment_group_participants',
    'treatment_plans',
    'patient_medical_records',
    'patient_attachments',
    'discharges'
  ]
  loop
    execute format('drop trigger if exists audit_activity_%I on public.%I', table_name, table_name);
    execute format(
      'create trigger audit_activity_%I after insert or update or delete on public.%I for each row execute function public.log_audit_event()',
      table_name, table_name
    );
  end loop;
end;
$$;