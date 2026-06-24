
-- SQL Fix for Schema Mismatch
-- Run this in your Supabase SQL Editor

-- 1. Drop the broken tables safely
drop table if exists public.sessions cascade;
drop table if exists public.appointments cascade;
drop table if exists public.invoices cascade;
drop table if exists public.patients cascade;

-- 2. Create patients table MATCHING EXACTLY what the frontend sends
create table public.patients (
    id text primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    "nameAr" text not null,
    phone text,
    gender text,
    age integer,
    address text,
    "activePackage" text,
    "sessionsUsed" integer default 0,
    "sessionsTotal" integer default 0,
    status text,
    occupation text,
    "emergencyContact" text,
    "emergencyPhone" text,
    doctor text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create sessions table
create table public.sessions (
    id text primary key default gen_random_uuid()::text,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    patient_id text references public.patients(id) on delete cascade not null,
    date text,
    diagnosis text,
    "vasScore" text,
    notes text,
    therapist text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create appointments table
create table public.appointments (
    id text primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    patient_id text references public.patients(id) on delete cascade not null,
    patient_name text,
    doctor_name text,
    appointment_type text,
    date text,
    time text,
    status text,
    price text,
    therapist text,
    duration text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create invoices table
create table public.invoices (
    id text primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    patient_id text references public.patients(id) on delete cascade not null,
    patient_name text,
    description text,
    amount text,
    status text,
    payment_method text,
    date text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Apply Permissive RLS to all created tables
do \$\$
declare
  tables text[] := array['patients', 'appointments', 'invoices', 'sessions'];
  tbl text;
begin
  foreach tbl in array tables
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists "clinic_access" on public.%I', tbl);
    execute format('create policy "clinic_access" on public.%I for all using (true) with check (true)', tbl);
  end loop;
end;
\$\$;
