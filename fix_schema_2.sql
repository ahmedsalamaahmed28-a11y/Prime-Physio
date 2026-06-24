
-- SQL Fix 2 for missing columns
-- Run this in your Supabase SQL Editor

-- Add missing columns to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS end_time text;

-- Add missing column to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_name text;
