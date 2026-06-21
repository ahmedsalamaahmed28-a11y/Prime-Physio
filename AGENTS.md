<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Goal
Multi-tenant SaaS clinic management platform with Arabic-first UI, secure auth (NextAuth Credentials + Google OAuth), live Supabase data with per-clinic isolation, working Paymob subscriptions.

## Constraints & Preferences
- Arabic-first interface
- Admin signup via Google OAuth (verified real account); doctors/receptionists use email/password (created by admin from `/staff`)
- Super admin (ahmedsalamaahmed21@gmail.com) sees all clinics; each clinic admin sees only their data
- Plans use unified feature list across all tiers; Basic most locked, Gold all unlocked
- NEXT_PUBLIC_SUPABASE_ANON_KEY on client; SUPABASE_SERVICE_ROLE_KEY server-side only

## Progress

### Session: Production Security Hardening (2026-06-16)
- **API routes secured**: Created `src/app/api/utils/auth.ts` — `requireAuth()` helper that checks NextAuth JWT + Supabase session cookie + Authorization header. Added to `chat`, `report`, `paymob/create-order` routes with proper 401 responses.
- **RLS patch created**: `supabase-rls-patch.sql` — complete RLS policies for all tenant tables: platform_admin_bypass (for platform_admins/service_role) + clinic_access (clinic-scoped via staff email subquery). Drop-in replacement for Supabase SQL Editor.
- **Signup flow fixed**: Created `POST /api/signup` route that creates auth user + clinic + staff record + clinic_settings in one transaction (with rollback on failure). Updated `signup/page.tsx` to call the API directly instead of client-side `registerWithSupabase`.
- **Subscription enforcement**: Created `src/lib/subscriptionCheck.ts` — checks plan limits (basic: 50 patients/100 sessions, silver: 200/500, gold: unlimited). Added `GET /api/subscription/check-limit` endpoint. Added client-side checks before creating patients (`patients/page.tsx`) and sessions (`calendar/page.tsx`).
- **Super admin panel**: Created `/admin` page — lists all clinics with patient counts, subscription info, toggle active/suspended. Added `GET/PATCH /api/admin/clinics` API. Added sidebar link in DashboardLayout (visible only to platform_admin role).
- **NEXTAUTH_SECRET strengthened**: Replaced weak `prime_physio_very_secret_key_12345` with cryptographically random 64-char hex string.

### Session: Google-Only Signup + Auto-Provision (2026-06-17)
- **Signup page rewritten**: Removed email/password form entirely. Only Google OAuth button remains. Stores `pending_google_signup` flag before redirect.
- **Auto-provision API created**: `POST /api/auth/auto-provision` — creates clinic + staff (admin) + clinic_settings for first-time Google OAuth users. Idempotent (skips if already in staff).
- **enrichUserWithClinic updated**: When `pending_google_signup` flag is set and user not found in staff, calls auto-provision API automatically during first login. Clears flag after use.
- **Proxy fixed**: `/logo.png` added to `PUBLIC_PATHS` and matcher exclusion so unauthenticated users on `/login` see the logo.
- **New admins signup flow**: Visit `/signup` → click "التسجيل بواسطة Google" → Google OAuth → auto-create clinic + staff → redirect to dashboard.
- **Doctors/receptionists**: Added by clinic admin from `/staff` page with email/password login.
- **DashboardLayout clinicId guard**: Added check — if `activeAccount` exists but `clinicId === undefined`, show loading spinner instead of rendering children. Prevents all pages from fetching data with stale/undefined `clinicId` before `enrichUserWithClinic` completes.
- **Error boundaries created**: `src/app/error.tsx` (route-level, preserves layout) and `src/app/global-error.tsx` (catches root layout errors, defines own html/body). Both show Arabic-first error UI with retry button.

### Session: Subscription Page Limit Alignment (2026-06-17)
- **Fixed limit mismatch**: Aligned `subscription/page.tsx` display limits with `subscriptionCheck.ts` enforcement — basic now shows 50 patients/100 sessions (was 100/2000), silver 200/500 (was 300/10000), gold ∞/∞ (was 500/999999).
- **Fixed session count**: Subscription page now filters session count by current month (`created_at >= startOfMonth`) matching the server-side enforcement and the "هذا الشهر" label.
- **Gold unlimited display**: Usage bar now shows ∞ and full-width progress bar for gold plans instead of specific numbers.
- **Consistent feature table**: `ALL_FEATURES` limits and `COMPARE_ROWS` updated to match actual server-enforced limits across all plans.
- **Build verified**: `npm run build` passes with zero errors.

### Session: RBAC Implementation + Server-Side Role Enforcement (2026-06-17)
- **Free signup removed**: `/signup` page rewritten — email/password form, OTP verification, and role selector removed entirely. Only Google OAuth remains for new clinic admins. Added notice explaining staff accounts are created by clinic admin from dashboard.
- **Normalized roles**: Added `mapStaffRoleToRoleKey()` in both `auth.tsx` and `auth.ts` — maps Arabic role values (`مدير العياده`, `موظف استقبال`, etc.) to canonical role keys. `enrichUserWithClinic` now derives `roleKey` from `staff.role` in the DB, not from client-side `pending_role` in `appStorage`.
- **Server-side enforcement**: Created `requireRole(req, allowedRoles)` in `src/app/api/utils/auth.ts` — authenticates user, queries staff role from DB, maps to role key, and rejects if insufficient permissions.
- **API routes hardened**: `paymob/create-order` restricted to admin only (`requireRole(["admin"])`). `report` and `chat` restricted to admin/doctor (`requireRole(["admin", "doctor"])`). Receptionists can no longer generate AI reports or create payment orders.
- **Staff invite locked down**: `POST /api/staff/invite` now uses `requireRole(["admin"])` instead of manual role check. Blocks creating any user with role `admin` or `مدير العياده` (only the original signup/auto-provision creates admins). Validates that the role is one of the 4 allowed staff roles (استشاري, أخصائي, ممارس, موظف استقبال).
- **Staff form updated**: Both add and edit dialogs on `/staff` page no longer include "مدير العياده" in the role dropdown. Admins can only create doctors and receptionists.
- **Build verified**: `npm run build` passes with zero errors.

### Previous work (pre-2026-06-16)
- Multi-tenant migration SQL created and run (platform_admins, clinics, clinic_id columns, RLS, data migration)
- Paymob integration (env vars in Vercel, subscription plans, callback handling)
- Arabic-first UI, calendar colors, print styles, EMR medical data, rehab protocols
- Subscription plan cards with unified feature list, progressive locking, gold gradient
- All Supabase queries scoped by clinic_id across all page files (~60+ query sites)
- Fixed `.eq()` ordering for Supabase v2 client (must be `.select().eq()` not `.eq().select()`)
- Fixed `onConflict` from `user_id` to `clinic_id` in profile upserts

## Next Steps (pre-deployment checklist)
1. **Run `supabase-rls-patch.sql`** in Supabase SQL Editor — ensures all RLS policies are correctly applied
2. **Add ALL env vars to Vercel** — copy entire `.env.local` to Vercel project settings (already partially done for Paymob)
3. **Configure DNS** for `www.prime-physio-system.com` → Vercel nameservers
4. **Test full signup flow** — create a new clinic, verify staff record and clinic_id are created
5. **Test subscription enforcement** — create patients beyond basic limit, verify block
6. **Test Paymob payment** end-to-end (create order → iframe → callback → subscription persisted)

## Key Architecture Decisions
- `requireAuth()` checks NextAuth JWT first (Google users), then Supabase session cookie (email/password), then Authorization header
- `requireRole()` builds on `requireAuth()` — queries staff role from DB, maps Arabic role values to canonical `roleKey`, and rejects if insufficient permissions
- Signup API uses service_role key (`getAdminClient()`) to create auth users + clinic + staff atomically
- Subscription enforcement is client-side pre-check + server-side verification via API
- Admin panel uses platform_admin bypass (checks `platform_admins` table + service_role)
- RLS uses `security definer` on `is_platform_admin()` function so anon-key users can read `platform_admins` table
- DashboardLayout shows loading spinner when `clinicId === undefined` — prevents all pages from rendering with stale clinicId before `enrichUserWithClinic` completes
- Error boundary conventions in this Next.js version: `error.tsx` (route-level, preserves layout, uses `unstable_retry` prop), `global-error.tsx` (catches root layout, defines own html/body)

### Session: Setup/center Onboarding Fix (2026-06-21)
- **Root cause #1**: `auth.tsx:270-272` redirected authenticated users from `/login` (including `/login?setup=center`) to `/home` before the center form could render — the auth guard's `isAuthPage` redirect didn't account for setup flows.
- **Root cause #2**: `DashboardLayout.tsx:212` did not include `/setup/center` (or `/subscribe` or `/centers/new`) in its `isAuthPage` list. When `clinicId === undefined`, it rendered `LoadingSpinner` instead of `{children}`, making the setup form invisible. The combination of #1 and #2 left users stuck on a permanent loading spinner.
- **Fix #1**: Created dedicated `/setup/center` page (copied center form from login page; not affected by auth redirect since it's not in `isAuthPage`). Changed auto-login redirect from `/login?setup=center` to `/setup/center`.
- **Fix #2**: Added `/setup/center`, `/subscribe`, and `/centers/new` to `DashboardLayout`'s `isAuthPage` list so children render without the `clinicId === undefined` loading spinner guard.
- **Changed redirect target**: auth.tsx guard now redirects to `/setup/center` (instead of `/login?setup=center`). Added `/setup/center` to both `isSetupPage` and `setupPaths`.
- **Root cause #3**: `src/app/page.tsx` redirected EVERYONE (`redirect("/home")`) unconditionally at the server level, regardless of auth status. Authenticated users without a clinic were sent to `/home` where the client-side auth context would fight with the DashboardLayout guard.
- **Fix #3**: Replaced unconditional `redirect("/home")` with server-side auth guard using `getServerSession(authOptions)`: no session → `/login`, has clinic → `/home`, no clinic yet → `/setup/center`.

## Relevant Files
- `src/app/api/utils/auth.ts`: `requireAuth()` + `requireRole()` helpers for API routes
- `src/app/api/signup/route.ts`: Server-side signup (creates auth user + clinic + staff)
- `src/app/api/subscription/check-limit/route.ts`: Subscription limit check endpoint
- `src/app/api/admin/clinics/route.ts`: Admin API (list clinics, toggle active)
- `src/app/api/staff/invite/route.ts`: Staff invite with role validation + admin-only guard
- `src/app/admin/page.tsx`: Super admin panel UI
- `src/lib/subscriptionCheck.ts`: Plan limit enforcement logic
- `src/lib/auth.tsx`: Auth context with `mapStaffRoleToRoleKey()` and `enrichUserWithClinic()`
- `src/components/DashboardLayout.tsx`: Sidebar with admin link for platform_admin role; clinicId guard (loading spinner until enrichUserWithClinic completes)
- `src/app/error.tsx`: Route-level error boundary (Arabic-first, retry button)
- `src/app/global-error.tsx`: Global error boundary for root layout crashes
- `supabase-rls-patch.sql`: Complete RLS policies for all tables
