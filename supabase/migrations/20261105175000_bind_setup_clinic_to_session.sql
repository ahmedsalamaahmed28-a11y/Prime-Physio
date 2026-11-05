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

  IF p_branches IS NULL OR jsonb_typeof(p_branches) <> 'array' OR jsonb_array_length(p_branches) = 0 THEN
    RETURN jsonb_build_object('error', 'At least one center is required');
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
    RETURN jsonb_build_object(
      'error', 'This email already has a clinic',
      'code', 'CLINIC_EMAIL_EXISTS',
      'clinicId', v_existing_clinic_id
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_branches) AS branch_a,
         jsonb_array_elements(p_branches) AS branch_b
    WHERE branch_a <> branch_b
      AND lower(branch_a->>'slug') = lower(branch_b->>'slug')
  ) THEN
    RETURN jsonb_build_object('error', 'Duplicate branch slugs are not allowed');
  END IF;

  INSERT INTO public.clinics (name, name_en, admin_email, status)
  VALUES (p_name, p_name, lower(trim(p_email)), 'active')
  RETURNING id INTO v_clinic_id;

  UPDATE public.staff
  SET clinic_id = v_clinic_id,
      pending_plan_id = NULL
  WHERE lower(email) = lower(trim(p_email));

  INSERT INTO public.clinic_settings (clinic_id, clinic_name)
  VALUES (v_clinic_id, p_name)
  ON CONFLICT (clinic_id) DO NOTHING;

  FOR v_branch IN
    SELECT * FROM jsonb_array_elements(p_branches)
  LOOP
    v_branch_slug := lower(btrim(coalesce(v_branch->>'slug', '')));

    IF v_branch_slug = '' THEN
      RETURN jsonb_build_object('error', 'Branch slug is required');
    END IF;

    IF EXISTS (SELECT 1 FROM public.branches WHERE slug = v_branch_slug) THEN
      RETURN jsonb_build_object('error', format('Slug already taken: %s', v_branch_slug));
    END IF;

    INSERT INTO public.branches (
      clinic_id, short_name, full_name, slug, status
    )
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

REVOKE ALL ON FUNCTION public.setup_clinic_transaction(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setup_clinic_transaction(text, text, jsonb) TO authenticated;