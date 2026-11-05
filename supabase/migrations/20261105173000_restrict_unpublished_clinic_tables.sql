-- These RLS-enabled tables have no client policies and are reserved for server-side access.
REVOKE ALL ON TABLE public.clinic_backups, public.clinic_services
FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.clinic_backups, public.clinic_services TO service_role;