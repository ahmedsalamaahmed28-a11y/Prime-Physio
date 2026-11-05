-- Remove policies that granted unrestricted public access to tenant and clinical records.
-- Existing service_role policies are retained; authenticated clinic users are scoped by their session email.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gait_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mmt_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rom_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;

-- Remove open policies whose USING/WITH CHECK expression was TRUE.
DROP POLICY IF EXISTS clinic_access ON public.audit_logs;
DROP POLICY IF EXISTS "Allow select audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow clinic staff to update audit_logs" ON public.audit_logs;

DROP POLICY IF EXISTS clinic_access ON public.balance_tests;
DROP POLICY IF EXISTS clinic_access ON public.gait_tests;
DROP POLICY IF EXISTS clinic_access ON public.invoices;
DROP POLICY IF EXISTS clinic_access ON public.mmt_assessments;
DROP POLICY IF EXISTS clinic_access ON public.patient_nutrition;
DROP POLICY IF EXISTS clinic_access ON public.rom_assessments;
DROP POLICY IF EXISTS clinic_access ON public.sessions;
DROP POLICY IF EXISTS clinic_access ON public.special_tests;

DROP POLICY IF EXISTS clinic_access ON public.clinic_settings;
DROP POLICY IF EXISTS clinic_access ON public.clinics;
DROP POLICY IF EXISTS "service role full access clinics" ON public.clinics;

DROP POLICY IF EXISTS clinic_access ON public.staff;
DROP POLICY IF EXISTS clinic_access ON public.subscriptions;

-- These two policies were incorrectly assigned to PUBLIC and had unconditional access.
DROP POLICY IF EXISTS "service role full access branches" ON public.branches;

-- Keep the intentional public-read policy for broadcasts, but remove public write access.
DROP POLICY IF EXISTS "Allow insert system_broadcasts" ON public.system_broadcasts;
DROP POLICY IF EXISTS "Allow select system_broadcasts" ON public.system_broadcasts;
DROP POLICY IF EXISTS "Anyone can read broadcasts" ON public.system_broadcasts;
DROP POLICY IF EXISTS "Platform admins can manage broadcasts" ON public.system_broadcasts;

CREATE POLICY broadcasts_public_read
ON public.system_broadcasts
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY broadcasts_platform_admin_manage
ON public.system_broadcasts
FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Tenant boundaries for clinical tables that previously had only an unconditional clinic_access policy.
CREATE POLICY balance_tests_tenant_access
ON public.balance_tests
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id())
WITH CHECK (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id());

CREATE POLICY gait_tests_tenant_access
ON public.gait_tests
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id())
WITH CHECK (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id());

CREATE POLICY invoices_tenant_access
ON public.invoices
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND (clinic_id = public.get_my_clinic_id() OR public.is_platform_admin()))
WITH CHECK (auth.uid() IS NOT NULL AND (clinic_id = public.get_my_clinic_id() OR public.is_platform_admin()));

CREATE POLICY mmt_assessments_tenant_access
ON public.mmt_assessments
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id())
WITH CHECK (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id());

CREATE POLICY patient_nutrition_tenant_access
ON public.patient_nutrition
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id())
WITH CHECK (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id());

CREATE POLICY rom_assessments_tenant_access
ON public.rom_assessments
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id())
WITH CHECK (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id());

CREATE POLICY sessions_tenant_access
ON public.sessions
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id())
WITH CHECK (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id());

CREATE POLICY special_tests_tenant_access
ON public.special_tests
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id())
WITH CHECK (auth.uid() IS NOT NULL AND clinic_id = public.get_my_clinic_id());

-- Clinic settings are readable by clinic members but mutable only by clinic/platform administrators.
CREATE POLICY clinic_settings_tenant_read
ON public.clinic_settings
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND (clinic_id = public.get_my_clinic_id() OR public.is_platform_admin()));

CREATE POLICY clinic_settings_admin_write
ON public.clinic_settings
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND (public.is_clinic_admin() OR public.is_platform_admin())
       AND (clinic_id = public.get_my_clinic_id() OR public.is_platform_admin()))
WITH CHECK (auth.uid() IS NOT NULL AND (public.is_clinic_admin() OR public.is_platform_admin())
            AND (clinic_id = public.get_my_clinic_id() OR public.is_platform_admin()));

-- Keep audit-log inserts tenant-bound; audit logs cannot be updated or deleted by clinic users.
CREATE POLICY audit_logs_tenant_insert
ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND clinic_id = public.get_my_clinic_id()
  AND lower(user_email) = lower(auth.jwt() ->> 'email')
);

-- Remove anonymous access to sensitive tenant and authentication tables.
REVOKE ALL ON TABLE
  public.audit_logs,
  public.balance_tests,
  public.branches,
  public.clinic_settings,
  public.clinics,
  public.gait_tests,
  public.invoices,
  public.mmt_assessments,
  public.patient_nutrition,
  public.rom_assessments,
  public.sessions,
  public.special_tests,
  public.staff,
  public.subscriptions,
  public.auth_accounts,
  public.app_key_values,
  public.verification_codes
FROM PUBLIC, anon;

-- The application has explicit server-side public endpoints for broadcast and plan/catalog data.
GRANT SELECT ON TABLE public.system_broadcasts TO anon;
GRANT SELECT ON TABLE public.subscription_plans TO anon;
GRANT SELECT ON TABLE public.platform_content TO anon;
GRANT SELECT ON TABLE public.treatment_templates TO anon;

-- Prevent browser roles from bypassing RLS through TRUNCATE or trigger/reference privileges.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Authentication secrets and OTP records are service-role only.
REVOKE ALL ON TABLE public.auth_accounts, public.app_key_values, public.verification_codes FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.auth_accounts, public.app_key_values, public.verification_codes TO service_role;

-- Service-role policies stay restricted to service_role; this removes an accidental public alias.
DROP POLICY IF EXISTS service_role_all ON public.app_key_values;
