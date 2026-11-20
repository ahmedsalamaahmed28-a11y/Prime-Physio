-- Fix: RLS infinite recursion on `staff` table
-- The clinic_access policy on `staff` itself queries `staff`, causing infinite recursion
-- Solution: use a security definer function to bypass RLS in the subquery

-- 1. Create security definer function to get clinic_id for the current user
create or replace function public.get_my_clinic_id()
returns uuid
language sql
stable
security definer
as $$
  select clinic_id from public.staff
  where email = current_setting('request.jwt.claims', true)::json ->> 'email'
  limit 1;
$$;

-- 2. Drop the old clinic_access policy on staff
drop policy if exists "clinic_access" on public.staff;

-- 3. Recreate it using the security definer function
create policy "clinic_access" on public.staff
  for all using (
    public.is_platform_admin() or auth.role() = 'service_role'
    or
    clinic_id = public.get_my_clinic_id()
  )
  with check (
    public.is_platform_admin() or auth.role() = 'service_role'
    or
    clinic_id = public.get_my_clinic_id()
  );
