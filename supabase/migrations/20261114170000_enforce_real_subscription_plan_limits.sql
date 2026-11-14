-- Enforce subscription quotas in PostgreSQL so server routes and direct client writes
-- are subject to the same limits. Plan aliases preserve existing subscription names.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.subscription_plan_limits (
  plan_code text primary key,
  plan_names text[] not null unique,
  max_active_users integer not null,
  max_total_users integer not null,
  max_centers integer not null,
  max_sessions_per_month integer not null,
  max_storage_bytes bigint not null,
  constraint subscription_plan_limits_positive check (
    (max_active_users = -1 or max_active_users >= 0) and
    (max_total_users = -1 or max_total_users >= 0) and
    (max_centers = -1 or max_centers >= 1) and
    (max_sessions_per_month = -1 or max_sessions_per_month >= 0) and
    (max_storage_bytes = -1 or max_storage_bytes >= 0)
  )
);

insert into private.subscription_plan_limits
  (plan_code, plan_names, max_active_users, max_total_users, max_centers, max_sessions_per_month, max_storage_bytes)
values
  ('free',      array['basic','free','starter','المجانية','الباقة المجانية'], 20, 100, 1, 2000, 1073741824),
  ('essential', array['silver','essential','standard','الأساسية','الباقة الأساسية'], 100, 500, 1, -1, 10737418240),
  ('medium',    array['gold','medium','المتوسطة','الباقة المتوسطة'], 500, 1000, 2, -1, 21474836480),
  ('advanced',  array['advanced'], 5000, -1, 5, -1, 32212254720),
  ('maximum',   array['maximum'], -1, -1, 10, -1, 53687091200)
on conflict (plan_code) do update set
  plan_names = excluded.plan_names,
  max_active_users = excluded.max_active_users,
  max_total_users = excluded.max_total_users,
  max_centers = excluded.max_centers,
  max_sessions_per_month = excluded.max_sessions_per_month,
  max_storage_bytes = excluded.max_storage_bytes;

create or replace function private.get_clinic_plan_code(p_clinic_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select l.plan_code
    from public.subscriptions s
    join private.subscription_plan_limits l
      on lower(btrim(s.plan_name)) = any(l.plan_names)
    where s.clinic_id = p_clinic_id
      and lower(coalesce(s.status, '')) = 'active'
      and (s.end_date is null or s.end_date > now())
    order by s.created_at desc
    limit 1
  ), 'free');
$$;

create or replace function private.enforce_staff_subscription_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_code text;
  v_max_active integer;
  v_max_total integer;
  v_active_count integer;
  v_total_count integer;
  v_new_active boolean;
  v_new_total boolean;
  v_old_active boolean := false;
  v_old_total boolean := false;
begin
  if new.clinic_id is null then return new; end if;
  if tg_op = 'UPDATE'
     and new.clinic_id is not distinct from old.clinic_id
     and new.status is not distinct from old.status then
    return new;
  end if;

  v_plan_code := private.get_clinic_plan_code(new.clinic_id);
  select max_active_users, max_total_users into v_max_active, v_max_total
  from private.subscription_plan_limits where plan_code = v_plan_code;

  select count(*) filter (where lower(coalesce(status,'')) in ('نشط','active','enabled')),
         count(*) filter (where lower(coalesce(status,'')) not in ('محذوف','deleted'))
    into v_active_count, v_total_count
  from public.staff
  where clinic_id = new.clinic_id;

  if tg_op = 'UPDATE' and old.clinic_id = new.clinic_id then
    v_old_active := lower(coalesce(old.status,'')) in ('نشط','active','enabled');
    v_old_total := lower(coalesce(old.status,'')) not in ('محذوف','deleted');
    if v_old_active then v_active_count := greatest(v_active_count - 1, 0); end if;
    if v_old_total then v_total_count := greatest(v_total_count - 1, 0); end if;
  end if;

  v_new_active := lower(coalesce(new.status,'')) in ('نشط','active','enabled');
  v_new_total := lower(coalesce(new.status,'')) not in ('محذوف','deleted');

  if v_new_total and v_max_total <> -1 and v_total_count + 1 > v_max_total then
    raise exception 'PLAN_LIMIT_TOTAL_USERS: this plan allows % total user accounts.', v_max_total using errcode = 'P0001';
  end if;
  if v_new_active and v_max_active <> -1 and v_active_count + 1 > v_max_active then
    raise exception 'PLAN_LIMIT_ACTIVE_USERS: this plan allows % active users.', v_max_active using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_staff_subscription_limits on public.staff;
create trigger enforce_staff_subscription_limits
before insert or update of status, clinic_id on public.staff
for each row execute function private.enforce_staff_subscription_limits();

create or replace function private.enforce_session_subscription_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_code text;
  v_limit integer;
  v_count integer;
  v_start timestamptz := date_trunc('month', now());
begin
  if new.clinic_id is null then return new; end if;
  v_plan_code := private.get_clinic_plan_code(new.clinic_id);
  select max_sessions_per_month into v_limit
  from private.subscription_plan_limits where plan_code = v_plan_code;
  if v_limit = -1 then return new; end if;

  select count(*) into v_count
  from public.sessions s
  where s.clinic_id = new.clinic_id
    and s.created_at >= v_start
    and s.created_at < v_start + interval '1 month'
    and (tg_op <> 'UPDATE' or s.id is distinct from new.id);

  if v_count + 1 > v_limit then
    raise exception 'PLAN_LIMIT_SESSIONS: this plan allows % sessions per month.', v_limit using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_session_subscription_limit on public.sessions;
create trigger enforce_session_subscription_limit
before insert or update of clinic_id, created_at on public.sessions
for each row execute function private.enforce_session_subscription_limit();

create or replace function private.enforce_patient_storage_subscription_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic_id uuid;
  v_plan_code text;
  v_limit bigint;
  v_used bigint;
  v_new_size bigint;
begin
  if new.bucket_id <> 'patient-files' then return new; end if;
  begin
    v_clinic_id := split_part(new.name, '/', 1)::uuid;
  exception when others then
    raise exception 'Invalid patient-files storage path.' using errcode = 'P0001';
  end;

  v_plan_code := private.get_clinic_plan_code(v_clinic_id);
  select max_storage_bytes into v_limit
  from private.subscription_plan_limits where plan_code = v_plan_code;
  if v_limit = -1 then return new; end if;

  v_new_size := case
    when coalesce(new.metadata->>'size','') ~ '^[0-9]+$' then (new.metadata->>'size')::bigint
    else 0
  end;

  perform pg_advisory_xact_lock(hashtextextended(v_clinic_id::text, 7));
  select coalesce(sum(case
    when coalesce(o.metadata->>'size','') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint
    else 0 end), 0)
    into v_used
  from storage.objects o
  where o.bucket_id = 'patient-files'
    and split_part(o.name, '/', 1) = v_clinic_id::text
    and (tg_op <> 'UPDATE' or o.id is distinct from new.id);

  if v_used + v_new_size > v_limit then
    raise exception 'PLAN_LIMIT_STORAGE: this plan allows % bytes of patient-file storage.', v_limit using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_patient_storage_subscription_limit on storage.objects;
create trigger enforce_patient_storage_subscription_limit
before insert or update of bucket_id, name, metadata on storage.objects
for each row execute function private.enforce_patient_storage_subscription_limit();

create or replace function private.enforce_clinic_center_subscription_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_limit integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(lower(btrim(new.owner_email)), 0));

  select count(*) into v_count
  from public.clinic_owners co
  where lower(btrim(co.owner_email)) = lower(btrim(new.owner_email));

  select coalesce(max(l.max_centers), 1) into v_limit
  from public.clinic_owners co
  join public.subscriptions s on s.clinic_id = co.clinic_id
  join private.subscription_plan_limits l
    on lower(btrim(s.plan_name)) = any(l.plan_names)
  where lower(btrim(co.owner_email)) = lower(btrim(new.owner_email))
    and lower(coalesce(s.status,'')) = 'active'
    and (s.end_date is null or s.end_date > now());

  if v_limit <> -1 and v_count + 1 > v_limit then
    raise exception 'PLAN_LIMIT_CENTERS: this plan allows % centers for this owner.', v_limit using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_clinic_center_subscription_limit on public.clinic_owners;
create trigger enforce_clinic_center_subscription_limit
before insert on public.clinic_owners
for each row execute function private.enforce_clinic_center_subscription_limit();

create index if not exists staff_clinic_status_subscription_idx on public.staff (clinic_id, status);
create index if not exists sessions_clinic_created_subscription_idx on public.sessions (clinic_id, created_at);
create index if not exists clinic_owners_email_subscription_idx on public.clinic_owners (lower(owner_email));
create index if not exists subscriptions_clinic_status_created_subscription_idx on public.subscriptions (clinic_id, status, created_at desc);

revoke all on function private.get_clinic_plan_code(uuid) from public, anon, authenticated;
revoke all on function private.enforce_staff_subscription_limits() from public, anon, authenticated;
revoke all on function private.enforce_session_subscription_limit() from public, anon, authenticated;
revoke all on function private.enforce_patient_storage_subscription_limit() from public, anon, authenticated;
revoke all on function private.enforce_clinic_center_subscription_limit() from public, anon, authenticated;
grant execute on function private.get_clinic_plan_code(uuid) to service_role;
