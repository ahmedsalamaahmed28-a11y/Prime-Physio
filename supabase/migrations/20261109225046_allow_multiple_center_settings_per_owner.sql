-- One manager can own many centers; clinic settings remain unique by clinic_id.
alter table public.clinic_settings
  drop constraint if exists clinic_settings_user_id_key;
create index if not exists clinic_settings_user_id_idx
  on public.clinic_settings(user_id);
