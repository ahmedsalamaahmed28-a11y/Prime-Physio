DROP POLICY IF EXISTS clinic_access ON public.treatment_templates;
REVOKE SELECT ON TABLE public.treatment_templates FROM anon;
GRANT SELECT ON TABLE public.treatment_templates TO authenticated;

CREATE POLICY treatment_templates_authenticated_read ON public.treatment_templates
FOR SELECT TO authenticated
USING (public.is_valid_auth_session());