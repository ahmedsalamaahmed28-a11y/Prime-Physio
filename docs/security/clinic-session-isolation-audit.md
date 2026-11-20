# Clinic Session Isolation — Implementation Audit

Branch: `fix/clinic-session-isolation`
Status: partial implementation on the feature branch; no production database, deployment, or `main` changes.

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

The initial API-auth foundation remains in place, with the following additions:

- `requireAuth` checks a verified Supabase bearer token before consulting the shared NextAuth cookie.
- It recognizes a new `clinic-scoped-shadow` token type and reads its canonical account email and clinic ID only from Supabase-verified `app_metadata` claims.
- Missing canonical email or clinic ID on that token type fails closed.
- `resolveActiveClinicId` now preserves a clinic ID already derived from the verified bearer token instead of allowing a shared Supabase cookie to overwrite it.
- Security regression assertions were added to verify bearer-token precedence and required claims.

This is groundwork, not a complete feature. The following additional groundwork is now committed on this branch:\n\n- `src/app/api/auth/clinic-session/route.ts` adds a same-origin POST exchange. It verifies the signed NextAuth identity, checks that the requested clinic is active, verifies owner/staff membership, and issues a distinct synthetic Supabase Auth identity for each canonical-email + clinic pair. Authorization claims are written only to server-managed `app_metadata`.\n- The exchange uses `public.clinic_auth_identities` as a server-only mapping so normal exchanges can resolve the shadow Auth user by ID rather than scanning all Auth users. The table is created by the draft migration below, has RLS enabled, and is granted only to `service_role`.\n- The shared browser client and app-state helper now persist auth/state in per-tab `sessionStorage`, so one tab does not overwrite another tab's client-side Supabase token or cached user.\n- `supabase/migrations/20261120191500_clinic_scoped_shadow_identity_rls.sql` introduces `get_auth_email()`, changes tenant resolution to use immutable `clinic_id` and `canonical_email` claims for the new token type, retains legacy-session compatibility during migration, and updates direct-email policies discovered in the live schema: clinic owners, staff self-read, audit logs, chat participants/conversations/messages, and HR attendance.\n- The migration explicitly prevents a clinic-scoped token from satisfying `is_platform_admin()`. The API `requireRole` path now also refuses to treat a clinic-scoped bearer identity as a platform administrator.\n- Static security regression assertions were added for the exchange endpoint, identity claims, and RLS migration. They have **not** been run.\n\nThis is still not an active end-to-end fix. The existing frontend still calls the legacy `/api/auth/supabase-session` bridge; the new exchange route is not yet wired into login. The new exchange is not yet called by the login flow, the API client does not yet attach the tab bearer token to same-origin protected API requests, and the auth context still listens to the shared NextAuth session. The SQL migration has not been applied. The storage primitives are tab-scoped now, but this alone does not complete the isolation. Users should not expect two-tab isolation to work yet.

## Current state

Changes are committed only to the isolated feature branch. No production database, `main`, or Vercel deployment was changed. The new SQL migration is a branch-only draft and has not been applied. Do not deploy or apply a database migration until the identity model, SQL policy coverage, and tests have been completed and reviewed.
