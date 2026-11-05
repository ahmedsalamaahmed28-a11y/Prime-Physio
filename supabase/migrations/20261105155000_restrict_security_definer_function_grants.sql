REVOKE ALL ON FUNCTION public.setup_clinic_transaction(text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.setup_clinic_transaction(text,text,jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_clinic_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_clinic_id() TO authenticated;
REVOKE ALL ON FUNCTION public.is_clinic_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;
