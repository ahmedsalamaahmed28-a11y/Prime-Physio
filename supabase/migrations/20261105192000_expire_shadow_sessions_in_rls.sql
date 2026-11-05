-- A Supabase shadow session must never outlive its owning NextAuth session.
CREATE OR REPLACE FUNCTION public.is_valid_auth_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN auth.jwt() -> 'app_metadata' ->> 'auth_source' = 'nextauth-shadow' THEN
      coalesce(
        (auth.jwt() -> 'app_metadata' ->> 'nextauth_expires_at') ~ '^[0-9]{1,12}$',
        false
      )
      AND (auth.jwt() -> 'app_metadata' ->> 'nextauth_expires_at')::bigint
          > floor(extract(epoch FROM now()))::bigint
    ELSE auth.uid() IS NOT NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.is_valid_auth_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_valid_auth_session() TO authenticated;

-- Restrictive policies are ANDed with existing tenant policies, so expired shadow
-- tokens cannot use any authenticated table grant even if a permissive policy allows it.
DO $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND (
        has_table_privilege('authenticated', c.oid, 'SELECT')
        OR has_table_privilege('authenticated', c.oid, 'INSERT')
        OR has_table_privilege('authenticated', c.oid, 'UPDATE')
        OR has_table_privilege('authenticated', c.oid, 'DELETE')
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS auth_session_expiry_guard ON public.%I',
      table_record.relname
    );
    EXECUTE format(
      'CREATE POLICY auth_session_expiry_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_valid_auth_session()) WITH CHECK (public.is_valid_auth_session())',
      table_record.relname
    );
  END LOOP;
END;
$$;