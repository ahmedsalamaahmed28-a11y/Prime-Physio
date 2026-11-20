create extension if not exists pgcrypto;

create table if not exists public.clinic_settings (
  id uuid primary key default gen_random_uuid(),
  user_id text unique default 'default',
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

create table if not exists public.mmt_assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade,
  muscle text,
  grade text,
  side text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.gait_tests (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade,
  test_name text,
  result text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.balance_tests (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade,
  test_name text,
  result text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.special_tests (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade,
  test_name text,
  result text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.treatment_templates (
  id text primary key,
  kind text not null default 'clinical_library',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_key_values (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if to_jsonb(new) ? 'updated_at' then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

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

drop policy if exists "service role full access clinic_settings" on public.clinic_settings;
create policy "service role full access clinic_settings" on public.clinic_settings for all using (true) with check (true);
drop policy if exists "service role full access staff" on public.staff;
create policy "service role full access staff" on public.staff for all using (true) with check (true);
drop policy if exists "service role full access patients" on public.patients;
create policy "service role full access patients" on public.patients for all using (true) with check (true);
drop policy if exists "service role full access appointments" on public.appointments;
create policy "service role full access appointments" on public.appointments for all using (true) with check (true);
drop policy if exists "service role full access invoices" on public.invoices;
create policy "service role full access invoices" on public.invoices for all using (true) with check (true);
drop policy if exists "service role full access sessions" on public.sessions;
create policy "service role full access sessions" on public.sessions for all using (true) with check (true);
drop policy if exists "service role full access rom_assessments" on public.rom_assessments;
create policy "service role full access rom_assessments" on public.rom_assessments for all using (true) with check (true);
drop policy if exists "service role full access mmt_assessments" on public.mmt_assessments;
create policy "service role full access mmt_assessments" on public.mmt_assessments for all using (true) with check (true);
drop policy if exists "service role full access gait_tests" on public.gait_tests;
create policy "service role full access gait_tests" on public.gait_tests for all using (true) with check (true);
drop policy if exists "service role full access balance_tests" on public.balance_tests;
create policy "service role full access balance_tests" on public.balance_tests for all using (true) with check (true);
drop policy if exists "service role full access special_tests" on public.special_tests;
create policy "service role full access special_tests" on public.special_tests for all using (true) with check (true);
drop policy if exists "service role full access treatment_templates" on public.treatment_templates;
create policy "service role full access treatment_templates" on public.treatment_templates for all using (true) with check (true);
drop policy if exists "service role full access patient_nutrition" on public.patient_nutrition;
create policy "service role full access patient_nutrition" on public.patient_nutrition for all using (true) with check (true);
drop policy if exists "service role full access audit_logs" on public.audit_logs;
create policy "service role full access audit_logs" on public.audit_logs for all using (true) with check (true);
drop policy if exists "service role full access app_key_values" on public.app_key_values;
create policy "service role full access app_key_values" on public.app_key_values for all using (true) with check (true);
drop policy if exists "service role full access subscriptions" on public.subscriptions;
create policy "service role full access subscriptions" on public.subscriptions for all using (true) with check (true);
