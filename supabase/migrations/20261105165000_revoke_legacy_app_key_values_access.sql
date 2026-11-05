-- Deferred legacy storage lockdown. The application must first deploy the localStorage migration.
-- Final revocation is performed by 20261105171000_revoke_legacy_app_key_values_access.sql.
SELECT 1;
