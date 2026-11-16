-- Reconciled historical migration.
-- Sensitive InstaPay/Vodafone Cash destination values are intentionally NOT stored in Git.
-- They remain configured in the production platform_settings row.

alter table public.platform_settings
  add column if not exists instapay_phone text,
  add column if not exists instapay_account text,
  add column if not exists instapay_link text,
  add column if not exists vodafone_cash_phone text,
  add column if not exists subscription_payments_enabled boolean not null default true;

create table if not exists public.subscription_payment_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_email text not null,
  plan_code text not null check (plan_code in ('essential','medium','advanced','maximum')),
  billing_period text not null check (billing_period in ('monthly','yearly')),
  amount integer not null check (amount > 0),
  payment_method text not null check (payment_method in ('instapay','vodafone_cash')),
  transfer_reference text not null,
  receipt_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_payment_requests_status_created_idx
  on public.subscription_payment_requests(status, created_at desc);
create index if not exists subscription_payment_requests_clinic_idx
  on public.subscription_payment_requests(clinic_id, created_at desc);

alter table public.subscription_payment_requests enable row level security;
revoke all on public.subscription_payment_requests from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'subscription-receipts',
  'subscription-receipts',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'];

create or replace function public.approve_subscription_payment(p_request_id uuid, p_admin_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.subscription_payment_requests%rowtype;
  v_existing public.subscriptions%rowtype;
  v_subscription_id uuid;
  v_period_months integer;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not exists (
    select 1 from public.platform_admins
    where lower(email) = lower(trim(p_admin_email))
  ) then
    raise exception 'Forbidden';
  end if;

  select * into v_request
  from public.subscription_payment_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Payment request not found or already reviewed';
  end if;

  v_period_months := case when v_request.billing_period = 'yearly' then 12 else 1 end;

  select * into v_existing
  from public.subscriptions
  where clinic_id = v_request.clinic_id and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if found
     and v_existing.plan_name = v_request.plan_code
     and (v_existing.end_date is null or v_existing.end_date > now()) then
    v_start := greatest(coalesce(v_existing.end_date, now()), now());
    v_end := v_start + make_interval(months => v_period_months);
    update public.subscriptions
      set end_date = v_end,
          plan_price = v_request.amount,
          transaction_id = v_request.transfer_reference,
          updated_at = now()
      where id = v_existing.id
      returning id into v_subscription_id;
  else
    if v_existing.id is not null then
      update public.subscriptions
        set status = 'expired', updated_at = now()
        where id = v_existing.id and status = 'active';
    end if;

    v_start := now();
    v_end := v_start + make_interval(months => v_period_months);
    insert into public.subscriptions (
      user_email, clinic_id, plan_name, plan_price, status,
      order_id, transaction_id, start_date, end_date, is_trial
    ) values (
      v_request.user_email, v_request.clinic_id, v_request.plan_code, v_request.amount, 'active',
      'manual-' || replace(v_request.id::text, '-', ''), v_request.transfer_reference,
      v_start, v_end, false
    ) returning id into v_subscription_id;
  end if;

  update public.subscription_payment_requests
    set status = 'approved', reviewed_by = lower(trim(p_admin_email)),
        reviewed_at = now(), updated_at = now(), rejection_reason = null
    where id = v_request.id;

  return v_subscription_id;
end;
$$;

revoke all on function public.approve_subscription_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_subscription_payment(uuid, text) to service_role;
