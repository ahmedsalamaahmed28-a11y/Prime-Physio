# Prime Physio migration history reconciliation

## Verified snapshot — 2026-11-20

Production Supabase project: `crrhrjhftwostjomzmfj`.

A read-only comparison of the production migration inventory with the source-controlled `supabase/migrations` directory on `security/strict-active-clinic-isolation` found:

| Check | Count |
|---|---:|
| Applied production migration records | 130 |
| Source-controlled migration SQL files | 122 |
| Exact version + name matches | 56 |
| Applied records with a same-name file but a different version prefix | 51 |
| Applied records with no same-name source file | 23 |
| Source files with no same-name applied record | 15 |

A matching name is not proof that the SQL body is identical. The 51 timestamp mismatches must be compared against historical SQL/deployment evidence before any rename or repair. The 23 unmatched production records must be recovered from trusted deployment history or classified as combined/no-op migrations with evidence. The 15 source-only files must also be classified; do not assume they are safe to apply.

## Confirmed clean-rebuild blockers

1. The repository has no `supabase/config.toml`, so a reproducible Supabase CLI local stack/reset is not configured.
2. The earliest source migration, `20261105145500_enable_notifications_rls.sql`, only runs `ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY`; it does not create the table.
3. The two legacy SQL archives, `docs/sql-archive/supabase-schema.sql` and `docs/sql-archive/supabase-full-setup.sql`, do not define `public.notifications`. They are historical snapshots, not a proven complete baseline for the current production schema.
4. The current PostgreSQL RLS CI harness creates a small synthetic schema and tests its copied RLS rules. It does not replay the 122 migrations and must not be described as a full database rebuild test.

Production currently contains `public.notifications`; this was checked read-only. No production table, migration record, policy, or setting was changed during this investigation.

## Safe rebuild and integration-test route

### Phase A — preserve and reconcile history

1. Keep the current production migration history untouched.
2. Recover each of the 130 applied SQL bodies from trusted Git history, deployment artifacts, or a verified schema-change archive.
3. Build a machine-readable reconciliation ledger with one row per applied version: exact source file, SQL-body hash, ordering, classification (exact, renamed, combined, no-op, missing), and evidence.
4. Compare the source-only files against production history and determine whether each is unapplied, superseded, or a duplicate. Never apply them merely because they exist in the repository.
5. Do not fabricate historical migration SQL or rewrite timestamps based on names alone.

### Phase B — establish a disposable local database

1. Add a reviewed Supabase CLI configuration and a documented local-only environment. Use the local Supabase stack/Docker or a disposable PostgreSQL service; do not use a paid Supabase development branch.
2. Build a complete baseline from verified schema objects, extensions, roles, functions, triggers, policies, storage metadata/policies, and required Auth/Storage compatibility objects. The old SQL archives are inputs for comparison only, not the baseline itself.
3. Replay the reconciled migration sequence from an empty local database. Run it twice from clean state to detect ordering and idempotency assumptions.
4. Compare resulting local schema metadata against a read-only production inventory: tables/columns, constraints, indexes, functions, triggers, grants, RLS flags/policies, and storage policies. Compare structure only; do not copy production patient or billing data.

### Phase C — disposable integration fixtures

1. Create synthetic Clinic A and Clinic B users/centers and synthetic patient, invoice, appointment, session, EMR, and attachment records in the isolated environment.
2. Run positive and negative CRUD tests for every role and every patient-linked table: read, insert, update, delete, cross-clinic access, forged active-clinic claims, switching centers, and service-role API boundaries.
3. Test Storage read/upload/update/delete isolation, not only folder-level select/insert.
4. Test subscription quota boundaries and concurrent attempts in the isolated database.
5. Test OTP end-to-end using a dedicated test mailbox and non-production email credentials. Do not expose secrets in logs.

### Phase D — release gate

Do not merge or deploy until the clean rebuild, schema comparison, role-based API integration, storage, quota, and OTP checks pass. Keep Vercel production deployment separate from database verification. A successful synthetic RLS harness or a skipped integration job is not evidence that the complete application is production-ready.

## Current execution status

- Production migration inventory: read-only, 130 records.
- Source inventory: 122 files; reconciliation is incomplete.
- Production schema/data/history: untouched.
- Supabase development branches: none created; no branch cost incurred.
- Full migration replay: not run because the verified baseline/configuration is missing.
- Real two-user API CRUD integration: not run because isolated tenant credentials/fixtures are not configured.
- Next safe action: recover the 23 unmatched historical migration bodies and reconcile all 51 same-name timestamp mismatches before constructing the local baseline.


## Additional Git-history investigation — 2026-11-20

A second read-only pass inspected GitHub commit history for all 23 currently unmatched production migration paths. Direct path history returned zero commits for all 23 exact production filenames. This does not prove that the SQL was never committed under another filename; it means the exact paths cannot be recovered from their direct path histories.

The migration directory history does contain prior timestamp-alignment and duplicate-removal commits. Examples include:
- `33b3e8ae39cf0b2aa006f532a1834eadae28712c`: moved the default-privilege migration to the production-recorded version `20261116194303`; the prior timestamped duplicate was removed in `85abce40f86273f5dcb2a98090675ec255d91fab`.
- `377c94b62398d0f6850f2fcd7df4fefb578e9f19` and `03f05aad3e2558cc085b7fbea30e5372090dccfe`: aligned the patient-index cleanup filename and removed the mismatched duplicate.
- `293af0496d1c103509b0e5ea89dc14a02e79588c`: added the current one-hour group-session source file.
- `28f49ea98dfd23f3f99c2596a1a7c73ac22d5c70`: added the current center-owner quota source file.
- `349759ce2e8ecd7c94a1203402ab4c893a00d918` and `5fc97153e26f64ae482b5fcebf625b6652e03a1a`: added the current RLS auth.uid() optimization source files.

These commits establish source-file provenance and show that filename reconciliation occurred before. They do not expose the SQL body stored in the hosted migration history, so they are not treated as proof of production/source body equality.

A machine-readable ledger is now stored at `docs/database-migration-reconciliation-ledger.json`. It contains one row per production-applied migration, the current source candidate (when same-name), the current source Git blob SHA-1, and an explicit null production SQL hash. The Git blob hash is not represented as a production SQL hash. All source-only files are listed separately and marked do-not-apply pending evidence.

## Execution boundary

No local PostgreSQL service or Docker runtime is exposed through the connected GitHub/Supabase tools in this session. The production Supabase project is healthy, but it is not a safe substitute for a disposable local database. Therefore no migration replay, schema mutation, migration repair, or test fixture creation was run. The next valid step is to obtain trusted SQL artifacts for the unmatched records and execute the reconciled replay in an isolated local PostgreSQL/Supabase environment.


## Candidate recovery findings — 2026-11-20

The original reconciliation note preserved in merge commit `1432e625f85e4b38249ed066e6b132e20cb31814` provides historical candidate paths for several early migrations:
- Applied `20261105150029_pin_search_path_security_functions` was previously associated with source `20261105151000_pin_security_function_search_path.sql`.
- The early clinic lookup/provisioning restrictions have a combined source candidate `20261105152500_restrict_clinic_lookup_and_provision.sql`.
- The original note also documented that the legacy app-key revocation history included multiple similarly named files with different contents, reinforcing that names cannot establish equivalence.

The ledger now records 13 historical or semantic candidates among the 23 unmatched production records. These candidates are explicitly marked unverified. Ten unmatched records still have no defensible current-source candidate. The ledger also records current source Git blob SHA-1 values for candidate files, while leaving every production SQL hash null because the hosted migration inventory does not expose original SQL bodies.

## Local execution environment check

The connected execution runtime was checked for `psql`, `postgres`, `initdb`, `pg_ctl`, Docker, Podman, and the Supabase CLI; none is installed. The connected GitHub and Supabase tools do not provide a disposable local PostgreSQL daemon. No production database was used as a substitute, and no migration replay was attempted. A local rebuild therefore remains blocked until an isolated PostgreSQL/Supabase CLI runner is made available and a complete, trusted baseline is recovered.
