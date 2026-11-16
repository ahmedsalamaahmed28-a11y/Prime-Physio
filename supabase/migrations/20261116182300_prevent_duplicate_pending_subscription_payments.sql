-- Allow at most one pending subscription payment request per clinic.
create unique index if not exists subscription_payment_requests_one_pending_per_clinic_idx
  on public.subscription_payment_requests(clinic_id)
  where status = 'pending';
