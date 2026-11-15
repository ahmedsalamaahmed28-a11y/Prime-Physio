-- The session-expiry guard must constrain access, not grant it.
-- As a PERMISSIVE ALL policy it OR-ed with tenant policies and bypassed clinic isolation.
-- RESTRICTIVE makes this validity check apply in addition to the table's tenant/role policies.
DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN
    SELECT DISTINCT schemaname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'auth_session_expiry_guard'
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      'auth_session_expiry_guard',
      policy_row.schemaname,
      policy_row.tablename
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_valid_auth_session()) WITH CHECK (public.is_valid_auth_session())',
      'auth_session_expiry_guard',
      policy_row.schemaname,
      policy_row.tablename
    );
  END LOOP;
END
$$;
