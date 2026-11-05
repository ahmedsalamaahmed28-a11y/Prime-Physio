-- Enforce case-insensitive unique branch slugs and validate all setup inputs before writing.
CREATE UNIQUE INDEX IF NOT EXISTS branches_slug_lower_unique
ON public.branches (lower(slug));

CREATE OR REPLACE FUNCTION public.is_slug_available(check_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.branches
    WHERE lower(trim(slug)) = lower(trim(check_slug))
  );
$$;
REVOKE ALL ON FUNCTION public.is_slug_available(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_slug_available(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_center(
  p_email text,
  p_plan_id text,
  p_short_name text,
  p_full_name text,
  p_slug text,
  p_specializations jsonb DEFAULT '[]'::jsonb,
  p_logo_url text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_clinic_id uuid;
  v_branch_id uuid;
  v_existing_staff_id uuid;
  v_existing_clinic_id uuid;
  v_plan_name text;
  v_plan_price integer;
  v_slug text;
BEGIN
  IF auth.uid() IS NULL OR lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(trim(coalesce(p_email, ''))) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  v_slug := lower(trim(coalesce(p_slug, '')));
  IF v_slug !~ '^[a-z0-9-]{3,50}$' THEN
    RETURN jsonb_build_object('error', 'Invalid clinic slug');
  END IF;

  SELECT name, price_monthly
  INTO v_plan_name, v_plan_price
  FROM public.subscription_plans
  WHERE is_active = true
    AND (lower(name) = lower(trim(coalesce(p_plan_id, ''))) OR id::text = trim(coalesce(p_plan_id, '')))
  LIMIT 1;

  IF v_plan_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Selected subscription plan is unavailable');
  END IF;

  IF EXISTS (SELECT 1 FROM public.branches WHERE lower(trim(slug)) = v_slug) THEN
    RETURN jsonb_build_object('error', 'Slug already taken');
  END IF;

  SELECT id INTO v_existing_staff_id
  FROM public.staff
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF v_existing_staff_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No staff record found for this email');
  END IF;

  SELECT id INTO v_existing_clinic_id
  FROM public.clinics
  WHERE lower(admin_email) = lower(trim(p_email))
  LIMIT 1;

  IF v_existing_clinic_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'This email already has a clinic', 'code', 'CLINIC_EMAIL_EXISTS', 'clinicId', v_existing_clinic_id);
  END IF;

  INSERT INTO public.clinics (name, name_en, admin_email, status)
  VALUES (btrim(p_short_name), btrim(p_short_name), lower(trim(p_email)), 'active')
  RETURNING id INTO v_clinic_id;

  INSERT INTO public.branches (clinic_id, short_name, full_name, slug, specializations, logo_url, status)
  VALUES (
    v_clinic_id,
    btrim(p_short_name),
    nullif(btrim(coalesce(p_full_name, '')), ''),
    v_slug,
    coalesce(p_specializations, '[]'::jsonb),
    p_logo_url,
    'active'
  )
  RETURNING id INTO v_branch_id;

  UPDATE public.staff
  SET clinic_id = v_clinic_id, pending_plan_id = NULL
  WHERE lower(email) = lower(trim(p_email));

  INSERT INTO public.clinic_settings (clinic_id, clinic_name, logo_url)
  VALUES (v_clinic_id, btrim(p_short_name), p_logo_url)
  ON CONFLICT (clinic_id) DO NOTHING;

  INSERT INTO public.subscriptions (clinic_id, user_email, plan_name, plan_price, status, start_date)
  VALUES (v_clinic_id, lower(trim(p_email)), v_plan_name, v_plan_price, 'active', now());

  RETURN jsonb_build_object('clinic_id', v_clinic_id, 'branch_id', v_branch_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.setup_clinic_transaction(p_email text, p_name text, p_branches jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_clinic_id uuid;
  v_branch jsonb;
  v_branch_id uuid;
  v_branch_slug text;
  v_branches jsonb := '[]'::jsonb;
  v_staff_exists boolean;
  v_existing_clinic_id uuid;
  v_sqlstate text;
  v_message text;
  v_detail text;
  v_hint text;
BEGIN
  IF auth.uid() IS NULL
     OR lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(trim(coalesce(p_email, ''))) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RETURN jsonb_build_object('error', 'Email is required');
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' OR length(p_name) > 160 THEN
    RETURN jsonb_build_object('error', 'Clinic name is invalid');
  END IF;
  IF p_branches IS NULL OR jsonb_typeof(p_branches) <> 'array' THEN
    RETURN jsonb_build_object('error', 'Branches must be an array');
  END IF;
  IF jsonb_array_length(p_branches) = 0 OR jsonb_array_length(p_branches) > 20 THEN
    RETURN jsonb_build_object('error', 'Provide between 1 and 20 centers');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_branches) AS b(value)
    WHERE jsonb_typeof(b.value) <> 'object'
       OR lower(trim(coalesce(b.value->>'slug', ''))) !~ '^[a-z0-9-]{3,50}$'
  ) THEN
    RETURN jsonb_build_object('error', 'Every center must have a valid slug');
  END IF;

  IF EXISTS (
    SELECT lower(trim(value->>'slug'))
    FROM jsonb_array_elements(p_branches)
    GROUP BY lower(trim(value->>'slug'))
    HAVING count(*) > 1
  ) THEN
    RETURN jsonb_build_object('error', 'Duplicate branch slugs are not allowed');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_branches) AS b(value)
    JOIN public.branches existing ON lower(existing.slug) = lower(trim(b.value->>'slug'))
  ) THEN
    RETURN jsonb_build_object('error', 'One or more slugs are already taken');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.staff WHERE lower(email) = lower(trim(p_email))
  ) INTO v_staff_exists;
  IF NOT v_staff_exists THEN
    RETURN jsonb_build_object('error', 'No staff record found for this email');
  END IF;

  SELECT id INTO v_existing_clinic_id
  FROM public.clinics
  WHERE lower(admin_email) = lower(trim(p_email))
  LIMIT 1;
  IF v_existing_clinic_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'This email already has a clinic', 'code', 'CLINIC_EMAIL_EXISTS', 'clinicId', v_existing_clinic_id);
  END IF;

  INSERT INTO public.clinics (name, name_en, admin_email, status)
  VALUES (btrim(p_name), btrim(p_name), lower(trim(p_email)), 'active')
  RETURNING id INTO v_clinic_id;

  UPDATE public.staff
  SET clinic_id = v_clinic_id, pending_plan_id = NULL
  WHERE lower(email) = lower(trim(p_email));

  INSERT INTO public.clinic_settings (clinic_id, clinic_name)
  VALUES (v_clinic_id, btrim(p_name))
  ON CONFLICT (clinic_id) DO NOTHING;

  FOR v_branch IN SELECT * FROM jsonb_array_elements(p_branches)
  LOOP
    v_branch_slug := lower(trim(v_branch->>'slug'));

    INSERT INTO public.branches (clinic_id, short_name, full_name, slug, status)
    VALUES (
      v_clinic_id,
      btrim(coalesce(v_branch->>'shortName', '')),
      nullif(btrim(coalesce(v_branch->>'fullName', '')), ''),
      v_branch_slug,
      'active'
    )
    RETURNING id INTO v_branch_id;

    v_branches := v_branches || jsonb_build_array(
      jsonb_build_object(
        'id', v_branch_id,
        'slug', v_branch_slug,
        'shortName', v_branch->>'shortName',
        'fullName', v_branch->>'fullName'
      )
    );
  END LOOP;

  RETURN jsonb_build_object('clinicId', v_clinic_id, 'branches', v_branches);
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS
    v_sqlstate = returned_sqlstate,
    v_message = message_text,
    v_detail = pg_exception_detail,
    v_hint = pg_exception_hint;
  RETURN jsonb_build_object(
    'error', 'setup_clinic_transaction failed',
    'code', coalesce(v_sqlstate, ''),
    'message', coalesce(v_message, ''),
    'detail', coalesce(v_detail, ''),
    'hint', coalesce(v_hint, '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_center(text, text, text, text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_center(text, text, text, text, text, jsonb, text) TO authenticated;
REVOKE ALL ON FUNCTION public.setup_clinic_transaction(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setup_clinic_transaction(text, text, jsonb) TO authenticated;