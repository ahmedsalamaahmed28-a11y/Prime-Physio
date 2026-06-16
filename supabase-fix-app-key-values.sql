-- Fix: app_key_values needs to be readable by all authenticated users
-- (auth flow reads pending_role, current_user, admin_email, etc.)

drop policy if exists "platform_admin_bypass" on public.app_key_values;
drop policy if exists "service role full access app_key_values" on public.app_key_values;

-- Allow reads for any user (including anon for signup flow)
create policy "anyone_can_read_app_key_values" on public.app_key_values
  for select using (true);

-- Allow writes only for platform_admins and service_role
create policy "platform_admin_insert_app_key_values" on public.app_key_values
  for insert with check (public.is_platform_admin() or auth.role() = 'service_role');

create policy "platform_admin_update_app_key_values" on public.app_key_values
  for update using (public.is_platform_admin() or auth.role() = 'service_role')
  with check (public.is_platform_admin() or auth.role() = 'service_role');

create policy "platform_admin_delete_app_key_values" on public.app_key_values
  for delete using (public.is_platform_admin() or auth.role() = 'service_role');
