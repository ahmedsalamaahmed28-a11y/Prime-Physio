create extension if not exists pgcrypto;

-- === Auth accounts (for NextAuth Credentials) ===
create table if not exists public.auth_accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.auth_accounts enable row level security;
drop policy if exists "service_role_access" on public.auth_accounts;
create policy "service_role_access" on public.auth_accounts
  for all to service_role using (true) with check (true);

create index if not exists idx_auth_accounts_email on public.auth_accounts (email);

-- === Clinic settings ===
create table if not exists public.clinic_settings (
  id uuid primary key default gen_random_uuid(),
  user_id text default 'default',
  clinic_name text,
  phone text,
  address text,
  working_hours text,
  city text,
  country text,
  logo_url text,
  branches jsonb not null default '[]'::jsonb,
  default_exam_price numeric not null default 500,
  default_session_price numeric not null default 300,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Staff ===
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null,
  permissions text,
  phone text,
  date_joined date default current_date,
  status text not null default 'نشط',
  specialty text,
  rating numeric not null default 5,
  active_patients integer not null default 0,
  today_sessions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Patients ===
create table if not exists public.patients (
  id text primary key,
  nameAr text,
  nameEn text,
  phone text,
  age integer,
  gender text,
  diagnosis text,
  status text,
  branch text,
  assignedDoctor text,
  packageName text,
  packageSessions integer,
  remainingSessions integer,
  totalPaid numeric default 0,
  totalDue numeric default 0,
  lastVisit date,
  nextAppointment timestamptz,
  medical_history jsonb not null default '{}'::jsonb,
  active_protocol jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Appointments ===
create table if not exists public.appointments (
  id text primary key default ('A-' || extract(epoch from now())::bigint || '-' || floor(random() * 10000)::int),
  patient_id text references public.patients(id) on delete set null,
  patient_name text,
  therapist text,
  date date,
  time text,
  duration integer default 45,
  type text,
  status text not null default 'مؤكد',
  notes text,
  day integer,
  branch text,
  price numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Invoices ===
create table if not exists public.invoices (
  id text primary key default ('INV-' || extract(epoch from now())::bigint || '-' || floor(random() * 10000)::int),
  patient_id text references public.patients(id) on delete set null,
  patient_name text,
  amount numeric not null default 0,
  paid numeric not null default 0,
  remaining numeric generated always as (amount - paid) stored,
  type text,
  status text not null default 'غير مدفوع',
  date date default current_date,
  due_date date,
  appointment_id text references public.appointments(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Sessions ===
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade,
  date date not null default current_date,
  diagnosis text,
  vasScore integer,
  exercises jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === ROM assessments ===
create table if not exists public.rom_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade,
  joint text,
  movement text,
  value numeric,
  side text,
  notes text,
  created_at timestamptz not null default now()
);

-- === MMT assessments ===
create table if not exists public.mmt_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade,
  muscle text,
  grade text,
  side text,
  notes text,
  created_at timestamptz not null default now()
);

-- === Gait tests ===
create table if not exists public.gait_tests (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade,
  test_name text,
  result text,
  notes text,
  created_at timestamptz not null default now()
);

-- === Balance tests ===
create table if not exists public.balance_tests (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade,
  test_name text,
  result text,
  notes text,
  created_at timestamptz not null default now()
);

-- === Special tests ===
create table if not exists public.special_tests (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade,
  test_name text,
  result text,
  notes text,
  created_at timestamptz not null default now()
);

-- === Treatment templates ===
create table if not exists public.treatment_templates (
  id text primary key,
  kind text not null default 'clinical_library',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Patient nutrition ===
create table if not exists public.patient_nutrition (
  patient_id text primary key references public.patients(id) on delete cascade,
  weight numeric,
  height numeric,
  waist numeric,
  hip numeric,
  gender text,
  diet_plan jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- === Audit logs ===
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- === App key values (for OTP, UI settings, etc) ===
create table if not exists public.app_key_values (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- === Subscriptions ===
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  plan_name text not null,
  plan_price numeric not null default 0,
  status text not null default 'active',
  order_id text,
  transaction_id text,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Platform admins ===
create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- === Clinics ===
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  admin_email text not null unique,
  phone text,
  address text,
  city text,
  country text,
  logo_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Add clinic_id to all tenant tables ===
alter table public.staff add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.clinic_settings add column if not exists clinic_id uuid references public.clinics(id) on delete cascade unique;
alter table public.clinic_settings alter column user_id drop not null;
alter table public.patients add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.appointments add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.invoices add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.sessions add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.rom_assessments add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.mmt_assessments add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.gait_tests add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.balance_tests add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.special_tests add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.patient_nutrition add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.audit_logs add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;
alter table public.subscriptions add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;

-- === Indexes ===
create index if not exists idx_staff_clinic on public.staff(clinic_id);
create index if not exists idx_clinic_settings_clinic on public.clinic_settings(clinic_id);
create index if not exists idx_patients_clinic on public.patients(clinic_id);
create index if not exists idx_appointments_clinic on public.appointments(clinic_id);
create index if not exists idx_invoices_clinic on public.invoices(clinic_id);
create index if not exists idx_sessions_clinic on public.sessions(clinic_id);

-- === Updated_at trigger ===
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  if to_jsonb(new) ? 'updated_at' then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists touch_clinic_settings_updated_at on public.clinic_settings;
create trigger touch_clinic_settings_updated_at before update on public.clinic_settings
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_staff_updated_at on public.staff;
create trigger touch_staff_updated_at before update on public.staff
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_patients_updated_at on public.patients;
create trigger touch_patients_updated_at before update on public.patients
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_appointments_updated_at on public.appointments;
create trigger touch_appointments_updated_at before update on public.appointments
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_invoices_updated_at on public.invoices;
create trigger touch_invoices_updated_at before update on public.invoices
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_subscriptions_updated_at on public.subscriptions;
create trigger touch_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- === RLS: Enable on all tables ===
alter table public.clinic_settings enable row level security;
alter table public.staff enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.invoices enable row level security;
alter table public.sessions enable row level security;
alter table public.rom_assessments enable row level security;
alter table public.mmt_assessments enable row level security;
alter table public.gait_tests enable row level security;
alter table public.balance_tests enable row level security;
alter table public.special_tests enable row level security;
alter table public.treatment_templates enable row level security;
alter table public.patient_nutrition enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_key_values enable row level security;
alter table public.subscriptions enable row level security;
alter table public.platform_admins enable row level security;
alter table public.clinics enable row level security;

-- === Helper: is_platform_admin ===
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

-- === Helper: get_clinic_id (bypasses RLS to avoid recursion) ===
create or replace function public.get_clinic_id_for_email(target_email text)
returns uuid
language sql
stable
security definer
as $$
  select clinic_id from public.staff where email = target_email limit 1;
$$;

-- === Drop all existing policies ===
do $$ declare tbl text; tables text[] := array['clinic_settings', 'staff', 'patients', 'appointments', 'invoices', 'sessions', 'rom_assessments', 'mmt_assessments', 'gait_tests', 'balance_tests', 'special_tests', 'patient_nutrition', 'audit_logs', 'subscriptions', 'treatment_templates', 'app_key_values', 'clinics', 'platform_admins']; begin foreach tbl in array tables loop execute format('drop policy if exists "service role full access %s" on public.%I', tbl, tbl); execute format('drop policy if exists "platform_admin_bypass" on public.%I', tbl); execute format('drop policy if exists "clinic_access" on public.%I', tbl); end loop; end; $$;

-- === Service role policies (for admin client) ===
do $$ declare tbl text; tables text[] := array['clinic_settings', 'staff', 'patients', 'appointments', 'invoices', 'sessions', 'rom_assessments', 'mmt_assessments', 'gait_tests', 'balance_tests', 'special_tests', 'patient_nutrition', 'audit_logs', 'subscriptions', 'treatment_templates', 'app_key_values', 'clinics']; begin foreach tbl in array tables loop execute format('create policy "service_role_access_%s" on public.%I for all to service_role using (true) with check (true)', tbl, tbl); end loop; end; $$;
create policy "service_role_access_platform_admins" on public.platform_admins for all to service_role using (true) with check (true);
create policy "service_role_access_auth_accounts" on public.auth_accounts for all to service_role using (true) with check (true);

-- === Platform admin bypass policies ===
do $$ declare tbl text; tables text[] := array['clinic_settings', 'staff', 'patients', 'appointments', 'invoices', 'sessions', 'rom_assessments', 'mmt_assessments', 'gait_tests', 'balance_tests', 'special_tests', 'patient_nutrition', 'audit_logs', 'subscriptions', 'treatment_templates', 'app_key_values', 'clinics']; begin foreach tbl in array tables loop execute format('create policy "platform_admin_bypass" on public.%I for all using (public.is_platform_admin() or auth.role() = ''service_role'') with check (public.is_platform_admin() or auth.role() = ''service_role'')', tbl); end loop; end; $$;

-- === Clinic-scoped policies ===
do $$ declare tbl text; tables text[] := array['clinic_settings', 'staff', 'patients', 'appointments', 'invoices', 'sessions', 'rom_assessments', 'mmt_assessments', 'gait_tests', 'balance_tests', 'special_tests', 'patient_nutrition', 'audit_logs', 'subscriptions']; begin foreach tbl in array tables loop execute format('create policy "clinic_access" on public.%I for all using (clinic_id = public.get_clinic_id_for_email(current_setting(''request.jwt.claims'', true)::json ->> ''email'')) with check (clinic_id = public.get_clinic_id_for_email(current_setting(''request.jwt.claims'', true)::json ->> ''email''))', tbl); end loop; end; $$;

-- === Clinics specific policies ===
create policy "clinic_access" on public.clinics
  for select using (id = public.get_clinic_id_for_email(current_setting('request.jwt.claims', true)::json ->> 'email'));

-- === Platform admins specific policy ===
create policy "platform_admin_bypass" on public.platform_admins
  for all using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

-- === Treatment templates: all clinics can read ===
create policy "clinic_access" on public.treatment_templates
  for select using (true);

-- === Insert the platform super admin ===
insert into public.platform_admins (email)
values ('ahmedsalamaahmed21@gmail.com')
on conflict (email) do nothing;
