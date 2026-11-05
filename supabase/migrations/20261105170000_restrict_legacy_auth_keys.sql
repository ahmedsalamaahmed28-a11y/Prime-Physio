-- Keep legacy browser storage temporarily, but never expose authentication secrets/state.
DROP POLICY IF EXISTS anyone_can_read_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS anyone_can_update_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS anyone_can_write_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS public_access_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_update_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_bypass ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_delete_app_key_values ON public.app_key_values;
DROP POLICY IF EXISTS platform_admin_insert_app_key_values ON public.app_key_values;

CREATE POLICY app_key_values_safe_select
ON public.app_key_values
FOR SELECT TO anon, authenticated
USING (
  lower(key) NOT IN ('current_user', 'pending_role')
  AND lower(key) NOT LIKE 'verification_%'
  AND lower(key) NOT LIKE 'password_reset_%'
);

CREATE POLICY app_key_values_safe_insert
ON public.app_key_values
FOR INSERT TO anon, authenticated
WITH CHECK (
  lower(key) NOT IN ('current_user', 'pending_role')
  AND lower(key) NOT LIKE 'verification_%'
  AND lower(key) NOT LIKE 'password_reset_%'
);

CREATE POLICY app_key_values_safe_update
ON public.app_key_values
FOR UPDATE TO anon, authenticated
USING (
  lower(key) NOT IN ('current_user', 'pending_role')
  AND lower(key) NOT LIKE 'verification_%'
  AND lower(key) NOT LIKE 'password_reset_%'
)
WITH CHECK (
  lower(key) NOT IN ('current_user', 'pending_role')
  AND lower(key) NOT LIKE 'verification_%'
  AND lower(key) NOT LIKE 'password_reset_%'
);

CREATE POLICY app_key_values_safe_delete
ON public.app_key_values
FOR DELETE TO anon, authenticated
USING (
  lower(key) NOT IN ('current_user', 'pending_role')
  AND lower(key) NOT LIKE 'verification_%'
  AND lower(key) NOT LIKE 'password_reset_%'
);

DELETE FROM public.app_key_values
WHERE lower(key) IN ('current_user', 'pending_role')
   OR lower(key) LIKE 'verification_%'
   OR lower(key) LIKE 'password_reset_%';
