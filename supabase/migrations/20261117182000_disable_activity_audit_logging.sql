do $$
declare r record;
begin
  for r in
    select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where not t.tgisinternal and n.nspname='public' and t.tgname ilike 'audit%'
  loop execute format('drop trigger if exists %I on %I.%I',r.trigger_name,r.schema_name,r.table_name); end loop;
end $$;
drop function if exists public.log_audit_event();
truncate table public.audit_logs, public.platform_admin_audit_log;
drop index if exists public.audit_logs_created_at_desc_idx;
drop index if exists public.audit_logs_clinic_created_at_desc_idx;