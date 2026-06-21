# Signup OTP + Subscribe + Centers Design

Date: 2026-06-21

## Problem

Current flow is Google-only signup with no OTP verification, no center creation (only 1 clinic
auto-created), and onboarding steps are scattered.

## Solution

4-step flow: Signup (email/password + OTP) → Login → Subscribe → Create Centers

## Database Changes

### New table: `branches`

```sql
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  short_name text not null,
  full_name text not null,
  slug text not null,
  logo_url text,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (clinic_id, slug)
);
```

### Columns on existing tables

- `auth_accounts`: add column `verified boolean not null default false`

## Flow Details

### Step 1: Signup (`/signup`)

1. Form: full name, email, password, confirm password
2. Google OAuth button remains as alternative
3. On submit → `POST /api/auth/send-verification`
4. OTP sent via email; if SMTP unavailable, return `devCode` inline
5. OTP modal appears with:
   - 4-digit input
   - Message: "يرجى التحقق من مجلد Spam إذا لم تجد الكود" / "Check Spam folder if you don't see the code"
   - "إعادة إرسال الكود" / "Resend code" link
6. On correct OTP → stores account in `auth_accounts` with `verified: true`
7. Green success banner: "تم إنشاء الحساب بنجاح" / "Account created successfully"
8. Redirect to `/login` after 2 seconds

### Step 2: Login (`/login`)

1. Email/password form + Google OAuth
2. On submit → `signIn("credentials")`
   - First checks `auth_accounts.verified === true`
   - If not verified → error "يرجى التحقق من بريدك الإلكتروني أولاً" / "Please verify your email first"
3. After auth success → check if `clinics` record exists for this user (by email)
   - No clinic → redirect to `/subscribe`
   - Has clinic → redirect to `/centers`
4. Google OAuth → auto-provision (same as today) → redirect to `/centers`

### Step 3: Subscribe (`/subscribe`)

**New dedicated page (separate from subscription management page).**

1. Shows the 3 pricing cards (same design as subscription page)
2. User selects a plan:
   - **Basic (free)**: Creates clinic + subscription_basic + staff (admin) + clinic_settings immediately
   - **Silver/Gold (paid)**: Shows Paymob billing form → on payment success → creates clinic + subscription + staff + clinic_settings
3. After subscription created → redirect to `/centers`
4. Plan determines max branches:
   - Basic: max 1 branch
   - Silver: max 1 branch
   - Gold: max 2 branches

### Step 4: Centers (`/centers`)

**New page for branch management.**

1. `/centers` page layout:
   - If no branches exist → hero card with large (+) button "أنشئ مركزك الأول" / "Create Your First Center"
   - If branches exist → grid of branch cards, each showing:
     - Logo (or default Prime Physio logo)
     - Short name
     - Full name
     - Slug
     - Status badge
   - Large (+) floating action button to add more (disabled if plan limit reached)

2. **Create branch modal/dialog**:
   - Short name (required, text input)
   - Full name (required, text input)
   - Slug (required, auto-generated from short name, editable, validated for uniqueness under clinic)
   - Logo upload (optional file input → Supabase Storage `branch-logos` bucket)
   - Default logo shown as placeholder (Prime Physio logo)
   - "إنشاء المركز" / "Create Center" button

3. **Branch limit enforcement**:
   - Before showing add form → check current plan vs current branch count
   - If limit reached → show message: "لقد وصلت للحد الأقصى من المراكز. قم بترقية خطتك لإضافة المزيد"
     / "You've reached the max centers. Upgrade your plan to add more"
   - Disable the add button

### Google OAuth Flow

1. Google signup → auto-provision creates clinic + subscription + staff (same as today)
2. After auto-provision → `enrichUserWithClinic` completes → redirect to `/centers` instead of `/home`
3. First-time Google users see the empty centers page with "Create Your First Center"

### Existing Google users (migration)

- Users who already have clinics via Google auto-provision will have 0 branches
- When they first visit `/centers`, they see the empty state and can create their first branch
- The first branch creation sets the sidebar logo

## UI Changes

### Sidebar (`DashboardLayout.tsx`)

- Read `branches.logo_url` for the currently active branch
- If `logo_url` exists → use it as sidebar logo
- If `logo_url` is null → fall back to `/logo.png` (Prime Physio default)
- Need a way to track "active branch" (stored in app context or localStorage)

### AL_FEATURES Update

In `src/app/subscription/page.tsx`:

- Change feature label from "فروع العيادة" / "Clinic Branches" → "المراكز" / "Centers"
- Keep limits: basic="1", silver="1", gold="2"

### Subscription Check

Update `subscriptionCheck.ts` to also check branch count against plan limit.

## API Routes

### New/Modified Routes

- **`POST /api/auth/send-verification`** — already exists, sends OTP email
- **`POST /api/auth/verify-email`** — already exists, verifies OTP + creates account
  - Modify: set `verified = true` on `auth_accounts`
- **`POST /api/auth/signup`** (or modify existing `/api/signup/route.ts`) — create account + OTP verify

- **`POST /api/subscribe`** (new) — create clinic + subscription + staff + clinic_settings
  - Accept: `planId`, `billingData` (for Silver/Gold)
  - For Basic: create immediately, return `{ clinicId }`
  - For Silver/Gold: process Paymob first, then create

- **`GET /api/branches`** — list branches for current clinic
- **`POST /api/branches`** — create new branch (checks plan limit)
- **`PATCH /api/branches/:id`** — update branch
- **`DELETE /api/branches/:id`** — delete branch

- **`POST /api/upload`** — upload logo to Supabase Storage

## Files to Create/Modify

### New files:
- `src/app/subscribe/page.tsx` — subscription selection page (step 3)
- `src/app/centers/page.tsx` — centers management page (step 4)

### Modified files:
- `src/app/signup/page.tsx` — add OTP flow with spam message + green success
- `src/app/login/page.tsx` — check verified before login, redirect to `/subscribe` if no clinic
- `src/components/DashboardLayout.tsx` — dynamic logo from active branch
- `src/lib/auth.tsx` — add active branch context, redirect to `/centers` after Google auto-provision
- `src/app/subscription/page.tsx` — rename feature label to "المراكز" / "Centers"
- `src/lib/subscriptionCheck.ts` — add branch count limit check

### Database migrations:
- `supabase-migration-branches.sql` — add `branches` table + `auth_accounts.verified` column

## Implementation Order

1. DB migration (`branches` table + `verified` column)
2. Modify signup page (email/password + OTP + spam message + green success)
3. Modify login page (verified check + redirect logic)
4. Create `/subscribe` page (plan selection + account creation)
5. Create `/centers` page (branch CRUD)
6. Update sidebar (dynamic logo)
7. Update ALL_FEATURES label
8. Update subscription enforcement for branches
9. Google OAuth redirect to `/centers`
