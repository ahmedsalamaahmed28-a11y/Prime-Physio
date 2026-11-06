-- Platform administrators manage the platform, not clinic patient charts.
-- Keep patient/clinical data restricted to authenticated staff in their own clinic.
-- Server-side aggregate admin APIs continue to use service_role where required.
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
      AND tablename = ANY (ARRAY[
        'patients', 'appointments', 'assessments', 'discharges',
        'insurance_claims', 'invoices', 'patient_evaluations',
        'patient_programs', 'patient_risks', 'progress_tracking',
        'referrals', 'soap_notes', 'treatment_plans'
      ])
      AND (
        coalesce(qual, '') LIKE '%is_platform_admin()%'
        OR coalesce(with_check, '') LIKE '%is_platform_admin()%'
      )
  LOOP
    v_qual := p.qual;
    v_check := p.with_check;

    -- A policy whose only purpose is platform-admin bypass is removed entirely.
    IF (v_qual IS NOT NULL AND (
          btrim(v_qual) = 'is_platform_admin()'
          OR v_qual LIKE '%is_platform_admin() OR%'
        ))
       OR (v_qual IS NULL AND v_check IS NOT NULL AND btrim(v_check) = 'is_platform_admin()') THEN
      EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
      CONTINUE;
    END IF;

    IF v_qual IS NOT NULL THEN
      v_qual := replace(v_qual, ' OR is_platform_admin()', '');
    END IF;
    IF v_check IS NOT NULL THEN
      v_check := replace(v_check, ' OR is_platform_admin()', '');
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
