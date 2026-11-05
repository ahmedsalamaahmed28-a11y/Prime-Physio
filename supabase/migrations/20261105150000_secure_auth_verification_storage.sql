-- Secure OTP storage. Apply only after the application release containing all OTP route changes is ready.
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
REVOKE ALL ON TABLE public.auth_verification_codes FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.auth_verification_codes TO service_role;

CREATE OR REPLACE FUNCTION public.store_auth_verification_code(
  p_email text,
  p_purpose text,
  p_code_hash text,
  p_expires_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  stored boolean := false;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) > 254
     OR p_purpose NOT IN ('signup', 'password_reset')
     OR p_code_hash !~ '^[0-9a-f]{64}$'
     OR p_expires_at <= now()
     OR p_expires_at > now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'Invalid verification code request' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.auth_verification_codes (
    email, purpose, code_hash, expires_at, attempts, consumed_at, created_at
  )
  VALUES (
    lower(trim(p_email)), p_purpose, p_code_hash, p_expires_at, 0, NULL, now()
  )
  ON CONFLICT (email, purpose) DO UPDATE
  SET code_hash = EXCLUDED.code_hash,
      expires_at = EXCLUDED.expires_at,
      attempts = 0,
      consumed_at = NULL,
      created_at = now()
  WHERE public.auth_verification_codes.created_at <= now() - interval '60 seconds'
     OR public.auth_verification_codes.consumed_at IS NOT NULL
     OR public.auth_verification_codes.expires_at <= now()
  RETURNING true INTO stored;

  RETURN coalesce(stored, false);
END;
$$;

REVOKE ALL ON FUNCTION public.store_auth_verification_code(text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_auth_verification_code(text, text, text, timestamptz) TO service_role;

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
  SET attempts = attempts + 1,
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
  SET attempts = attempts + 1,
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

-- Do not expose legacy application key/value storage to browser roles.
DROP POLICY IF EXISTS anyone_can_write_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS anyone_can_update_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS anyone_can_read_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS public_access_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_bypass ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_insert_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_update_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_delete_app_key_values ON public.app_key_values;

REVOKE ALL ON TABLE public.app_key_values FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_key_values TO service_role;

-- Remove only obsolete OTP records from the legacy store.
DELETE FROM public.app_key_values
WHERE key LIKE 'verification_%' OR key LIKE 'password_reset_%';
