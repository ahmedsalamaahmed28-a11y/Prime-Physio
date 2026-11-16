-- Canonical, server-only payment order ledger and atomic subscription activation.
create table if not exists public.subscription_payment_orders (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_email text not null,
  plan_code text not null check (plan_code in ('essential','medium','advanced','maximum')),
  billing_period text not null check (billing_period in ('monthly','yearly')),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  status text not null default 'pending' check (status in ('pending','paid','failed','expired')),
  paymob_intention_id text unique,
  paymob_order_id text unique,
  paymob_transaction_id text unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  paid_at timestamptz
);

create index if not exists subscription_payment_orders_clinic_created_idx
  on public.subscription_payment_orders (clinic_id, created_at desc);

alter table public.subscription_payment_orders enable row level security;
revoke all on public.subscription_payment_orders from public, anon, authenticated;
grant select, insert, update on public.subscription_payment_orders to service_role;

create or replace function public.activate_subscription_from_payment(
  p_order_id uuid,
  p_transaction_id text,
  p_amount_cents bigint,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.subscription_payment_orders%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_expected_price integer;
  v_new_subscription_id uuid;
  v_start timestamptz := now();
  v_end timestamptz;
begin
  if p_order_id is null
     or coalesce(p_transaction_id, '') !~ '^[0-9]+$'
     or p_amount_cents is null
     or upper(coalesce(p_currency, '')) <> 'EGP' then
    raise exception 'invalid_payment_payload' using errcode = '22023';
  end if;

  select * into v_order
  from public.subscription_payment_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'payment_order_not_found' using errcode = 'P0002';
  end if;

  if v_order.status = 'paid' then
    if v_order.paymob_transaction_id = p_transaction_id then
      return jsonb_build_object('success', true, 'duplicate', true, 'subscription_id',
        (select s.id from public.subscriptions s where s.order_id = v_order.paymob_order_id limit 1));
    end if;
    raise exception 'payment_order_already_paid' using errcode = '23505';
  end if;

  if v_order.status <> 'pending' or v_order.expires_at <= now() then
    raise exception 'payment_order_not_pending_or_expired' using errcode = '22023';
  end if;

  if v_order.amount_cents <> p_amount_cents or v_order.currency <> upper(p_currency) then
    raise exception 'payment_amount_or_currency_mismatch' using errcode = '22023';
  end if;

  if v_order.paymob_order_id is null then
    raise exception 'payment_order_not_linked_to_paymob' using errcode = '22023';
  end if;

  select * into v_plan
  from public.subscription_plans
  where lower(name) = v_order.plan_code and is_active = true
  limit 1;

  if not found then
    raise exception 'subscription_plan_unavailable' using errcode = '22023';
  end if;

  v_expected_price := case
    when v_order.billing_period = 'yearly' then v_plan.price_yearly
    else v_plan.price_monthly
  end;

  if v_expected_price * 100 <> v_order.amount_cents then
    raise exception 'subscription_price_changed_after_checkout' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.clinic_owners co
    join public.clinics c on c.id = co.clinic_id
    where co.clinic_id = v_order.clinic_id
      and lower(btrim(co.owner_email)) = lower(btrim(v_order.user_email))
      and lower(btrim(c.admin_email)) = lower(btrim(v_order.user_email))
      and c.is_active is distinct from false
      and lower(coalesce(c.status, 'active')) = 'active'
  ) then
    raise exception 'clinic_ownership_mismatch' using errcode = '42501';
  end if;

  v_end := case
    when v_order.billing_period = 'yearly' then v_start + interval '1 year'
    else v_start + interval '1 month'
  end;

  update public.subscriptions
  set status = 'canceled', updated_at = now()
  where clinic_id = v_order.clinic_id and status = 'active';

  insert into public.subscriptions (
    user_email, clinic_id, plan_name, plan_price, status,
    order_id, transaction_id, start_date, end_date, is_trial
  ) values (
    lower(btrim(v_order.user_email)), v_order.clinic_id, v_order.plan_code,
    v_expected_price, 'active', v_order.paymob_order_id,
    p_transaction_id, v_start, v_end, false
  )
  returning id into v_new_subscription_id;

  update public.subscription_payment_orders
  set status = 'paid',
      paymob_transaction_id = p_transaction_id,
      paid_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'duplicate', false,
    'subscription_id', v_new_subscription_id,
    'clinic_id', v_order.clinic_id,
    'plan_code', v_order.plan_code,
    'billing_period', v_order.billing_period
  );
end;
$function$;

revoke all on function public.activate_subscription_from_payment(uuid, text, bigint, text) from public, anon, authenticated;
grant execute on function public.activate_subscription_from_payment(uuid, text, bigint, text) to service_role;

create or replace function public.activate_paid_subscription(
  p_order_id text,
  p_transaction_id text,
  p_user_email text,
  p_clinic_id uuid,
  p_plan_name text,
  p_plan_price numeric,
  p_start_date timestamptz,
  p_end_date timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception 'legacy_activation_disabled_use_activate_subscription_from_payment'
    using errcode = '0A000';
end;
$function$;

revoke all on function public.activate_paid_subscription(text, text, text, uuid, text, numeric, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.activate_paid_subscription(text, text, text, uuid, text, numeric, timestamptz, timestamptz) to service_role;
