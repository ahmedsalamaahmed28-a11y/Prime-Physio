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
7. **Remove hardcoded mock accounts** from `DashboardLayout.tsx` lines 86-90
8. **Add error boundaries** for production UX (toast system, global error boundary)

## Key Architecture Decisions
- `requireAuth()` checks NextAuth JWT first (Google users), then Supabase session cookie (email/password), then Authorization header
- Signup API uses service_role key (`getAdminClient()`) to create auth users + clinic + staff atomically
- Subscription enforcement is client-side pre-check + server-side verification via API
- Admin panel uses platform_admin bypass (checks `platform_admins` table + service_role)
- RLS uses `security definer` on `is_platform_admin()` function so anon-key users can read `platform_admins` table

## Relevant Files
- `src/app/api/utils/auth.ts`: `requireAuth()` helper for API routes
- `src/app/api/signup/route.ts`: Server-side signup (creates auth user + clinic + staff)
- `src/app/api/subscription/check-limit/route.ts`: Subscription limit check endpoint
- `src/app/api/admin/clinics/route.ts`: Admin API (list clinics, toggle active)
- `src/app/admin/page.tsx`: Super admin panel UI
- `src/lib/subscriptionCheck.ts`: Plan limit enforcement logic
- `src/components/DashboardLayout.tsx`: Sidebar with admin link for platform_admin role
- `supabase-rls-patch.sql`: Complete RLS policies for all tables
