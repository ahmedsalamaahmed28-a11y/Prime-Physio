"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Building2, CheckCircle2, ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";

const plans = [
  { id: "basic", nameAr: "الأساسية", nameEn: "Basic", price: "0", priceLabelAr: "مجانًا", priceLabelEn: "Free", descriptionAr: "للمراكز التي تبدأ عملها", descriptionEn: "For centers getting started" },
  { id: "silver", nameAr: "الفضية", nameEn: "Silver", price: "1000", priceLabelAr: "1,000 جنيه / شهريًا", priceLabelEn: "EGP 1,000 / month", descriptionAr: "للمراكز النامية", descriptionEn: "For growing centers" },
  { id: "gold", nameAr: "الذهبية", nameEn: "Gold", price: "1500", priceLabelAr: "1,500 جنيه / شهريًا", priceLabelEn: "EGP 1,500 / month", descriptionAr: "للمراكز الكبيرة", descriptionEn: "For larger centers" },
];

export default function CreateCenterPage() {
  const { user, isLoading, isEnriching } = useAuth();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [planId, setPlanId] = useState("");
  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [slug, setSlug] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");

  const normalizeSlug = (value: string) =>
    value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const sendOtp = async () => {
    setError("");
    setNotice("");
    if (!shortName.trim() || !slug.trim()) {
      setError(isRtl ? "أدخل اسم المركز والرابط أولاً." : "Enter the center name and URL first.");
      return;
    }
    setSendingOtp(true);
    try {
      const response = await fetch("/api/centers/send-otp", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send verification code");
      setOtpSent(true);
      setNotice(isRtl ? "تم إرسال رمز التحقق إلى بريد حسابك." : "A verification code was sent to your account email.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send verification code");
    } finally {
      setSendingOtp(false);
    }
  };

  const activateCenterSession = async (clinicId: string) => {
    const response = await fetch(`/api/auth/supabase-session?clinic_id=${encodeURIComponent(clinicId)}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.session?.access_token || !data.session?.refresh_token) {
      throw new Error(data.error || "Could not activate the new center session");
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (sessionError) throw sessionError;
  };

  const createCenter = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!user?.email) {
      setError(isRtl ? "يرجى تسجيل الدخول أولاً." : "Please sign in first.");
      return;
    }
    if (!planId) {
      setError(isRtl ? "اختر باقة الاشتراك قبل إنشاء المركز." : "Choose a subscription plan before creating the center.");
      return;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError(isRtl ? "أدخل رمز التحقق المكوّن من 6 أرقام." : "Enter the 6-digit verification code.");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/centers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          shortName: shortName.trim(),
          fullName: fullName.trim(),
          slug: normalizeSlug(slug),
          code: otp.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.clinicId) throw new Error(data.error || "Center creation failed");

      await activateCenterSession(data.clinicId);

      if (planId === "basic") {
        const subscribeResponse = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinicId: data.clinicId, planId: "basic" }),
        });
        const subscribeData = await subscribeResponse.json().catch(() => ({}));
        if (!subscribeResponse.ok) throw new Error(subscribeData.error || "The center was created, but the free plan could not be activated.");
        window.location.replace(`/${data.slug}`);
        return;
      }

      const paymentResponse = await fetch("/api/paymob/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingPeriod: "monthly",
          billingData: {
            first_name: user.name || "Prime",
            last_name: "Physio",
            email: user.email,
            city: "Cairo",
            state: "Cairo",
            country: "EG",
          },
        }),
      });
      const paymentData = await paymentResponse.json().catch(() => ({}));
      if (!paymentResponse.ok || !paymentData.iframeUrl) {
        throw new Error(paymentData.error || "Center created, but payment setup failed. You can retry from the center subscription page.");
      }
      setCreatedSlug(data.slug);
      setPaymentUrl(paymentData.iframeUrl);
      setNotice(isRtl ? "تم إنشاء المركز. أكمل الدفع لتفعيل الباقة." : "The center was created. Complete payment to activate the plan.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Center creation failed");
    } finally {
      setCreating(false);
    }
  };

  if (isLoading || isEnriching || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]"><Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" /></main>;
  }

  if (paymentUrl) {
    return (
      <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#F7F9FC] px-4 py-8">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h1 className="text-xl font-extrabold text-slate-800">{isRtl ? "إتمام الدفع" : "Complete payment"}</h1>
            <p className="mt-1 text-sm text-slate-500">{isRtl ? "أكمل الدفع لتفعيل اشتراك هذا المركز." : "Complete payment to activate this center's subscription."}</p>
          </div>
          <iframe src={paymentUrl} title="Paymob payment" className="h-[620px] w-full border-0" allow="payment" />
          <div className="p-5">
            <p className="mb-4 text-xs leading-6 text-slate-500">{isRtl ? "بعد نجاح الدفع، قد يستغرق تحديث حالة الاشتراك لحظات. يمكنك فتح المركز ومراجعة حالة الاشتراك." : "After successful payment, subscription status may take a short moment to update. You can open the center and review its subscription status."}</p>
            <Link href={`/${createdSlug}`} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#1769AA] text-sm font-bold text-white">{isRtl ? "الانتقال إلى المركز" : "Open center"}</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#F7F9FC] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/center-management" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#1769AA]"><ArrowLeft className="h-4 w-4" />{isRtl ? "العودة إلى إدارة المراكز" : "Back to center management"}</Link>
        <div className="mb-7">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1769AA] text-white"><Building2 className="h-6 w-6" /></div>
          <h1 className="text-2xl font-extrabold text-[#202B38]">{isRtl ? "إنشاء مركز مستقل جديد" : "Create a new independent center"}</h1>
          <p className="mt-2 text-sm text-[#7C8794]">{isRtl ? "كل مركز يحصل على رابط دخول وبيانات واشتراك منفصل." : "Every center gets its own login URL, data and subscription."}</p>
        </div>

        <form onSubmit={createCenter} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <section>
            <h2 className="mb-3 text-base font-extrabold text-slate-800">{isRtl ? "1. اختر الباقة" : "1. Choose a plan"}</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {plans.map((plan) => (
                <button key={plan.id} type="button" onClick={() => setPlanId(plan.id)} className={`rounded-2xl border p-4 text-start transition ${planId === plan.id ? "border-[#1769AA] bg-[#EFF5FC] ring-2 ring-[#1769AA]/15" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-800">{isRtl ? plan.nameAr : plan.nameEn}</span>
                    {planId === plan.id && <CheckCircle2 className="h-5 w-5 text-[#1769AA]" />}
                  </div>
                  <div className="mt-3 text-lg font-extrabold text-[#1769AA]">{isRtl ? plan.priceLabelAr : plan.priceLabelEn}</div>
                  <p className="mt-1 text-xs text-slate-500">{isRtl ? plan.descriptionAr : plan.descriptionEn}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-6">
            <h2 className="mb-4 text-base font-extrabold text-slate-800">{isRtl ? "2. بيانات المركز" : "2. Center details"}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                {isRtl ? "اسم المركز" : "Center name"}
                <input value={shortName} onChange={(e) => setShortName(e.target.value)} required maxLength={120} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#1769AA]" placeholder={isRtl ? "مثال: مركز برايم للعلاج الطبيعي" : "e.g. Prime Physiotherapy Center"} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                {isRtl ? "الاسم الكامل (اختياري)" : "Full name (optional)"}
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={200} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#1769AA]" placeholder={isRtl ? "الاسم الظاهر في صفحة الدخول" : "Name shown on the login page"} />
              </label>
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              {isRtl ? "رابط المركز الخاص" : "Unique center URL"}
              <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-[#1769AA]" dir="ltr">
                <span className="flex items-center bg-slate-50 px-3 text-xs text-slate-500">primephysio.vercel.app/</span>
                <input value={slug} onChange={(e) => setSlug(normalizeSlug(e.target.value))} required maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="h-11 min-w-0 flex-1 px-3 outline-none" placeholder="my-center" />
              </div>
              <span className="mt-1 block text-xs font-normal text-slate-400">{isRtl ? "استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطة فقط." : "Use lowercase English letters, numbers and hyphens only."}</span>
            </label>
          </section>

          <section className="border-t border-slate-100 pt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-800">{isRtl ? "3. تأكيد البريد الإلكتروني" : "3. Verify your email"}</h2>
                <p className="mt-1 text-xs text-slate-500">{user.email}</p>
              </div>
              <Mail className="h-5 w-5 text-[#1769AA]" />
            </div>
            {!otpSent ? (
              <button type="button" onClick={sendOtp} disabled={sendingOtp} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#1769AA] px-5 text-sm font-bold text-[#1769AA] disabled:opacity-50">
                {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {isRtl ? "إرسال رمز التحقق" : "Send verification code"}
              </button>
            ) : (
              <div className="max-w-xs">
                <label className="text-sm font-semibold text-slate-700">{isRtl ? "رمز التحقق (6 أرقام)" : "Verification code (6 digits)"}
                  <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-center text-xl tracking-[.4em] outline-none focus:border-[#1769AA]" />
                </label>
              </div>
            )}
          </section>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

          <button type="submit" disabled={creating || !otpSent || !planId} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1769AA] px-6 text-sm font-extrabold text-white transition hover:bg-[#12598F] disabled:cursor-not-allowed disabled:opacity-50">
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRtl ? "إنشاء المركز" : "Create center"}
          </button>
          <p className="text-center text-[11px] leading-5 text-slate-400">{isRtl ? "سيتم إنشاء مركز مستقل. لا يمكن للمراكز الأخرى الوصول إلى مرضاه أو سجلاته." : "A separate tenant will be created. Other centers cannot access its patients or records."}</p>
        </form>
      </div>
    </main>
  );
}
