-- ============================================================
-- Fix RLS: Allow users to read their own staff record (by email)
-- This fixes the client-side enrichUserWithClinic fallback
-- ============================================================

-- Allow authenticated users to SELECT their own staff row
drop policy if exists "staff_self_read" on public.staff;
create policy "staff_self_read" on public.staff
  for select
  using (
    email = current_setting('request.jwt.claims', true)::json ->> 'email'
  );

-- Allow authenticated users to SELECT their own clinic
drop policy if exists "clinics_self_read" on public.clinics;
create policy "clinics_self_read" on public.clinics
  for select
  using (
    id = public.get_clinic_id_for_email(
      current_setting('request.jwt.claims', true)::json ->> 'email'
    )
    or
    id in (
      select clinic_id from public.staff
      where email = current_setting('request.jwt.claims', true)::json ->> 'email'
    )
  );

-- Allow authenticated users to SELECT their own subscription
drop policy if exists "subscriptions_self_read" on public.subscriptions;
create policy "subscriptions_self_read" on public.subscriptions
  for select
  using (
    clinic_id in (
      select clinic_id from public.staff
      where email = current_setting('request.jwt.claims', true)::json ->> 'email'
    )
  );

-- Allow authenticated users to SELECT their own branches
drop policy if exists "branches_self_read" on public.branches;
create policy "branches_self_read" on public.branches
  for select
  using (
    clinic_id in (
      select clinic_id from public.staff
      where email = current_setting('request.jwt.claims', true)::json ->> 'email'
    )
  );

-- Fix get_clinic_id_for_email: handle null email gracefully
create or replace function public.get_clinic_id_for_email(target_email text)
returns uuid
language sql
stable
security definer
as $$
  select clinic_id from public.staff
  where email = target_email
  limit 1;
$$;
