-- Enforce the NextAuth shadow-session expiry guard as an AND condition.
-- A permissive guard is ineffective when another permissive tenant policy matches,
-- because PostgreSQL combines permissive policies with OR.
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'auth_session_expiry_guard'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS auth_session_expiry_guard ON public.%I', policy_row.tablename);
    EXECUTE format(
      'CREATE POLICY auth_session_expiry_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_valid_auth_session()) WITH CHECK (public.is_valid_auth_session())',
      policy_row.tablename
    );
  END LOOP;
END $$;
