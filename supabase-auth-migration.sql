-- Create auth_accounts table for NextAuth Credentials provider
-- Bypasses broken GoTrue auth.users schema

CREATE TABLE IF NOT EXISTS public.auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Secure by default: only service_role can read/write
ALTER TABLE public.auth_accounts ENABLE ROW LEVEL SECURITY;

-- Service role bypass (handled automatically by Supabase for service_role)
-- Anon key users should not access this table
CREATE POLICY "service_role_access" ON public.auth_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_auth_accounts_email ON public.auth_accounts (email);
