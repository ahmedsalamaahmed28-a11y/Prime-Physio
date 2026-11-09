-- Prevent center slugs from shadowing Next.js static routes.
create or replace function public.create_independent_center(
  p_email text,
  p_plan_id text,
  p_short_name text,
  p_full_name text,
  p_slug text,
  p_logo_url text default null,
  p_specializations jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));
  v_plan_id text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_plan_id, '')));
  v_short_name text := pg_catalog.btrim(coalesce(p_short_name, ''));
  v_full_name text := pg_catalog.btrim(coalesce(p_full_name, ''));
  v_slug text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_slug, '')));
  v_clinic_id uuid;
  v_branch_id uuid;
  v_plan_name text;
  v_plan_price integer;
  v_owner_name text;
  v_staff_role text;
  v_staff_status text;
begin
  if v_email = '' or pg_catalog.length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    return jsonb_build_object('error', 'Invalid account email');
  end if;
  if v_short_name = '' or pg_catalog.length(v_short_name) > 120
     or pg_catalog.length(v_full_name) > 200
     or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or pg_catalog.length(v_slug) > 50 then
    return jsonb_build_object('error', 'Invalid center details or slug');
  end if;
  if v_slug = any (array[
    'admin','api','home','manage','signup','center-management','create-center',
    'my-centers','setup','login','register','pricing','privacy','terms',
    'platform','dashboard','_next','favicon','robots','sitemap'
  ]) then
    return jsonb_build_object('error', 'This center URL is reserved', 'code', 'SLUG_RESERVED');
  end if;
  if pg_catalog.jsonb_typeof(coalesce(p_specializations, '[]'::jsonb)) <> 'array' then
    return jsonb_build_object('error', 'Invalid specializations');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_slug, 1));

  if exists (select 1 from public.clinics c where pg_catalog.lower(c.slug) = v_slug)
     or exists (select 1 from public.branches b where pg_catalog.lower(b.slug) = v_slug) then
    return jsonb_build_object('error', 'This center URL is already taken', 'code', 'SLUG_TAKEN');
  end if;

  select sp.name, sp.price_monthly into v_plan_name, v_plan_price
  from public.subscription_plans sp
  where sp.is_active = true and pg_catalog.lower(sp.name) = v_plan_id
  limit 1;
  if v_plan_name is null then
    return jsonb_build_object('error', 'Selected subscription plan is unavailable');
  end if;

  select aa.name into v_owner_name
  from public.auth_accounts aa
  where pg_catalog.lower(aa.email) = v_email and aa.verified = true and aa.role = 'admin'
  limit 1;
  if v_owner_name is null then
    return jsonb_build_object('error', 'Verified center-manager account required');
  end if;

  select pg_catalog.lower(pg_catalog.btrim(s.role)), pg_catalog.lower(pg_catalog.btrim(coalesce(s.status,'')))
    into v_staff_role, v_staff_status
  from public.staff s
  where pg_catalog.lower(s.email) = v_email
  limit 1
  for update;

  if v_staff_role is not null and (
    v_staff_role not in ('admin','clinic_admin','مدير العيادة','مدير العياده')
    or v_staff_status in ('محذوف','deleted','inactive','غير نشط')
  ) then
    return jsonb_build_object('error', 'Only an active center manager can create centers');
  end if;

  insert into public.clinics (name, name_en, admin_email, status, is_active, slug, logo_url)
  values (v_short_name, v_short_name, v_email, 'active', true, v_slug, p_logo_url)
  returning id into v_clinic_id;

  insert into public.branches (clinic_id, short_name, full_name, slug, logo_url, specializations, status)
  values (
    v_clinic_id, v_short_name,
    coalesce(nullif(v_full_name, ''), v_short_name),
    v_slug, p_logo_url, coalesce(p_specializations, '[]'::jsonb), 'active'
  )
  returning id into v_branch_id;

  if v_staff_role is null then
    insert into public.staff (clinic_id, name, email, role, status)
    values (null, v_owner_name, v_email, 'admin', 'نشط');
  end if;

  insert into public.clinic_owners (clinic_id, owner_email)
  values (v_clinic_id, v_email)
  on conflict do nothing;

  insert into public.clinic_settings (user_id, clinic_id, clinic_name, logo_url)
  values (v_email, v_clinic_id, v_short_name, p_logo_url)
  on conflict (clinic_id) do nothing;

  return jsonb_build_object(
    'success', true, 'clinicId', v_clinic_id, 'branchId', v_branch_id,
    'slug', v_slug, 'planId', v_plan_id, 'planPrice', v_plan_price
  );
end;
$function$;
