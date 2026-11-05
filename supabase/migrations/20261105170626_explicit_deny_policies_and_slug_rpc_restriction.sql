-- These tables are accessed only through trusted server-side code or are not exposed to the browser.
-- Explicit deny policies document the intended client access model while preserving service_role access.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'auth_login_attempts',
    'auth_verification_codes',
    'clinic_backups',
    'clinic_services'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS deny_client_access ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY deny_client_access ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      table_name
    );
  END LOOP;
END $$;

-- Slug availability is called by a server-side API using service_role.
REVOKE EXECUTE ON FUNCTION public.is_slug_available(text) FROM authenticated;
