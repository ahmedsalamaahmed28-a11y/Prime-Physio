# Clinic Session Isolation — Implementation Audit

Branch: `fix/clinic-session-isolation`
Status: partial implementation on the feature branch; no production database, deployment, or `main` changes.

## Confirmed root cause

The browser currently has one shared NextAuth session cookie per origin. In addition, the Supabase shadow-session bridge provisions/signs in one shadow Auth user per email and writes the selected tenant to that user's global `app_metadata.active_clinic_id`. The second operation is not tab-scoped: changing it for one tab changes the claim used by newly issued tokens for the other tab. A client-side `sessionStorage` change alone cannot fix either identity source.

## Relevant code

- `src/app/api/auth/supabase-session/route.ts`: legacy bridge remains for compatibility but the clinic login flow no longer calls it. New clinic sessions use `/api/auth/clinic-session`.
- `src/app/api/utils/auth.ts`: verifies clinic-scoped bearer tokens before NextAuth cookies, checks token expiry and active clinic membership, and prevents a shared cookie from overriding the verified clinic.
- `src/lib/auth.tsx`: uses the tab-scoped Supabase identity as authoritative after exchange; mismatched shared NextAuth changes do not replace it, and logout uses local Supabase scope without clearing the shared NextAuth cookie.
- `src/lib/supabase.ts`: browser auth storage is configured to use per-tab `sessionStorage`.
- `src/lib/appStorage.ts`: app state is stored in per-tab `sessionStorage` and namespaced by clinic.
- `src/app/[slug]/page.tsx`: branded clinic login now exchanges the verified NextAuth session for the selected clinic's independent Supabase identity before entering `/dashboard`.
- `supabase/migrations/20261109224321_multi_center_ownership_and_tenant_context.sql`: `get_my_clinic_id()`, `is_clinic_admin()`, and `has_staff_permission()` resolve membership from JWT email plus global `active_clinic_id`.
- `supabase/migrations/20261109224906_keep_owner_identity_global_across_centers.sql`: intentionally keeps one global staff identity per email; center ownership is mapped through `clinic_owners`.
- `supabase/migrations/20261105192000_expire_shadow_sessions_in_rls.sql` and `20261105192500_safe_shadow_expiry_check.sql`: RLS session expiry is currently coupled to the shadow-session metadata claims.
- `supabase/migrations/20261120025936_independent_view_permissions_20261120.sql`: recent patient/invoice and clinical RLS policies depend on the existing tenant and staff permission helpers. Those permissions must remain intact through the identity migration.

## Security constraints for implementation

1. Never trust a client-provided slug or clinic ID as authorization. Resolve the clinic from a server-verified, clinic-bound token and re-check active membership/status.
2. Never update shared Supabase `app_metadata.active_clinic_id` to select a tab's clinic.
3. API authorization must verify the tab bearer token first, then resolve the exact clinic and role from server-side membership records. A shared NextAuth cookie must not override a valid tab token.
4. Supabase Data API requests need a JWT whose claims identify the correct clinic independently of other tabs. API-only bearer handling is insufficient because direct browser Supabase queries also rely on RLS.
5. RLS helper functions and every policy that compares `auth.jwt()->>'email'` or reads `active_clinic_id` must be audited before replacing the current identity mapping. This includes staff, owners, chat participants, audit records, and setup/onboarding functions.
6. Platform-admin authorization remains a separate, explicit path; clinic-bound sessions must not grant platform-admin access.
7. Logging out one tab must revoke/clear only that tab's credentials and must not call global Supabase/NextAuth sign-out in a way that invalidates another tab.

## Safe implementation sequence

### Phase A — identity model and database
- Introduce a server-managed mapping from each clinic membership to a distinct Supabase Auth shadow identity (or an equivalent cryptographically signed tenant context supported by Supabase RLS).
- Keep the human/NextAuth account as the login identity; do not duplicate or alter clinic staff records.
- Issue distinct clinic-bound JWT claims for each tab/session. Remove the mutable shared `active_clinic_id` dependency from tenant resolution.
- Replace tenant helper functions and affected policies atomically in a reviewed migration; retain role/permission semantics and expiry guards.
- Add SQL tests proving wrong-clinic tokens cannot read or mutate patients, invoices, appointments, staff, chat, storage objects, or other tenant data.

### Phase B — browser and API session
- Exchange the verified initial login for a clinic-specific session.
- Store the session in tab-scoped `sessionStorage`; configure a per-tab Supabase client with an isolated storage key.
- Add a same-origin-only API fetch wrapper that sends the tab bearer token. Never attach it to NextAuth endpoints or external origins.
- Change `requireAuth` to validate the bearer token first and derive clinic identity from the verified token plus database membership. Do not fall back to a conflicting shared cookie.
- Make logout local to the tab and namespace app storage by clinic/session.
- Preserve `/{slug}` navigation and add a slug-scoped dashboard route without exposing cross-tenant data.

### Phase C — regression tests
- Two simultaneous tabs logged into Balance and Bedaya.
- Tab switching, refresh, token renewal, expiry, and one-tab logout.
- Google and email/password login.
- Slug/clinic ID tampering and cross-clinic patient/invoice reads and writes.
- Direct Supabase Data API/RLS requests with the wrong clinic token.
- Platform-admin isolation and no bearer leakage to external origins.

## Implementation progress (branch only)

### Completed groundwork

- Added `src/app/api/auth/clinic-session/route.ts`: same-origin POST exchange; verifies the NextAuth session, active clinic status, and owner/staff membership before issuing a distinct synthetic Supabase Auth identity for each canonical-email + clinic pair.
- Added `public.clinic_auth_identities` in the draft migration as a server-only identity map. RLS is enabled; only `service_role` receives table access.
- The issued token stores `auth_source`, `canonical_email`, `clinic_id`, and bounded NextAuth expiry in server-managed `app_metadata`.
- Wired the branded clinic login and the auth provider to the new exchange. The provider restores the existing tab-scoped identity before consulting a potentially changed shared NextAuth cookie.
- Added a same-origin API fetch bridge. It attaches the active tab's bearer token to private API calls, excludes public endpoints and every auth endpoint except `/api/auth/enrich`, and never forwards credentials to external origins.
- Updated `/api/auth/enrich` to validate the bearer token with Supabase Auth and derive email/clinic from verified `app_metadata`.
- Updated `requireAuth` to verify the bearer token, expiry, active clinic, and current membership before returning the canonical identity.
- API authorization and `/api/auth/enrich` now require the exact server-managed identity-map row for the bearer user's `auth.uid()`, canonical email, and clinic ID.
- The clinic-session exchange now binds the request to the expected login email from the current tab, preventing a shared NextAuth-cookie change during the exchange from silently provisioning a different account. A failed exchange clears only that tab's stale Supabase credentials.
- Updated the existing `clinics` admin-email trigger function to compare against `get_auth_email()` so synthetic shadow emails do not break center setup; a PostgreSQL trigger regression test covers the canonical-email check.
- Changed logout to `signOut({ scope: "local" })` and deliberately retained the shared NextAuth cookie, so one tab does not sign out another.
- Browser Supabase auth now persists in per-tab `sessionStorage`; app state is per-tab and namespaced by clinic.
- The draft RLS migration replaces tenant helpers and direct-email policies for clinic owners, staff, audit logs, chat, and HR attendance; clinic-scoped tokens cannot become platform administrators.
- A read-only inventory of the connected production schema confirmed the direct-email policy set and that Storage object policies already derive tenant scope through `get_my_clinic_id()`; those policies therefore inherit the new clinic-bound identity without changing their existing permission conditions.
- Added static security assertions and a disposable PostgreSQL integration fixture.

### Verification

- GitHub Actions disposable PostgreSQL 16 integration job **passed** on commit `f9dbabfbb4b5bd22fd233370c940dab0a307d77d`. It applied the draft migration to an isolated database and tested clinic A/B read/write isolation, mapped identity claims, expiry handling, private identity-map access, platform-admin separation, Storage tenant paths, and the clinic admin-email trigger.
- GitHub Actions security/application validation **passed** on the same commit: unit/API security tests, production dependency audit, TypeScript, ESLint, strict CSP checks, and production build.
- The separate live Supabase tenant A/B test was **skipped** because no dedicated non-production project credentials and test fixtures are configured in GitHub Actions.
- The connected Supabase account exposes the Prime Physio production project and no Supabase development branches. No SQL was run against that production project, and no paid test project/branch was created.
- The browser-level Balance/Bedaya two-tab test has **not** been run. Therefore the user-visible tab isolation is not yet proven end-to-end.
- API bearer authorization and `/api/auth/enrich` require an exact `clinic_auth_identities` row matching the signed-in shadow user ID, canonical email, and clinic ID. The login exchange also binds to the expected email in the current tab to guard against a shared NextAuth-cookie race.

### Remaining before activation

- Review the current security/application CI result and fix any failures.
- Configure or provide a dedicated non-production Supabase test project and synthetic Balance/Bedaya fixtures. Do not use production for this.
- Run the live Supabase RLS A/B read/write tests and the actual two-tab browser scenario, including refresh, session renewal, one-tab logout, and Google/email login.
- Complete coverage for every storage policy, view, RPC, and service-role API path before accepting the migration.
- Apply the migration only to the approved test project first. Production migration and deployment remain blocked pending your review.
## Current state

Changes are committed only to the isolated feature branch. No production database, `main`, or Vercel deployment was changed. The new SQL migration is a branch-only draft and has not been applied. Do not deploy or apply a database migration until the identity model, SQL policy coverage, and tests have been completed and reviewed.
