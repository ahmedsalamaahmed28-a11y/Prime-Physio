-- RLS Patch: Ensure all policies are correctly applied
-- Paste this into Supabase SQL Editor and run

-- 1. Ensure is_platform_admin function exists
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.platform_admins
    where email = current_setting('request.jwt.claims', true)::json ->> 'email'
  );
$$;

-- 1.5. Security definer function to get clinic_id without triggering RLS on staff
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

-- 2. Drop conflicting old policies
do $$
declare
  tbl text;
  tables text[] := array['clinic_settings', 'staff', 'patients', 'appointments', 'invoices', 'sessions', 'rom_assessments', 'mmt_assessments', 'gait_tests', 'balance_tests', 'special_tests', 'patient_nutrition', 'audit_logs', 'subscriptions', 'clinics', 'platform_admins', 'treatment_templates', 'app_key_values'];
  extra text[] := array['anyone_can_read_app_key_values', 'platform_admin_insert_app_key_values', 'platform_admin_update_app_key_values', 'platform_admin_delete_app_key_values'];
begin
  foreach tbl in array tables
  loop
    execute format('drop policy if exists "service role full access %s" on public.%I', tbl, tbl);
    execute format('drop policy if exists "platform_admin_bypass" on public.%I', tbl, tbl);
    execute format('drop policy if exists "clinic_access" on public.%I', tbl, tbl);
  end loop;
  -- Drop app_key_values-specific policies that don't follow the naming pattern
  foreach tbl in array extra
  loop
    execute format('drop policy if exists %I on public.app_key_values', tbl);
  end loop;
end;
$$;

-- 3. Create clinic-scoped policies for tenant tables (except staff, which needs special handling)
do $$
declare
  tables text[] := array['clinic_settings', 'patients', 'appointments', 'invoices', 'sessions', 'rom_assessments', 'mmt_assessments', 'gait_tests', 'balance_tests', 'special_tests', 'patient_nutrition', 'audit_logs', 'subscriptions'];
  tbl text;
begin
  foreach tbl in array tables
  loop
    execute format('
      create policy "platform_admin_bypass" on public.%I
      for all using (public.is_platform_admin() or auth.role() = ''service_role'')
      with check (public.is_platform_admin() or auth.role() = ''service_role'')
    ', tbl);

    execute format('
      create policy "clinic_access" on public.%I
      for all using (
        clinic_id = (
          select clinic_id from public.staff
          where email = current_setting(''request.jwt.claims'', true)::json ->> ''email''
          limit 1
        )
      )
      with check (
        clinic_id = (
          select clinic_id from public.staff
          where email = current_setting(''request.jwt.claims'', true)::json ->> ''email''
          limit 1
        )
      )
    ', tbl);
  end loop;
end;
$$;

-- 3.5. Staff table needs special clinic_access policy using security definer function
-- to avoid infinite recursion (the subquery would otherwise trigger RLS on staff)
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

-- 4. Policies for clinics table
create policy "platform_admin_bypass" on public.clinics
  for all using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

create policy "clinic_access" on public.clinics
  for select using (
    public.is_platform_admin() or auth.role() = 'service_role'
    or
    id = public.get_my_clinic_id()
  );

-- 5. Policies for platform_admins table
create policy "platform_admin_bypass" on public.platform_admins
  for all using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

-- 6. app_key_values: readable by all, writable only by platform_admins
create policy "anyone_can_read_app_key_values" on public.app_key_values
  for select using (true);

create policy "platform_admin_insert_app_key_values" on public.app_key_values
  for insert with check (public.is_platform_admin() or auth.role() = 'service_role');

create policy "platform_admin_update_app_key_values" on public.app_key_values
  for update using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

create policy "platform_admin_delete_app_key_values" on public.app_key_values
  for delete using (public.is_platform_admin() or auth.role() = 'service_role');

-- 7. treatment_templates: shared across clinics, readable by all
create policy "platform_admin_bypass" on public.treatment_templates
  for all using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

create policy "clinic_access" on public.treatment_templates
  for select using (true);
