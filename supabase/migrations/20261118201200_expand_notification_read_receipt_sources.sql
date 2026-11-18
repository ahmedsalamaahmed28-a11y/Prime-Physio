alter table public.notification_read_states
  drop constraint if exists notification_read_states_source_check;
alter table public.notification_read_states
  add constraint notification_read_states_source_check
  check (source in ('broadcast', 'audit', 'clinic'));