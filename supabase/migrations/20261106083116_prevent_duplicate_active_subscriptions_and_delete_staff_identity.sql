-- Keep exactly one active subscription per clinic (and per unassigned email).
-- Existing data was checked before applying this migration; no active duplicates were found.

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_clinic_idx
  ON public.subscriptions (clinic_id)
  WHERE status = 'active' AND clinic_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_unassigned_email_idx
  ON public.subscriptions (lower(user_email))
  WHERE status = 'active' AND clinic_id IS NULL;

-- Atomically remove both the clinic membership and the custom credential record.
-- Supabase shadow identities are intentionally not deleted here: requireAuth rejects
-- auth_source=nextauth-shadow, and all role-protected endpoints require a live staff row.
CREATE OR REPLACE FUNCTION public.delete_staff_account(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_staff_deleted integer := 0;
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

  DELETE FROM public.staff s WHERE lower(s.email) = v_email;
  GET DIAGNOSTICS v_staff_deleted = ROW_COUNT;

  DELETE FROM public.auth_accounts a WHERE lower(a.email) = v_email;
  GET DIAGNOSTICS v_auth_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'staff_deleted', v_staff_deleted,
    'auth_account_deleted', v_auth_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_staff_account(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_staff_account(text) TO service_role;
