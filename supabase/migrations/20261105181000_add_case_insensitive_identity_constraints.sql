-- Prevent case-variant duplicate auth accounts and duplicate clinic ownership.
CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_email_lower_unique
ON public.auth_accounts (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS clinics_admin_email_lower_unique
ON public.clinics (lower(admin_email))
WHERE admin_email IS NOT NULL;