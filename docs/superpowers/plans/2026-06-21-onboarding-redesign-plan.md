# Onboarding Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** إعادة تصميم تدفق التسجيل — كل المستخدمين (Google + إيميل) يعدوا من نفس المسار: تسجيل ← OTP ← إنشاء مركز (متعدد) ← باقة ← داشبورد.

**Architecture:** Step indicator (SetupSteps) يُظهر التقدم في ٤ خطوات. Google OAuth لم يعد يعمل auto-provision. root page يفحص auth_accounts لتحديد المسار. صفحة setup تقبل array من المراكز. صفحة subscribe إجبارية قبل الداشبورد.

**Tech Stack:** Next.js 16 App Router, Supabase (service_role), NextAuth, Tailwind

## Global Constraints

- Arabic-first RTL (use `isRtl` من `useLanguage`)
- Build يجب أن يمر بدون أخطاء (`npm run build`)
- جميع الاستعلامات تستخدم `getAdminClient()` (service_role) للسيرفر
- auth_accounts هو المصدر الوحيد لمعرفة "المستخدم كمل التسجيل ولا لسه"
- JWT cookies قد تبقى stale بعد reset — root page يفحص auth_accounts دائماً

---

### Task 1: إنشاء مكون SetupSteps

**Files:**
- Create: `src/components/SetupSteps.tsx`

**Interfaces:**
- Produces: `<SetupSteps />` — مكون يعرض ٤ خطوات أفقية مع أرقام في دوائر

- [ ] **Step 1: إنشاء المكون**

```tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";

const STEPS = [
  { key: "signup", labelAr: "التسجيل", labelEn: "Sign Up" },
  { key: "login", labelAr: "الدخول", labelEn: "Login" },
  { key: "center", labelAr: "إنشاء مركز", labelEn: "Create Center" },
  { key: "plan", labelAr: "الباقة", labelEn: "Plan" },
];

const STEP_MAP: Record<string, number> = {
  "/signup": 0,
  "/setup/center": 2,
  "/subscribe": 3,
};

export default function SetupSteps() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const currentIdx = pathname ? STEP_MAP[pathname] ?? -1 : -1;

  // On /signup, steps 0 (signup) and 1 (login) are active
  const activeIdx = pathname === "/signup" ? 1 : currentIdx;

  return (
    <div className="flex items-center justify-center gap-1 mb-6" dir="ltr">
      {STEPS.map((step, idx) => {
        const isActive = idx <= activeIdx;
        const isCurrent = pathname === "/signup" ? idx <= 1 : idx === currentIdx;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-[#4F46BA] text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {idx + 1}
              </div>
              <span
                className={`text-[10px] mt-1 whitespace-nowrap ${
                  isActive ? "text-[#4F46BA] font-semibold" : "text-slate-400"
                }`}
              >
                {isRtl ? step.labelAr : step.labelEn}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-12 h-0.5 mb-5 ${
                  idx < activeIdx ? "bg-[#4F46BA]" : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/SetupSteps.tsx
git commit -m "feat: add SetupSteps component for onboarding wizard"
```

---

### Task 2: تعديل verify-email API لقبول provider

**Files:**
- Modify: `src/app/api/auth/verify-email/route.ts`

**Interfaces:**
- Consumes: POST JSON with `{ email, code, name, password, provider }`
- Produces: `{ success: true, id }` بعد إنشاء auth_accounts

- [ ] **Step 1: إضافة provider إلى الـ API**

```typescript
// بعد قراءة الـ body:
const { email, code, name, phone, password, role, provider } = await req.json();

// عند إنشاء auth_accounts:
const { error: insertErr } = await admin.from("auth_accounts").insert({
  email,
  name: name || email.split("@")[0],
  password_hash: hashedPassword,
  role: role || "admin",
  verified: true,
  provider: provider || "email",
});
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/verify-email/route.ts
git commit -m "feat: add provider field to verify-email API"
```

---

### Task 3: تعديل صفحة signup لدعم Google

**Files:**
- Modify: `src/app/signup/page.tsx`

- [ ] **Step 1: إضافة `?google=1` والـ session**

```tsx
// إضافة import:
import { useSession } from "next-auth/react";

// داخل المكون:
const { data: session } = useSession();
const searchParams = useSearchParams();
const isGoogleFlow = searchParams?.get("google") === "1";

// تعبئة البيانات من session لو google flow:
useEffect(() => {
  if (isGoogleFlow && session?.user) {
    setEmail(session.user.email || "");
    const nameParts = (session.user.name || "").split(" ");
    if (nameParts.length > 1) {
      setFirstName(nameParts[0]);
      setLastName(nameParts.slice(1).join(" "));
    } else {
      setFirstName(session.user.name || "");
    }
  }
}, [isGoogleFlow, session]);
```

- [ ] **Step 2: إرسال provider في طلب verify-email**

```tsx
// داخل handleVerifyOtp:
const res = await fetch("/api/auth/verify-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: email.trim().toLowerCase(),
    code,
    name: `${firstName.trim()} ${lastName.trim()}`,
    password,
    role: "admin",
    provider: isGoogleFlow ? "google" : "email",
  }),
});
```

- [ ] **Step 3: تثبيت `useSearchParams` و `useSession`**

تأكد من وجود:
```tsx
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
```

وإضافة `Suspense` حول المكون أو استخدام dynamic import.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/signup/page.tsx
git commit -m "feat: support google flow in signup page"
```

---

### Task 4: حذف auto-provision من auth.tsx

**Files:**
- Modify: `src/lib/auth.tsx`

- [ ] **Step 1: حذف `autoProvisionAttempted` والمتغيرات المرتبطة**

```typescript
// حذف السطر:
let autoProvisionAttempted = false;

// في enrichUserWithClinic, حذف الكتلة:
const pendingSignup = await getAppValue<string>("pending_google_signup", "");
if (pendingSignup === "true" && !autoProvisionAttempted) {
  // ... كل الكود ده
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.tsx
git commit -m "refactor: remove google auto-provision from auth context"
```

---

### Task 5: تعديل login page

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: حذف `pending_google_signup` من handleGoogleLogin**

```typescript
const handleGoogleLogin = async () => {
  setError("");
  setIsLoading(true);
  // حذف هذين السطرين:
  // await setAppValue("pending_google_signup", "true");
  // await setAppValue("pending_role", "admin");
  try {
    const result = await signIn("google", { callbackUrl: "/", redirect: false });```
    // ...
  };
};
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "fix: remove pending_google_signup from login page"
```

---

### Task 6: تحديث root page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: تغيير redirect logic**

```typescript
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase";

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  const admin = getAdminClient();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email;

  // Check if auth_accounts exists
  let hasAccount = false;
  try {
    const { data: account } = await admin
      .from("auth_accounts")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    hasAccount = !!account;
  } catch {}

  if (!hasAccount) {
    redirect("/signup?google=1");
  }

  // Check subscription
  let hasSubscription = false;
  try {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_email", email)
      .eq("status", "active")
      .maybeSingle();
    hasSubscription = !!sub;
  } catch {}

  // Check staff/clinic
  try {
    const { data: staff } = await admin
      .from("staff")
      .select("clinic_id")
      .eq("email", email)
      .maybeSingle();

    if (staff?.clinic_id) {
      if (hasSubscription) {
        redirect("/home");
      } else {
        redirect("/subscribe");
      }
    }
  } catch {}

  redirect("/setup/center");
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: root page checks auth_accounts + subscription before routing"
```

---

### Task 7: تحديث API setup/center لقبول array

**Files:**
- Modify: `src/app/api/setup/center/route.ts`

- [ ] **Step 1: تغيير الـ API لقبول `centers` array**

```typescript
const { centers } = await req.json();
if (!centers || !Array.isArray(centers) || centers.length === 0) {
  return NextResponse.json({ error: "At least one center is required" }, { status: 400 });
}

const admin = getAdminClient();
const email = session.user.email;

// Check for existing clinic
let clinicId: string;
let isNewClinic = false;

const { data: existingClinic } = await admin
  .from("clinics")
  .select("id")
  .eq("admin_email", email)
  .maybeSingle();

if (existingClinic) {
  clinicId = existingClinic.id;
} else {
  isNewClinic = true;
  clinicId = crypto.randomUUID();

  const { error: clinicErr } = await admin.from("clinics").insert({
    id: clinicId,
    name: centers[0].full_name || centers[0].short_name,
    admin_email: email,
    status: "active",
  });
  if (clinicErr) {
    return NextResponse.json({ error: clinicErr.message }, { status: 500 });
  }

  const displayName = session.user.name || centers[0].short_name;
  const { error: staffErr } = await admin.from("staff").insert({
    clinic_id: clinicId,
    name: displayName,
    email,
    role: "admin",
    status: "نشط",
  });
  if (staffErr) {
    await admin.from("clinics").delete().eq("id", clinicId);
    return NextResponse.json({ error: staffErr.message }, { status: 500 });
  }
}

// Create branches
const branches = [];
for (const center of centers) {
  const cleanSlug = center.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const { data: branch, error: branchErr } = await admin
    .from("branches")
    .insert({
      clinic_id: clinicId,
      short_name: center.short_name,
      full_name: center.full_name || center.short_name,
      slug: cleanSlug,
      logo_url: center.logo_url || null,
    })
    .select()
    .single();

  if (branchErr) {
    // Rollback logic
    if (isNewClinic) {
      await admin.from("clinics").delete().eq("id", clinicId);
      await admin.from("staff").delete().eq("clinic_id", clinicId);
    }
    return NextResponse.json({ error: branchErr.message }, { status: 500 });
  }
  branches.push(branch);
}

return NextResponse.json({ clinicId, branches, isNewClinic });
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/setup/center/route.ts
git commit -m "feat: setup center API accepts multiple centers array"
```

---

### Task 8: تحديث صفحة setup/center (multiple centers + logo)

**Files:**
- Modify: `src/app/setup/center/page.tsx`

- [ ] **Step 1: إضافة state للمراكز المتعددة**

```tsx
interface CenterEntry {
  id: string;
  shortName: string;
  fullName: string;
  slug: string;
  logoFile: File | null;
  logoPreview: string | null;
}

const [centers, setCenters] = useState<CenterEntry[]>([
  { id: crypto.randomUUID(), shortName: "", fullName: "", slug: "", logoFile: null, logoPreview: null },
]);

const addCenter = () => {
  setCenters(prev => [...prev, {
    id: crypto.randomUUID(), shortName: "", fullName: "", slug: "", logoFile: null, logoPreview: null,
  }]);
};

const removeCenter = (id: string) => {
  setCenters(prev => prev.filter(c => c.id !== id));
};

const updateCenter = (id: string, field: string, value: any) => {
  setCenters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
};
```

- [ ] **Step 2: تعديل `handleSubmit` لرفع اللوجوهات وإرسال array**

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (centers.some(c => !c.shortName.trim() || !c.slug.trim())) return;
  setLoading(true);
  setError("");

  try {
    const centersData = [];
    for (const center of centers) {
      let logoUrl: string | null = null;
      if (center.logoFile) {
        const formData = new FormData();
        formData.append("file", center.logoFile);
        const uploadRes = await fetch("/api/upload/logo", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          logoUrl = uploadData.url;
        }
      }
      centersData.push({
        short_name: center.shortName.trim(),
        full_name: center.fullName.trim() || center.shortName.trim(),
        slug: center.slug.trim(),
        logo_url: logoUrl,
      });
    }

    const res = await fetch("/api/setup/center", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ centers: centersData }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create centers");
    window.location.href = "/subscribe";
  } catch (err: any) {
    setError(err?.message || "An error occurred");
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 3: تعديل الـ UI لعرض فورم لكل مركز مع زر "إضافة مركز تاني"**

```tsx
// داخل الـ form، بعد الخطوات:
{centers.map((center, idx) => (
  <div key={center.id} className="border border-slate-100 rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-bold text-slate-700">
        {isRtl ? `المركز ${idx + 1}` : `Center ${idx + 1}`}
      </h3>
      {centers.length > 1 && (
        <button type="button" onClick={() => removeCenter(center.id)}
          className="text-xs text-red-500 hover:text-red-700">
          {isRtl ? "حذف" : "Remove"}
        </button>
      )}
    </div>
    {/* حقول الاسم، الاسم الكامل، slug, اللوجو — كلها مرتبطة بـ updateCenter */}
  </div>
))}

<button type="button" onClick={addCenter}
  className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-slate-400 hover:border-[#4F46BA] hover:text-[#4F46BA] transition-colors text-sm">
  {isRtl ? "+ إضافة مركز تاني" : "+ Add Another Center"}
</button>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/setup/center/page.tsx
git commit -m "feat: support multiple centers in setup page"
```

---

### Task 9: تحديث صفحة subscribe (guard إجباري)

**Files:**
- Modify: `src/app/subscribe/page.tsx`

- [ ] **Step 1: إضافة guard يمنع تخطي الباقة**

```tsx
// بداية المكون، بعد hooks:
useEffect(() => {
  if (user?.clinicId && !user?.subscriptionId) {
    // كل شيء طبيعي، عايزين يختار باقة
  }
}, [user]);
```

المكون الموجود حالياً يعمل بالفعل redirect بعد الاشتراك. فقط تأكد من إضافة `SetupSteps`.

- [ ] **Step 2: إضافة SetupSteps**

```tsx
// داخل الـ return، قبل المحتوى:
<SetupSteps />
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/subscribe/page.tsx
git commit -m "feat: add setup steps indicator to subscribe page"
```

---

### Task 10: تحديث DashboardLayout guard

**Files:**
- Modify: `src/components/DashboardLayout.tsx`

- [ ] **Step 1: إضافة subscription check في guard**

```typescript
// في منطقة الـ useEffect أو guard، بعد isAuthPage check:
useEffect(() => {
  if (activeAccount?.clinicId && !isAuthPage && !isSetupPage && pathname !== "/subscribe") {
    const checkSub = async () => {
      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("clinic_id", activeAccount.clinicId)
          .eq("status", "active")
          .maybeSingle();
        if (!data) {
          window.location.href = "/subscribe";
        }
      } catch {}
    };
    checkSub();
  }
}, [activeAccount?.clinicId, pathname]);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/DashboardLayout.tsx
git commit -m "feat: dashboard guard redirects to subscribe if no active plan"
```

---

### Task 11: إضافة SetupSteps للصفحات

**Files:**
- Modify: `src/app/signup/page.tsx`
- Modify: `src/app/setup/center/page.tsx`

- [ ] **Step 1: إضافة `<SetupSteps />` لصفحة signup (فوق الـ container)**

```tsx
// داخل return، قبل <div className="min-h-screen...">
<SetupSteps />
```

- [ ] **Step 2: إضافة `<SetupSteps />` لصفحة setup/center**

```tsx
// داخل return، قبل <div className="min-h-screen...">
<SetupSteps />
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/signup/page.tsx src/app/setup/center/page.tsx
git commit -m "feat: add setup steps indicator to signup and setup center pages"
```

---

### Task 12: Build شامل + Push

- [ ] **Step 1: Build كامل**

Run: `npm run build`
Expected: PASS (zero errors)

- [ ] **Step 2: Commit + Push + Deploy**

```bash
git add -A
git commit -m "feat: complete onboarding redesign - unified flow for all users"
git push origin main
npx vercel --prod --yes
```

Expected: Deployment successful على https://primephysio.vercel.app
