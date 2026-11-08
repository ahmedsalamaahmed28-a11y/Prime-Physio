-- Add a dedicated OTP purpose for clinic/center creation.
-- The existing signup and password-reset purposes remain unchanged.
ALTER TABLE public.auth_verification_codes
  DROP CONSTRAINT IF EXISTS auth_verification_codes_purpose_check;

ALTER TABLE public.auth_verification_codes
  ADD CONSTRAINT auth_verification_codes_purpose_check
  CHECK (purpose IN ('signup', 'password_reset', 'center_creation'));

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
     OR p_purpose NOT IN ('signup', 'password_reset', 'center_creation')
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
     OR public.auth_verification_codes.expires_at <= now()
  RETURNING true INTO stored;

  RETURN coalesce(stored, false);
END;
$$;

REVOKE ALL ON FUNCTION public.store_auth_verification_code(text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_auth_verification_code(text, text, text, timestamptz) TO service_role;

-- Consume the OTP and create the clinic in one database transaction.
CREATE OR REPLACE FUNCTION public.setup_clinic_transaction_verified(
  p_email text,
  p_name text,
  p_centers jsonb,
  p_code_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) > 254
     OR p_code_hash IS NULL OR p_code_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('error', 'OTP_INVALID');
  END IF;

  IF NOT public.consume_auth_verification_code(
    lower(trim(p_email)),
    'center_creation',
    p_code_hash
  ) THEN
    RETURN jsonb_build_object('error', 'OTP_INVALID');
  END IF;

  RETURN public.setup_clinic_transaction_server(
    lower(trim(p_email)),
    p_name,
    p_centers
  );
END;
$$;

REVOKE ALL ON FUNCTION public.setup_clinic_transaction_verified(text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.setup_clinic_transaction_verified(text, text, jsonb, text) TO service_role;
