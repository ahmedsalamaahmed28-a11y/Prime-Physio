-- Add missing columns to existing tables
alter table public.staff add column if not exists specialty text;
alter table public.audit_logs add column if not exists module text;
