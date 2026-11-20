-- Isolated PostgreSQL RLS regression harness.
-- Mirrors the active-clinic and core tenant policies currently installed in Prime Physio.
-- Everything runs in one transaction and is rolled back; only synthetic rows are used.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $roles$
BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$roles$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')::uuid;
$$;

CREATE TABLE public.clinics (
  id uuid PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE public.clinic_owners (
  clinic_id uuid NOT NULL REFERENCES public.clinics(id),
  owner_email text NOT NULL,
  PRIMARY KEY (clinic_id, owner_email)
);

CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NULL REFERENCES public.clinics(id),
  email text NOT NULL,
  role text NOT NULL,
  status text NULL,
  permissions text NULL
);

CREATE TABLE public.patients (
  id text PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id),
  "nameAr" text NULL,
  phone text NULL
);

CREATE TABLE public.invoices (
  id text PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id),
  patient_id text NOT NULL REFERENCES public.patients(id),
  amount text NULL,
  status text NULL
);

CREATE TABLE public.appointments (
  id text PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id),
  patient_id text NOT NULL REFERENCES public.patients(id),
  appointment_type text NULL,
  status text NULL
);

CREATE TABLE public.sessions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id),
  patient_id text NOT NULL REFERENCES public.patients(id),
  diagnosis text NULL
);

CREATE OR REPLACE FUNCTION public.is_valid_auth_session()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT CASE
    WHEN auth.jwt() -> 'app_metadata' ->> 'auth_source' = 'nextauth-shadow' THEN
      CASE
        WHEN (auth.jwt() -> 'app_metadata' ->> 'nextauth_expires_at') ~ '^[0-9]{1,12}$'
        THEN (auth.jwt() -> 'app_metadata' ->> 'nextauth_expires_at')::bigint
             > floor(extract(epoch FROM now()))::bigint
        ELSE false
      END
    ELSE auth.uid() IS NOT NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_active_text text := nullif(auth.jwt() -> 'app_metadata' ->> 'active_clinic_id', '');
  v_active_id uuid;
  v_count bigint;
  v_only_id uuid;
BEGIN
  IF auth.uid() IS NULL OR v_email = '' OR NOT public.is_valid_auth_session() THEN
    RETURN NULL;
  END IF;

  IF v_active_text IS NOT NULL THEN
    BEGIN
      v_active_id := v_active_text::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN NULL;
    END;

    IF EXISTS (
      SELECT 1 FROM public.clinic_owners o
      WHERE o.clinic_id = v_active_id AND pg_catalog.lower(o.owner_email) = v_email
    ) OR EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.clinic_id = v_active_id
        AND pg_catalog.lower(s.email) = v_email
        AND coalesce(s.status, '') NOT IN ('محذوف','deleted','inactive','غير نشط')
    ) THEN
      RETURN v_active_id;
    END IF;
    RETURN NULL;
  END IF;

  SELECT count(DISTINCT membership.clinic_id)
    INTO v_count
  FROM (
    SELECT s.clinic_id FROM public.staff s
    WHERE pg_catalog.lower(s.email) = v_email
      AND s.clinic_id IS NOT NULL
      AND coalesce(s.status, '') NOT IN ('محذوف','deleted','inactive','غير نشط')
    UNION
    SELECT o.clinic_id FROM public.clinic_owners o
    WHERE pg_catalog.lower(o.owner_email) = v_email
  ) membership;

  IF v_count = 1 THEN
    SELECT membership.clinic_id INTO v_only_id
    FROM (
      SELECT s.clinic_id FROM public.staff s
      WHERE pg_catalog.lower(s.email) = v_email
        AND s.clinic_id IS NOT NULL
        AND coalesce(s.status, '') NOT IN ('محذوف','deleted','inactive','غير نشط')
      UNION
      SELECT o.clinic_id FROM public.clinic_owners o
      WHERE pg_catalog.lower(o.owner_email) = v_email
    ) membership
    LIMIT 1;
    RETURN v_only_id;
  END IF;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_staff_permission(permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_clinic_id uuid := public.get_my_clinic_id();
  v_role text;
  v_permissions text;
  v_permission_json jsonb;
BEGIN
  IF auth.uid() IS NULL OR v_email = '' OR v_clinic_id IS NULL
     OR permission_key IS NULL OR pg_catalog.btrim(permission_key) = '' THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.clinic_owners o
    WHERE o.clinic_id = v_clinic_id
      AND pg_catalog.lower(pg_catalog.btrim(o.owner_email)) = v_email
  ) THEN
    RETURN true;
  END IF;

  SELECT pg_catalog.lower(pg_catalog.btrim(s.role)), s.permissions
    INTO v_role, v_permissions
  FROM public.staff s
  WHERE s.clinic_id = v_clinic_id
    AND pg_catalog.lower(pg_catalog.btrim(s.email)) = v_email
    AND pg_catalog.lower(pg_catalog.btrim(coalesce(s.status, ''))) NOT IN
      ('محذوف', 'deleted', 'inactive', 'غير نشط')
  LIMIT 1;

  IF NOT FOUND THEN RETURN false; END IF;

  IF v_permissions IS NOT NULL AND pg_catalog.btrim(v_permissions) <> '' THEN
    BEGIN
      v_permission_json := v_permissions::jsonb;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    IF pg_catalog.jsonb_typeof(v_permission_json) <> 'array' THEN RETURN false; END IF;
    IF EXISTS (
      SELECT 1 FROM pg_catalog.jsonb_array_elements(v_permission_json) AS item(value)
      WHERE pg_catalog.jsonb_typeof(item.value) <> 'string'
    ) THEN RETURN false; END IF;
    RETURN (v_permission_json ? permission_key) OR (v_permission_json ? '*');
  END IF;

  IF v_role IN ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده', 'مدير العياره', 'مدير النظام') THEN
    RETURN true;
  END IF;
  IF v_role IN ('doctor', 'استشاري علاج طبيعي', 'أخصائي علاج طبيعي', 'ممارس علاج طبيعي') THEN
    RETURN permission_key IN ('view_patients', 'view_appointments', 'edit_emr', 'edit_patient', 'view_patient_history');
  END IF;
  IF v_role IN ('receptionist', 'موظف استقبال', 'موظفة استقبال رئيسية') THEN
    RETURN permission_key IN ('view_patients', 'view_appointments', 'view_invoices', 'create_invoice', 'edit_patient');
  END IF;
  RETURN false;
END;
$function$;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_session_expiry_guard ON public.patients
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_valid_auth_session()) WITH CHECK (public.is_valid_auth_session());
CREATE POLICY auth_session_expiry_guard ON public.invoices
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_valid_auth_session()) WITH CHECK (public.is_valid_auth_session());
CREATE POLICY auth_session_expiry_guard ON public.appointments
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_valid_auth_session()) WITH CHECK (public.is_valid_auth_session());
CREATE POLICY auth_session_expiry_guard ON public.sessions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_valid_auth_session()) WITH CHECK (public.is_valid_auth_session());

CREATE POLICY patients_clinic_select ON public.patients
  FOR SELECT TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('view_patients'));
CREATE POLICY patients_clinic_insert ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_patient'));
CREATE POLICY patients_clinic_update ON public.patients
  FOR UPDATE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_patient'))
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_patient'));
CREATE POLICY patients_clinic_delete ON public.patients
  FOR DELETE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('delete_patient'));

CREATE POLICY invoices_clinic_select ON public.invoices
  FOR SELECT TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('view_invoices'));
CREATE POLICY invoices_clinic_insert ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('create_invoice'));
CREATE POLICY invoices_clinic_update ON public.invoices
  FOR UPDATE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND (
    public.has_staff_permission('create_invoice') OR public.has_staff_permission('apply_discount')
    OR public.has_staff_permission('refund_invoice') OR public.has_staff_permission('delete_invoice')
  ))
  WITH CHECK (clinic_id = public.get_my_clinic_id() AND (
    public.has_staff_permission('create_invoice') OR public.has_staff_permission('apply_discount')
    OR public.has_staff_permission('refund_invoice') OR public.has_staff_permission('delete_invoice')
  ));
CREATE POLICY invoices_clinic_delete ON public.invoices
  FOR DELETE TO authenticated
  USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('delete_invoice'));

CREATE POLICY appointments_clinic_select ON public.appointments
  FOR SELECT TO authenticated
  USING (clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('view_appointments')
    AND public.has_staff_permission('view_patients'));
CREATE POLICY appointments_clinic_insert ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('view_patients')
    AND public.has_staff_permission('edit_appointments')
    AND public.has_staff_permission('create_invoice'));
CREATE POLICY appointments_clinic_update ON public.appointments
  FOR UPDATE TO authenticated
  USING (clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('view_appointments')
    AND public.has_staff_permission('view_patients')
    AND public.has_staff_permission('edit_appointments'))
  WITH CHECK (clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('view_appointments')
    AND public.has_staff_permission('view_patients')
    AND public.has_staff_permission('edit_appointments'));
CREATE POLICY appointments_clinic_delete ON public.appointments
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL
    AND clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('view_appointments')
    AND public.has_staff_permission('view_patients')
    AND public.has_staff_permission('edit_appointments'));

CREATE POLICY sessions_clinic_select ON public.sessions
  FOR SELECT TO authenticated
  USING (clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('view_patients')
    AND (public.has_staff_permission('view_patient_history') OR public.has_staff_permission('edit_emr')));
CREATE POLICY sessions_clinic_insert ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL
    AND clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('view_patients')
    AND public.has_staff_permission('edit_emr'));
CREATE POLICY sessions_clinic_update ON public.sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL
    AND clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('view_patients')
    AND public.has_staff_permission('edit_emr'))
  WITH CHECK (auth.uid() IS NOT NULL
    AND clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('view_patients')
    AND public.has_staff_permission('edit_emr'));
CREATE POLICY sessions_clinic_delete ON public.sessions
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL
    AND clinic_id = public.get_my_clinic_id()
    AND public.has_staff_permission('view_patients')
    AND public.has_staff_permission('delete_emr'));

CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL REFERENCES storage.buckets(id),
  name text NOT NULL
);
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN pg_catalog.array_length(pg_catalog.string_to_array(name, '/'), 1) > 1
    THEN (pg_catalog.string_to_array(name, '/'))[1:pg_catalog.array_length(pg_catalog.string_to_array(name, '/'), 1) - 1]
    ELSE ARRAY[]::text[]
  END;
$$;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY patient_files_clinic_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
    AND public.has_staff_permission('view_patients')
    AND (public.has_staff_permission('view_patient_history') OR public.has_staff_permission('edit_emr')));
CREATE POLICY patient_files_clinic_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-files'
    AND (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
    AND public.has_staff_permission('view_patients')
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = (storage.foldername(objects.name))[2]
        AND p.clinic_id = public.get_my_clinic_id()
    )
    AND public.has_staff_permission('edit_emr'));

INSERT INTO public.clinics (id, name) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Synthetic Balance A'),
  ('22222222-2222-4222-8222-222222222222', 'Synthetic Tenant B');

INSERT INTO public.clinic_owners (clinic_id, owner_email) VALUES
  ('11111111-1111-4111-8111-111111111111', 'tenant-a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'tenant-b@example.test');

INSERT INTO public.patients (id, clinic_id, "nameAr", phone) VALUES
  ('A_PATIENT', '11111111-1111-4111-8111-111111111111', 'Synthetic A', '01000000000'),
  ('B_PATIENT', '22222222-2222-4222-8222-222222222222', 'Synthetic B', '01000000000');

INSERT INTO public.invoices (id, clinic_id, patient_id, amount, status) VALUES
  ('A_INVOICE', '11111111-1111-4111-8111-111111111111', 'A_PATIENT', '100', 'انتظار'),
  ('B_INVOICE', '22222222-2222-4222-8222-222222222222', 'B_PATIENT', '100', 'انتظار');

INSERT INTO public.appointments (id, clinic_id, patient_id, appointment_type, status) VALUES
  ('A_APPOINTMENT', '11111111-1111-4111-8111-111111111111', 'A_PATIENT', 'test', 'مؤكد'),
  ('B_APPOINTMENT', '22222222-2222-4222-8222-222222222222', 'B_PATIENT', 'test', 'مؤكد');

INSERT INTO public.sessions (id, clinic_id, patient_id, diagnosis) VALUES
  ('A_SESSION', '11111111-1111-4111-8111-111111111111', 'A_PATIENT', 'Synthetic A'),
  ('B_SESSION', '22222222-2222-4222-8222-222222222222', 'B_PATIENT', 'Synthetic B');

INSERT INTO storage.buckets (id, name, public) VALUES ('patient-files', 'patient-files', false);
INSERT INTO storage.objects (bucket_id, name) VALUES
  ('patient-files', '11111111-1111-4111-8111-111111111111/A_PATIENT/base-a.pdf'),
  ('patient-files', '22222222-2222-4222-8222-222222222222/B_PATIENT/base-b.pdf');

-- Create the owner's second center only after Balance already has synthetic records.
INSERT INTO public.clinics (id, name) VALUES
  ('33333333-3333-4333-8333-333333333333', 'Synthetic Balance A2');
INSERT INTO public.clinic_owners (clinic_id, owner_email) VALUES
  ('33333333-3333-4333-8333-333333333333', 'tenant-a@example.test');

DO $copy_check$
BEGIN
  IF (SELECT count(*) FROM public.patients WHERE clinic_id = '11111111-1111-4111-8111-111111111111') <> 1
     OR (SELECT count(*) FROM public.invoices WHERE clinic_id = '11111111-1111-4111-8111-111111111111') <> 1
     OR (SELECT count(*) FROM public.appointments WHERE clinic_id = '11111111-1111-4111-8111-111111111111') <> 1
     OR (SELECT count(*) FROM public.sessions WHERE clinic_id = '11111111-1111-4111-8111-111111111111') <> 1 THEN
    RAISE EXCEPTION 'Creating the second center changed the original Balance fixture counts.';
  END IF;
  IF (SELECT count(*) FROM public.patients WHERE clinic_id = '33333333-3333-4333-8333-333333333333') <> 0
     OR (SELECT count(*) FROM public.invoices WHERE clinic_id = '33333333-3333-4333-8333-333333333333') <> 0
     OR (SELECT count(*) FROM public.appointments WHERE clinic_id = '33333333-3333-4333-8333-333333333333') <> 0
     OR (SELECT count(*) FROM public.sessions WHERE clinic_id = '33333333-3333-4333-8333-333333333333') <> 0 THEN
    RAISE EXCEPTION 'The second center received copied clinical or financial records.';
  END IF;
END;
$copy_check$;

CREATE OR REPLACE FUNCTION public.assert_tenant_crud(
  p_table text, p_own_id text, p_other_id text,
  p_clinic_id uuid, p_other_clinic_id uuid,
  p_own_patient_id text, p_other_patient_id text, p_new_id text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_denied boolean;
  v_new_id text;
BEGIN
  IF p_table NOT IN ('patients', 'invoices', 'appointments', 'sessions') THEN
    RAISE EXCEPTION 'Unexpected table in tenant test: %', p_table;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I WHERE id = $1', p_table)
    INTO v_count USING p_own_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Own row not visible in %', p_table; END IF;

  EXECUTE format('SELECT count(*) FROM public.%I WHERE id = $1', p_table)
    INTO v_count USING p_other_id;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Cross-tenant row visible in %', p_table; END IF;

  v_new_id := p_new_id;
  IF p_table = 'patients' THEN
    INSERT INTO public.patients (id, clinic_id, "nameAr", phone)
      VALUES (v_new_id, p_clinic_id, 'Synthetic own row', '01000000000');
  ELSIF p_table = 'invoices' THEN
    INSERT INTO public.invoices (id, clinic_id, patient_id, amount, status)
      VALUES (v_new_id, p_clinic_id, p_own_patient_id, '100', 'انتظار');
  ELSIF p_table = 'appointments' THEN
    INSERT INTO public.appointments (id, clinic_id, patient_id, appointment_type, status)
      VALUES (v_new_id, p_clinic_id, p_own_patient_id, 'synthetic', 'مؤكد');
  ELSE
    INSERT INTO public.sessions (clinic_id, patient_id, diagnosis)
      VALUES (p_clinic_id, p_own_patient_id, 'Synthetic own row')
      RETURNING id INTO v_new_id;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I WHERE id = $1', p_table)
    INTO v_count USING v_new_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Own insert failed in %', p_table; END IF;

  IF p_table = 'patients' THEN
    UPDATE public.patients SET "nameAr" = 'Synthetic updated' WHERE id = v_new_id;
  ELSIF p_table = 'invoices' THEN
    UPDATE public.invoices SET amount = '211' WHERE id = v_new_id;
  ELSIF p_table = 'appointments' THEN
    UPDATE public.appointments SET appointment_type = 'updated' WHERE id = v_new_id;
  ELSE
    UPDATE public.sessions SET diagnosis = 'Synthetic updated' WHERE id = v_new_id;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Own update failed in %', p_table; END IF;

  v_denied := false;
  BEGIN
    IF p_table = 'patients' THEN
      INSERT INTO public.patients (id, clinic_id, "nameAr", phone)
        VALUES (p_new_id || '_CROSS', p_other_clinic_id, 'Unauthorized', '01000000000');
    ELSIF p_table = 'invoices' THEN
      INSERT INTO public.invoices (id, clinic_id, patient_id, amount, status)
        VALUES (p_new_id || '_CROSS', p_other_clinic_id, p_other_patient_id, '100', 'انتظار');
    ELSIF p_table = 'appointments' THEN
      INSERT INTO public.appointments (id, clinic_id, patient_id, appointment_type, status)
        VALUES (p_new_id || '_CROSS', p_other_clinic_id, p_other_patient_id, 'unauthorized', 'مؤكد');
    ELSE
      INSERT INTO public.sessions (clinic_id, patient_id, diagnosis)
        VALUES (p_other_clinic_id, p_other_patient_id, 'Unauthorized');
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN RAISE EXCEPTION 'Cross-tenant insert was allowed in %', p_table; END IF;

  IF p_table = 'patients' THEN
    UPDATE public.patients SET "nameAr" = 'Unauthorized update' WHERE id = p_other_id;
  ELSIF p_table = 'invoices' THEN
    UPDATE public.invoices SET amount = '999' WHERE id = p_other_id;
  ELSIF p_table = 'appointments' THEN
    UPDATE public.appointments SET appointment_type = 'unauthorized' WHERE id = p_other_id;
  ELSE
    UPDATE public.sessions SET diagnosis = 'Unauthorized update' WHERE id = p_other_id;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Cross-tenant update was allowed in %', p_table; END IF;

  EXECUTE format('DELETE FROM public.%I WHERE id = $1', p_table) USING p_other_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Cross-tenant delete was allowed in %', p_table; END IF;

  EXECUTE format('DELETE FROM public.%I WHERE id = $1', p_table) USING v_new_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Own delete failed in %', p_table; END IF;
END;
$$;

GRANT USAGE ON SCHEMA public, auth, storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients, public.invoices, public.appointments, public.sessions TO authenticated;
GRANT SELECT, INSERT ON storage.objects TO authenticated;
GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), public.is_valid_auth_session(),
  public.get_my_clinic_id(), public.has_staff_permission(text), storage.foldername(text),
  public.assert_tenant_crud(text, text, text, uuid, uuid, text, text, text) TO authenticated;

SET LOCAL ROLE authenticated;

DO $tenant_tests$
DECLARE
  v_count integer;
BEGIN
  -- Owner A has two centers; an explicit active clinic must scope all queries to A only.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'email', 'tenant-a@example.test',
      'app_metadata', jsonb_build_object('active_clinic_id', '11111111-1111-4111-8111-111111111111'))::text, true);

  SELECT count(*) INTO v_count FROM public.patients WHERE id = 'A_PATIENT';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Tenant A cannot read its own patient.'; END IF;
  SELECT count(*) INTO v_count FROM public.patients WHERE id = 'B_PATIENT';
  IF v_count <> 0 THEN RAISE EXCEPTION 'Tenant A can read Tenant B patient.'; END IF;

  PERFORM public.assert_tenant_crud('patients', 'A_PATIENT', 'B_PATIENT',
    '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
    'A_PATIENT', 'B_PATIENT', 'A_NEW_PATIENT');
  PERFORM public.assert_tenant_crud('invoices', 'A_INVOICE', 'B_INVOICE',
    '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
    'A_PATIENT', 'B_PATIENT', 'A_NEW_INVOICE');
  PERFORM public.assert_tenant_crud('appointments', 'A_APPOINTMENT', 'B_APPOINTMENT',
    '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
    'A_PATIENT', 'B_PATIENT', 'A_NEW_APPOINTMENT');
  PERFORM public.assert_tenant_crud('sessions', 'A_SESSION', 'B_SESSION',
    '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
    'A_PATIENT', 'B_PATIENT', 'A_NEW_SESSION');

  -- No active claim with multiple owner memberships must fail closed.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'email', 'tenant-a@example.test',
      'app_metadata', jsonb_build_object('active_clinic_id', NULL))::text, true);
  SELECT count(*) INTO v_count FROM public.patients;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Ambiguous multi-center owner session was not denied.'; END IF;

  -- A forged claim for B must not grant A access to B.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'email', 'tenant-a@example.test',
      'app_metadata', jsonb_build_object('active_clinic_id', '22222222-2222-4222-8222-222222222222'))::text, true);
  SELECT count(*) INTO v_count FROM public.patients;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Non-member active clinic claim was accepted.'; END IF;

  -- A may explicitly select its second center, but it must contain no copied records.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'email', 'tenant-a@example.test',
      'app_metadata', jsonb_build_object('active_clinic_id', '33333333-3333-4333-8333-333333333333'))::text, true);
  SELECT count(*) INTO v_count FROM public.patients;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Second center exposes records from original Balance center.'; END IF;

  -- Tenant B has access to B only and cannot see A or A2.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'email', 'tenant-b@example.test',
      'app_metadata', jsonb_build_object('active_clinic_id', '22222222-2222-4222-8222-222222222222'))::text, true);
  SELECT count(*) INTO v_count FROM public.patients WHERE id = 'B_PATIENT';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Tenant B cannot read its own patient.'; END IF;
  SELECT count(*) INTO v_count FROM public.patients WHERE id = 'A_PATIENT';
  IF v_count <> 0 THEN RAISE EXCEPTION 'Tenant B can read Tenant A patient.'; END IF;

  PERFORM public.assert_tenant_crud('patients', 'B_PATIENT', 'A_PATIENT',
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
    'B_PATIENT', 'A_PATIENT', 'B_NEW_PATIENT');
  PERFORM public.assert_tenant_crud('invoices', 'B_INVOICE', 'A_INVOICE',
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
    'B_PATIENT', 'A_PATIENT', 'B_NEW_INVOICE');
  PERFORM public.assert_tenant_crud('appointments', 'B_APPOINTMENT', 'A_APPOINTMENT',
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
    'B_PATIENT', 'A_PATIENT', 'B_NEW_APPOINTMENT');
  PERFORM public.assert_tenant_crud('sessions', 'B_SESSION', 'A_SESSION',
    '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
    'B_PATIENT', 'A_PATIENT', 'B_NEW_SESSION');

  -- Private patient files: own folder readable/uploadable, other clinic folder denied.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'email', 'tenant-a@example.test',
      'app_metadata', jsonb_build_object('active_clinic_id', '11111111-1111-4111-8111-111111111111'))::text, true);
  SELECT count(*) INTO v_count FROM storage.objects
    WHERE name = '11111111-1111-4111-8111-111111111111/A_PATIENT/base-a.pdf';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Tenant A cannot read its own patient file.'; END IF;
  SELECT count(*) INTO v_count FROM storage.objects
    WHERE name = '22222222-2222-4222-8222-222222222222/B_PATIENT/base-b.pdf';
  IF v_count <> 0 THEN RAISE EXCEPTION 'Tenant A can read Tenant B patient file.'; END IF;
  INSERT INTO storage.objects (bucket_id, name)
    VALUES ('patient-files', '11111111-1111-4111-8111-111111111111/A_PATIENT/own-a.pdf');
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
      VALUES ('patient-files', '22222222-2222-4222-8222-222222222222/B_PATIENT/cross-a.pdf');
    RAISE EXCEPTION 'Tenant A was able to upload into Tenant B storage folder.';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'email', 'tenant-b@example.test',
      'app_metadata', jsonb_build_object('active_clinic_id', '22222222-2222-4222-8222-222222222222'))::text, true);
  SELECT count(*) INTO v_count FROM storage.objects
    WHERE name = '22222222-2222-4222-8222-222222222222/B_PATIENT/base-b.pdf';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Tenant B cannot read its own patient file.'; END IF;
  SELECT count(*) INTO v_count FROM storage.objects
    WHERE name = '11111111-1111-4111-8111-111111111111/A_PATIENT/base-a.pdf';
  IF v_count <> 0 THEN RAISE EXCEPTION 'Tenant B can read Tenant A patient file.'; END IF;
  INSERT INTO storage.objects (bucket_id, name)
    VALUES ('patient-files', '22222222-2222-4222-8222-222222222222/B_PATIENT/own-b.pdf');
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
      VALUES ('patient-files', '11111111-1111-4111-8111-111111111111/A_PATIENT/cross-b.pdf');
    RAISE EXCEPTION 'Tenant B was able to upload into Tenant A storage folder.';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  RAISE NOTICE 'PASS: synthetic A/B RLS CRUD, active-clinic ambiguity, second-center isolation, and patient storage checks.';
END;
$tenant_tests$;

RESET ROLE;
ROLLBACK;
