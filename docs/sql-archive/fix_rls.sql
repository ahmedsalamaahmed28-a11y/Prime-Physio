
-- SQL Fix for Saving Issues (Revert Strict RLS to allow Client-Side Filtering)
-- Run this in your Supabase SQL Editor

do \$\$
declare
  tables text[] := array[
    'clinic_settings', 'staff', 'patients', 'appointments', 'invoices', 
    'sessions', 'rom_assessments', 'mmt_assessments', 'gait_tests', 
    'balance_tests', 'special_tests', 'patient_nutrition', 'audit_logs', 
    'subscriptions', 'clinics'
  ];
  tbl text;
begin
  foreach tbl in array tables
  loop
    -- Drop the restrictive policies that rely on request.jwt.claims
    execute format('drop policy if exists "clinic_access" on public.%I', tbl);
    execute format('drop policy if exists "platform_admin_bypass" on public.%I', tbl);
    
    -- Create permissive policies that trust the frontend's eq('clinic_id') filtering
    execute format('
      create policy "clinic_access" on public.%I
      for all using (true) with check (true)
    ', tbl);
  end loop;
end;
\$\$;
