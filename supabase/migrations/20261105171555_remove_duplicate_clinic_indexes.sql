-- Remove exact duplicate indexes while retaining one covering index per table.
-- pg_stat_user_indexes showed idx_subscriptions_clinic_id had scans; the other
-- subscriptions index was unused. Both audit_logs indexes were unused, so keep
-- the pre-existing audit_logs_clinic_id_idx.
DROP INDEX IF EXISTS public.idx_audit_logs_clinic;
DROP INDEX IF EXISTS public.idx_subscriptions_clinic;
