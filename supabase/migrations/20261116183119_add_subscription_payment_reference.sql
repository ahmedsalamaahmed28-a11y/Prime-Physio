-- Give each subscription payment request a unique platform reference.
alter table public.subscription_payment_requests
  add column if not exists platform_reference text;

update public.subscription_payment_requests
set platform_reference = 'PP-OLD-' || upper(replace(id::text, '-', ''))
where platform_reference is null;

alter table public.subscription_payment_requests
  alter column platform_reference set not null;

create unique index if not exists subscription_payment_requests_platform_reference_uidx
  on public.subscription_payment_requests(platform_reference);
