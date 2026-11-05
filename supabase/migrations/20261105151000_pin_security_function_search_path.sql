-- Pin search_path for exposed functions to prevent object-shadowing attacks.
ALTER FUNCTION public.touch_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_platform_admin() SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_my_clinic_id() SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_clinic_id_for_email(text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_clinic_admin() SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_slug_available(text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.create_center(text, text, text, text, text, jsonb, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.provision_google_user(text, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.setup_clinic_transaction(text, text, jsonb) SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_platform_settings_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.log_audit_event() SET search_path = pg_catalog, public;
