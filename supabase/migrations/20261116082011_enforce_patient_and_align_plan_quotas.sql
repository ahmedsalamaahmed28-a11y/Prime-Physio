-- Make patient quotas part of the canonical private plan limits and enforce them
-- in PostgreSQL for every writer (including service-role API routes).
alter table private.subscription_plan_limits
  add column if not exists max_patients integer not null default -1;

update private.subscription_plan_limits
set max_patients = case plan_code
  when 'free' then 50
  when 'essential' then 200
  else -1
end;

alter table private.subscription_plan_limits
  drop constraint if exists subscription_plan_limits_patients_positive;
alter table private.subscription_plan_limits
  add constraint subscription_plan_limits_patients_positive
  check (max_patients = -1 or max_patients >= 0);

update public.subscription_plans
set max_sessions_per_month = case lower(name)
  when 'basic' then 2000
  when 'silver' then -1
  when 'gold' then -1
  else max_sessions_per_month
end
where lower(name) in ('basic', 'silver', 'gold');

create or replace function private.enforce_patient_subscription_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_code text;
  v_limit integer;
  v_count integer;
begin
  if new.clinic_id is null then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.clinic_id::text, 23));

  v_plan_code := private.get_clinic_plan_code(new.clinic_id);
  select max_patients into v_limit
  from private.subscription_plan_limits
  where plan_code = v_plan_code;

  if v_limit is null then
    raise exception 'Unknown subscription plan for patient quota.' using errcode = 'P0001';
  end if;
  if v_limit = -1 then return new; end if;

  select count(*) into v_count
  from public.patients p
  where p.clinic_id = new.clinic_id
    and (tg_op <> 'UPDATE' or p.id is distinct from new.id);

  if v_count + 1 > v_limit then
    raise exception 'PLAN_LIMIT_PATIENTS: this plan allows % patients.', v_limit using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_patient_subscription_limit on public.patients;
create trigger enforce_patient_subscription_limit
before insert or update of clinic_id on public.patients
for each row execute function private.enforce_patient_subscription_limit();

create or replace function public.get_clinic_subscription_limits(p_clinic_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(l)
  from private.subscription_plan_limits l
  where l.plan_code = private.get_clinic_plan_code(p_clinic_id);
$$;

revoke all on function private.enforce_patient_subscription_limit() from public, anon, authenticated;
revoke all on function public.get_clinic_subscription_limits(uuid) from public, anon, authenticated;
grant execute on function public.get_clinic_subscription_limits(uuid) to service_role;

create index if not exists patients_clinic_subscription_limit_idx
  on public.patients (clinic_id);
