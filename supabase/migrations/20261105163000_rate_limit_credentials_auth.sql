-- Server-side credential login rate limiting (email + HMAC'd client IP).
CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
  email text NOT NULL,
  ip_hash text NOT NULL CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, ip_hash)
);

ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_login_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.auth_login_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.check_auth_login_attempt(
  p_email text,
  p_ip_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  allowed boolean := false;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) > 254
     OR p_ip_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;

  INSERT INTO public.auth_login_attempts (
    email, ip_hash, window_started_at, attempts, blocked_until, updated_at
  )
  VALUES (lower(trim(p_email)), p_ip_hash, now(), 1, NULL, now())
  ON CONFLICT (email, ip_hash) DO UPDATE
  SET
    window_started_at = CASE
      WHEN public.auth_login_attempts.blocked_until > now()
        THEN public.auth_login_attempts.window_started_at
      WHEN public.auth_login_attempts.window_started_at <= now() - interval '15 minutes'
        THEN now()
      ELSE public.auth_login_attempts.window_started_at
    END,
    attempts = CASE
      WHEN public.auth_login_attempts.blocked_until > now()
        THEN public.auth_login_attempts.attempts
      WHEN public.auth_login_attempts.window_started_at <= now() - interval '15 minutes'
        THEN 1
      ELSE public.auth_login_attempts.attempts + 1
    END,
    blocked_until = CASE
      WHEN public.auth_login_attempts.blocked_until > now()
        THEN public.auth_login_attempts.blocked_until
      WHEN public.auth_login_attempts.window_started_at <= now() - interval '15 minutes'
        THEN NULL
      WHEN public.auth_login_attempts.attempts + 1 >= 8
        THEN now() + interval '15 minutes'
      ELSE NULL
    END,
    updated_at = now()
  RETURNING (blocked_until IS NULL OR blocked_until <= now()) AND attempts <= 8
  INTO allowed;

  RETURN coalesce(allowed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.check_auth_login_attempt(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_auth_login_attempt(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.clear_auth_login_attempts(
  p_email text,
  p_ip_hash text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  DELETE FROM public.auth_login_attempts
  WHERE email = lower(trim(p_email))
    AND ip_hash = p_ip_hash;
$$;

REVOKE ALL ON FUNCTION public.clear_auth_login_attempts(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_auth_login_attempts(text, text) TO service_role;
