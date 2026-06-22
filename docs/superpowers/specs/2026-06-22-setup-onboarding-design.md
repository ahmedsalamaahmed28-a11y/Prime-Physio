# Setup & Onboarding Redesign

**Date:** 2026-06-22
**Status:** Approved Design

## Overview

Replace the separate `/subscribe` and `/setup/center` pages with a unified `/setup` page for first-time clinic admins. Add branded per-center login pages (`/[slug]`) and restructure the `/login` page's "ادارة" section to show account + centers tabs after login.

## Flow

```
/signup → /login (تسجيل دخول أول مرة)
         → /setup (Stepper: باقة → مركز → تم)
         → auto-redirect to /[slug] (صفحة دخول المركز)
         → login again → /home
```

After first setup, returning users:
- `/login` → login via "ادارة" section → tabs show (الحساب + المراكز)
- Or `/login` → "المراكز" directory tab → pick center → `/[slug]`
- Or direct URL `primephysio.vercel.app/[slug]` → login → `/home`

## Route Changes

| Route | Status | Purpose |
|-------|--------|---------|
| `/signup` | Existing | Create account |
| `/login` | **Modified** | "ادارة" section changes after login; "المراكز" tab shows all-platform centers directory |
| `/setup` | **New** | First-time onboarding stepper (plan → center → done) |
| `/[slug]` | **New** | Branded login page per center (logo + name + login form) |
| `/home` | Existing | Dashboard (only reachable via center login page) |

## 1. `/login` Page — "ادارة" Section

### Before login
Shows the existing login card (email/password form).

### After first login (returning user)
The "ادارة" section transforms to two tabs:

#### Tab: الحساب (Account)
- **بيانات الحساب:** الاسم الأول، الاسم الأخير
- **بيانات الدخول:** البريد الإلكتروني (معروض)، كلمة المرور (مخفية + زر "تغيير كلمة المرور")
  - تغيير كلمة المرور: OTP verification via email → reset password form
- **بيانات الباقة:** (بعد اختيار الباقة في `/setup`)
  - اسم الباقة (Basic / Silver / Gold)
  - الحد الأقصى للمستخدمين
  - الحد الأقصى للحسابات النشطة
  - الحد الأقصى للمراكز
  - الحد الأقصى للجلسات

#### Tab: المراكز (Centers)
- Shows user's centers as cards (logo + name + slug)
- Click on a center card → navigates to `/[slug]` branded login page
- From `/[slug]` → login → `/home`

### "المراكز" Directory Tab
- Shows ALL centers on the platform (browseable, searchable)
- Center cards with logo + name
- Click → navigates to `/[slug]`

## 2. `/setup` Page (New)

### Layout
Two stepper steps at top:
```
① اختيار الباقة  →  ② إنشاء المركز  →  تم
```

No tabs — pure linear wizard flow.

### Step 1: Choose Plan
- 3 plan cards: Basic (مجاني), Silver (1000 ج.م/شهر), Gold (1500 ج.م/شهر)
- Gold = max 2 centers, Basic/Silver = max 1 center
- Plan limits map:
  - Basic: 50 patients, 100 sessions/mo, 1 center, 3 staff accounts
  - Silver: 200 patients, 500 sessions/mo, 1 center, 10 staff accounts
  - Gold: unlimited patients, unlimited sessions, 2 centers, unlimited staff
- Clicks "متابعة" → saves plan choice → advances to Step 2

### Step 2: Create Center(s)
- Form fields per center:
  - اسم المركز المختصر (e.g., "إرادة")
  - الاسم الكامل للمركز (e.g., "مركز إرادة للعلاج الطبيعي والتغذية العلاجية")
  - الرمز التعريفي / slug (e.g., `erada`) — determines URL: `primephysio.vercel.app/erada`
  - شعار المركز — file upload for logo image
- Gold users see "+ إضافة مركز تاني" button (max 2)
- Clicks "تم" → saves centers → advances to "تم" step

### Step 3: Done
- Success message with center summary (name + URL)
- Auto-redirect after 3s to `primephysio.vercel.app/[slug]`

## 3. `/[slug]` Page (New)

Dynamic route parameterized by center slug.

### Layout
```
┌──────────────────────────────┐
│         [شعار المركز]         │
│   اسم المركز الكامل           │
│                              │
│   ┌──────────────────────┐   │
│   │ البريد الإلكتروني     │   │
│   └──────────────────────┘   │
│   ┌──────────────────────┐   │
│   │ كلمة المرور           │   │
│   └──────────────────────┘   │
│                              │
│   [     تسجيل الدخول       ]  │
│                              │
│   نسيت كلمة المرور؟          │
└──────────────────────────────┘
```

### Data loading
- Fetch center data from `branches` table by slug → get `short_name`, `full_name`, `logo_url`, `clinic_id`
- Display logo + name in the branded header
- Login form: same email/password as main account
- On success → redirect to `/home` with the center's `clinic_id` context

## Critical: Auth Guard Changes (src/lib/auth.tsx + DashboardLayout)

**Current behavior:** `auth.tsx` redirects authenticated users away from `/login` to `/home`. This prevents the new tabs from rendering.

**Required changes:**
- Allow authenticated users to stay on `/login` — "ادارة" section swaps login form for tabs based on auth state
- Add `/login` to the exception list where authenticated users can remain
- The "ادارة" tabs read user data from the existing NextAuth session + fetch subscription data from `/api/auth/me`
- DashboardLayout should render normally when the user is on `/login` (already handled by the `isAuthPage` guard)

**`/[slug]` session handling:**
- `/[slug]` page fetches branch data server-side by slug from `branches` table
- Displays branded header before login form
- On login success, the `clinic_id` from the branch's `clinic_id` must be set as the active clinic context
- Approach: store selected `clinic_id` in sessionStorage on login, have `enrichUserWithClinic` check for a stored `clinic_id` when the user has multiple clinics
- After login redirect to `/home` — DashboardLayout reads the stored `clinic_id` and renders with the correct clinic context

## 4. Auth Flow Changes

### First-time login detection
- After `/signup` + first `/login`: check if user has any active subscription + centers
- If no subscription → redirect to `/setup`
- If has subscription + centers → show "ادارة" tabs

### Auto-provision
- Existing auto-provision (creates clinic + staff + settings) runs during signup
- `/setup` creates the subscription record + branch records

### Session handling
- Regular `/login` session: NextAuth session with user email
- `/[slug]` login: Same credentials, same session, but sets `clinic_id` from the center's `clinic_id`
- After `/[slug]` login → `/home` renders with correct clinic context

## Data & API Changes

### New/Modified API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/subscribe` | Modify | Create subscription record + update clinic status (exists, may need expansion) |
| `POST /api/branches` | Modify | Create branch record with slug + logo (exists, may need slug-based lookup) |
| `GET /api/branches/by-slug?slug=erada` | **New** | Fetch branch data by slug for `/[slug]` page |
| `GET /api/branches/all` | **New** | List ALL branches across all clinics for directory |
| `GET /api/auth/me` | **New** or Modify | Return current user's account data + subscription info |
| `POST /api/auth/change-password` | Modify | OTP-verified password change (exists as reset-password) |

### Database tables

| Table | Usage |
|-------|-------|
| `branches` | Store center slug, logo, name, clinic_id |
| `subscriptions` | Store plan info, linked to clinic_id |
| `staff` | Store user info, linked to clinic_id |
| `clinics` | Base clinic record (auto-provision creates) |

### First-time vs Returning Detection
- After login, check if user has an active subscription + at least one branch
- No subscription → redirect to `/setup`
- Has subscription + branches → show ادارة tabs (stay on `/login`)

### Deprecated Pages
- `/subscribe` — exists but no longer reachable via new flow (kept for backward compat)
- `/setup/center` — deleted (replaced by `/setup`)
- `/centers/new` — deleted (replaced by `/setup`)

### "المراكز" Directory Tab (existing UI)
- Already exists in `/login` page — shows all centers
- Minimal changes: ensure clicking a center navigates to `/[slug]` instead of current behavior

### Implementation Constraints
- Reuse existing `getAdminClient()` (service_role) for all API endpoints
- All Supabase queries scoped by `clinic_id`
- RLS policies must allow public read of branch slug → name/logo for the directory
- Password change reuses existing OTP flow (email verification)
- Plan limits must match `src/lib/subscriptionCheck.ts`

## User Stories

1. **New admin signs up → first login:**
   - Enters email/password at `/login`
   - Redirected to `/setup`
   - Chooses Gold plan → creates "مركز إرادة" + "مركز النور"
   - Auto-redirected to `primephysio.vercel.app/erada`
   - Logs in → `/home`

2. **Returning admin:**
   - Goes to `/login`, logs in
   - "ادارة" section shows account info + centers list
   - Clicks "مركز إرادة" card → `primephysio.vercel.app/erada`
   - Logs in → `/home`

3. **Patient looking for a center:**
   - Goes to `/login`, clicks "المراكز" tab
   - Searches "إرادة"
   - Clicks center card → `primephysio.vercel.app/erada`
   - Sees branded login page
