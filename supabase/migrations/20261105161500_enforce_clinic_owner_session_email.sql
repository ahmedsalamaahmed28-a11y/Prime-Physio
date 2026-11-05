-- Keep the clinic owner identity guard in source-controlled migration history.
CREATE OR REPLACE FUNCTION public.enforce_clinic_admin_email_matches_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(trim(NEW.admin_email)) THEN
    RAISE EXCEPTION 'Clinic admin email must match the authenticated account'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_clinic_admin_email_matches_session() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_clinic_admin_email_matches_session() TO service_role;

DROP TRIGGER IF EXISTS enforce_clinic_admin_email_matches_session ON public.clinics;
CREATE TRIGGER enforce_clinic_admin_email_matches_session
BEFORE INSERT OR UPDATE OF admin_email ON public.clinics
FOR EACH ROW
EXECUTE FUNCTION public.enforce_clinic_admin_email_matches_session();
