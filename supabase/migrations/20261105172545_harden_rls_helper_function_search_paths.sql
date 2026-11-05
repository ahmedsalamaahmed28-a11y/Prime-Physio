-- Keep SECURITY DEFINER helpers safe against search_path object shadowing.
-- These helpers remain executable by authenticated because tenant RLS policies call them.
CREATE OR REPLACE FUNCTION public.get_clinic_id_for_email(target_email text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT s.clinic_id
  FROM public.staff AS s
  WHERE pg_catalog.lower(s.email) = pg_catalog.lower(target_email)
    AND auth.uid() IS NOT NULL
    AND pg_catalog.lower(target_email) = pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT s.clinic_id
  FROM public.staff AS s
  WHERE auth.uid() IS NOT NULL
    AND pg_catalog.lower(s.email) = pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_clinic_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff AS s
    WHERE auth.uid() IS NOT NULL
      AND pg_catalog.lower(s.email) = pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
      AND s.role IN ('admin', 'clinic_admin', 'مدير العياره', 'مدير العيادة')
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins AS pa
    WHERE auth.uid() IS NOT NULL
      AND pg_catalog.lower(pa.email) = pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_slug_available(check_slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.branches AS b
    WHERE pg_catalog.lower(pg_catalog.btrim(b.slug)) = pg_catalog.lower(pg_catalog.btrim(check_slug))
  );
$function$;
