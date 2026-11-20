-- ════════════════════════════════════════════════════════════════════
-- Multi-Tenant Migration: Prime Physio SaaS Platform
-- ════════════════════════════════════════════════════════════════════
-- Run this in Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- 1. Platform super admins table (system owners who see all clinics)
create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
drop policy if exists "service role full access platform_admins" on public.platform_admins;
create policy "service role full access platform_admins" on public.platform_admins for all using (true) with check (true);

-- Insert the platform super admin (YOU — the system owner)
-- Change this email to YOUR actual email
insert into public.platform_admins (email)
values ('ahmedsalamaahmed21@gmail.com')
on conflict (email) do nothing;

-- 2. Clinics table (one row per tenant)
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  admin_email text not null unique,     -- the clinic owner's email
  phone text,
  address text,
  city text,
  country text,
  logo_url text,
  status text not null default 'active', -- active / suspended / cancelled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clinics enable row level security;
drop policy if exists "service role full access clinics" on public.clinics;
create policy "service role full access clinics" on public.clinics for all using (true) with check (true);

-- 3. Add clinic_id to all tenant-specific tables
-- Staff
alter table public.staff add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_staff_clinic on public.staff(clinic_id);

-- Clinic settings (now per-clinic instead of per-user)
alter table public.clinic_settings add column if not exists clinic_id uuid references public.clinics(id) on delete cascade unique;
alter table public.clinic_settings alter column user_id drop not null;
create index if not exists idx_clinic_settings_clinic on public.clinic_settings(clinic_id);

-- Patients
alter table public.patients add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_patients_clinic on public.patients(clinic_id);

-- Appointments
alter table public.appointments add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_appointments_clinic on public.appointments(clinic_id);

-- Invoices
alter table public.invoices add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_invoices_clinic on public.invoices(clinic_id);

-- Sessions
alter table public.sessions add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_sessions_clinic on public.sessions(clinic_id);

-- ROM assessments
alter table public.rom_assessments add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_rom_assessments_clinic on public.rom_assessments(clinic_id);

-- MMT assessments
alter table public.mmt_assessments add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_mmt_assessments_clinic on public.mmt_assessments(clinic_id);

-- Gait tests
alter table public.gait_tests add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_gait_tests_clinic on public.gait_tests(clinic_id);

-- Balance tests
alter table public.balance_tests add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_balance_tests_clinic on public.balance_tests(clinic_id);

-- Special tests
alter table public.special_tests add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_special_tests_clinic on public.special_tests(clinic_id);

-- Patient nutrition
alter table public.patient_nutrition add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_patient_nutrition_clinic on public.patient_nutrition(clinic_id);

-- Audit logs
alter table public.audit_logs add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_audit_logs_clinic on public.audit_logs(clinic_id);

-- Subscriptions (now per-clinic)
alter table public.subscriptions add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
create index if not exists idx_subscriptions_clinic on public.subscriptions(clinic_id);

-- 4. Migrate existing data to a default clinic
-- This creates a clinic for your existing data (Prime Physio)
do $$
declare
  v_clinic_id uuid;
  v_admin_email text;
begin
  -- Get the current admin email from app_key_values
  select value ->> 'email' into v_admin_email
  from public.app_key_values
  where key = 'current_user';

  -- If no admin email found, use a fallback
  if v_admin_email is null then
    v_admin_email := 'admin@prime-physio.com';
  end if;

  -- Check if a clinic already exists (to make migration re-runnable)
  select id into v_clinic_id from public.clinics
  where admin_email = v_admin_email
  limit 1;

  -- Create default clinic if not exists
  if v_clinic_id is null then
    insert into public.clinics (name, name_en, admin_email, phone, address, city, country)
    values (
      coalesce((select clinic_name from public.clinic_settings limit 1), 'Prime Physio'),
      'Prime Physio',
      v_admin_email,
      (select phone from public.clinic_settings limit 1),
      (select address from public.clinic_settings limit 1),
      (select city from public.clinic_settings limit 1),
      (select country from public.clinic_settings limit 1)
    )
    returning id into v_clinic_id;
  end if;

  -- Update existing records to point to the default clinic
  update public.staff set clinic_id = v_clinic_id where clinic_id is null;
  update public.clinic_settings set clinic_id = v_clinic_id where clinic_id is null;
  update public.patients set clinic_id = v_clinic_id where clinic_id is null;
  update public.appointments set clinic_id = v_clinic_id where clinic_id is null;
  update public.invoices set clinic_id = v_clinic_id where clinic_id is null;
  update public.sessions set clinic_id = v_clinic_id where clinic_id is null;
  update public.rom_assessments set clinic_id = v_clinic_id where clinic_id is null;
  update public.mmt_assessments set clinic_id = v_clinic_id where clinic_id is null;
  update public.gait_tests set clinic_id = v_clinic_id where clinic_id is null;
  update public.balance_tests set clinic_id = v_clinic_id where clinic_id is null;
  update public.special_tests set clinic_id = v_clinic_id where clinic_id is null;
  update public.patient_nutrition set clinic_id = v_clinic_id where clinic_id is null;
  update public.audit_logs set clinic_id = v_clinic_id where clinic_id is null;
  update public.subscriptions set clinic_id = v_clinic_id where clinic_id is null;
end;
$$;

-- 5. Update RLS policies to respect clinic_id
-- Drop the old open policies
do $$
declare
  tbl text;
  tables text[] := array['clinic_settings', 'staff', 'patients', 'appointments', 'invoices', 'sessions', 'rom_assessments', 'mmt_assessments', 'gait_tests', 'balance_tests', 'special_tests', 'patient_nutrition', 'audit_logs', 'subscriptions'];
begin
  foreach tbl in array tables
  loop
    execute format('drop policy if exists "service role full access %s" on public.%I', tbl, tbl);
  end loop;
end;
$$;

-- New policies: platform_admins see everything, clinic users see only their clinic
-- We create two policies per table:
--   1. Platform admin bypass (full access)
--   2. Clinic-scoped access (users see only their clinic_id)

-- Helper: returns true if the current user is a platform super admin
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

-- Drop the helper if we're recreating
drop policy if exists "platform_admin_bypass" on public.clinic_settings;
drop policy if exists "platform_admin_bypass" on public.staff;
drop policy if exists "platform_admin_bypass" on public.patients;
drop policy if exists "platform_admin_bypass" on public.appointments;
drop policy if exists "platform_admin_bypass" on public.invoices;
drop policy if exists "platform_admin_bypass" on public.sessions;
drop policy if exists "platform_admin_bypass" on public.rom_assessments;
drop policy if exists "platform_admin_bypass" on public.mmt_assessments;
drop policy if exists "platform_admin_bypass" on public.gait_tests;
drop policy if exists "platform_admin_bypass" on public.balance_tests;
drop policy if exists "platform_admin_bypass" on public.special_tests;
drop policy if exists "platform_admin_bypass" on public.patient_nutrition;
drop policy if exists "platform_admin_bypass" on public.audit_logs;
drop policy if exists "platform_admin_bypass" on public.subscriptions;
drop policy if exists "platform_admin_bypass" on public.clinics;
drop policy if exists "platform_admin_bypass" on public.platform_admins;
drop policy if exists "platform_admin_bypass" on public.treatment_templates;
drop policy if exists "platform_admin_bypass" on public.app_key_values;

drop policy if exists "clinic_access" on public.clinic_settings;
drop policy if exists "clinic_access" on public.staff;
drop policy if exists "clinic_access" on public.patients;
drop policy if exists "clinic_access" on public.appointments;
drop policy if exists "clinic_access" on public.invoices;
drop policy if exists "clinic_access" on public.sessions;
drop policy if exists "clinic_access" on public.rom_assessments;
drop policy if exists "clinic_access" on public.mmt_assessments;
drop policy if exists "clinic_access" on public.gait_tests;
drop policy if exists "clinic_access" on public.balance_tests;
drop policy if exists "clinic_access" on public.special_tests;
drop policy if exists "clinic_access" on public.patient_nutrition;
drop policy if exists "clinic_access" on public.audit_logs;
drop policy if exists "clinic_access" on public.subscriptions;

-- Generate clinic-scoped policies for each table
do $$
declare
  tables text[] := array['clinic_settings', 'staff', 'patients', 'appointments', 'invoices', 'sessions', 'rom_assessments', 'mmt_assessments', 'gait_tests', 'balance_tests', 'special_tests', 'patient_nutrition', 'audit_logs', 'subscriptions'];
  tbl text;
begin
  foreach tbl in array tables
  loop
    -- Platform admin bypass: full access
    execute format('
      create policy "platform_admin_bypass" on public.%I
      for all using (public.is_platform_admin() or auth.role() = ''service_role'')
      with check (public.is_platform_admin() or auth.role() = ''service_role'')
    ', tbl);

    -- Clinic-scoped access: users see only their clinic's data
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

drop policy if exists "clinic_access" on public.clinics;

-- Police for clinics table (platform_admin can see all, staff can see their own)
create policy "platform_admin_bypass" on public.clinics
  for all using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

create policy "clinic_access" on public.clinics
  for select using (
    id = (
      select clinic_id from public.staff
      where email = current_setting('request.jwt.claims', true)::json ->> 'email'
      limit 1
    )
  );

drop policy if exists "clinic_access" on public.platform_admins;

-- Police for platform_admins table (only platform_admins and service_role)
create policy "platform_admin_bypass" on public.platform_admins
  for all using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

-- app_key_values remains open to service_role (always)
drop policy if exists "service role full access app_key_values" on public.app_key_values;
create policy "service role full access app_key_values" on public.app_key_values
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "platform_admin_bypass" on public.app_key_values
  for all using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

-- treatment_templates (shared across clinics)
drop policy if exists "service role full access treatment_templates" on public.treatment_templates;
create policy "platform_admin_bypass" on public.treatment_templates
  for all using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

drop policy if exists "clinic_access" on public.treatment_templates;
create policy "clinic_access" on public.treatment_templates
  for select using (true);  -- all clinics can read shared templates

-- 6. New Supabase anon key should be used on the client (NOT service role key)
-- IMPORTANT: After this migration, update your .env.local:
--   NEXT_PUBLIC_SUPABASE_ANON_KEY = <your anon key>
--   SUPABASE_SERVICE_ROLE_KEY = <your service role key>  (server-side only)
-- And update src/lib/supabase.ts to use anon key on client
