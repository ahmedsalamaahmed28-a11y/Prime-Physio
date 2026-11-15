-- Supabase's default privileges had re-granted broad anon access to tables
-- created after the initial anonymous-privilege hardening migration.
-- Remove it from existing tables and prevent it from recurring.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- Preserve only the intentionally public application endpoints.
GRANT ALL ON TABLE public.app_key_values TO anon;
GRANT SELECT ON TABLE
  public.clinical_protocols,
  public.platform_content,
  public.subscription_plans,
  public.system_broadcasts,
  public.treatment_templates
TO anon;

-- These privileges bypass row-level security and must never be available to anon.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon;

-- New public tables/sequences must receive explicit grants instead of broad anon access.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
