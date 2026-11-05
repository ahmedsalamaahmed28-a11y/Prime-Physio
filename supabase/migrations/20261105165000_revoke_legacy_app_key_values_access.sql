-- Apply only after the application release has moved all browser preferences to localStorage
-- and all OTP API routes use auth_verification_codes.
-- Do not expose legacy application key/value storage to browser roles.
DROP POLICY IF EXISTS anyone_can_write_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS anyone_can_update_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS anyone_can_read_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS public_access_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_bypass ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_insert_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_update_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_delete_app_key_values ON public.app_key_values;

REVOKE ALL ON TABLE public.app_key_values FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_key_values TO service_role;

-- Remove only obsolete OTP records from the legacy store.
DELETE FROM public.app_key_values
WHERE key LIKE 'verification_%'
   OR key LIKE 'password_reset_%'
   OR key IN ('current_user', 'pending_role', 'pending_google_signup');
