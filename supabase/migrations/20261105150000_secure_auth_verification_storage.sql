-- Keep browser preferences in localStorage; OTPs move to a server-only table.
CREATE TABLE IF NOT EXISTS public.auth_verification_codes (
  email text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('signup', 'password_reset')),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, purpose)
);

ALTER TABLE public.auth_verification_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_verification_codes FROM anon, authenticated;
GRANT ALL ON TABLE public.auth_verification_codes TO service_role;

CREATE OR REPLACE FUNCTION public.consume_auth_verification_code(
  p_email text,
  p_purpose text,
  p_code_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  matched boolean := false;
BEGIN
  UPDATE public.auth_verification_codes
  SET
    attempts = attempts + 1,
    consumed_at = CASE
      WHEN code_hash = p_code_hash THEN now()
      WHEN attempts + 1 >= 5 THEN now()
      ELSE consumed_at
    END
  WHERE email = lower(trim(p_email))
    AND purpose = p_purpose
    AND consumed_at IS NULL
    AND expires_at > now()
    AND attempts < 5
  RETURNING (code_hash = p_code_hash) INTO matched;

  RETURN coalesce(matched, false);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_auth_verification_code(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_auth_verification_code(text, text, text) TO service_role;

-- app_key_values is no longer accessed by browser clients. Keep server-side service_role access only.
DROP POLICY IF EXISTS anyone_can_write_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS anyone_can_update_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS anyone_can_read_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS public_access_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_bypass ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_insert_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_update_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_delete_app_key_values ON public.app_key_values;

REVOKE ALL ON TABLE public.app_key_values FROM anon, authenticated;
GRANT ALL ON TABLE public.app_key_values TO service_role;

-- Old OTPs were stored in a globally readable table; invalidate and remove only those temporary entries.
DELETE FROM public.app_key_values
WHERE key LIKE 'verification_%' OR key LIKE 'password_reset_%';

CREATE OR REPLACE FUNCTION public.check_auth_verification_code(
  p_email text,
  p_purpose text,
  p_code_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  valid_code boolean := false;
BEGIN
  UPDATE public.auth_verification_codes
  SET
    attempts = attempts + 1,
    consumed_at = CASE WHEN attempts + 1 >= 5 THEN now() ELSE consumed_at END
  WHERE email = lower(trim(p_email))
    AND purpose = p_purpose
    AND code_hash <> p_code_hash
    AND consumed_at IS NULL
    AND expires_at > now()
    AND attempts < 5;

  SELECT EXISTS (
    SELECT 1 FROM public.auth_verification_codes
    WHERE email = lower(trim(p_email))
      AND purpose = p_purpose
      AND code_hash = p_code_hash
      AND consumed_at IS NULL
      AND expires_at > now()
      AND attempts < 5
  ) INTO valid_code;

  RETURN valid_code;
END;
$$;

REVOKE ALL ON FUNCTION public.check_auth_verification_code(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_auth_verification_code(text, text, text) TO service_role;
