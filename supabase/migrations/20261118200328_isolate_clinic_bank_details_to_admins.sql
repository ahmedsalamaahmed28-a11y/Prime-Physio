create table if not exists public.clinic_bank_details (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  account_holder_name text,
  bank_name text,
  iban text,
  swift_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.clinic_bank_details (
  clinic_id, account_holder_name, bank_name, iban, swift_code, updated_at
)
select clinic_id, account_holder_name, bank_name, iban, swift_code, coalesce(updated_at, now())
from public.clinic_settings
where account_holder_name is not null
   or bank_name is not null
   or iban is not null
   or swift_code is not null
on conflict (clinic_id) do update set
  account_holder_name = excluded.account_holder_name,
  bank_name = excluded.bank_name,
  iban = excluded.iban,
  swift_code = excluded.swift_code,
  updated_at = excluded.updated_at;

alter table public.clinic_bank_details enable row level security;
grant select, insert, update, delete on public.clinic_bank_details to authenticated;

drop policy if exists clinic_bank_details_admin_select on public.clinic_bank_details;
create policy clinic_bank_details_admin_select
  on public.clinic_bank_details for select to authenticated
  using (clinic_id = public.get_my_clinic_id() and public.is_clinic_admin());

drop policy if exists clinic_bank_details_admin_insert on public.clinic_bank_details;
create policy clinic_bank_details_admin_insert
  on public.clinic_bank_details for insert to authenticated
  with check (clinic_id = public.get_my_clinic_id() and public.is_clinic_admin());

drop policy if exists clinic_bank_details_admin_update on public.clinic_bank_details;
create policy clinic_bank_details_admin_update
  on public.clinic_bank_details for update to authenticated
  using (clinic_id = public.get_my_clinic_id() and public.is_clinic_admin())
  with check (clinic_id = public.get_my_clinic_id() and public.is_clinic_admin());

drop policy if exists clinic_bank_details_admin_delete on public.clinic_bank_details;
create policy clinic_bank_details_admin_delete
  on public.clinic_bank_details for delete to authenticated
  using (clinic_id = public.get_my_clinic_id() and public.is_clinic_admin());

alter table public.clinic_settings
  drop column if exists account_holder_name,
  drop column if exists bank_name,
  drop column if exists iban,
  drop column if exists swift_code;