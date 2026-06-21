-- Add missing columns to existing tables
alter table public.staff add column if not exists specialty text;
alter table public.audit_logs add column if not exists module text;

-- Create subscriptions table if not exists
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

alter table public.subscriptions enable row level security;
drop policy if exists "service role full access subscriptions" on public.subscriptions;
create policy "service role full access subscriptions" on public.subscriptions for all using (true) with check (true);

-- Add trial support
alter table public.subscriptions add column if not exists is_trial boolean not null default false;
