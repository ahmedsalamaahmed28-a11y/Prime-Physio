-- Remove anonymous CRUD grants from all exposed application tables.
-- app_key_values is deliberately preserved until the appStorage migration is deployed.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

GRANT ALL ON TABLE public.app_key_values TO anon;

-- Explicitly allow only read access to intended public catalog/content tables.
GRANT SELECT ON TABLE
  public.clinical_protocols,
  public.platform_content,
  public.subscription_plans,
  public.system_broadcasts,
  public.treatment_templates
TO anon;

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon;
