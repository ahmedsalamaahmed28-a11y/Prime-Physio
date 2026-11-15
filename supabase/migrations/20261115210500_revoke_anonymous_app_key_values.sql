-- app_key_values has no anon RLS policy; anonymous grants were unnecessary.
-- Keep service_role and authenticated access governed by the existing policies.
REVOKE ALL PRIVILEGES ON TABLE public.app_key_values FROM anon;
