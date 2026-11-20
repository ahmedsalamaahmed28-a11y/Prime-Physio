-- Normalize existing emails to lowercase for case-insensitive matching
-- Run this after deploying the code fix to ensure all existing data is consistent

-- 1. Normalize staff emails
UPDATE staff SET email = LOWER(TRIM(email)) WHERE email <> LOWER(TRIM(email));

-- 2. Normalize clinic admin_email
UPDATE clinics SET admin_email = LOWER(TRIM(admin_email)) WHERE admin_email <> LOWER(TRIM(admin_email));

-- 3. Normalize auth_accounts emails (should already be lowercase, but just in case)
UPDATE auth_accounts SET email = LOWER(TRIM(email)) WHERE email <> LOWER(TRIM(email));

-- 4. Normalize subscriptions user_email
UPDATE subscriptions SET user_email = LOWER(TRIM(user_email)) WHERE user_email <> LOWER(TRIM(user_email));

-- Verify: should return 0 rows
SELECT COUNT(*) AS "Non-lowercase staff emails remaining" FROM staff WHERE email <> LOWER(TRIM(email));
