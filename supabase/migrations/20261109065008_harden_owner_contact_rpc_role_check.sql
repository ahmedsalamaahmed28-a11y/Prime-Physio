create or replace function public.store_clinic_owner_contact(p_email text, p_phone text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
declare
  request_role text;
  request_claims text;
begin
  request_role := nullif(current_setting('request.jwt.claim.role', true), '');
  if request_role is null then
    request_claims := nullif(current_setting('request.jwt.claims', true), '');
    if request_claims is not null then
      request_role := request_claims::jsonb ->> 'role';
    end if;
  end if;

  if coalesce(request_role, '') <> 'service_role' then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_email is null or lower(btrim(p_email)) = '' or p_phone is null
     or length(btrim(p_phone)) < 7 or length(btrim(p_phone)) > 32 then
    raise exception 'invalid owner contact';
  end if;
  insert into private.clinic_owner_contacts (user_email, phone)
  values (lower(btrim(p_email)), btrim(p_phone))
  on conflict (user_email) do update
    set phone = excluded.phone, updated_at = now();
end;
$$;

revoke all on function public.store_clinic_owner_contact(text, text) from public, anon, authenticated;
grant execute on function public.store_clinic_owner_contact(text, text) to service_role;
