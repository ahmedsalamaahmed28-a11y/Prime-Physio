-- ============================================================
-- Prime Physio — Complete Database Fix Script
-- Run this ONCE in Supabase SQL Editor to fix all known issues
-- ============================================================
-- Fixes:
--   ✅ verified column on auth_accounts (needed for signup flow)
--   ✅ branches table (needed for centers page)
--   ✅ app_key_values public access (fixes 400 errors for appStorage)
--   ✅ staff self-read policy (RLS fix for enrichUserWithClinic)
--   ✅ platform_admin function (ensures RLS bypass works)
-- ============================================================

-- ============================================================
-- 1. Add verified column to auth_accounts (if missing)
-- ============================================================
alter table public.auth_accounts add column if not exists verified boolean not null default false;

-- ============================================================
-- 2. Create branches table (if not exists)
-- ============================================================
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

alter table public.branches enable row level security;

drop policy if exists "service_role_access_branches" on public.branches;
create policy "service_role_access_branches" on public.branches
  for all to service_role using (true) with check (true);

drop policy if exists "platform_admin_bypass_branches" on public.branches;
create policy "platform_admin_bypass_branches" on public.branches
  for all using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

drop policy if exists "clinic_access_branches" on public.branches;
create policy "clinic_access_branches" on public.branches
  for all using (
    clinic_id in (
      select clinic_id from public.staff where email = auth.jwt() ->> 'email'
    )
  )
  with check (
    clinic_id in (
      select clinic_id from public.staff where email = auth.jwt() ->> 'email'
    )
  );

-- ============================================================
-- 3. Fix app_key_values RLS — allow public (anon) access
--    Needed for appStorage (getAppValue / setAppValue) to work
--    from the frontend for NextAuth users (no Supabase JWT)
-- ============================================================
drop policy if exists "public_access_app_key_values" on public.app_key_values;
create policy "public_access_app_key_values" on public.app_key_values
  for all using (true) with check (true);

-- ============================================================
-- 4. Fix staff table RLS — allow users to read their own record
--    without needing a Supabase JWT (for enrichUserWithClinic)
-- ============================================================
drop policy if exists "self_access_staff" on public.staff;
create policy "self_access_staff" on public.staff
  for select using (auth.jwt() ->> 'email' = email);

-- ============================================================
-- 5. Ensure auth_accounts has proper service_role access
-- ============================================================
drop policy if exists "service_role_access_auth_accounts" on public.auth_accounts;
create policy "service_role_access_auth_accounts" on public.auth_accounts
  for all to service_role using (true) with check (true);

-- ============================================================
-- 6. Ensure is_platform_admin function exists
-- ============================================================
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.platform_admins
    where email = (auth.jwt() ->> 'email')
  );
$$;
