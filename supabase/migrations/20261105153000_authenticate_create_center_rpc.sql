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
BEGIN
  IF auth.uid() IS NULL OR lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(trim(p_email)) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.branches WHERE slug = p_slug) THEN
    RETURN jsonb_build_object('error', 'Slug already taken');
  END IF;

  SELECT id INTO v_existing_staff_id FROM public.staff WHERE lower(email) = lower(p_email);
  IF v_existing_staff_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No staff record found for this email');
  END IF;

  SELECT id INTO v_existing_clinic_id FROM public.clinics
  WHERE lower(admin_email) = lower(p_email) LIMIT 1;
  IF v_existing_clinic_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'This email already has a clinic', 'code', 'CLINIC_EMAIL_EXISTS', 'clinicId', v_existing_clinic_id);
  END IF;

  INSERT INTO public.clinics (name, name_en, admin_email, status)
  VALUES (p_short_name, p_short_name, p_email, 'active')
  RETURNING id INTO v_clinic_id;

  INSERT INTO public.branches (clinic_id, short_name, full_name, slug, specializations, logo_url, status)
  VALUES (v_clinic_id, p_short_name, p_full_name, p_slug, p_specializations, p_logo_url, 'active')
  RETURNING id INTO v_branch_id;

  UPDATE public.staff SET clinic_id = v_clinic_id, pending_plan_id = NULL
  WHERE lower(email) = lower(p_email);

  INSERT INTO public.clinic_settings (clinic_id, clinic_name, logo_url)
  VALUES (v_clinic_id, p_short_name, p_logo_url)
  ON CONFLICT (clinic_id) DO NOTHING;

  INSERT INTO public.subscriptions (clinic_id, user_email, plan_name, plan_price, status, start_date)
  VALUES (
    v_clinic_id, p_email,
    CASE p_plan_id WHEN 'basic' THEN 'basic' WHEN 'silver' THEN 'silver' WHEN 'gold' THEN 'gold' ELSE p_plan_id END,
    CASE p_plan_id WHEN 'basic' THEN 0 WHEN 'silver' THEN 1000 WHEN 'gold' THEN 1500 ELSE 0 END,
    'active', now()
  );

  RETURN jsonb_build_object('clinic_id', v_clinic_id, 'branch_id', v_branch_id);
END;
$$;
REVOKE ALL ON FUNCTION public.create_center(text,text,text,text,text,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_center(text,text,text,text,text,jsonb,text) TO authenticated;
