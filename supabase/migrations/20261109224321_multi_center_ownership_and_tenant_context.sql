-- Multi-center ownership and explicit tenant context.
-- Existing clinic data is preserved. Users with one existing clinic retain their
-- previous default context; users with multiple memberships must select a center.

create table if not exists public.clinic_owners (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  owner_email text not null,
  created_at timestamptz not null default now(),
  primary key (clinic_id, owner_email),
  constraint clinic_owners_email_format check (
    owner_email = lower(btrim(owner_email)) and length(owner_email) between 3 and 254
  )
);
create index if not exists clinic_owners_owner_email_idx
  on public.clinic_owners (lower(owner_email));
alter table public.clinic_owners enable row level security;
revoke all on public.clinic_owners from anon, authenticated;
grant select on public.clinic_owners to authenticated;
grant all on public.clinic_owners to service_role;
drop policy if exists clinic_owners_owner_read on public.clinic_owners;
create policy clinic_owners_owner_read on public.clinic_owners
  for select to authenticated
  using (
    public.is_valid_auth_session()
    and lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

insert into public.clinic_owners (clinic_id, owner_email)
select c.id, lower(btrim(c.admin_email))
from public.clinics c
where c.admin_email is not null and btrim(c.admin_email) <> ''
on conflict do nothing;

insert into public.clinic_owners (clinic_id, owner_email)
select distinct s.clinic_id, lower(btrim(s.email))
from public.staff s
where s.clinic_id is not null
  and s.email is not null
  and lower(btrim(s.role)) in ('admin','clinic_admin','مدير العيادة','مدير العياده')
  and coalesce(s.status,'') <> 'محذوف'
on conflict do nothing;

alter table public.clinics drop constraint if exists clinics_admin_email_key;
drop index if exists public.clinics_admin_email_lower_unique;
alter table public.staff drop constraint if exists staff_email_key;
drop index if exists public.staff_email_lower_unique;
create unique index if not exists staff_email_clinic_unique
  on public.staff (lower(email), clinic_id)
  where clinic_id is not null;
create unique index if not exists staff_email_unassigned_unique
  on public.staff (lower(email))
  where clinic_id is null;

create or replace function public.get_my_clinic_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_active_text text := nullif(auth.jwt() -> 'app_metadata' ->> 'active_clinic_id', '');
  v_active_id uuid;
  v_count bigint;
  v_only_id uuid;
begin
  if auth.uid() is null or v_email = '' or not public.is_valid_auth_session() then
    return null;
  end if;

  if v_active_text is not null then
    begin
      v_active_id := v_active_text::uuid;
    exception when invalid_text_representation then
      return null;
    end;

    if exists (
      select 1 from public.clinic_owners o
      where o.clinic_id = v_active_id and pg_catalog.lower(o.owner_email) = v_email
    ) or exists (
      select 1 from public.staff s
      where s.clinic_id = v_active_id
        and pg_catalog.lower(s.email) = v_email
        and coalesce(s.status, '') not in ('محذوف','deleted','inactive','غير نشط')
    ) then
      return v_active_id;
    end if;
    return null;
  end if;

  select count(distinct membership.clinic_id), min(membership.clinic_id)
    into v_count, v_only_id
  from (
    select s.clinic_id
    from public.staff s
    where pg_catalog.lower(s.email) = v_email
      and s.clinic_id is not null
      and coalesce(s.status, '') not in ('محذوف','deleted','inactive','غير نشط')
    union
    select o.clinic_id
    from public.clinic_owners o
    where pg_catalog.lower(o.owner_email) = v_email
  ) membership;

  if v_count = 1 then return v_only_id; end if;
  return null;
end;
$function$;

create or replace function public.get_clinic_id_for_email(target_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when auth.uid() is not null
      and pg_catalog.lower(pg_catalog.btrim(coalesce(target_email, ''))) =
          pg_catalog.lower(pg_catalog.btrim(coalesce(auth.jwt() ->> 'email', '')))
      then public.get_my_clinic_id()
    else null::uuid
  end;
$function$;

create or replace function public.is_clinic_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and public.get_my_clinic_id() is not null
    and (
      exists (
        select 1 from public.clinic_owners o
        where o.clinic_id = public.get_my_clinic_id()
          and pg_catalog.lower(o.owner_email) =
              pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      or exists (
        select 1 from public.staff s
        where s.clinic_id = public.get_my_clinic_id()
          and pg_catalog.lower(s.email) =
              pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
          and coalesce(s.status, '') not in ('محذوف','deleted','inactive','غير نشط')
          and pg_catalog.lower(pg_catalog.btrim(s.role)) in
            ('admin','clinic_admin','مدير العيادة','مدير العياده')
      )
    );
$function$;

create or replace function public.has_staff_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce((
    select case
      when exists (
        select 1 from public.clinic_owners o
        where o.clinic_id = public.get_my_clinic_id()
          and pg_catalog.lower(o.owner_email) =
              pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
      ) then true
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
    where auth.uid() is not null
      and public.get_my_clinic_id() is not null
      and s.clinic_id = public.get_my_clinic_id()
      and pg_catalog.lower(s.email) = pg_catalog.lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce(s.status, '') not in ('محذوف','deleted','inactive','غير نشط')
    limit 1
  ), false);
$function$;

revoke all on function public.get_my_clinic_id() from public, anon;
revoke all on function public.get_clinic_id_for_email(text) from public, anon;
revoke all on function public.is_clinic_admin() from public, anon;
revoke all on function public.has_staff_permission(text) from public, anon;
grant execute on function public.get_my_clinic_id() to authenticated, service_role;
grant execute on function public.get_clinic_id_for_email(text) to authenticated, service_role;
grant execute on function public.is_clinic_admin() to authenticated, service_role;
grant execute on function public.has_staff_permission(text) to authenticated, service_role;
