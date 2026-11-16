-- The patients table already has an index on clinic_id for its foreign key.
-- Keep the existing index and avoid maintaining a duplicate copy.
drop index if exists public.patients_clinic_subscription_limit_idx;
