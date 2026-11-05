DROP POLICY IF EXISTS app_key_values_safe_select ON public.app_key_values;
DROP POLICY IF EXISTS app_key_values_safe_insert ON public.app_key_values;
DROP POLICY IF EXISTS app_key_values_safe_update ON public.app_key_values;
DROP POLICY IF EXISTS app_key_values_safe_delete ON public.app_key_values;

CREATE POLICY app_key_values_safe_select ON public.app_key_values
FOR SELECT TO anon, authenticated
USING (
  lower(key) NOT IN ('current_user', 'pending_role')
  AND lower(key) NOT LIKE 'verification_%'
  AND lower(key) NOT LIKE 'password_reset_%'
  AND lower(key) NOT LIKE 'paymob_order_%'
);

CREATE POLICY app_key_values_safe_insert ON public.app_key_values
FOR INSERT TO anon, authenticated
WITH CHECK (
  lower(key) NOT IN ('current_user', 'pending_role')
  AND lower(key) NOT LIKE 'verification_%'
  AND lower(key) NOT LIKE 'password_reset_%'
  AND lower(key) NOT LIKE 'paymob_order_%'
);

CREATE POLICY app_key_values_safe_update ON public.app_key_values
FOR UPDATE TO anon, authenticated
USING (
  lower(key) NOT IN ('current_user', 'pending_role')
  AND lower(key) NOT LIKE 'verification_%'
  AND lower(key) NOT LIKE 'password_reset_%'
  AND lower(key) NOT LIKE 'paymob_order_%'
)
WITH CHECK (
  lower(key) NOT IN ('current_user', 'pending_role')
  AND lower(key) NOT LIKE 'verification_%'
  AND lower(key) NOT LIKE 'password_reset_%'
  AND lower(key) NOT LIKE 'paymob_order_%'
);

CREATE POLICY app_key_values_safe_delete ON public.app_key_values
FOR DELETE TO anon, authenticated
USING (
  lower(key) NOT IN ('current_user', 'pending_role')
  AND lower(key) NOT LIKE 'verification_%'
  AND lower(key) NOT LIKE 'password_reset_%'
  AND lower(key) NOT LIKE 'paymob_order_%'
);