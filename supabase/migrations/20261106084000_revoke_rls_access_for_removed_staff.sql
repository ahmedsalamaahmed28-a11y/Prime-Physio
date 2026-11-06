-- A soft-removed employee must lose direct Supabase Data API access as well as
-- server API access. Keep HR history but make every staff-based tenant lookup ignore
-- staff rows marked as removed.

CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT s.clinic_id
  FROM public.staff AS s
  WHERE auth.uid() IS NOT NULL
    AND pg_catalog.lower(s.email) = pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
    AND s.status <> 'محذوف'
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_clinic_id_for_email(target_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT s.clinic_id
  FROM public.staff AS s
  WHERE pg_catalog.lower(s.email) = pg_catalog.lower(target_email)
    AND s.status <> 'محذوف'
    AND auth.uid() IS NOT NULL
    AND pg_catalog.lower(target_email) = pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_clinic_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff AS s
    WHERE auth.uid() IS NOT NULL
      AND pg_catalog.lower(s.email) = pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
      AND s.status <> 'محذوف'
      AND s.role IN ('admin', 'clinic_admin', 'مدير العياره', 'مدير العيادة')
  );
$function$;

-- Update existing tenant policies in-place while preserving their roles,
-- permissive/restrictive mode, commands, and all other predicates.
DO $migration$
DECLARE
  p record;
  v_qual text;
  v_check text;
  v_stmt text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') LIKE '%staff.email%'
        OR coalesce(with_check, '') LIKE '%staff.email%'
        OR coalesce(qual, '') LIKE '%s.email%'
        OR coalesce(with_check, '') LIKE '%s.email%'
        OR coalesce(qual, '') LIKE '%staff.id%'
        OR coalesce(with_check, '') LIKE '%staff.id%'
      )
  LOOP
    v_qual := p.qual;
    v_check := p.with_check;

    IF v_qual IS NOT NULL THEN
      v_qual := replace(
        v_qual,
        $match$staff.email = ((( SELECT current_setting('request.jwt.claims'::text, true) AS current_setting))::json ->> 'email'::text)$match$,
        $replacement$(staff.email = ((( SELECT current_setting('request.jwt.claims'::text, true) AS current_setting))::json ->> 'email'::text) AND staff.status <> 'محذوف')$replacement$
      );
      v_qual := replace(
        v_qual,
        $match$s.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)$match$,
        $replacement$(s.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text) AND s.status <> 'محذوف')$replacement$
      );
      v_qual := replace(
        v_qual,
        $match$staff.id = ( SELECT auth.uid() AS uid)$match$,
        $replacement$(staff.id = ( SELECT auth.uid() AS uid) AND staff.status <> 'محذوف')$replacement$
      );
    END IF;

    IF v_check IS NOT NULL THEN
      v_check := replace(
        v_check,
        $match$staff.email = ((( SELECT current_setting('request.jwt.claims'::text, true) AS current_setting))::json ->> 'email'::text)$match$,
        $replacement$(staff.email = ((( SELECT current_setting('request.jwt.claims'::text, true) AS current_setting))::json ->> 'email'::text) AND staff.status <> 'محذوف')$replacement$
      );
      v_check := replace(
        v_check,
        $match$s.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)$match$,
        $replacement$(s.email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text) AND s.status <> 'محذوف')$replacement$
      );
      v_check := replace(
        v_check,
        $match$staff.id = ( SELECT auth.uid() AS uid)$match$,
        $replacement$(staff.id = ( SELECT auth.uid() AS uid) AND staff.status <> 'محذوف')$replacement$
      );
    END IF;

    IF v_qual IS DISTINCT FROM p.qual OR v_check IS DISTINCT FROM p.with_check THEN
      v_stmt := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
      IF v_qual IS NOT NULL THEN
        v_stmt := v_stmt || format(' USING (%s)', v_qual);
      END IF;
      IF v_check IS NOT NULL THEN
        v_stmt := v_stmt || format(' WITH CHECK (%s)', v_check);
      END IF;
      EXECUTE v_stmt;
    END IF;
  END LOOP;
END;
$migration$;
