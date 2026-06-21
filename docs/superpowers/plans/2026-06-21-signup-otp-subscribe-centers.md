# Signup OTP + Subscribe + Centers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4-step onboarding flow: Signup (email/password + OTP) → Login → Subscribe → Create Centers.

**Architecture:** Add `branches` table under existing `clinics` for multi-center support. Rewrite signup flow to not auto-create clinic on OTP verify. New `/subscribe` page creates clinic + subscription + staff atomically. New `/centers` page manages branches with logo upload.

**Tech Stack:** Next.js, Supabase (service_role for admin ops), NextAuth Credentials + Google, bcryptjs, Paymob, Supabase Storage for logos.

## Global Constraints

- Arabic-first RTL UI throughout
- Build must pass zero errors (`npm run build`)
- Google OAuth flow stays intact (auto-provision → redirect to /centers)
- All Supabase queries use `getAdminClient()` for server-side operations
- `branches.slug` is unique per `clinic_id`
- Plan limits: Basic=1 center, Silver=1 center, Gold=2 centers
- Logos stored in Supabase Storage bucket `branch-logos`

---

## File Structure

### New files:
- `src/app/subscribe/page.tsx` — subscription selection page
- `src/app/centers/page.tsx` — centers management page (branch CRUD)
- `src/app/api/subscribe/route.ts` — subscribe API (create clinic + subscription + staff)
- `src/app/api/branches/route.ts` — list + create branches
- `src/app/api/branches/[id]/route.ts` — update + delete branch
- `supabase-migration-branches.sql` — DB migration

### Modified files:
- `src/app/signup/page.tsx` — add spam message + green success + redirect to /login
- `src/app/login/page.tsx` — check verified + redirect /subscribe or /centers
- `src/lib/auth.tsx` — active branch context + redirect to /centers after Google auto-provision
- `src/components/DashboardLayout.tsx` — dynamic logo from active branch
- `src/app/subscription/page.tsx` — rename "فروع العيادة" to "المراكز"
- `src/lib/subscriptionCheck.ts` — add branch count enforcement
- `src/app/api/auth/verify-email/route.ts` — stop creating clinic on verify, set `verified=true`
- `src/app/api/auth/send-verification/route.ts` — check `auth_accounts` for existing (not just verified)
- `src/app/api/auth/auto-provision/route.ts` — redirect to /centers after create

---

### Task 1: Database Migration

**Files:**
- Create: `supabase-migration-branches.sql`

- [ ] **Create migration SQL**

Write `supabase-migration-branches.sql`:

```sql
-- Add verified column to auth_accounts
alter table public.auth_accounts add column if not exists verified boolean not null default false;

-- Create branches table
create table if not exists public.branches (
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

-- Add RLS
alter table public.branches enable row level security;

-- Clinic access policy
create policy "clinic_access_branches" on public.branches
  for all using (
    clinic_id in (
      select clinic_id from public.staff where email = auth.jwt() ->> 'email'
    )
  );

-- Platform admin bypass
create policy "platform_admin_bypass_branches" on public.branches
  for all using (
    (select is_platform_admin())
  );
```

- [ ] **Commit**

```bash
git add supabase-migration-branches.sql
git commit -m "feat: add branches table + verified column to auth_accounts"
```

---

### Task 2: API Routes — Branches CRUD + Subscribe

**Files:**
- Create: `src/app/api/subscribe/route.ts`
- Create: `src/app/api/branches/route.ts`
- Create: `src/app/api/branches/[id]/route.ts`

- [ ] **Create `src/app/api/subscribe/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, name, planId, paymentData } = await req.json();
    if (!email || !planId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = getAdminClient();
    const cleanEmail = email.toLowerCase().trim();

    // Check if clinic already exists
    const { data: existingClinic } = await admin
      .from("clinics")
      .select("id")
      .eq("admin_email", cleanEmail)
      .maybeSingle();

    if (existingClinic) {
      return NextResponse.json({ clinicId: existingClinic.id });
    }

    const clinicId = crypto.randomUUID();
    const clinicName = name || cleanEmail.split("@")[0];

    // Create clinic
    const { error: clinicErr } = await admin.from("clinics").insert({
      id: clinicId, name: clinicName, admin_email: cleanEmail, status: "active",
    });
    if (clinicErr) {
      return NextResponse.json({ error: clinicErr.message }, { status: 500 });
    }

    // Create staff (admin)
    const { error: staffErr } = await admin.from("staff").insert({
      clinic_id: clinicId, name: clinicName, email: cleanEmail, role: "admin", status: "نشط",
    });
    if (staffErr) {
      await admin.from("clinics").delete().eq("id", clinicId);
      return NextResponse.json({ error: staffErr.message }, { status: 500 });
    }

    // Create clinic_settings
    try {
      await admin.from("clinic_settings").upsert({
        clinic_id: clinicId, clinic_name: clinicName,
      }, { onConflict: "clinic_id" });
    } catch {}

    // Create subscription
    const plans: Record<string, { price: number }> = {
      basic: { price: 500 },
      silver: { price: 1000 },
      gold: { price: 1500 },
    };
    const plan = plans[planId];
    if (!plan) {
      await admin.from("clinics").delete().eq("id", clinicId);
      await admin.from("staff").delete().eq("clinic_id", clinicId);
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { error: subErr } = await admin.from("subscriptions").insert({
      clinic_id: clinicId, user_email: cleanEmail, plan_name: planId,
      plan_price: plan.price, status: "active", is_trial: false,
    });
    if (subErr) {
      console.warn("[Subscribe] Subscription error:", subErr);
    }

    return NextResponse.json({ clinicId, clinicName });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Create `src/app/api/branches/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get("clinic_id");

  if (!clinicId) {
    return NextResponse.json({ error: "clinic_id is required" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("branches")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ branches: data || [] });
}

export async function POST(req: NextRequest) {
  try {
    const { clinic_id, short_name, full_name, slug, logo_url } = await req.json();

    if (!clinic_id || !short_name || !full_name || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Check plan limit for branches
    const { data: subs } = await admin
      .from("subscriptions")
      .select("plan_name")
      .eq("clinic_id", clinic_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);
    const planName = (subs && subs[0]?.plan_name) || "basic";
    const maxBranches = planName === "gold" ? 2 : 1;

    const { count } = await admin
      .from("branches")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinic_id);

    if (count !== null && count >= maxBranches) {
      return NextResponse.json({
        error: `Plan limit reached. Max ${maxBranches} centers allowed on ${planName} plan.`,
      }, { status: 403 });
    }

    // Check slug uniqueness within clinic
    const { data: existing } = await admin
      .from("branches")
      .select("id")
      .eq("clinic_id", clinic_id)
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Slug already exists in this clinic" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("branches")
      .insert({ clinic_id, short_name, full_name, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""), logo_url })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ branch: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Create `src/app/api/branches/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const admin = getAdminClient();

    const { data, error } = await admin
      .from("branches")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ branch: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminClient();
  const { error } = await admin.from("branches").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Commit**

```bash
git add src/app/api/subscribe/route.ts src/app/api/branches/
git commit -m "feat: add subscribe and branches API routes"
```

---

### Task 3: Update signup flow (OTP + spam message + green success)

**Files:**
- Modify: `src/app/api/auth/verify-email/route.ts`
- Modify: `src/app/signup/page.tsx`
- Modify: `src/app/api/auth/send-verification/route.ts`

- [ ] **Modify `src/app/api/auth/verify-email/route.ts`**

The current route creates clinic + staff + clinic_settings on verify. In the new flow, it should only create the `auth_accounts` entry with `verified: true`. Remove all clinic/staff/clinic_settings creation:

Replace the entire file after creating `auth_accounts` (line 69 onwards) with:

```typescript
    // Create auth_accounts entry with verified=true
    const passwordHash = await bcrypt.hash(password, 10);
    const { data: authRecord, error: authError } = await admin
      .from("auth_accounts")
      .insert({ email: cleanEmail, password_hash: passwordHash, verified: true })
      .select("id")
      .single();

    if (authError || !authRecord) {
      return NextResponse.json({ error: "فشل إنشاء الحساب", details: authError?.message }, { status: 500 });
    }

    // Mark code as used
    await admin.from("app_key_values").upsert({
      key,
      value: { ...stored, used: true },
    });

    return NextResponse.json({ success: true });
```

- [ ] **Modify `src/app/signup/page.tsx`**

Changes:
1. After OTP verification success (line ~160), show green success banner instead of auto-login
2. Add "تحقق من Spam" message in the OTP step (line ~356)
3. After green success, redirect to `/login` after 2 seconds

Replace the OTP step section (lines 354-402) with:

```tsx
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {isRtl ? "تم إرسال رمز التحقق إلى بريدك الإلكتروني" : "A verification code has been sent to your email"}
                </span>
              </div>

              <p className="text-[11px] text-amber-600 text-center -mt-4">
                {isRtl ? "يرجى التحقق من مجلد Spam إذا لم تجد الكود" : "Check your Spam folder if you don't see the code"}
              </p>

              <div className="flex items-center justify-center gap-3" dir="ltr">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={otpRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-lg font-bold text-slate-800 border border-slate-200 rounded-lg focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none transition-all"
                  />
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.join("").length !== 4}
                  className="flex-1 bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      {isRtl ? "تأكيد" : "Verify"}
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setStep("form")}
                  disabled={isLoading}
                  className="px-4 border border-slate-200 text-slate-500 font-medium h-10 rounded-lg transition-all duration-200 text-sm hover:bg-slate-50"
                >
                  {isRtl ? "تعديل" : "Edit"}
                </button>
              </div>
            </div>
          )}

          {showSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-700 text-sm font-bold rounded-xl p-4 mt-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
              {isRtl ? "✅ تم إنشاء الحساب بنجاح! جاري تحويلك إلى صفحة تسجيل الدخول..." : "✅ Account created successfully! Redirecting to login..."}
            </div>
          )}
```

Also add `showSuccess` state and update `handleVerifyOtp`:

Replace the `handleVerifyOtp` function (lines 119-167) with:

```typescript
  const [showSuccess, setShowSuccess] = useState(false);

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 4) {
      setError(isRtl ? "يرجى إدخال رمز التحقق كاملاً" : "Please enter the full code");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
          clinicName: `${firstName.trim()} ${lastName.trim()}`,
          phone: "",
          password,
          role: "admin",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (isRtl ? "فشل التحقق" : "Verification failed"));
      }

      setShowSuccess(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (err: any) {
      setError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
      setIsLoading(false);
    }
  };
```

- [ ] **Commit**

```bash
git add src/app/api/auth/verify-email/route.ts src/app/signup/page.tsx
git commit -m "feat: signup OTP flow — spam message, green success, redirect to login"
```

---

### Task 4: Update login page — verified check + redirect

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Modify login page**

In the LoginContent component, after the signIn call succeeds, add logic to check if the user has a clinic and redirect accordingly.

Find the `handleSubmit` function in the login page. After successful signIn, replace the redirect logic:

```typescript
      if (result?.error) {
        setError(isRtl ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password");
        setIsLoading(false);
        return;
      }

      // Check if account is verified
      try {
        const checkRes = await fetch("/api/auth/check-verified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        const checkData = await checkRes.json();
        if (!checkData.verified) {
          setError(isRtl ? "يرجى التحقق من بريدك الإلكتروني أولاً" : "Please verify your email first");
          setIsLoading(false);
          return;
        }
      } catch {}

      // Check if user has a clinic
      try {
        const clinicRes = await fetch(`/api/has-clinic?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        const clinicData = await clinicRes.json();
        if (!clinicData.hasClinic) {
          window.location.href = "/subscribe";
          return;
        }
      } catch {}

      window.location.href = "/centers";
```

Also add the check-verified API route. Create `src/app/api/auth/check-verified/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const admin = getAdminClient();
    const { data } = await admin
      .from("auth_accounts")
      .select("verified")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    return NextResponse.json({ verified: data?.verified || false });
  } catch {
    return NextResponse.json({ verified: false });
  }
}
```

And `src/app/api/has-clinic/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const email = new URL(req.url).searchParams.get("email");
    if (!email) return NextResponse.json({ hasClinic: false });

    const admin = getAdminClient();
    const { data } = await admin
      .from("clinics")
      .select("id")
      .eq("admin_email", email)
      .maybeSingle();

    return NextResponse.json({ hasClinic: !!data });
  } catch {
    return NextResponse.json({ hasClinic: false });
  }
}
```

- [ ] **Commit**

```bash
git add src/app/api/auth/check-verified/route.ts src/app/api/has-clinic/route.ts src/app/login/page.tsx
git commit -m "feat: login checks verified account + redirects to subscribe or centers"
```

---

### Task 5: Create `/subscribe` page

**Files:**
- Create: `src/app/subscribe/page.tsx`

- [ ] **Create subscribe page**

```tsx
"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const plans = (isRtl: boolean) => [
  {
    id: "basic",
    name: isRtl ? "الأساسية" : "Starter",
    price: isRtl ? "مجاني" : "Free",
    priceNum: 0,
    features: isRtl
      ? ["50 مريض", "100 جلسة/شهر", "مركز واحد"]
      : ["50 Patients", "100 Sessions/mo", "1 Center"],
    popular: false,
  },
  {
    id: "silver",
    name: isRtl ? "الفضية" : "Silver",
    price: "1,000",
    priceNum: 1000,
    features: isRtl
      ? ["200 مريض", "500 جلسة/شهر", "مركز واحد"]
      : ["200 Patients", "500 Sessions/mo", "1 Center"],
    popular: true,
  },
  {
    id: "gold",
    name: isRtl ? "الذهبية" : "Gold",
    price: "1,500",
    priceNum: 1500,
    features: isRtl
      ? ["مرضى غير محدودين", "جلسات غير محدودة", "مركزين"]
      : ["Unlimited Patients", "Unlimited Sessions", "2 Centers"],
    popular: false,
  },
];

export default function SubscribePage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const email = user?.email;
  const name = user?.name;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async (planId: string) => {
    if (!email) return;
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || email.split("@")[0], planId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Subscription failed");
      }

      window.location.href = "/centers";
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4F46BA]/10 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4F46BA]" />
          <span className="text-[11px] font-medium text-[#4F46BA]">
            {isRtl ? "الباقات" : "Plans"}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">
          {isRtl ? "اختر الباقة المناسبة لعيادتك" : "Choose the Right Plan for Your Clinic"}
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          {isRtl ? "اختر باقة للبدء. يمكنك الترقية لاحقاً." : "Choose a plan to get started. You can upgrade later."}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 max-w-md mx-auto">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 items-start justify-items-center gap-6 pt-4">
          {plans(isRtl).map((plan) => (
            <div
              key={plan.id}
              className={`w-72 relative text-center border p-6 rounded-lg ${
                plan.popular
                  ? "bg-indigo-500 text-white border-gray-500/30"
                  : "bg-white text-gray-800/80 border-gray-200"
              }`}
            >
              {plan.popular && (
                <p className="absolute px-3 text-sm -top-3.5 left-3.5 py-1 bg-[#8789FB] rounded-full text-white">
                  {isRtl ? "الأكثر طلباً" : "Most Popular"}
                </p>
              )}
              <p className={`font-semibold ${plan.popular ? "pt-2" : ""}`}>{plan.name}</p>
              <h1 className="text-3xl font-semibold mt-1">
                {plan.price}
                {plan.priceNum > 0 && (
                  <span className={`text-sm font-normal ${plan.popular ? "text-white/70" : "text-gray-500"}`}>
                    /{isRtl ? "شهر" : "mo"}
                  </span>
                )}
              </h1>
              <ul className="list-none text-sm mt-6 space-y-1">
                {plan.features.map((feat, fi) => (
                  <li key={fi} className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                      <path d="M7.162 13.5 2.887 9.225l1.07-1.069 3.205 3.207 6.882-6.882 1.069 1.07z" fill={plan.popular ? "currentColor" : "#6366F1"}/>
                    </svg>
                    <p className={`text-sm ${plan.popular ? "text-white" : "text-gray-500"}`}>{feat}</p>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading}
                className={`text-sm w-full py-2 rounded font-medium mt-7 transition-all disabled:opacity-50 ${
                  plan.popular
                    ? "bg-white text-indigo-500 hover:bg-gray-200"
                    : "bg-indigo-500 text-white hover:bg-indigo-600"
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  isRtl ? "ابدأ الآن" : "Get Started"
                )}
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400">
          <Link href="/centers" className="text-[#4F46BA] hover:underline">
            {isRtl ? "سأفعل ذلك لاحقاً" : "I'll do this later"}
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/app/subscribe/page.tsx
git commit -m "feat: add subscribe page for plan selection after signup"
```

---

### Task 6: Create `/centers` page (branch management)

**Files:**
- Create: `src/app/centers/page.tsx`

- [ ] **Create centers page**

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Plus, Check, Building } from "lucide-react";
import Link from "next/link";

interface Branch {
  id: string;
  short_name: string;
  full_name: string;
  slug: string;
  logo_url: string | null;
  status: string;
}

export default function CentersPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const clinicId = user?.clinicId;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [planLimit, setPlanLimit] = useState(1);

  useEffect(() => {
    if (clinicId === undefined) return;
    loadBranches();
  }, [clinicId]);

  const loadBranches = async () => {
    if (!clinicId) return;
    try {
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("plan_name")
        .eq("clinic_id", clinicId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      const plan = (subData && subData[0]?.plan_name) || "basic";
      setPlanLimit(plan === "gold" ? 2 : 1);

      const { data } = await supabase
        .from("branches")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: true });
      setBranches(data || []);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !clinicId) return null;
    const ext = logoFile.name.split(".").pop();
    const path = `${clinicId}/${Date.now()}.${ext}`;
    const { data, error: uploadErr } = await supabase.storage
      .from("branch-logos")
      .upload(path, logoFile);
    if (uploadErr) {
      console.warn("[Upload] Failed:", uploadErr);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from("branch-logos")
      .getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const handleCreate = async () => {
    if (!shortName || !fullName || !slug) {
      setError(isRtl ? "يرجى ملء جميع الحقول" : "Please fill all fields");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const logoUrl = await uploadLogo();
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: clinicId,
          short_name: shortName,
          full_name: fullName,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
          logo_url: logoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }
      setBranches(prev => [...prev, data.branch]);
      setShowForm(false);
      setShortName("");
      setFullName("");
      setSlug("");
      setLogoFile(null);
      setLogoPreview(null);
    } catch (err: any) {
      setError(err?.message || "Failed to create center");
    } finally {
      setSaving(false);
    }
  };

  const autoSlug = (val: string) => {
    return val.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  };

  if (isLoading) return null;

  const atLimit = branches.length >= planLimit;

  return (
    <div className="min-h-screen bg-neutral-100 p-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isRtl ? "مراكزي" : "My Centers"}
            </h1>
            <p className="text-sm text-slate-400">
              {isRtl ? `لديك ${branches.length} من أصل ${planLimit} مركز` : `${branches.length} of ${planLimit} centers used`}
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              disabled={atLimit}
              className="bg-[#4F46BA] hover:bg-[#4338ca] disabled:bg-gray-300 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all disabled:cursor-not-allowed"
              title={atLimit ? (isRtl ? "لقد وصلت للحد الأقصى" : "Limit reached") : ""}
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {atLimit && !showForm && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg p-3 mb-4 text-center">
            {isRtl
              ? `لقد وصلت للحد الأقصى من المراكز (${planLimit}). قم بترقية خطتك لإضافة المزيد.`
              : `You've reached the max centers (${planLimit}). Upgrade your plan to add more.`}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">
              {isRtl ? "إنشاء مركز جديد" : "Create New Center"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  {isRtl ? "الاسم المختصر" : "Short Name"}
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => {
                    setShortName(e.target.value);
                    if (!slug || slug === autoSlug(shortName)) {
                      setSlug(autoSlug(e.target.value));
                    }
                  }}
                  placeholder={isRtl ? "مثال: عيادة المعادي" : "e.g. Maadi Clinic"}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  {isRtl ? "الاسم الكامل" : "Full Name"}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isRtl ? "مثال: مركز Prime Physio الطبي - المعادي" : "e.g. Prime Physio Medical Center - Maadi"}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  {isRtl ? "الرمز التعريفي" : "Identifier"}
                  <span className="text-[10px] text-slate-400 mr-1">
                    {isRtl ? "(يظهر في الرابط)" : "(appears in URL)"}
                  </span>
                </label>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <span>primephysio.vercel.app/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(autoSlug(e.target.value))}
                    placeholder="my-clinic"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  {isRtl ? "شعار المركز" : "Center Logo"}
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <img src="/logo.png" alt="Prime Physio" className="w-10 h-10 object-contain opacity-50" />
                    )}
                  </div>
                  <label className="cursor-pointer bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs text-slate-500 hover:bg-gray-50 transition-colors">
                    {isRtl ? "اختيار صورة" : "Choose Image"}
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-10 rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {isRtl ? "إنشاء المركز" : "Create Center"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 border border-gray-200 text-slate-500 font-medium h-10 rounded-lg text-sm hover:bg-gray-50"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}

        {branches.length === 0 && !showForm ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <div className="w-16 h-16 bg-[#4F46BA]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-[#4F46BA]" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">
              {isRtl ? "أنشئ مركزك الأول" : "Create Your First Center"}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {isRtl
                ? "أضف مركزك الأول للبدء في إدارة المرضى والمواعيد"
                : "Add your first center to start managing patients and appointments"}
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-12 w-12 rounded-full flex items-center justify-center mx-auto shadow-lg transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        ) : (
          !showForm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((branch) => (
                <div key={branch.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    {branch.logo_url ? (
                      <img src={branch.logo_url} alt={branch.short_name} className="w-full h-full object-contain" />
                    ) : (
                      <img src="/logo.png" alt="Prime Physio" className="w-8 h-8 object-contain opacity-50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{branch.short_name}</p>
                    <p className="text-xs text-slate-400 truncate">{branch.full_name}</p>
                    <p className="text-[10px] text-slate-300 font-mono">/{branch.slug}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">
                    {branch.status}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        <div className="text-center mt-8">
          <Link
            href="/home"
            className="text-sm text-[#4F46BA] hover:text-[#4338ca] font-medium"
          >
            {isRtl ? "تخطي، سأفعل ذلك لاحقاً ← الذهاب إلى لوحة التحكم" : "Skip, I'll do this later → Go to Dashboard"}
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/app/centers/page.tsx
git commit -m "feat: add centers page for branch CRUD"
```

---

### Task 7: Update sidebar with dynamic logo + auth context

**Files:**
- Modify: `src/components/DashboardLayout.tsx`
- Modify: `src/lib/auth.tsx`

- [ ] **Modify `src/lib/auth.tsx` — add activeBranch state + redirect to /centers for Google auto-provision**

After the `enrichUserWithClinic` function completes (after the auto-provision call), add redirect to `/centers`:

In the auth context provider, after `enrichUserWithClinic` succeeds, add:

```typescript
// After auto-provision redirect to centers page
if (autoProvisionJustCompleted) {
  window.location.href = "/centers";
  return;
}
```

Also add `activeBranchId` to the auth context:

```typescript
const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
```

Expose it in the context value.

- [ ] **Modify `DashboardLayout.tsx` — dynamic sidebar logo**

Find the logo section in the sidebar (around the `<img src="/logo.png">`). Replace with:

```tsx
const { activeBranchId } = useAuth();
const [branchLogo, setBranchLogo] = useState<string | null>(null);

useEffect(() => {
  if (!clinicId || !activeBranchId) return;
  supabase
    .from("branches")
    .select("logo_url")
    .eq("id", activeBranchId)
    .single()
    .then(({ data }) => {
      if (data?.logo_url) setBranchLogo(data.logo_url);
    });
}, [clinicId, activeBranchId]);
```

Then in the logo section:

```tsx
<img
  src={branchLogo || "/logo.png"}
  alt="Logo"
  className="h-20 w-full object-contain"
  onError={(e) => {
    (e.target as HTMLImageElement).style.display = "none";
  }}
/>
```

- [ ] **Commit**

```bash
git add src/lib/auth.tsx src/components/DashboardLayout.tsx
git commit -m "feat: dynamic sidebar logo from active branch"
```

---

### Task 8: Update ALL_FEATURES + subscription check

**Files:**
- Modify: `src/app/subscription/page.tsx`
- Modify: `src/lib/subscriptionCheck.ts`

- [ ] **Update ALL_FEATURES label**

In `src/app/subscription/page.tsx`, find the branches feature (around line 70-75). Change:
```tsx
    label: isRtl ? "فروع العيادة" : "Clinic Branches",
```
to:
```tsx
    label: isRtl ? "المراكز" : "Centers",
```

- [ ] **Update subscriptionCheck.ts**

In `src/lib/subscriptionCheck.ts`, add branch count check after patient/session checks:

```typescript
// Check branch count
const { count: branchCount } = await admin
  .from("branches")
  .select("*", { count: "exact", head: true })
  .eq("clinic_id", clinicId);

const planLimits: Record<string, { patients: number; sessions: number; branches: number }> = {
  basic: { patients: 50, sessions: 100, branches: 1 },
  silver: { patients: 200, sessions: 500, branches: 1 },
  gold: { patients: -1, sessions: -1, branches: 2 },
};

const limits = planLimits[planName] || planLimits.basic;
if (resource === "branches" && branchCount !== null && branchCount >= limits.branches) {
  return { allowed: false, message: `Max ${limits.branches} centers on ${planName} plan` };
}
```

- [ ] **Commit**

```bash
git add src/app/subscription/page.tsx src/lib/subscriptionCheck.ts
git commit -m "feat: update ALL_FEATURES label + subscription check for branches"
```

---

### Task 9: Build verification + deploy

- [ ] **Run npm run build**

```bash
npm run build 2>&1
```

Expected: zero errors

- [ ] **Fix any build errors** (unused imports, missing exports, etc.)

- [ ] **Commit and push**

```bash
git add -A
git commit -m "fix: clean up build errors"
git push origin main
```

- [ ] **Deploy to Vercel**

```bash
vercel deploy --prod
```

Expected: `Verified https://primephysio.vercel.app`
