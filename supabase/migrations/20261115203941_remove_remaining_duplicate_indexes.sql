-- Remove redundant indexes while retaining the constraint-backed unique index.
DROP INDEX IF EXISTS public.clinic_owners_email_subscription_idx;
DROP INDEX IF EXISTS public.patients_id_clinic_unique;
