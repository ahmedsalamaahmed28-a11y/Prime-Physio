# Onboarding Redesign — 2026-06-21

## Goal

إعادة تصميم تدفق التسجيل (onboarding) للمستخدمين الجدد (Google + البريد الإلكتروني)
بحيث كل المستخدمين يعدوا من نفس المسار: تسجيل ← دخول ← إنشاء مركز ← باقة ← داشبورد.

## الفرق عن الحالي

| الحالي | الجديد |
|--------|--------|
| Google OAuth يعمل auto-provision (ينشئ مركز مباشرة) | Google يعدي على signup/OTP أولاً |
| صفحة signup للإيميل/باسورد فقط | صفحة signup للكل (Google + إيميل/باسورد) |
| إنشاء مركز واحد فقط في setup | يقدر يضيف أكتر من مركز (اسم + لوجو لكل واحد) |
| مفيش step indicator | ٤ خطوات horizontal فوق الصفحة |
| الباقة مش إجبارية قبل الداشبورد | لازم يختار باقة قبل الدخول |

## التدفق الجديد

```
1 ◉ التسجيل ──→ 2 ◉ الدخول ──→ 3 ◉ إنشاء مركز ──→ 4 ◉ الباقات ──→ الداشبورد
```

## المكونات والتغييرات

### 1. `SetupSteps` (مكون جديد)
- 4 خطوات: التسجيل، الدخول، إنشاء مركز، الباقات
- أرقام في دايرة بلون أزرق للحالي/المكتمل، رمادي للباقي
- Horizontal, يظهر فوق الصفحات: signup, setup/center, subscribe
- المسار: `/signup` → الخطوة 1 (نشط), `/setup/center` → الخطوة 3 (نشط), `/subscribe` → الخطوة 4 (نشط)

### 2. `src/app/signup/page.tsx` (معدل)
- يقبل `?google=1` في الـ URL
- لو `google=1` و session موجود → يعبي الإيميل والاسم من session.user تلقائياً
- حقل الباسورد إجباري للكل (حتى Google users)
- بعد OTP → API ينشئ `auth_accounts` بالباسورد اللي كتبه المستخدم
- بعد OTP → `signIn("credentials")` → redirect إلى `/setup/center`
- الخطوة 1 (التسجيل) و 2 (الدخول) نشطين معاً (لأن الدخول بيحصل تلقائياً بعد التسجيل)

### 3. `src/app/setup/center/page.tsx` (معدل)
- حقل رفع لوجو (موجود حالياً)
- زر "إضافة مركز تاني" — يضيف فورم مكرر (اسم + لوجو) لنفس الصفحة
- قبل الحفظ، يقدر يرجع يعدل على أي مركز
- بعد الحفظ: API ينشئ عيادة (clinic) واحدة + فروع (branches) متعددة + الموظف admin
- أول فرع/مركز هو الرئيسي (يُستخدم في enrich: shortName + logoUrl)
- يُحدث `user.shortName` و `user.logoUrl` (أول مركز)
- redirect إلى `/subscribe`
- الخطوة 3 (إنشاء مركز) نشط

### 4. `src/app/subscribe/page.tsx` (معدل)
- إجبارية: لازم يختار باقة عشان يكمل
- مينفعش يتخطاها أو يدخل الداشبورد من غير باقة
- الـ guard في DashboardLayout يمنع الدخول لو في session و auth_accounts ولا subscription
- redirect للصفحة الرئيسية بعد اختيار الباقة
- الخطوة 4 (الباقات) نشط

### 5. `src/app/page.tsx` (معدل حالياً)
- Session + auth_accounts + subscription → `/home`
- Session + auth_accounts + staff + no subscription → `/subscribe`
- Session + no auth_accounts → `/signup`
- No session → `/login`

### 6. `src/lib/auth.tsx` (معدل)
- حذف auto-provision لمستخدمي Google (لم يعد مستخدماً)
- `enrichUserWithClinic` لم يعد ينشئ clinic
- `isPlatformAdmin` و staff lookup باقي كما هو

### 7. `src/app/api/auth/verify-email/route.ts` (معدل)
- يقبل `provider: "google"` لجوجل
- ينشئ `auth_accounts` بالباسورد اللي أدخله المستخدم

### 8. `src/components/DashboardLayout.tsx` (معدل)
- Guard: لو session موجود و auth_accounts موجود ولا subscription → يمنع الدخول
- السايدبار يعرض `user.shortName` و `user.logoUrl`

### 9. `src/app/login/page.tsx` (معدل)
- دالة `handleGoogleLogin` لم تعد تضبط `pending_google_signup`
- Google login → NextAuth → redirect إلى `/` → الرoot يقرر

### 10. `src/app/api/auth/auto-provision/route.ts`
- لم يعد مستخدماً. يحتفظ به للتوافق مؤقتاً أو يحذف.

## API Routes

### `POST /api/auth/verify-email` — تعديل
Input:
```json
{
  "email": "...",
  "code": "1234",
  "name": "...",
  "password": "...",
  "provider": "email" | "google"
}
```
- `provider: "google"` يعني إنشاء `auth_accounts` بالباسورد اللي أدخله المستخدم (عشان `signIn("credentials")` يشتغل)
- `provider: "email"` — behaviour الحالي

### `POST /api/setup/center` — تعديل
Input:
```json
{
  "centers": [
    { "short_name": "...", "full_name": "...", "slug": "...", "logo_url": "..." }
  ]
}
```
- يقبل array of centers بدل مركز واحد
- ينشئ clinic واحدة + staff + branches متعددة (كل entry في array = branch)
- أول branch هو الرئيسي (يُستخدم في enrich)

## Guard Logic (DashboardLayout)

```javascript
if (session && user?.clinicId && !hasSubscription) {
  redirect("/subscribe");
}
if (!session) {
  redirect("/login");
}
if (session && !auth_accounts) {
  redirect("/signup");
}
```

## Step Indicator

```
  ①  ←  ②  ←  ③  ←  ④
تسجيل    دخول    مركز    باقة
```

- كل خطوة: رقم في دايرة (w-8 h-8) مع نص تحتها
- الخطوة النشطة/المكتملة: دايرة زرقاء (`#4F46BA`) مع نص أبيض
- الخطوة الغير نشطة: دايرة رمادية (`#CBD5E1`) مع نص رمادي
- خط بين الدوائر: `w-16 h-0.5` رمادي/أزرق حسب الحالة
- يظهر فوق المحتوى في صفحة signup، setup/center، subscribe
- يستخدم `usePathname()` لتحديد الخطوة النشطة

## الملاحظات

- Google OAuth ما زال يستخدم NextAuth Google provider
- الفرق بس: مش بنعمل auto-provision بعد Google
- كل المستخدمين يعدوا من نفس المسار
- `auth_accounts` + `provider` column للتمييز
