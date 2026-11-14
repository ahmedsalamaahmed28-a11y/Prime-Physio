-- Include clinic owners in user quotas and serialize concurrent quota checks.
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
  v_owner_count integer;
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

  perform pg_advisory_xact_lock(hashtextextended(new.clinic_id::text, 13));
  v_plan_code := private.get_clinic_plan_code(new.clinic_id);
  select max_active_users, max_total_users into v_max_active, v_max_total
  from private.subscription_plan_limits where plan_code = v_plan_code;

  select count(*) filter (where lower(coalesce(s.status,'')) in ('نشط','active','enabled')),
         count(*) filter (where lower(coalesce(s.status,'')) not in ('محذوف','deleted'))
    into v_active_count, v_total_count
  from public.staff s
  where s.clinic_id = new.clinic_id
    and not exists (
      select 1 from public.clinic_owners co
      where co.clinic_id = new.clinic_id
        and lower(btrim(co.owner_email)) = lower(btrim(s.email))
    );

  select count(*) into v_owner_count
  from public.clinic_owners co where co.clinic_id = new.clinic_id;
  v_active_count := v_active_count + v_owner_count;
  v_total_count := v_total_count + v_owner_count;

  if tg_op = 'UPDATE' and old.clinic_id = new.clinic_id
     and not exists (
       select 1 from public.clinic_owners co
       where co.clinic_id = new.clinic_id
         and lower(btrim(co.owner_email)) = lower(btrim(old.email))
     ) then
    v_old_active := lower(coalesce(old.status,'')) in ('نشط','active','enabled');
    v_old_total := lower(coalesce(old.status,'')) not in ('محذوف','deleted');
    if v_old_active then v_active_count := greatest(v_active_count - 1, 0); end if;
    if v_old_total then v_total_count := greatest(v_total_count - 1, 0); end if;
  end if;

  v_new_active := lower(coalesce(new.status,'')) in ('نشط','active','enabled');
  v_new_total := lower(coalesce(new.status,'')) not in ('محذوف','deleted');
  if exists (
    select 1 from public.clinic_owners co
    where co.clinic_id = new.clinic_id
      and lower(btrim(co.owner_email)) = lower(btrim(new.email))
  ) then
    v_new_active := false;
    v_new_total := false;
  end if;

  if v_new_total and v_max_total <> -1 and v_total_count + 1 > v_max_total then
    raise exception 'PLAN_LIMIT_TOTAL_USERS: this plan allows % total user accounts.', v_max_total using errcode = 'P0001';
  end if;
  if v_new_active and v_max_active <> -1 and v_active_count + 1 > v_max_active then
    raise exception 'PLAN_LIMIT_ACTIVE_USERS: this plan allows % active users.', v_max_active using errcode = 'P0001';
  end if;
  return new;
end;
$$;

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
  perform pg_advisory_xact_lock(hashtextextended(new.clinic_id::text, 19));
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
