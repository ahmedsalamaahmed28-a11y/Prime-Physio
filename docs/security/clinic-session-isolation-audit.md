# Clinic Session Isolation — Implementation Audit

Branch: `fix/clinic-session-isolation`
Status: design/audit only; no production database, deployment, or `main` changes.

## Confirmed root cause

The browser currently has one shared NextAuth session cookie per origin. In addition, the Supabase shadow-session bridge provisions/signs in one shadow Auth user per email and writes the selected tenant to that user's global `app_metadata.active_clinic_id`. The second operation is not tab-scoped: changing it for one tab changes the claim used by newly issued tokens for the other tab. A client-side `sessionStorage` change alone cannot fix either identity source.

## Relevant code

- `src/app/api/auth/supabase-session/route.ts`: reads the shared NextAuth session, signs in a shadow user by email, and mutates the shared user's `active_clinic_id` metadata.
- `src/app/api/utils/auth.ts`: `requireAuth` prefers the shared NextAuth session before bearer authentication; its shadow-cookie parsing can override the clinic from the same shared shadow identity.
- `src/lib/auth.tsx`: uses NextAuth `useSession` as the ongoing identity and syncs the shadow session; logout signs out the shared identity.
- `src/lib/supabase.ts`: exports one shared browser Supabase client.
- `src/lib/appStorage.ts`: uses unscoped origin-wide localStorage keys.
- `src/app/[slug]/page.tsx`: clinic login currently redirects to `/dashboard`; there is no `src/app/[slug]/dashboard/page.tsx`.
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

The first API-auth foundation has now been implemented on this branch:

- `requireAuth` checks a verified Supabase bearer token before consulting the shared NextAuth cookie.
- It recognizes a new `clinic-scoped-shadow` token type and reads its canonical account email and clinic ID only from Supabase-verified `app_metadata` claims.
- Missing canonical email or clinic ID on that token type fails closed.
- `resolveActiveClinicId` now preserves a clinic ID already derived from the verified bearer token instead of allowing a shared Supabase cookie to overwrite it.
- Security regression assertions were added to verify bearer-token precedence and required claims.

This is groundwork, not a complete feature. The clinic-scoped session provisioning endpoint, per-tab browser session storage/Supabase client, RLS identity mapping, policy updates, and end-to-end tests have **not** been implemented yet. The existing login bridge still issues the legacy shared shadow identity, so users should not expect the two-tab behavior to be fixed by this commit alone.

## Current state

Changes are committed only to the isolated feature branch. No production database, `main`, or Vercel deployment was changed. Do not deploy or apply a database migration until the identity model, SQL policy coverage, and tests have been completed and reviewed.
