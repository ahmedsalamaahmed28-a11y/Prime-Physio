-- Restrict account provisioning and prevent clinic-id enumeration by arbitrary email.
REVOKE ALL ON FUNCTION public.provision_google_user(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_google_user(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_clinic_id_for_email(target_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT clinic_id
  FROM public.staff
  WHERE lower(email) = lower(target_email)
    AND auth.uid() IS NOT NULL
    AND lower(target_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_clinic_id_for_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_clinic_id_for_email(text) TO authenticated;
