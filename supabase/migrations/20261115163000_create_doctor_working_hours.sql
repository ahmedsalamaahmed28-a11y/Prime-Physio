create table if not exists public.doctor_working_hours (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time without time zone not null,
  end_time time without time zone not null,
  is_working boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_working_hours_valid_range check (end_time > start_time),
  constraint doctor_working_hours_staff_day_unique unique (staff_id, weekday)
);
create index if not exists doctor_working_hours_clinic_day_idx
  on public.doctor_working_hours (clinic_id, weekday, is_working);
alter table public.doctor_working_hours enable row level security;
revoke all on public.doctor_working_hours from anon, authenticated;
comment on table public.doctor_working_hours is 'Per-therapist weekly working hours configured by clinic managers. Access through authenticated server APIs only.';