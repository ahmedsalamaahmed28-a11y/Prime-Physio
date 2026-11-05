-- Run only after deploying the application version that no longer uses app_key_values in the browser.
DROP POLICY IF EXISTS app_key_values_safe_select ON public.app_key_values;
DROP POLICY IF EXISTS app_key_values_safe_insert ON public.app_key_values;
DROP POLICY IF EXISTS app_key_values_safe_update ON public.app_key_values;
DROP POLICY IF EXISTS app_key_values_safe_delete ON public.app_key_values;
DROP POLICY IF EXISTS anyone_can_read_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS anyone_can_update_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS anyone_can_write_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS public_access_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_update_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_bypass ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_delete_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_insert_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS service_role_all ON public.app_key_values;

REVOKE ALL ON TABLE public.app_key_values FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_key_values TO service_role;

DELETE FROM public.app_key_values
WHERE lower(key) IN ('current_user', 'pending_role', 'pending_google_signup')
   OR lower(key) LIKE 'verification_%'
   OR lower(key) LIKE 'password_reset_%';
