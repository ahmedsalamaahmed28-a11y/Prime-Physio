<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Goal
Multi-tenant SaaS clinic management platform with Arabic-first UI, secure auth (Google OAuth + Supabase email/password), live Supabase data with per-clinic isolation, working Paymob subscriptions.

## Constraints & Preferences
- Arabic-first interface
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

### Session: NextAuth Credentials Auth Rewrite (2026-06-17)
- **Auth migration created**: `supabase-auth-migration.sql` — creates `public.auth_accounts` table with RLS (service_role only), bypassing broken GoTrue auth.users schema.
- **NextAuth CredentialsProvider added**: `src/pages/api/auth/[...nextauth].ts` — new `CredentialsProvider` that queries `auth_accounts` table with `bcryptjs` password verification. Email/password users now authenticate through NextAuth like Google users.
- **Signup API rewritten**: `src/app/api/signup/route.ts` — stores password hash in `auth_accounts` table instead of calling broken `admin.auth.admin.createUser()`. Creates clinic + staff + settings atomically with rollback on failure.
- **Login page updated**: `src/app/login/page.tsx` — replaced `loginWithSupabase()` with `signIn("credentials", ...)` from NextAuth. Removed dependency on `useAuth()` for manual login. Redirects to `/` on success.
- **Signup page cleaned**: `src/app/signup/page.tsx` — removed unused `useAuth` / `registerWithSupabase` imports. Updated success message (no email confirmation needed, log in immediately).
- **Supabase `auth_accounts` table**: SQL to run in Supabase SQL Editor — creates the table that holds email + bcrypt hashed passwords. Service role only access via RLS.
- **Fixes**: Login redirects with `window.location.href = "/"` after successful credentials sign-in.
- **DashboardLayout clinicId guard**: Added check — if `activeAccount` exists but `clinicId === undefined`, show loading spinner instead of rendering children. Prevents all pages from fetching data with stale/undefined `clinicId` before `enrichUserWithClinic` completes.
- **Error boundaries created**: `src/app/error.tsx` (route-level, preserves layout) and `src/app/global-error.tsx` (catches root layout errors, defines own html/body). Both show Arabic-first error UI with retry button.

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
- Signup API uses service_role key (`getAdminClient()`) to create auth users + clinic + staff atomically
- Subscription enforcement is client-side pre-check + server-side verification via API
- Admin panel uses platform_admin bypass (checks `platform_admins` table + service_role)
- RLS uses `security definer` on `is_platform_admin()` function so anon-key users can read `platform_admins` table
- DashboardLayout shows loading spinner when `clinicId === undefined` — prevents all pages from rendering with stale clinicId before `enrichUserWithClinic` completes
- Error boundary conventions in this Next.js version: `error.tsx` (route-level, preserves layout, uses `unstable_retry` prop), `global-error.tsx` (catches root layout, defines own html/body)

## Relevant Files
- `src/app/api/utils/auth.ts`: `requireAuth()` helper for API routes
- `src/app/api/signup/route.ts`: Server-side signup (creates auth user + clinic + staff)
- `src/app/api/subscription/check-limit/route.ts`: Subscription limit check endpoint
- `src/app/api/admin/clinics/route.ts`: Admin API (list clinics, toggle active)
- `src/app/admin/page.tsx`: Super admin panel UI
- `src/lib/subscriptionCheck.ts`: Plan limit enforcement logic
- `src/components/DashboardLayout.tsx`: Sidebar with admin link for platform_admin role; clinicId guard (loading spinner until enrichUserWithClinic completes)
- `src/app/error.tsx`: Route-level error boundary (Arabic-first, retry button)
- `src/app/global-error.tsx`: Global error boundary for root layout crashes
- `supabase-rls-patch.sql`: Complete RLS policies for all tables
