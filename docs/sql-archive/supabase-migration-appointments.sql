-- ============================================================
-- Fix appointments schema — add missing columns used by frontend
-- Run this ONCE in Supabase SQL Editor
-- ============================================================
-- The original schema had: date, time, therapist, type
-- Frontend code uses: start_time, end_time, doctor_name, appointment_type
-- This migration adds the missing columns and keeps existing ones
-- ============================================================

alter table public.appointments add column if not exists start_time timestamptz;
alter table public.appointments add column if not exists end_time timestamptz;
alter table public.appointments add column if not exists doctor_name text;
alter table public.appointments add column if not exists appointment_type text;

-- Migrate existing date+time data into start_time (if empty)
update public.appointments
set start_time = (date || ' ' || coalesce(time, '09:00'))::timestamp
where start_time is null and date is not null;
