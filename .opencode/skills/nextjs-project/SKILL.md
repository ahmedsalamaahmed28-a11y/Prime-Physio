---
name: nextjs-project
description: Use for any task involving Next.js, React, Supabase, or project architecture. Covers project-specific conventions, multi-tenant patterns, authentication, and database rules.
---

# Project Conventions (Prime Physio)

## Multi-Tenant Architecture
- Every query on tenant tables must filter by `clinic_id`
- `clinic_id` comes from `activeAccount.clinicId` in auth context
- `requireAuth()` from `src/app/api/utils/auth.ts` for all API routes
- `requireRole(req, ["admin", "doctor"])` for role-restricted routes
- Service role (`getAdminClient()`) for admin operations only
- Staff role values in DB: `مدير العياده` (admin), `استشاري`/`أخصائي`/`ممارس` (doctors), `موظف استقبال` (receptionist)

## Authentication
- NextAuth (Credentials + Google OAuth) via `src/pages/api/auth/[...nextauth].ts`
- Custom `auth_accounts` table (NOT Supabase Auth) for email/password users
- Google OAuth users auto-provisioned via `/api/auth/auto-provision`
- `enrichUserWithClinic()` in `src/lib/auth.tsx` populates session with clinic data
- DashboardLayout shows loading until `clinicId !== undefined`

## Supabase
- Client: `createClientComponentClient()` for page-level queries
- Admin: `getAdminClient()` (uses service_role key) for server-side operations
- Tables use RLS with `clinic_access` policy (scoped by staff email)
- `app_key_values` table for temporary storage (OTP, flags)
- Key naming convention: `password_reset_{email_hash}`, `verification_{email_hash}`

## Subscription Plans
- Basic: 50 patients / 100 sessions per month
- Silver: 200 patients / 500 sessions per month
- Gold: unlimited
- Check limits via `POST /api/subscription/check-limit`
- Feature/plan comparison in `COMPARE_ROWS` on subscription page

## File Structure
```
src/
  app/          # Next.js App Router pages + API routes
    api/        # API routes under /api/*
    login/      # /login
    signup/     # /signup (Google-only)
    admin/      # /admin (super admin panel)
  components/   # Shared React components
  lib/          # Utilities, auth context, supabase clients
  pages/api/    # NextAuth catch-all route only
```

## Build & Verify
- `npm run build` must pass with zero errors
- Arabic-first UI with `useLanguage()` hook
- `.env.local` has all required vars (see file for template)
