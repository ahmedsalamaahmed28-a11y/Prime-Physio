-- Preserve HR attendance and payroll history when removing an employee's access.
-- staff_id is NOT NULL and those tables currently cascade on staff deletion, so this
-- RPC performs a soft removal of the membership while deleting its login credentials.
CREATE OR REPLACE FUNCTION public.delete_staff_account(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_staff_disabled integer := 0;
  v_auth_deleted integer := 0;
BEGIN
  v_email := lower(btrim(coalesce(p_email, '')));
  IF length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE lower(pa.email) = v_email
  ) THEN
    RAISE EXCEPTION 'platform_admin_protected' USING ERRCODE = '42501';
  END IF;

  UPDATE public.staff s
     SET status = 'محذوف',
         updated_at = now()
   WHERE lower(s.email) = v_email
     AND s.status <> 'محذوف';
  GET DIAGNOSTICS v_staff_disabled = ROW_COUNT;

  DELETE FROM public.auth_accounts a WHERE lower(a.email) = v_email;
  GET DIAGNOSTICS v_auth_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'staff_disabled', v_staff_disabled,
    'auth_account_deleted', v_auth_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_staff_account(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_staff_account(text) TO service_role;
