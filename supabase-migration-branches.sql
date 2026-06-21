-- Add verified column to auth_accounts
alter table public.auth_accounts add column if not exists verified boolean not null default false;

-- Create branches table
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  short_name text not null,
  full_name text not null,
  slug text not null,
  logo_url text,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (clinic_id, slug)
);

-- Add RLS
alter table public.branches enable row level security;

-- Clinic access policy
create policy "clinic_access_branches" on public.branches
  for all using (
    clinic_id in (
      select clinic_id from public.staff where email = auth.jwt() ->> 'email'
    )
  );

-- Platform admin bypass
create policy "platform_admin_bypass_branches" on public.branches
  for all using (
    (select is_platform_admin())
  );
