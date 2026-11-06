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

-- A verified Paymob callback replaces any previous active subscription atomically.
-- The clinic row (or an advisory lock for an unassigned email) serializes concurrent
-- callbacks so the unique indexes remain a final database-level safety net.
CREATE OR REPLACE FUNCTION public.activate_paid_subscription(
  p_order_id text,
  p_transaction_id text,
  p_user_email text,
  p_clinic_id uuid,
  p_plan_name text,
  p_plan_price numeric,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_existing record;
  v_clinic_admin_email text;
  v_new_id uuid;
BEGIN
  v_email := lower(btrim(coalesce(p_user_email, '')));
  IF p_order_id IS NULL OR p_order_id = '' OR p_order_id ~ '[^0-9]'
     OR p_transaction_id IS NULL OR p_transaction_id = '' OR p_transaction_id ~ '[^0-9]'
     OR p_plan_name IS NULL OR p_plan_name NOT IN ('silver', 'gold')
     OR length(v_email) > 254
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR p_plan_price IS NULL OR p_plan_price <= 0
     OR p_start_date IS NULL OR p_end_date IS NULL OR p_end_date <= p_start_date THEN
    RAISE EXCEPTION 'invalid_subscription_payload' USING ERRCODE = '22023';
  END IF;

  SELECT s.id, s.clinic_id, s.transaction_id
    INTO v_existing
    FROM public.subscriptions s
   WHERE s.order_id = p_order_id
   LIMIT 1
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing.transaction_id <> p_transaction_id THEN
      RAISE EXCEPTION 'order_already_used' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object(
      'subscription_id', v_existing.id,
      'clinic_id', v_existing.clinic_id,
      'duplicate', true
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.transaction_id = p_transaction_id
  ) THEN
    RAISE EXCEPTION 'transaction_already_used' USING ERRCODE = '23505';
  END IF;

  IF p_clinic_id IS NOT NULL THEN
    SELECT c.admin_email INTO v_clinic_admin_email
    FROM public.clinics c
    WHERE c.id = p_clinic_id
    FOR UPDATE;

    IF NOT FOUND OR lower(btrim(coalesce(v_clinic_admin_email, ''))) <> v_email THEN
      RAISE EXCEPTION 'clinic_ownership_mismatch' USING ERRCODE = '42501';
    END IF;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtextextended('subscription:' || v_email, 0));
  END IF;

  UPDATE public.subscriptions s
     SET status = 'canceled',
         updated_at = now()
   WHERE s.status = 'active'
     AND (
       (p_clinic_id IS NOT NULL AND s.clinic_id = p_clinic_id)
       OR (s.clinic_id IS NULL AND lower(s.user_email) = v_email)
     );

  INSERT INTO public.subscriptions (
    user_email, clinic_id, plan_name, plan_price, status,
    order_id, transaction_id, start_date, end_date
  ) VALUES (
    v_email, p_clinic_id, p_plan_name, p_plan_price, 'active',
    p_order_id, p_transaction_id, p_start_date, p_end_date
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'subscription_id', v_new_id,
    'clinic_id', p_clinic_id,
    'duplicate', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_paid_subscription(
  text, text, text, uuid, text, numeric, timestamptz, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_paid_subscription(
  text, text, text, uuid, text, numeric, timestamptz, timestamptz
) TO service_role;
