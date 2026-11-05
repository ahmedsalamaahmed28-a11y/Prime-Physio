# Prime Physio migration history reconciliation

## Current production snapshot

Inspected project `crrhrjhftwostjomzmfj` on 2026-11-05. Supabase reports 37 applied migration records. The security branch contains SQL migration files, but their filename timestamps do not consistently match the applied `schema_migrations.version` values.

Examples observed:
- Database: `20261105145318_enable_notifications_rls`; branch file: `20261105145500_enable_notifications_rls.sql`.
- Database: `20261105150029_pin_search_path_security_functions`; branch file: `20261105151000_pin_security_function_search_path.sql`.
- Database: `20261105152933_secure_auth_verification_storage`; branch file: `20261105150000_secure_auth_verification_storage.sql`.
- Database: `20261105162204_revoke_legacy_app_key_values_access`; branch has multiple similarly named files, including a deferred no-op placeholder and later revocation scripts with different contents.

There are also source files that appear to combine changes represented by more than one applied migration record. A filename/name similarity is not sufficient evidence that two migration SQL bodies are equivalent.

## Safety decision

Do not run `supabase db push`, do not run `supabase migration repair`, and do not rename or delete migration files until each applied database version has been matched to its exact SQL body and ordering. The production database already contains the security changes; replaying a mismatched or incomplete migration sequence could fail or change access controls unexpectedly.

## Required reconciliation procedure

1. Export the complete applied migration inventory from the production project's migration history.
2. Recover the exact SQL for every applied version from the deployment history, prior commits, or a trusted schema-change archive.
3. Compare each SQL body with the source-controlled migration files and the current production schema. Record exact one-to-one matches, combined migrations, no-op migrations, and missing source files separately.
4. Restore the original version prefixes for exact matches. For combined or missing historical SQL, preserve the applied history and add a documented baseline/reconciliation strategy for fresh environments; do not fabricate old migration bodies.
5. Validate the reconstructed sequence against a disposable staging database with `supabase db reset` before any production history change.
6. Confirm `supabase migration list` shows local/remote alignment and that the resulting schema matches production before merging.

## Current status

- Production migration history: 37 applied records.
- Source-controlled SQL: present, but timestamp/name alignment is not yet proven.
- Production schema changes: already applied; no production migration history rows were modified during this review.
- Staging validation: pending creation of a Supabase development branch and test credentials.
