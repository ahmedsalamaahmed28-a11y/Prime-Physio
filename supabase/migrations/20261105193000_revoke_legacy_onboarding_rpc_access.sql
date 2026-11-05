REVOKE ALL ON FUNCTION public.create_center(text, text, text, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_center(text, text, text, text, text, jsonb, text) TO service_role;
REVOKE ALL ON FUNCTION public.setup_clinic_transaction(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.setup_clinic_transaction(text, text, jsonb) TO service_role;