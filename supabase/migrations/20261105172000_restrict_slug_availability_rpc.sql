REVOKE ALL ON FUNCTION public.is_slug_available(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_slug_available(text) TO authenticated;