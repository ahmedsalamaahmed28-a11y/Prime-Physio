-- Harden onboarding: only an unassigned clinic administrator may claim/create a clinic.
CREATE OR REPLACE FUNCTION public.setup_clinic_transaction_server(
  p_email text,
  p_name text,
  p_centers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_clinic_name text := btrim(coalesce(p_name, ''));
  v_staff_id uuid;
  v_staff_clinic_id uuid;
  v_staff_role text;
  v_clinic_id uuid;
  v_plan_name text;
  v_branch_count integer := 0;
  v_center_count integer;
  v_center jsonb;
  v_slug text;
  v_short_name text;
  v_full_name text;
  v_branch record;
  v_created_branches jsonb := '[]'::jsonb;
BEGIN
  IF v_email = '' OR length(v_email) > 254
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RETURN jsonb_build_object('error', 'Invalid account email');
  END IF;

  IF v_clinic_name = '' OR length(v_clinic_name) > 160 THEN
    RETURN jsonb_build_object('error', 'Invalid clinic name');
  END IF;

  IF p_centers IS NULL OR jsonb_typeof(p_centers) <> 'array' THEN
    RETURN jsonb_build_object('error', 'Centers must be an array');
  END IF;

  v_center_count := jsonb_array_length(p_centers);
  IF v_center_count < 1 OR v_center_count > 5 THEN
    RETURN jsonb_build_object('error', 'Provide between 1 and 5 centers');
  END IF;

  FOR v_center IN SELECT value FROM jsonb_array_elements(p_centers)
  LOOP
    v_short_name := btrim(coalesce(v_center->>'shortName', ''));
    v_full_name := btrim(coalesce(v_center->>'fullName', ''));
    v_slug := lower(btrim(coalesce(v_center->>'slug', '')));

    IF jsonb_typeof(v_center) <> 'object'
       OR v_short_name = '' OR length(v_short_name) > 120
       OR length(v_full_name) > 200
       OR v_slug !~ '^[a-z0-9-]{3,50}$' THEN
      RETURN jsonb_build_object('error', 'Invalid center details or slug');
    END IF;
  END LOOP;

  IF (
    SELECT count(DISTINCT lower(btrim(value->>'slug')))
    FROM jsonb_array_elements(p_centers)
  ) <> v_center_count THEN
    RETURN jsonb_build_object('error', 'Duplicate center slugs are not allowed');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_centers) AS submitted(value)
    JOIN public.branches existing
      ON lower(existing.slug) = lower(btrim(submitted.value->>'slug'))
  ) THEN
    RETURN jsonb_build_object('error', 'One or more center slugs are already taken');
  END IF;

  SELECT s.id, s.clinic_id, lower(btrim(s.role))
  INTO v_staff_id, v_staff_clinic_id, v_staff_role
  FROM public.staff s
  WHERE lower(s.email) = v_email
  LIMIT 1
  FOR UPDATE;

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No staff account found');
  END IF;

  IF v_staff_role NOT IN ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده') THEN
    RETURN jsonb_build_object('error', 'Only clinic administrators can create centers');
  END IF;

  IF v_staff_clinic_id IS NULL THEN
    SELECT c.id INTO v_clinic_id
    FROM public.clinics c
    WHERE lower(c.admin_email) = v_email
    LIMIT 1
    FOR UPDATE;

    IF v_clinic_id IS NULL THEN
      INSERT INTO public.clinics (name, name_en, admin_email, status)
      VALUES (v_clinic_name, v_clinic_name, v_email, 'active')
      RETURNING id INTO v_clinic_id;
    END IF;

    UPDATE public.staff
    SET clinic_id = v_clinic_id, pending_plan_id = NULL
    WHERE id = v_staff_id AND clinic_id IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Staff clinic assignment changed concurrently' USING ERRCODE = '40001';
    END IF;

    INSERT INTO public.clinic_settings (clinic_id, clinic_name)
    VALUES (v_clinic_id, v_clinic_name)
    ON CONFLICT (clinic_id) DO NOTHING;

    UPDATE public.subscriptions
    SET clinic_id = v_clinic_id
    WHERE lower(user_email) = v_email AND clinic_id IS NULL;
  ELSE
    v_clinic_id := v_staff_clinic_id;

    IF NOT EXISTS (SELECT 1 FROM public.clinics WHERE id = v_clinic_id) THEN
      RETURN jsonb_build_object('error', 'The assigned clinic no longer exists');
    END IF;

    SELECT lower(plan_name) INTO v_plan_name
    FROM public.subscriptions
    WHERE clinic_id = v_clinic_id AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT count(*) INTO v_branch_count
    FROM public.branches
    WHERE clinic_id = v_clinic_id;

    IF coalesce(v_plan_name, 'basic') <> 'gold'
       AND v_branch_count + v_center_count > 1 THEN
      RETURN jsonb_build_object('error', 'Your current plan supports one center only');
    END IF;

    IF coalesce(v_plan_name, 'basic') = 'gold'
       AND v_branch_count + v_center_count > 5 THEN
      RETURN jsonb_build_object('error', 'Your current plan supports up to five centers');
    END IF;
  END IF;

  FOR v_center IN SELECT value FROM jsonb_array_elements(p_centers)
  LOOP
    v_slug := lower(btrim(v_center->>'slug'));

    INSERT INTO public.branches (
      clinic_id, short_name, full_name, slug, status
    )
    VALUES (
      v_clinic_id,
      btrim(v_center->>'shortName'),
      nullif(btrim(coalesce(v_center->>'fullName', '')), ''),
      v_slug,
      'active'
    )
    RETURNING id, slug, short_name, full_name
    INTO v_branch;

    v_created_branches := v_created_branches || jsonb_build_array(
      jsonb_build_object(
        'id', v_branch.id,
        'slug', v_branch.slug,
        'shortName', v_branch.short_name,
        'fullName', v_branch.full_name
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'clinicId', v_clinic_id,
    'createdBranches', v_created_branches,
    'createdSlugs', (
      SELECT coalesce(jsonb_agg(value->>'slug'), '[]'::jsonb)
      FROM jsonb_array_elements(v_created_branches)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.setup_clinic_transaction_server(text, text, jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.setup_clinic_transaction_server(text, text, jsonb)
TO service_role;

-- Keep direct authenticated RPCs from transferring an existing employee to a new clinic.
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
  v_staff_id uuid;
  v_existing_clinic_id uuid;
  v_plan_name text;
  v_plan_price integer;
  v_slug text;
BEGIN
  IF auth.uid() IS NULL
     OR lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(trim(coalesce(p_email, ''))) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  v_slug := lower(trim(coalesce(p_slug, '')));
  IF v_slug !~ '^[a-z0-9-]{3,50}$' THEN
    RETURN jsonb_build_object('error', 'Invalid clinic slug');
  END IF;

  SELECT name, price_monthly INTO v_plan_name, v_plan_price
  FROM public.subscription_plans
  WHERE is_active = true
    AND (lower(name) = lower(trim(coalesce(p_plan_id, ''))) OR id::text = trim(coalesce(p_plan_id, '')))
  LIMIT 1;

  IF v_plan_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Selected subscription plan is unavailable');
  END IF;

  SELECT id INTO v_staff_id
  FROM public.staff
  WHERE lower(email) = lower(trim(p_email))
    AND clinic_id IS NULL
    AND lower(btrim(role)) IN ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  LIMIT 1
  FOR UPDATE;

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  END IF;

  SELECT id INTO v_existing_clinic_id
  FROM public.clinics
  WHERE lower(admin_email) = lower(trim(p_email))
  LIMIT 1
  FOR UPDATE;

  IF v_existing_clinic_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'This email already has a clinic', 'code', 'CLINIC_EMAIL_EXISTS', 'clinicId', v_existing_clinic_id);
  END IF;

  INSERT INTO public.clinics (name, name_en, admin_email, status)
  VALUES (btrim(p_short_name), btrim(p_short_name), lower(trim(p_email)), 'active')
  RETURNING id INTO v_clinic_id;

  INSERT INTO public.branches (clinic_id, short_name, full_name, slug, specializations, logo_url, status)
  VALUES (v_clinic_id, btrim(p_short_name), nullif(btrim(coalesce(p_full_name, '')), ''), v_slug,
          coalesce(p_specializations, '[]'::jsonb), p_logo_url, 'active')
  RETURNING id INTO v_branch_id;

  UPDATE public.staff SET clinic_id = v_clinic_id, pending_plan_id = NULL
  WHERE id = v_staff_id AND clinic_id IS NULL;

  INSERT INTO public.clinic_settings (clinic_id, clinic_name, logo_url)
  VALUES (v_clinic_id, btrim(p_short_name), p_logo_url)
  ON CONFLICT (clinic_id) DO NOTHING;

  INSERT INTO public.subscriptions (clinic_id, user_email, plan_name, plan_price, status, start_date)
  VALUES (v_clinic_id, lower(trim(p_email)), v_plan_name, v_plan_price, 'active', now());

  RETURN jsonb_build_object('clinic_id', v_clinic_id, 'branch_id', v_branch_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_center(text, text, text, text, text, jsonb, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_center(text, text, text, text, text, jsonb, text)
TO authenticated;

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
  v_staff_id uuid;
BEGIN
  IF auth.uid() IS NULL
     OR lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(trim(coalesce(p_email, ''))) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' OR length(p_name) > 160
     OR p_branches IS NULL OR jsonb_typeof(p_branches) <> 'array'
     OR jsonb_array_length(p_branches) < 1 OR jsonb_array_length(p_branches) > 5 THEN
    RETURN jsonb_build_object('error', 'Invalid clinic setup details');
  END IF;

  SELECT id INTO v_staff_id
  FROM public.staff
  WHERE lower(email) = lower(trim(p_email))
    AND clinic_id IS NULL
    AND lower(btrim(role)) IN ('admin', 'clinic_admin', 'مدير العيادة', 'مدير العياده')
  LIMIT 1
  FOR UPDATE;

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('error', 'An unassigned clinic administrator account is required');
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_branches) AS b(value)
    WHERE jsonb_typeof(b.value) <> 'object'
       OR btrim(coalesce(b.value->>'shortName', '')) = ''
       OR lower(btrim(coalesce(b.value->>'slug', ''))) !~ '^[a-z0-9-]{3,50}$'
  ) THEN
    RETURN jsonb_build_object('error', 'Invalid center details or slug');
  END IF;

  IF EXISTS (
    SELECT lower(btrim(value->>'slug'))
    FROM jsonb_array_elements(p_branches)
    GROUP BY lower(btrim(value->>'slug'))
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_branches) AS b(value)
    JOIN public.branches existing ON lower(existing.slug) = lower(btrim(b.value->>'slug'))
  ) THEN
    RETURN jsonb_build_object('error', 'Duplicate or unavailable center slug');
  END IF;

  INSERT INTO public.clinics (name, name_en, admin_email, status)
  VALUES (btrim(p_name), btrim(p_name), lower(trim(p_email)), 'active')
  RETURNING id INTO v_clinic_id;

  UPDATE public.staff SET clinic_id = v_clinic_id, pending_plan_id = NULL
  WHERE id = v_staff_id AND clinic_id IS NULL;

  INSERT INTO public.clinic_settings (clinic_id, clinic_name)
  VALUES (v_clinic_id, btrim(p_name))
  ON CONFLICT (clinic_id) DO NOTHING;

  FOR v_branch IN SELECT value FROM jsonb_array_elements(p_branches)
  LOOP
    v_branch_slug := lower(btrim(v_branch->>'slug'));
    INSERT INTO public.branches (clinic_id, short_name, full_name, slug, status)
    VALUES (v_clinic_id, btrim(v_branch->>'shortName'),
            nullif(btrim(coalesce(v_branch->>'fullName', '')), ''), v_branch_slug, 'active')
    RETURNING id INTO v_branch_id;

    v_branches := v_branches || jsonb_build_array(
      jsonb_build_object('id', v_branch_id, 'slug', v_branch_slug,
        'shortName', v_branch->>'shortName', 'fullName', v_branch->>'fullName')
    );
  END LOOP;

  RETURN jsonb_build_object('clinicId', v_clinic_id, 'branches', v_branches);
END;
$$;

REVOKE ALL ON FUNCTION public.setup_clinic_transaction(text, text, jsonb)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setup_clinic_transaction(text, text, jsonb)
TO authenticated;
