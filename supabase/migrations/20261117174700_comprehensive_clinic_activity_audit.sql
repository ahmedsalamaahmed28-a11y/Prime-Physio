create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  current_user_email text;
  current_user_name text;
  clinic uuid;
  old_row jsonb := '{}'::jsonb;
  new_row jsonb := '{}'::jsonb;
  entity_identifier text;
  event_details jsonb;
begin
  begin
    current_user_email := current_setting('request.jwt.claims', true)::jsonb ->> 'email';
    current_user_name := coalesce(
      current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'full_name',
      current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'name'
    );
  exception when others then
    current_user_email := null;
    current_user_name := null;
  end;

  if tg_op <> 'INSERT' then old_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_row := to_jsonb(new); end if;

  if tg_table_name = 'clinics' then
    clinic := coalesce(nullif(new_row ->> 'id', '')::uuid, nullif(old_row ->> 'id', '')::uuid);
  else
    clinic := coalesce(
      nullif(new_row ->> 'clinic_id', '')::uuid,
      nullif(old_row ->> 'clinic_id', '')::uuid
    );
  end if;

  entity_identifier := coalesce(
    new_row ->> 'id',
    new_row ->> 'patient_id',
    new_row ->> 'staff_id',
    old_row ->> 'id',
    old_row ->> 'patient_id',
    old_row ->> 'staff_id'
  );

  event_details := case
    when tg_op = 'UPDATE' then jsonb_build_object('message', 'تم تعديل السجل بنجاح')
    when tg_op = 'DELETE' then jsonb_build_object('message', 'تم حذف السجل')
    else jsonb_build_object('message', 'تم إنشاء سجل جديد')
  end;

  if tg_table_name = 'appointments' then
    event_details := event_details || jsonb_build_object(
      'before', case when tg_op = 'INSERT' then '{}'::jsonb else
        jsonb_strip_nulls(jsonb_build_object(
          'status', old_row -> 'status',
          'start_time', old_row -> 'start_time',
          'end_time', old_row -> 'end_time',
          'doctor_name', old_row -> 'doctor_name',
          'therapist_id', old_row -> 'therapist_id',
          'room_id', old_row -> 'room_id',
          'branch_id', old_row -> 'branch_id'
        )) end,
      'after', case when tg_op = 'DELETE' then '{}'::jsonb else
        jsonb_strip_nulls(jsonb_build_object(
          'status', new_row -> 'status',
          'start_time', new_row -> 'start_time',
          'end_time', new_row -> 'end_time',
          'doctor_name', new_row -> 'doctor_name',
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
  elsif tg_table_name = 'clinics' then
    event_details := event_details || jsonb_build_object(
      'clinic_id', coalesce(new_row ->> 'id', old_row ->> 'id'),
      'clinic_name', coalesce(new_row ->> 'name', old_row ->> 'name')
    );
  end if;

  if clinic is not null and not exists (select 1 from public.clinics where id = clinic) then
    if tg_table_name = 'clinics' and tg_op = 'DELETE' then
      clinic := null;
    elsif tg_op = 'DELETE' then
      return old;
    else
      return new;
    end if;
  end if;

  insert into public.audit_logs (
    user_email, user_name, action, module, entity, entity_id, details, clinic_id
  ) values (
    coalesce(current_user_email, 'system@primephysio.com'),
    coalesce(nullif(current_user_name, ''), 'موظف العيادة'),
    tg_op,
    tg_table_name,
    tg_table_name,
    entity_identifier,
    event_details,
    clinic
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

do $$
declare
  item record;
  trigger_name text;
begin
  for item in
    select distinct c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
      and c.column_name = 'clinic_id'
      and c.table_name not in ('audit_logs', 'platform_admin_audit_log')
  loop
    trigger_name := 'audit_activity_' || item.table_name;
    if not exists (
      select 1 from pg_trigger
      where tgrelid = format('public.%I', item.table_name)::regclass
        and tgname = trigger_name
        and not tgisinternal
    ) then
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.log_audit_event()',
        trigger_name, item.table_name
      );
    end if;
  end loop;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.clinics'::regclass
      and tgname = 'audit_activity_clinics'
      and not tgisinternal
  ) then
    create trigger audit_activity_clinics
      after insert or update or delete on public.clinics
      for each row execute function public.log_audit_event();
  end if;
end;
$$;

create index if not exists audit_logs_created_at_desc_idx
  on public.audit_logs (created_at desc);
create index if not exists audit_logs_clinic_created_at_desc_idx
  on public.audit_logs (clinic_id, created_at desc);
