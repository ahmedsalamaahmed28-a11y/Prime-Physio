-- appStorage now uses browser localStorage and all sensitive values are accessed
-- through server-side service_role APIs. No browser role needs this table.
REVOKE ALL ON TABLE public.app_key_values FROM anon, authenticated;
DROP POLICY IF EXISTS app_key_values_safe_select ON public.app_key_values;
DROP POLICY IF EXISTS app_key_values_safe_insert ON public.app_key_values;
DROP POLICY IF EXISTS app_key_values_safe_update ON public.app_key_values;
DROP POLICY IF EXISTS app_key_values_safe_delete ON public.app_key_values;