create table if not exists public.platform_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null check (action in ('payment_approved','payment_rejected')),
  payment_request_id uuid references public.subscription_payment_requests(id) on delete set null,
  clinic_id uuid references public.clinics(id) on delete set null,
  plan_code text,
  amount integer,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists platform_admin_audit_log_created_idx on public.platform_admin_audit_log(created_at desc);
alter table public.platform_admin_audit_log enable row level security;
revoke all on public.platform_admin_audit_log from public, anon, authenticated;
grant select, insert on public.platform_admin_audit_log to service_role;

insert into public.platform_admins(email) values ('ahmedsalamaahmed21@gmail.com') on conflict (email) do nothing;

create or replace function public.approve_subscription_payment(p_request_id uuid, p_admin_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_request public.subscription_payment_requests%rowtype;
  v_existing public.subscriptions%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_expected_amount integer;
  v_subscription_id uuid;
  v_period_months integer;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not exists (select 1 from public.platform_admins where lower(email)=lower(trim(p_admin_email))) then raise exception 'Forbidden'; end if;
  select * into v_request from public.subscription_payment_requests where id=p_request_id and status='pending' for update;
  if not found then raise exception 'Payment request not found or already reviewed'; end if;
  select * into v_plan from public.subscription_plans where lower(name)=lower(v_request.plan_code) and is_active=true limit 1;
  if not found then raise exception 'Requested plan is unavailable'; end if;
  v_expected_amount := case when v_request.billing_period='yearly' then v_plan.price_yearly else v_plan.price_monthly end;
  if v_expected_amount is null or v_request.amount <> v_expected_amount then raise exception 'Payment amount does not match the current plan price'; end if;
  if not exists (select 1 from public.clinics c where c.id=v_request.clinic_id and lower(trim(c.admin_email))=lower(trim(v_request.user_email)) and c.is_active is distinct from false and lower(coalesce(c.status,'active'))='active') then raise exception 'Clinic ownership validation failed'; end if;
  if exists (select 1 from public.subscription_payment_requests p where p.id<>v_request.id and p.status='approved' and lower(trim(p.transfer_reference))=lower(trim(v_request.transfer_reference)) and p.payment_method=v_request.payment_method) then raise exception 'Transfer reference has already been used'; end if;
  v_period_months := case when v_request.billing_period='yearly' then 12 else 1 end;
  select * into v_existing from public.subscriptions where clinic_id=v_request.clinic_id and status='active' order by created_at desc limit 1 for update;
  if found and v_existing.plan_name=v_request.plan_code and (v_existing.end_date is null or v_existing.end_date>now()) then
    v_start := greatest(coalesce(v_existing.end_date,now()),now());
    v_end := v_start + make_interval(months=>v_period_months);
    update public.subscriptions set end_date=v_end,plan_price=v_expected_amount,transaction_id=v_request.transfer_reference,updated_at=now() where id=v_existing.id returning id into v_subscription_id;
  else
    if v_existing.id is not null then update public.subscriptions set status='expired',updated_at=now() where id=v_existing.id and status='active'; end if;
    v_start:=now(); v_end:=v_start+make_interval(months=>v_period_months);
    insert into public.subscriptions(user_email,clinic_id,plan_name,plan_price,status,order_id,transaction_id,start_date,end_date,is_trial)
    values(lower(trim(v_request.user_email)),v_request.clinic_id,v_request.plan_code,v_expected_amount,'active','manual-'||replace(v_request.id::text,'-',''),v_request.transfer_reference,v_start,v_end,false)
    returning id into v_subscription_id;
  end if;
  update public.subscription_payment_requests set status='approved',reviewed_by=lower(trim(p_admin_email)),reviewed_at=now(),updated_at=now(),rejection_reason=null where id=v_request.id;
  insert into public.platform_admin_audit_log(admin_email,action,payment_request_id,clinic_id,plan_code,amount,details)
  values(lower(trim(p_admin_email)),'payment_approved',v_request.id,v_request.clinic_id,v_request.plan_code,v_expected_amount,
    jsonb_build_object('subscription_id',v_subscription_id,'billing_period',v_request.billing_period,'payment_method',v_request.payment_method,'transfer_reference',v_request.transfer_reference));
  return v_subscription_id;
end; $$;

create or replace function public.reject_subscription_payment(p_request_id uuid,p_admin_email text,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare v_request public.subscription_payment_requests%rowtype;
begin
  if not exists(select 1 from public.platform_admins where lower(email)=lower(trim(p_admin_email))) then raise exception 'Forbidden'; end if;
  if length(trim(coalesce(p_reason,'')))<4 then raise exception 'A rejection reason is required'; end if;
  select * into v_request from public.subscription_payment_requests where id=p_request_id and status='pending' for update;
  if not found then raise exception 'Payment request not found or already reviewed'; end if;
  update public.subscription_payment_requests set status='rejected',reviewed_by=lower(trim(p_admin_email)),reviewed_at=now(),updated_at=now(),rejection_reason=trim(p_reason) where id=v_request.id;
  insert into public.platform_admin_audit_log(admin_email,action,payment_request_id,clinic_id,plan_code,amount,details)
  values(lower(trim(p_admin_email)),'payment_rejected',v_request.id,v_request.clinic_id,v_request.plan_code,v_request.amount,
    jsonb_build_object('reason',trim(p_reason),'payment_method',v_request.payment_method,'transfer_reference',v_request.transfer_reference));
end; $$;
revoke all on function public.approve_subscription_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.approve_subscription_payment(uuid,text) to service_role;
revoke all on function public.reject_subscription_payment(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reject_subscription_payment(uuid,text,text) to service_role;
