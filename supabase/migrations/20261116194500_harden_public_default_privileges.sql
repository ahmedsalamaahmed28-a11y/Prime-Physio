-- Follow Supabase's hosted-project guidance: harden defaults for objects
-- created by the postgres role in public. Future objects must opt in to grants.
-- Existing table/function grants are not changed by ALTER DEFAULT PRIVILEGES.

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;
