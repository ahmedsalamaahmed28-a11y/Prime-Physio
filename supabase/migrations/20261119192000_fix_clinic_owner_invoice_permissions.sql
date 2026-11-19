create or replace function public.has_staff_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select case
    when auth.uid() is null or public.get_my_clinic_id() is null then false
    when exists (
      select 1
      from public.clinic_owners o
      where o.clinic_id = public.get_my_clinic_id()
        and pg_catalog.lower(o.owner_email) =
            pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
    ) then true
    else coalesce((
      select case
        when pg_catalog.lower(pg_catalog.btrim(s.role)) in
          ('admin','clinic_admin','مدير العيادة','مدير العياره','مدير العياده','مدير النظام') then true
        when s.permissions is not null
          and pg_catalog.btrim(s.permissions) <> ''
          and pg_catalog.left(pg_catalog.btrim(s.permissions), 1) = '['
          then coalesce((s.permissions::jsonb ? permission_key), false)
        when pg_catalog.lower(pg_catalog.btrim(s.role)) in
          ('doctor','استشاري علاج طبيعي','أخصائي علاج طبيعي','ممارس علاج طبيعي')
          then permission_key in ('edit_emr','edit_patient','view_patient_history')
        when pg_catalog.lower(pg_catalog.btrim(s.role)) in
          ('receptionist','موظف استقبال','موظفة استقبال رئيسية')
          then permission_key in ('create_invoice','edit_patient')
        else false
      end
      from public.staff s
      where s.clinic_id = public.get_my_clinic_id()
        and pg_catalog.lower(s.email) =
            pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
        and coalesce(s.status, '') not in ('محذوف','deleted','inactive','غير نشط')
      limit 1
    ), false)
  end
$function$;
