\set ON_ERROR_STOP on

-- Disposable PostgreSQL fixture. No production project, credentials, or records.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END
$$;

CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE OR REPLACE FUNCTION storage.foldername(object_name text)
RETURNS text[] LANGUAGE sql IMMUTABLE
AS $function$ SELECT string_to_array(object_name, '/') $function$;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb LANGUAGE sql STABLE
AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt() TO anon, authenticated, service_role;

CREATE TABLE public.clinics (
  id uuid PRIMARY KEY,
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  admin_email text
);
CREATE TABLE public.clinic_owners (
  clinic_id uuid NOT NULL REFERENCES public.clinics(id),
  owner_email text NOT NULL
);
CREATE TABLE public.staff (
  id uuid PRIMARY KEY,
  clinic_id uuid,
  email text NOT NULL,
  status text,
  role text,
  permissions text
);
CREATE TABLE public.platform_admins (email text PRIMARY KEY);
CREATE TABLE public.audit_logs (clinic_id uuid, user_email text);
CREATE TABLE public.chat_conversations (id uuid PRIMARY KEY, clinic_id uuid, kind text);
CREATE TABLE public.chat_participants (conversation_id uuid, clinic_id uuid, email text);
CREATE TABLE public.chat_messages (conversation_id uuid, clinic_id uuid);
CREATE TABLE public.hr_attendance (clinic_id uuid, staff_id uuid);
CREATE TABLE public.patients (id text PRIMARY KEY, clinic_id uuid NOT NULL);
CREATE TABLE public.invoices (id text PRIMARY KEY, clinic_id uuid NOT NULL);
CREATE TABLE public.appointments (id uuid PRIMARY KEY, clinic_id uuid NOT NULL);
CREATE TABLE storage.objects (id uuid PRIMARY KEY, bucket_id text NOT NULL, name text NOT NULL);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.clinics, public.clinic_owners, public.staff,
  public.chat_conversations, public.chat_participants, public.chat_messages,
  public.hr_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients, public.invoices, public.appointments TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;

-- Two clinics intentionally share one canonical owner email.
INSERT INTO auth.users (id) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
INSERT INTO public.clinics (id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.clinic_owners (clinic_id, owner_email) VALUES
  ('11111111-1111-4111-8111-111111111111', 'owner@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'owner@example.test');
INSERT INTO public.staff (id, clinic_id, email, status, role, permissions) VALUES
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'owner@example.test', 'active', 'admin', NULL),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '22222222-2222-4222-8222-222222222222', 'owner@example.test', 'active', 'admin', NULL);
INSERT INTO public.platform_admins (email) VALUES ('owner@example.test');
INSERT INTO public.patients (id, clinic_id) VALUES
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', '22222222-2222-4222-8222-222222222222');
INSERT INTO public.invoices (id, clinic_id) VALUES
  ('12121212-1212-4212-8212-121212121212', '11111111-1111-4111-8111-111111111111'),
  ('23232323-2323-4232-8232-232323232323', '22222222-2222-4222-8222-222222222222');
INSERT INTO public.appointments (id, clinic_id) VALUES
  ('56565656-5656-4565-8565-565656565656', '11111111-1111-4111-8111-111111111111'),
  ('67676767-6767-4676-8676-676767676767', '22222222-2222-4222-8222-222222222222');
INSERT INTO storage.objects (id, bucket_id, name) VALUES
  ('abababab-abab-4aba-8aba-111111111111', 'patient-files', '11111111-1111-4111-8111-111111111111/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/report.pdf'),
  ('bcbcbcbc-bcbc-4bcb-8bcb-222222222222', 'patient-files', '22222222-2222-4222-8222-222222222222/ffffffff-ffff-4fff-8fff-ffffffffffff/report.pdf'),
  ('cdcdcdcd-cdcd-4dcd-8dcd-333333333333', 'branch-logos', '11111111-1111-4111-8111-111111111111/logo.png'),
  ('dededede-dede-4ede-8ede-444444444444', 'branch-logos', '22222222-2222-4222-8222-222222222222/logo.png');
INSERT INTO public.chat_conversations (id, clinic_id, kind) VALUES
  ('34343434-3434-4434-8434-343434343434', '11111111-1111-4111-8111-111111111111', 'team'),
  ('45454545-4545-4454-8454-454545454545', '22222222-2222-4222-8222-222222222222', 'team');
INSERT INTO public.chat_participants (conversation_id, clinic_id, email) VALUES
  ('34343434-3434-4434-8434-343434343434', '11111111-1111-4111-8111-111111111111', 'owner@example.test'),
  ('45454545-4545-4454-8454-454545454545', '22222222-2222-4222-8222-222222222222', 'owner@example.test');
INSERT INTO public.chat_messages (conversation_id, clinic_id) VALUES
  ('34343434-3434-4434-8434-343434343434', '11111111-1111-4111-8111-111111111111'),
  ('45454545-4545-4454-8454-454545454545', '22222222-2222-4222-8222-222222222222');
INSERT INTO public.hr_attendance (clinic_id, staff_id) VALUES
  ('11111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  ('22222222-2222-4222-8222-222222222222', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');

\i supabase/migrations/20261120191500_clinic_scoped_shadow_identity_rls.sql

-- Server-provisioned mapping rows bind the immutable JWT claims to auth.uid().
INSERT INTO public.clinic_auth_identities (clinic_id, canonical_email, shadow_email, shadow_user_id) VALUES
  ('11111111-1111-4111-8111-111111111111', 'owner@example.test', 'clinic-a@shadow.primephysio.app', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('22222222-2222-4222-8222-222222222222', 'owner@example.test', 'clinic-b@shadow.primephysio.app', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

-- Mirror the live BEFORE INSERT/UPDATE clinics admin-email trigger.
CREATE TRIGGER enforce_clinic_admin_email_matches_session
BEFORE INSERT OR UPDATE OF admin_email ON public.clinics
FOR EACH ROW EXECUTE FUNCTION public.enforce_clinic_admin_email_matches_session();

SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"clinic-a@shadow.primephysio.app","app_metadata":{"auth_source":"clinic-scoped-shadow","canonical_email":"owner@example.test","clinic_id":"11111111-1111-4111-8111-111111111111","nextauth_expires_at":"4102444800"}}',
  false
);
UPDATE public.clinics SET admin_email = 'owner@example.test'
WHERE id = '11111111-1111-4111-8111-111111111111';
DO $$
BEGIN
  BEGIN
    UPDATE public.clinics SET admin_email = 'clinic-a@shadow.primephysio.app'
    WHERE id = '11111111-1111-4111-8111-111111111111';
    RAISE EXCEPTION 'Clinic trigger accepted synthetic shadow email as business owner';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$$;

-- Mirror the live Storage policies; their tenant scope is supplied by get_my_clinic_id().
CREATE POLICY clinic_logo_delete_own_center ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'branch-logos'
  AND (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
  AND public.has_staff_permission('manage_settings')
);
CREATE POLICY clinic_logo_upload_own_center ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'branch-logos'
  AND (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
  AND public.has_staff_permission('manage_settings')
);
CREATE POLICY patient_files_clinic_read ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
  AND public.has_staff_permission('view_patients')
  AND (public.has_staff_permission('view_patient_history') OR public.has_staff_permission('edit_emr'))
);
CREATE POLICY patient_files_clinic_upload ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
  AND public.has_staff_permission('view_patients')
  AND EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = (storage.foldername(objects.name))[2]
      AND p.clinic_id = public.get_my_clinic_id()
  )
  AND public.has_staff_permission('edit_emr')
);
CREATE POLICY patient_files_clinic_update ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
  AND public.has_staff_permission('view_patients')
  AND public.has_staff_permission('edit_emr')
) WITH CHECK (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
  AND public.has_staff_permission('view_patients')
  AND public.has_staff_permission('edit_emr')
);
CREATE POLICY patient_files_clinic_delete ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
  AND public.has_staff_permission('view_patients')
  AND public.has_staff_permission('delete_emr')
);

-- Mirror the live tenant/permission policies for patients, invoices, and appointments.
CREATE POLICY patients_clinic_select ON public.patients
FOR SELECT TO authenticated USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('view_patients'));
CREATE POLICY patients_clinic_insert ON public.patients
FOR INSERT TO authenticated WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_patient'));
CREATE POLICY patients_clinic_update ON public.patients
FOR UPDATE TO authenticated USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_patient'))
WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('edit_patient'));
CREATE POLICY patients_clinic_delete ON public.patients
FOR DELETE TO authenticated USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('delete_patient'));
CREATE POLICY patients_auth_session_expiry_guard ON public.patients AS RESTRICTIVE
FOR ALL TO authenticated USING (public.is_valid_auth_session()) WITH CHECK (public.is_valid_auth_session());

CREATE POLICY invoices_clinic_select ON public.invoices
FOR SELECT TO authenticated USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('view_invoices'));
CREATE POLICY invoices_clinic_insert ON public.invoices
FOR INSERT TO authenticated WITH CHECK (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('create_invoice'));
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
FOR DELETE TO authenticated USING (clinic_id = public.get_my_clinic_id() AND public.has_staff_permission('delete_invoice'));
CREATE POLICY invoices_auth_session_expiry_guard ON public.invoices AS RESTRICTIVE
FOR ALL TO authenticated USING (public.is_valid_auth_session()) WITH CHECK (public.is_valid_auth_session());

CREATE POLICY appointments_clinic_select ON public.appointments
FOR SELECT TO authenticated USING (
  clinic_id = public.get_my_clinic_id()
  AND public.has_staff_permission('view_appointments')
  AND public.has_staff_permission('view_patients')
);
CREATE POLICY appointments_clinic_insert ON public.appointments
FOR INSERT TO authenticated WITH CHECK (
  clinic_id = public.get_my_clinic_id()
  AND public.has_staff_permission('view_patients')
  AND public.has_staff_permission('edit_appointments')
  AND public.has_staff_permission('create_invoice')
);
CREATE POLICY appointments_clinic_update ON public.appointments
FOR UPDATE TO authenticated
USING (
  clinic_id = public.get_my_clinic_id()
  AND public.has_staff_permission('view_appointments')
  AND public.has_staff_permission('view_patients')
  AND public.has_staff_permission('edit_appointments')
)
WITH CHECK (
  clinic_id = public.get_my_clinic_id()
  AND public.has_staff_permission('view_appointments')
  AND public.has_staff_permission('view_patients')
  AND public.has_staff_permission('edit_appointments')
);
CREATE POLICY appointments_clinic_delete ON public.appointments
FOR DELETE TO authenticated USING (
  clinic_id = public.get_my_clinic_id()
  AND public.has_staff_permission('view_appointments')
  AND public.has_staff_permission('view_patients')
  AND public.has_staff_permission('edit_appointments')
);
CREATE POLICY appointments_auth_session_expiry_guard ON public.appointments AS RESTRICTIVE
FOR ALL TO authenticated USING (public.is_valid_auth_session()) WITH CHECK (public.is_valid_auth_session());


SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"clinic-a@shadow.primephysio.app","app_metadata":{"auth_source":"clinic-scoped-shadow","canonical_email":"owner@example.test","clinic_id":"11111111-1111-4111-8111-111111111111","nextauth_expires_at":"4102444800"}}',
  false
);

DO $$
DECLARE v_count bigint;
BEGIN
  IF public.get_auth_email() <> 'owner@example.test' THEN RAISE EXCEPTION 'canonical email claim was not resolved'; END IF;
  IF public.get_my_clinic_id() <> '11111111-1111-4111-8111-111111111111'::uuid THEN RAISE EXCEPTION 'Clinic A scope was not resolved'; END IF;
  IF public.is_platform_admin() THEN RAISE EXCEPTION 'Clinic-scoped identity entered platform admin'; END IF;
  IF NOT public.has_staff_permission('manage_staff') THEN RAISE EXCEPTION 'Clinic owner permission was not preserved'; END IF;

  SELECT count(*) INTO v_count FROM public.clinic_owners;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Clinic owner policy leaked rows across centers: %', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.staff;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Staff policy leaked rows across centers: %', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.patients;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Patient RLS leaked rows across centers: %', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.invoices;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Invoice RLS leaked rows across centers: %', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.appointments;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Appointment RLS leaked rows across centers: %', v_count; END IF;

  -- Clinic A owner can write within A, but cannot create or move rows into B.
  INSERT INTO public.patients (id, clinic_id)
    VALUES ('78787878-7878-4787-8787-787878787878', '11111111-1111-4111-8111-111111111111');
  BEGIN
    INSERT INTO public.patients (id, clinic_id)
      VALUES ('89898989-8989-4898-8898-898989898989', '22222222-2222-4222-8222-222222222222');
    RAISE EXCEPTION 'Clinic A inserted a patient into Clinic B';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.invoices
      SET clinic_id = '22222222-2222-4222-8222-222222222222'
      WHERE id = '12121212-1212-4212-8212-121212121212';
    RAISE EXCEPTION 'Clinic A moved an invoice into Clinic B';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO public.appointments (id, clinic_id)
    VALUES ('90909090-9090-4090-8090-909090909090', '11111111-1111-4111-8111-111111111111');
  BEGIN
    INSERT INTO public.appointments (id, clinic_id)
      VALUES ('abababab-abab-4aba-8aba-abababababab', '22222222-2222-4222-8222-222222222222');
    RAISE EXCEPTION 'Clinic A inserted an appointment into Clinic B';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO storage.objects (id, bucket_id, name)
    VALUES ('efefefef-efef-4fef-8fef-555555555555', 'branch-logos', '11111111-1111-4111-8111-111111111111/new-logo.png');
  BEGIN
    INSERT INTO storage.objects (id, bucket_id, name)
      VALUES ('f1f1f1f1-f1f1-41f1-81f1-777777777777', 'branch-logos', '22222222-2222-4222-8222-222222222222/unauthorized-logo.png');
    RAISE EXCEPTION 'Clinic A uploaded a logo into Clinic B Storage';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO storage.objects (id, bucket_id, name)
      VALUES ('f0f0f0f0-f0f0-40f0-80f0-666666666666', 'patient-files', '22222222-2222-4222-8222-222222222222/ffffffff-ffff-4fff-8fff-ffffffffffff/unauthorized.pdf');
    RAISE EXCEPTION 'Clinic A uploaded a patient file into Clinic B Storage';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO public.audit_logs (clinic_id, user_email)
    VALUES ('11111111-1111-4111-8111-111111111111', 'owner@example.test');
  BEGIN
    INSERT INTO public.audit_logs (clinic_id, user_email)
      VALUES ('22222222-2222-4222-8222-222222222222', 'owner@example.test');
    RAISE EXCEPTION 'Clinic A wrote an audit log into Clinic B';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SELECT count(*) INTO v_count FROM public.chat_conversations;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Conversation policy leaked rows across centers: %', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.chat_messages;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Message policy leaked rows across centers: %', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.chat_participants;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Participant policy leaked rows across centers: %', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.hr_attendance;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Attendance policy leaked rows across centers: %', v_count; END IF;
  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id = 'patient-files';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Patient file Storage policy leaked rows across centers: %', v_count; END IF;

  IF has_table_privilege('authenticated', 'public.clinic_auth_identities', 'SELECT') THEN
    RAISE EXCEPTION 'Authenticated users can read the private identity mapping table';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.clinic_auth_identities', 'SELECT') THEN
    RAISE EXCEPTION 'Service role cannot read the private identity mapping table';
  END IF;
END
$$;

-- A token for Clinic B must see B and not A, even with the same canonical email.
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"clinic-b@shadow.primephysio.app","app_metadata":{"auth_source":"clinic-scoped-shadow","canonical_email":"owner@example.test","clinic_id":"22222222-2222-4222-8222-222222222222","nextauth_expires_at":"4102444800"}}',
  false
);
DO $$
DECLARE v_count bigint;
BEGIN
  IF public.get_my_clinic_id() <> '22222222-2222-4222-8222-222222222222'::uuid THEN RAISE EXCEPTION 'Clinic B scope was not resolved'; END IF;
  SELECT count(*) INTO v_count FROM public.patients;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Clinic B patient scope is not isolated'; END IF;
  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id = 'patient-files';
  IF v_count <> 1 THEN RAISE EXCEPTION 'Clinic B patient file scope is not isolated'; END IF;
  IF EXISTS (SELECT 1 FROM public.patients WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') THEN
    RAISE EXCEPTION 'Clinic B read Clinic A patient';
  END IF;
END
$$;

-- Expired NextAuth-backed claims fail closed even if the Supabase access token remains valid.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"clinic-b@shadow.primephysio.app","app_metadata":{"auth_source":"clinic-scoped-shadow","canonical_email":"owner@example.test","clinic_id":"22222222-2222-4222-8222-222222222222","nextauth_expires_at":"1"}}',
  false
);
DO $$
BEGIN
  IF public.is_valid_auth_session() THEN RAISE EXCEPTION 'Expired clinic session was accepted'; END IF;
  IF public.get_my_clinic_id() IS NOT NULL THEN RAISE EXCEPTION 'Expired clinic session retained tenant scope'; END IF;
END
$$;

RESET ROLE;
SELECT 'clinic-scoped RLS integration checks passed' AS result;
