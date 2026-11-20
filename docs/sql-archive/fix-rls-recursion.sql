-- Fix Infinite Recursion in RLS
-- Run this in Supabase SQL Editor

-- 1. Create a SECURITY DEFINER function to bypass RLS when looking up the user's clinic
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT clinic_id FROM public.staff
  WHERE email = current_setting('request.jwt.claims', true)::json ->> 'email'
  LIMIT 1;
$$;

-- 2. Drop the old recursive policies
DO $$
DECLARE
  tbl text;
  tables text[] := array['clinic_settings', 'staff', 'patients', 'appointments', 'invoices', 'sessions', 'rom_assessments', 'mmt_assessments', 'gait_tests', 'balance_tests', 'special_tests', 'patient_nutrition', 'audit_logs', 'subscriptions', 'clinics'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "clinic_access" ON public.%I', tbl);
  END LOOP;
END;
$$;

-- 3. Recreate policies using the new function
DO $$
DECLARE
  tbl text;
  tables text[] := array['clinic_settings', 'staff', 'patients', 'appointments', 'invoices', 'sessions', 'rom_assessments', 'mmt_assessments', 'gait_tests', 'balance_tests', 'special_tests', 'patient_nutrition', 'audit_logs', 'subscriptions'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('
      CREATE POLICY "clinic_access" ON public.%I
      FOR ALL USING (clinic_id = public.get_my_clinic_id())
      WITH CHECK (clinic_id = public.get_my_clinic_id())
    ', tbl);
  END LOOP;
END;
$$;

-- 4. Recreate the policy for the clinics table (which uses 'id' instead of 'clinic_id')
CREATE POLICY "clinic_access" ON public.clinics
  FOR SELECT USING (id = public.get_my_clinic_id());
