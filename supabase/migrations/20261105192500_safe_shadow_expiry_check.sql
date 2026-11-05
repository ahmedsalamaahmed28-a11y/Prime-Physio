CREATE OR REPLACE FUNCTION public.is_valid_auth_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN auth.jwt() -> 'app_metadata' ->> 'auth_source' = 'nextauth-shadow' THEN
      CASE
        WHEN (auth.jwt() -> 'app_metadata' ->> 'nextauth_expires_at') ~ '^[0-9]{1,12}$'
        THEN (auth.jwt() -> 'app_metadata' ->> 'nextauth_expires_at')::bigint
             > floor(extract(epoch FROM now()))::bigint
        ELSE false
      END
    ELSE auth.uid() IS NOT NULL
  END;
$$;
REVOKE ALL ON FUNCTION public.is_valid_auth_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_valid_auth_session() TO authenticated;