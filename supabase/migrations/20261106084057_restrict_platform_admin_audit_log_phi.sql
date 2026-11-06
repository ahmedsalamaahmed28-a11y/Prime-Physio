-- Platform administrators must use the redacted server audit endpoint rather
-- than reading raw audit details that may contain patient or billing information.
DROP POLICY IF EXISTS "Allow platform admins full access to audit_logs" ON public.audit_logs;
