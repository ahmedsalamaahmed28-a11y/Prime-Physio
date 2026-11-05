-- Tenant and administrator policies must not be granted to the anon role.
-- Keep only the explicitly intended public reads for published protocols,
-- platform branding/translations, and subscription plan catalogue.
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND 'public' = ANY(roles)
      AND NOT (
        (tablename = 'clinical_protocols' AND policyname = 'Anyone can view published protocols')
        OR (tablename = 'platform_content' AND policyname = 'Allow public read access to platform_content')
        OR (tablename = 'subscription_plans' AND policyname = 'Anyone can read subscription plans')
      )
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', policy_row.policyname, policy_row.tablename);
  END LOOP;
END $$;
