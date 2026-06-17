-- Create auth_accounts table for NextAuth Credentials provider
-- Bypasses broken GoTrue auth.users schema

CREATE TABLE IF NOT EXISTS public.auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.auth_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_access" ON public.auth_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_auth_accounts_email ON public.auth_accounts (email);

-- Verification codes for email OTP during signup

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_access_verification" ON public.verification_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON public.verification_codes (email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON public.verification_codes (expires_at);
