alter table public.clinic_settings
  add column if not exists email text,
  add column if not exists description text,
  add column if not exists account_holder_name text,
  add column if not exists bank_name text,
  add column if not exists iban text,
  add column if not exists swift_code text;

create table if not exists public.notification_read_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('broadcast', 'audit', 'clinic')),
  notification_id text not null,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, source, notification_id)
);

alter table public.notification_read_states enable row level security;

drop policy if exists notification_read_states_select_own on public.notification_read_states;
create policy notification_read_states_select_own
  on public.notification_read_states for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notification_read_states_insert_own on public.notification_read_states;
create policy notification_read_states_insert_own
  on public.notification_read_states for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists notification_read_states_update_own on public.notification_read_states;
create policy notification_read_states_update_own
  on public.notification_read_states for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists notification_read_states_delete_own on public.notification_read_states;
create policy notification_read_states_delete_own
  on public.notification_read_states for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.notification_read_states to authenticated;

drop policy if exists clinic_logo_upload_own_center on storage.objects;
create policy clinic_logo_upload_own_center
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'branch-logos'
    and (storage.foldername(name))[1] = (public.get_my_clinic_id())::text
    and public.is_clinic_admin()
  );