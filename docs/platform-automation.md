# Prime Physio platform automation

This automation layer uses the existing GitHub Actions, Vercel Git integration, and Supabase database. It adds no paid service and does not change patient records.

## 1. Deployment monitor

Workflow: `.github/workflows/platform-deployment-monitor.yml`

- Runs every 30 minutes, on demand, and after the existing **Security and application checks** workflow succeeds on `main`.
- Reads the GitHub commit status named `Vercel`.
- Waits up to 10 minutes for the production deployment result.
- Opens one GitHub issue per failed/missing deployment status and closes that issue after a later successful recheck.
- Does not deploy code or change Vercel settings.

Important: Vercel is currently connected to deploy from `main` automatically. This monitor verifies the Vercel status after CI; it does not block Vercel's automatic deployment while GitHub checks are running. Blocking deployments would require changing branch protection or Vercel deployment-check settings, which is intentionally not changed in this first pass.

## 2. Tenant isolation integration test

Workflow: `.github/workflows/tenant-isolation.yml`

The test performs four read-only REST requests:
- Tenant A can read its own synthetic patient.
- Tenant A cannot read Tenant B's synthetic patient.
- Tenant B can read its own synthetic patient.
- Tenant B cannot read Tenant A's synthetic patient.

It refuses to run against the production project reference `crrhrjhftwostjomzmfj`. It does not create, update, or delete records and never prints patient values or access tokens.

Configure these GitHub repository variables/secrets before expecting a real integration test:

| Name | GitHub setting | Purpose |
| --- | --- | --- |
| `SUPABASE_TEST_PROJECT_REF` | Variable | Dedicated non-production Supabase project reference |
| `TENANT_A_TEST_PATIENT_ID` | Variable | Synthetic patient ID owned by test clinic A |
| `TENANT_B_TEST_PATIENT_ID` | Variable | Synthetic patient ID owned by test clinic B |
| `SUPABASE_TEST_ANON_KEY` | Secret | Publishable/anon key for the test project |
| `TENANT_A_ACCESS_TOKEN` | Secret | Authenticated access token for test user A |
| `TENANT_B_ACCESS_TOKEN` | Secret | Authenticated access token for test user B |

If these values are absent, the workflow explicitly reports **SKIPPED** rather than pretending that isolation was tested. Never use real patient records as test fixtures.

## 3. Database integrity monitor

Workflow: `.github/workflows/database-integrity.yml`

Runs daily and on demand. The script checks aggregate counts for:
- Patients/sessions missing their clinic association.
- Sessions, evaluations, programs, medical records, or attachments whose patient and clinic pair does not match.

The SQL runs inside a `BEGIN READ ONLY` transaction and selects counts only; it does not retrieve patient names, clinical notes, phone numbers, or other patient content.

For scheduled execution, configure `SUPABASE_READONLY_DB_URL` as a GitHub Actions secret. It must be a dedicated database role with SELECT-only access to the required tables, not the `postgres` owner connection. If it is not configured, the job reports **SKIPPED**.

## 4. Failure diagnosis

Workflow: `.github/workflows/automation-diagnostics.yml`

When a monitored workflow fails, it creates a GitHub issue containing failed job names, failed step names, and links to the relevant logs. It deliberately does not download raw logs (which can contain secrets), edit code, change database permissions, or apply automatic fixes.

## 5. Existing CI

The existing `Security and application checks` workflow remains responsible for dependency audit, TypeScript, ESLint, CSP checks, and the production build. The new workflows complement it; they do not replace it.

## Safety boundaries

- No Supabase schema, RLS policy, auth setting, or production patient record is changed by these workflows.
- No service-role key is added to the repository.
- Tenant integration tests use a separate test project and synthetic patients only.
- Database integrity checks use a read-only database connection and aggregate results only.
- Automatic repair is intentionally disabled. A failure creates a diagnostic issue for review.
