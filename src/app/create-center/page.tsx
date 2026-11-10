"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Building, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

const plans = [
  { id: "basic", nameAr: "الأساسية", nameEn: "Basic", price: "0", priceLabelAr: "مجانًا", priceLabelEn: "Free", descriptionAr: "مجانية — لا تحتاج إلى بطاقة دفع", descriptionEn: "Free — no payment card required" },
  { id: "silver", nameAr: "الفضية", nameEn: "Silver", price: "1000", priceLabelAr: "1,000 جنيه / شهريًا", priceLabelEn: "EGP 1,000 / month", descriptionAr: "للمراكز النامية", descriptionEn: "For growing centers" },
  { id: "gold", nameAr: "الذهبية", nameEn: "Gold", price: "1500", priceLabelAr: "1,500 جنيه / شهريًا", priceLabelEn: "EGP 1,500 / month", descriptionAr: "للمراكز الكبيرة", descriptionEn: "For larger centers" },
];

export default function CreateCenterPage() {
  const { user, isLoading, isEnriching } = useAuth();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [planId, setPlanId] = useState("basic");
  const [step, setStep] = useState<"plan" | "details">("plan");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");
  const [centerCreated, setCenterCreated] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  const normalizeSlug = (value: string) =>
    value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const activateCenterSession = async (clinicId: string) => {
    sessionStorage.setItem("preferred_clinic_id", clinicId);
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
    setCreating(true);
    try {
      let uploadedLogo: { url: string; path: string } | null = null;
      if (logoFile) {
        setUploadingLogo(true);
        const formData = new FormData();
        formData.append("file", logoFile);
        const uploadResponse = await fetch("/api/centers/upload-logo", { method: "POST", body: formData });
        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok || !uploadData.success || !uploadData.url || !uploadData.path) {
          throw new Error(uploadData.error || (isRtl ? "تعذر رفع صورة المركز." : "Could not upload center logo."));
        }
        uploadedLogo = { url: uploadData.url, path: uploadData.path };
        setUploadingLogo(false);
      }
      const response = await fetch("/api/centers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          shortName: shortName.trim(),
          fullName: fullName.trim(),
          slug: normalizeSlug(slug),
          phone: phone.trim(),
          address: address.trim(),
          logoUrl: uploadedLogo?.url || null,
          logoPath: uploadedLogo?.path || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.clinicId) throw new Error(data.error || "Center creation failed");

      if (planId === "basic") {
        const subscribeResponse = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinicId: data.clinicId, planId: "basic" }),
        });
        const subscribeData = await subscribeResponse.json().catch(() => ({}));
        if (!subscribeResponse.ok) throw new Error(subscribeData.error || "The center was created, but the free plan could not be activated.");
        await activateCenterSession(data.clinicId);
        window.location.href = "/dashboard";
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
      setUploadingLogo(false);
      setCreating(false);
    }
  };

  if (isLoading || isEnriching || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]"><Loader2 className="h-8 w-8 animate-spin text-[#5B50C7]" /></main>;
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
            <Link href={`/${createdSlug}`} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#5B50C7] text-sm font-bold text-white">{isRtl ? "الانتقال إلى المركز" : "Open center"}</Link>
          </div>
        </div>
      </main>
    );
  }

  if (centerCreated && createdSlug) {
    const centerUrl = `${typeof window !== "undefined" ? window.location.origin : "https://primephysio.vercel.app"}/${createdSlug}`;
    return (
      <main dir={isRtl ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-10">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-9">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-9 w-9" /></div>
          <h1 className="text-2xl font-extrabold text-slate-900">{isRtl ? "تم إنشاء المركز بنجاح" : "Center created successfully"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{isRtl ? "أصبح للمركز رابط مستقل يمكنك مشاركته مع فريق العمل." : "Your center now has its own link that you can share with your team."}</p>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left" dir="ltr">
            <p className="break-all text-sm font-semibold text-[#4F46BA]">{centerUrl}</p>
          </div>
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(centerUrl); setLinkCopied(true); } catch { setLinkCopied(false); } }} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#5B50C7] font-bold text-[#5B50C7] transition hover:bg-[#F1EFFF]">{linkCopied ? (isRtl ? "تم نسخ الرابط" : "Link copied") : (isRtl ? "نسخ رابط المركز" : "Copy center link")}</button>
          <Link href={`/${createdSlug}`} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#5B50C7] font-bold text-white transition hover:bg-[#4338A8]">{isRtl ? "فتح صفحة المركز" : "Open center page"}</Link>
          <Link href="/center-management" className="mt-4 inline-block text-sm font-semibold text-slate-500 hover:text-[#5B50C7]">{isRtl ? "العودة إلى إدارة المراكز" : "Back to center management"}</Link>
        </section>
      </main>
    );
  }

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white font-sans text-slate-800">
      <div className="flex min-h-screen w-full flex-col lg:flex-row" dir={isRtl ? "rtl" : "ltr"}>
        <section className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:w-1/2 items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-[#4F46BA] opacity-95" />
          <div className="relative z-10 flex w-full max-w-lg flex-col items-center justify-center p-12 text-center text-white">
            <Link href="/" className="mb-10 transition-transform hover:scale-105">
              <img src="/logo.png" alt="Prime Physio" className="h-24 w-24 object-contain drop-shadow-2xl brightness-0 invert" />
            </Link>
            <h2 className="mb-6 text-4xl font-bold leading-tight">
              {isRtl ? "مستقبل إدارة عيادات" : "The Future of Clinic"}<br />
              <span className="text-indigo-400">{isRtl ? "العلاج الطبيعي" : "Management"}</span>
            </h2>
            <p className="mb-12 text-lg leading-relaxed text-slate-300">
              {isRtl
                ? "نظام متكامل يجمع بين السجلات الطبية، الإدارة المالية، وجدولة المواعيد في منصة واحدة سهلة الاستخدام."
                : "An integrated system combining EMR, billing, and scheduling in one easy-to-use platform."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium backdrop-blur">{isRtl ? "سجلات طبية" : "EMR"}</div>
              <div className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium backdrop-blur">{isRtl ? "إدارة المراكز" : "Center management"}</div>
              <div className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium backdrop-blur">{isRtl ? "مواعيد" : "Scheduling"}</div>
            </div>
          </div>
        </section>
        <section className="flex w-full flex-col items-center justify-center bg-[#F7F9FC] px-4 py-8 sm:px-6 lg:w-1/2">
          <div className="mx-auto w-full max-w-4xl">
        <Link href="/center-management" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#5B50C7]"><ArrowLeft className="h-4 w-4" />{isRtl ? "العودة إلى إدارة المراكز" : "Back to center management"}</Link>
        <div className="mb-7">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5B50C7] text-white"><Building className="h-6 w-6" /></div>
          <h1 className="text-2xl font-extrabold text-[#202B38]">{isRtl ? "إنشاء مركز مستقل جديد" : "Create a new independent center"}</h1>
          <p className="mt-2 text-sm text-[#7C8794]">{isRtl ? "كل مركز يحصل على رابط دخول وبيانات واشتراك منفصل." : "Every center gets its own login URL, data and subscription."}</p>
        </div>

        <form onSubmit={createCenter} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {step === "plan" && <>
          <section>
            <h2 className="mb-3 text-base font-extrabold text-slate-800">{isRtl ? "1. اختر الباقة" : "1. Choose a plan"}</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {plans.map((plan) => (
                <button key={plan.id} type="button" onClick={() => setPlanId(plan.id)} className={`rounded-2xl border p-4 text-start transition ${planId === plan.id ? "border-[#5B50C7] bg-[#F1EFFF] ring-2 ring-[#5B50C7]/15" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  {plan.id === "basic" && <span className="mb-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{isRtl ? "موصى بها — بدون بطاقة دفع" : "Recommended — no card required"}</span>}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-800">{isRtl ? plan.nameAr : plan.nameEn}</span>
                    {planId === plan.id && <CheckCircle2 className="h-5 w-5 text-[#5B50C7]" />}
                  </div>
                  <div className="mt-3 text-lg font-extrabold text-[#5B50C7]">{isRtl ? plan.priceLabelAr : plan.priceLabelEn}</div>
                  <p className="mt-1 text-xs text-slate-500">{isRtl ? plan.descriptionAr : plan.descriptionEn}</p>
                </button>
              ))}
            </div>
          </section>


            <button type="button" disabled={!planId} onClick={() => { setError(""); setStep("details"); }} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#5B50C7] px-6 text-sm font-extrabold text-white transition hover:bg-[#4338A8] disabled:cursor-not-allowed disabled:opacity-50">{isRtl ? "متابعة إلى بيانات المركز" : "Continue to center details"}</button>
          </>}
          {step === "details" && <>
            <button type="button" onClick={() => setStep("plan")} className="inline-flex items-center gap-2 text-sm font-semibold text-[#5B50C7]"><ArrowLeft className="h-4 w-4" />{isRtl ? "العودة لاختيار الباقة" : "Back to plan selection"}</button>
          <section className="border-t border-slate-100 pt-6">
            <h2 className="mb-4 text-base font-extrabold text-slate-800">{isRtl ? "2. بيانات المركز" : "2. Center details"}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                {isRtl ? "اسم المركز" : "Center name"}
                <input value={shortName} onChange={(e) => setShortName(e.target.value)} required maxLength={120} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#5B50C7]" placeholder={isRtl ? "مثال: مركز برايم للعلاج الطبيعي" : "e.g. Prime Physiotherapy Center"} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                {isRtl ? "الاسم الكامل (اختياري)" : "Full name (optional)"}
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={200} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#5B50C7]" placeholder={isRtl ? "الاسم الظاهر في صفحة الدخول" : "Name shown on the login page"} />
              </label>
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              {isRtl ? "رابط المركز الخاص" : "Unique center URL"}
              <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-[#5B50C7]" dir="ltr">
                <span className="flex items-center bg-slate-50 px-3 text-xs text-slate-500">primephysio.vercel.app/</span>
                <input value={slug} onChange={(e) => setSlug(normalizeSlug(e.target.value))} required maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="h-11 min-w-0 flex-1 px-3 outline-none" placeholder="my-center" />
              </div>
              <span className="mt-1 block text-xs font-normal text-slate-400">{isRtl ? "استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطة فقط." : "Use lowercase English letters, numbers and hyphens only."}</span>
            </label>
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {isRtl ? "شعار أو صورة المركز (اختياري)" : "Center logo or image (optional)"}
            </label>
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center">
              {logoPreview ? (
                <img src={logoPreview} alt={isRtl ? "معاينة شعار المركز" : "Center logo preview"} className="h-24 w-24 rounded-xl border border-slate-200 bg-white object-contain p-2" />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-white text-[#5B50C7]"><Building className="h-9 w-9" /></div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">{isRtl ? "أضف شعار المركز ليظهر في صفحته" : "Add a logo to display on your center page"}</p>
                <p className="mt-1 text-xs text-slate-500">{isRtl ? "PNG أو JPG أو WebP — بحد أقصى 5 ميجابايت." : "PNG, JPG or WebP — up to 5 MB."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full bg-[#5B50C7] px-4 text-xs font-bold text-white hover:bg-[#4338A8]">
                    {isRtl ? (logoFile ? "تغيير الصورة" : "اختيار صورة") : (logoFile ? "Change image" : "Choose image")}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type.toLowerCase())) {
                        setError(isRtl ? "اختر صورة PNG أو JPG أو WebP." : "Choose a PNG, JPG, or WebP image.");
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setError(isRtl ? "حجم الصورة يجب ألا يتجاوز 5 ميجابايت." : "Image size must not exceed 5 MB.");
                        return;
                      }
                      setError("");
                      setLogoFile(file);
                      setLogoPreview(URL.createObjectURL(file));
                    }} />
                  </label>
                  {logoFile && <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(""); }} className="h-9 rounded-full border border-slate-300 px-4 text-xs font-bold text-slate-600">{isRtl ? "إزالة الصورة" : "Remove image"}</button>}
                </div>
              </div>
            </div>
          </div>
          </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">{isRtl ? "رقم هاتف المركز" : "Center phone"}
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={32} type="tel" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#5B50C7]" placeholder="+20 10 1234 5678" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">{isRtl ? "عنوان المركز" : "Center address"}
                <input value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={250} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#5B50C7]" placeholder={isRtl ? "المحافظة، المنطقة، الشارع" : "City, area, street"} />
              </label>
            </div>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
            <button type="submit" disabled={creating || uploadingLogo} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#5B50C7] px-6 text-sm font-extrabold text-white transition hover:bg-[#4338A8] disabled:cursor-not-allowed disabled:opacity-50">
              {(creating || uploadingLogo) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRtl ? "إنشاء المركز وفتح لوحة التحكم" : "Create center and open dashboard"}
            </button>
            <p className="text-center text-[11px] leading-5 text-slate-400">{isRtl ? "سيتم إنشاء مركز مستقل. لا يمكن للمراكز الأخرى الوصول إلى مرضاه أو سجلاته." : "A separate tenant will be created. Other centers cannot access its patients or records."}</p>
          </>}
        </form>
          </div>
        </section>
      </div>
    </main>
  );
}
