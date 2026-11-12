"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Building, CheckCircle2, ArrowLeft, Loader2, Check, Star } from "lucide-react";

type CenterCountry = { code: string; dial: string; flag: string; ar: string; en: string; example: string };

const CENTER_COUNTRIES: CenterCountry[] = [
  { code: "EG", dial: "20", flag: "🇪🇬", ar: "مصر", en: "Egypt", example: "10 1234 5678" },
  { code: "SA", dial: "966", flag: "🇸🇦", ar: "السعودية", en: "Saudi Arabia", example: "5X XXX XXXX" },
  { code: "AE", dial: "971", flag: "🇦🇪", ar: "الإمارات", en: "United Arab Emirates", example: "50 123 4567" },
  { code: "KW", dial: "965", flag: "🇰🇼", ar: "الكويت", en: "Kuwait", example: "5XXX XXXX" },
  { code: "QA", dial: "974", flag: "🇶🇦", ar: "قطر", en: "Qatar", example: "33XX XXXX" },
  { code: "BH", dial: "973", flag: "🇧🇭", ar: "البحرين", en: "Bahrain", example: "3XXX XXXX" },
  { code: "OM", dial: "968", flag: "🇴🇲", ar: "عُمان", en: "Oman", example: "9XXX XXXX" },
  { code: "JO", dial: "962", flag: "🇯🇴", ar: "الأردن", en: "Jordan", example: "7X XXX XXXX" },
  { code: "LB", dial: "961", flag: "🇱🇧", ar: "لبنان", en: "Lebanon", example: "XX XXX XXX" },
  { code: "IQ", dial: "964", flag: "🇮🇶", ar: "العراق", en: "Iraq", example: "7XX XXX XXXX" },
  { code: "PS", dial: "970", flag: "🇵🇸", ar: "فلسطين", en: "Palestine", example: "59 XXX XXXX" },
  { code: "YE", dial: "967", flag: "🇾🇪", ar: "اليمن", en: "Yemen", example: "7XX XXX XXX" },
  { code: "MA", dial: "212", flag: "🇲🇦", ar: "المغرب", en: "Morocco", example: "6XX XXX XXX" },
  { code: "DZ", dial: "213", flag: "🇩🇿", ar: "الجزائر", en: "Algeria", example: "5XX XX XX XX" },
  { code: "TN", dial: "216", flag: "🇹🇳", ar: "تونس", en: "Tunisia", example: "XX XXX XXX" },
  { code: "LY", dial: "218", flag: "🇱🇾", ar: "ليبيا", en: "Libya", example: "91 XXX XXXX" },
  { code: "SD", dial: "249", flag: "🇸🇩", ar: "السودان", en: "Sudan", example: "9X XXX XXXX" },
  { code: "US", dial: "1", flag: "🇺🇸", ar: "الولايات المتحدة", en: "United States", example: "201 555 0123" },
  { code: "CA", dial: "1", flag: "🇨🇦", ar: "كندا", en: "Canada", example: "204 234 5678" },
  { code: "GB", dial: "44", flag: "🇬🇧", ar: "المملكة المتحدة", en: "United Kingdom", example: "7XXX XXXXXX" },
  { code: "DE", dial: "49", flag: "🇩🇪", en: "Germany", ar: "ألمانيا", example: "1512 3456789" },
  { code: "FR", dial: "33", flag: "🇫🇷", en: "France", ar: "فرنسا", example: "6 12 34 56 78" },
  { code: "IT", dial: "39", flag: "🇮🇹", en: "Italy", ar: "إيطاليا", example: "312 345 6789" },
  { code: "ES", dial: "34", flag: "🇪🇸", en: "Spain", ar: "إسبانيا", example: "612 345 678" },
  { code: "TR", dial: "90", flag: "🇹🇷", en: "Türkiye", ar: "تركيا", example: "501 234 5678" },
  { code: "IN", dial: "91", flag: "🇮🇳", en: "India", ar: "الهند", example: "98765 43210" },
  { code: "PK", dial: "92", flag: "🇵🇰", en: "Pakistan", ar: "باكستان", example: "301 2345678" },
  { code: "BD", dial: "880", flag: "🇧🇩", en: "Bangladesh", ar: "بنغلاديش", example: "1812 345678" },
  { code: "MY", dial: "60", flag: "🇲🇾", en: "Malaysia", ar: "ماليزيا", example: "12 345 6789" },
  { code: "ID", dial: "62", flag: "🇮🇩", en: "Indonesia", ar: "إندونيسيا", example: "812 3456 7890" },
  { code: "AU", dial: "61", flag: "🇦🇺", en: "Australia", ar: "أستراليا", example: "4XX XXX XXX" },
  { code: "ZA", dial: "27", flag: "🇿🇦", en: "South Africa", ar: "جنوب أفريقيا", example: "XX XXX XXXX" },
  { code: "BR", dial: "55", flag: "🇧🇷", en: "Brazil", ar: "البرازيل", example: "11 91234 5678" },
  { code: "JP", dial: "81", flag: "🇯🇵", en: "Japan", ar: "اليابان", example: "90 1234 5678" },
  { code: "CN", dial: "86", flag: "🇨🇳", en: "China", ar: "الصين", example: "131 2345 6789" },
  { code: "RU", dial: "7", flag: "🇷🇺", en: "Russia", ar: "روسيا", example: "912 345-67-89" },
];

const plans = [
  {
    id: "basic",
    nameAr: "الأساسية",
    nameEn: "Basic",
    price: "0",
    priceLabelAr: "مجانًا",
    priceLabelEn: "Free",
    descriptionAr: "بداية مجانية لتنظيم مركزك.",
    descriptionEn: "A free starting point for a small clinic.",
    featuresAr: ["إدارة حتى 50 مريضًا", "حتى 100 جلسة شهريًا", "إدارة ملفات المرضى", "جدولة المواعيد", "تقارير أساسية"],
    featuresEn: ["Up to 50 patients", "Up to 100 sessions per month", "Patient records management", "Appointment scheduling", "Basic reports"],
    popular: false,
  },
  {
    id: "silver",
    nameAr: "الفضية",
    nameEn: "Silver",
    price: "1000",
    priceLabelAr: "1,000 جنيه",
    priceLabelEn: "EGP 1,000",
    descriptionAr: "للمراكز التي تحتاج إلى سعة وأدوات إضافية.",
    descriptionEn: "For clinics that need more capacity and tools.",
    featuresAr: ["إدارة حتى 200 مريض", "حتى 500 جلسة شهريًا", "إدارة الجلسات العلاجية", "تقارير مالية", "دعم فني", "تشمل مميزات الباقة الأساسية"],
    featuresEn: ["Up to 200 patients", "Up to 500 sessions per month", "Treatment session management", "Financial reports", "Technical support", "Includes Basic plan features"],
    popular: true,
  },
  {
    id: "gold",
    nameAr: "الذهبية",
    nameEn: "Gold",
    price: "1500",
    priceLabelAr: "1,500 جنيه",
    priceLabelEn: "EGP 1,500",
    descriptionAr: "للمراكز التي تحتاج إلى سعة تشغيلية أكبر.",
    descriptionEn: "For clinics that need higher operating capacity.",
    featuresAr: ["عدد غير محدود من المرضى", "جلسات غير محدودة شهريًا", "إدارة التمارين الرياضية", "روشتات علاجية", "تشمل مميزات الباقة الفضية"],
    featuresEn: ["Unlimited patients", "Unlimited sessions per month", "Exercise management", "Treatment prescriptions", "Includes Silver plan features"],
    popular: false,
  },
];

export default function CreateCenterPage() {
  const { user, isLoading, isEnriching } = useAuth();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [planId, setPlanId] = useState("basic");
  const [step, setStep] = useState<"plan" | "details">("plan");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("EG");
  const selectedCountry = CENTER_COUNTRIES.find((country) => country.code === countryCode) ?? CENTER_COUNTRIES[0];
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
  const [createdCenterName, setCreatedCenterName] = useState("");
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
          phone: `+${selectedCountry.dial}${phone.trim().replace(/[^0-9]/g, "").replace(/^0+/, "")}`,
          address: address.trim(),
          logoUrl: uploadedLogo?.url || null,
          logoPath: uploadedLogo?.path || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.clinicId) {
        throw new Error(data.error || "Center creation failed");
      }

      if (planId === "basic") {
        const subscribeResponse = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinicId: data.clinicId, planId: "basic" }),
        });
        const subscribeData = await subscribeResponse.json().catch(() => ({}));
        if (!subscribeResponse.ok) throw new Error(subscribeData.error || "The center was created, but the free plan could not be activated.");
        await activateCenterSession(data.clinicId);
        setCreatedCenterName(shortName.trim());
        setCreatedSlug(data.slug);
        setCenterCreated(true);
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
    return <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]"><Loader2 className="h-8 w-8 animate-spin text-[#0B4C96]" /></main>;
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
            <Link href={`/${createdSlug}`} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#0B4C96] text-sm font-bold text-white">{isRtl ? "الانتقال إلى المركز" : "Open center"}</Link>
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
          <p className="mt-2 text-base font-bold text-slate-800">{createdCenterName}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{isRtl ? "أصبح للمركز رابط دخول مستقل يمكنك مشاركته مع فريق العمل." : "Your center now has its own login link that you can share with your team."}</p>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left" dir="ltr">
            <p className="break-all text-sm font-semibold text-[#4F46BA]">{centerUrl}</p>
          </div>
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(centerUrl); setLinkCopied(true); } catch { setLinkCopied(false); } }} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#0B4C96] font-bold text-[#0B4C96] transition hover:bg-[#F1EFFF]">{linkCopied ? (isRtl ? "تم نسخ الرابط" : "Link copied") : (isRtl ? "نسخ رابط المركز" : "Copy center link")}</button>
          <p className="mt-2 text-xs leading-5 text-slate-500">{isRtl ? "هذا الرابط يفتح صفحة تسجيل الدخول الخاصة بالمركز، وليس لوحة التحكم مباشرة." : "This link opens the center login page, not the dashboard directly."}</p>
          <Link href={`/${createdSlug}`} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#0B4C96] font-bold text-[#0B4C96] transition hover:bg-[#F1EFFF]">{isRtl ? "فتح صفحة دخول المركز" : "Open center login"}</Link>
          <Link href="/dashboard" className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0B4C96] font-bold text-white transition hover:bg-[#083B75]">{isRtl ? "الانتقال إلى لوحة التحكم" : "Continue to dashboard"}</Link>
          <Link href="/center-management" className="mt-4 inline-block text-sm font-semibold text-slate-500 hover:text-[#0B4C96]">{isRtl ? "العودة إلى إدارة المراكز" : "Back to center management"}</Link>
        </section>
      </main>
    );
  }

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-[calc(100dvh-4rem)] w-full max-w-none bg-slate-50/40 font-sans text-slate-800">
      <div className="flex min-h-[calc(100dvh-4rem)] w-full flex-col" dir={isRtl ? "rtl" : "ltr"}>
                <section className="relative flex min-h-[calc(100dvh-4rem)] w-full max-w-none flex-1 flex-col items-stretch bg-slate-50/40 px-3 py-3 sm:px-5 sm:py-4 lg:px-7 xl:px-8">
          <div className="relative z-10 flex w-full max-w-none min-w-0 flex-1 flex-col">
        <div className="mb-4 flex w-full justify-start" dir="ltr">
          <Link href="/center-management" dir={isRtl ? "rtl" : "ltr"} className="inline-flex items-center gap-2 text-sm font-bold text-[#4F46E5] transition-colors hover:text-[#7C3AED]"><ArrowLeft className="h-4 w-4" />{isRtl ? "العودة إلى إدارة المراكز" : "Back to center management"}</Link>
        </div>
        <div className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-4 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#4F46E5] sm:h-12 sm:w-12"><Building className="h-5 w-5 sm:h-6 sm:w-6" /></div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-2xl lg:text-[1.7rem]">{isRtl ? "إنشاء مركز مستقل جديد" : "Create a new independent center"}</h1>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500 sm:text-sm">{isRtl ? "كل مركز يحصل على رابط دخول وبيانات واشتراك منفصل." : "Every center gets its own login URL, data and subscription."}</p>
          </div>
        </div>

        <form onSubmit={createCenter} className="flex w-full flex-1 flex-col gap-5 sm:gap-6">
          {step === "plan" && <>
          <section className="flex w-full flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900 sm:text-2xl">{isRtl ? "1. اختر الباقة" : "1. Choose a plan"}</h2>
                <p className="mt-1 text-sm text-slate-500">{isRtl ? "أسعار واضحة وبسيطة — اختر الباقة المناسبة لمركزك." : "Simple, transparent pricing — choose the plan that fits your center."}</p>
              </div>
              <span className="hidden rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 sm:inline-flex">{isRtl ? "اختر باقة واحدة" : "Select one plan"}</span>
            </div>
            <div className="mx-auto grid w-full max-w-none grid-cols-1 items-stretch gap-5 md:grid-cols-3 xl:gap-7">
              {plans.map((plan) => {
                const selected = planId === plan.id;
                const features = isRtl ? plan.featuresAr : plan.featuresEn;
                return (
                  <button key={plan.id} type="button" aria-pressed={selected} onClick={() => setPlanId(plan.id)} className={`relative flex h-full min-h-[340px] flex-col rounded-3xl bg-white p-5 text-start transition-all duration-200 sm:p-6 lg:p-7 ${selected ? "border-2 border-[#4F46E5] shadow-xl shadow-indigo-500/10" : "my-1 border border-slate-200 shadow-sm hover:border-slate-300"} hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2`}>
                    {plan.popular && <span className="absolute -top-3.5 left-0 right-0 mx-auto flex w-fit items-center gap-1 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-4 py-1.5 text-xs font-bold text-white"><Star className="h-3 w-3 fill-white" />{isRtl ? "الأكثر طلبًا" : "Most popular"}</span>}
                    <div className="mb-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{isRtl ? plan.nameAr : plan.nameEn}</h3>
                        {selected && <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white"><Check className="h-4 w-4" /></span>}
                      </div>
                      <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">{isRtl ? plan.descriptionAr : plan.descriptionEn}</p>
                    </div>
                    <div className="mb-6 flex flex-wrap items-baseline gap-2 border-b border-slate-100 pb-5">
                      <span className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{isRtl ? plan.priceLabelAr : plan.priceLabelEn}</span>
                      {plan.id !== "basic" && <span className="text-sm font-semibold text-slate-500">{isRtl ? "/ شهريًا" : "/ month"}</span>}
                    </div>
                    <ul className="mb-6 flex-1 space-y-3">
                      {features.map((feature) => <li key={feature} className="flex items-start gap-3"><Check className={`mt-0.5 h-5 w-5 shrink-0 ${plan.popular ? "text-[#4F46E5]" : "text-slate-400"}`} /><span className="text-sm font-medium leading-6 text-slate-700">{feature}</span></li>)}
                    </ul>
                    <span className={`mt-auto inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-bold transition-all ${selected ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}`}>{selected ? (isRtl ? "تم اختيار هذه الباقة" : "Selected plan") : (isRtl ? "اختيار الباقة" : "Choose plan")}</span>
                  </button>
                );
              })}
            </div>
          </section>


            <button type="button" disabled={!planId} onClick={() => { setError(""); setStep("details"); }} className="inline-flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-8 text-base font-extrabold text-white shadow-md shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:from-[#4338CA] hover:to-[#6D28D9] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50">{isRtl ? "متابعة إلى بيانات المركز" : "Continue to center details"}</button>
          </>}
          {step === "details" && <>
            <button type="button" onClick={() => setStep("plan")} className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B4C96]"><ArrowLeft className="h-4 w-4" />{isRtl ? "العودة لاختيار الباقة" : "Back to plan selection"}</button>
          <section className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-lg hover:shadow-slate-200/50 sm:p-7 lg:p-8">
            <h2 className="mb-5 text-lg font-black text-slate-900 sm:text-xl">{isRtl ? "2. بيانات المركز" : "2. Center details"}</h2>
            <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-800">{isRtl ? "تم التحقق من بريد حساب المالك أثناء إنشاء الحساب. يمكنك الآن إعداد مركزك." : "Your owner email was verified during account creation. You can now set up your center."}</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                {isRtl ? "اسم المركز المختصر" : "Center display name"}
                <input value={shortName} onChange={(e) => setShortName(e.target.value)} required maxLength={120} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#0B4C96]" placeholder={isRtl ? "مثال: برايم للعلاج الطبيعي" : "e.g. Prime Physiotherapy"} />
                <span className="mt-1 block text-xs font-normal text-slate-500">{isRtl ? "الاسم المختصر الذي سيظهر في واجهة المركز." : "The short name displayed across the center interface."}</span>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                {isRtl ? "الاسم الكامل أو الرسمي (اختياري)" : "Full / official name (optional)"}
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={200} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#0B4C96]" placeholder={isRtl ? "الاسم القانوني أو الاسم الكامل للمركز" : "Legal or complete center name"} />
                <span className="mt-1 block text-xs font-normal text-slate-500">{isRtl ? "اتركه فارغًا إذا كان اسم المركز المختصر كافيًا." : "Leave blank if the center display name is sufficient."}</span>
              </label>
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              {isRtl ? "رابط المركز الخاص" : "Unique center URL"}
              <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-[#0B4C96]" dir="ltr">
                <span className="flex items-center bg-slate-50 px-3 text-xs text-slate-500">primephysio.vercel.app/</span>
                <input value={slug} onChange={(e) => setSlug(normalizeSlug(e.target.value))} required maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="h-11 min-w-0 flex-1 px-3 outline-none" placeholder="my-center" />
              </div>
              <span className="mt-1 block text-xs font-normal text-slate-400">{isRtl ? "استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطة فقط. الرابط يفتح صفحة تسجيل دخول المركز." : "Use lowercase English letters, numbers and hyphens only. This URL opens the center login page."}</span>
            </label>
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {isRtl ? "شعار أو صورة المركز (اختياري)" : "Center logo or image (optional)"}
            </label>
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center">
              {logoPreview ? (
                <img src={logoPreview} alt={isRtl ? "معاينة شعار المركز" : "Center logo preview"} className="h-24 w-24 rounded-xl border border-slate-200 bg-white object-contain p-2" />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-white text-[#0B4C96]"><Building className="h-9 w-9" /></div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">{isRtl ? "أضف شعار المركز ليظهر في صفحته" : "Add a logo to display on your center page"}</p>
                <p className="mt-1 text-xs text-slate-500">{isRtl ? "PNG أو JPG أو WebP — بحد أقصى 5 ميجابايت." : "PNG, JPG or WebP — up to 5 MB."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full bg-[#0B4C96] px-4 text-xs font-bold text-white hover:bg-[#083B75]">
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
                <div className="mt-2 flex h-11 overflow-hidden rounded-xl border border-slate-200 focus-within:border-[#0B4C96]" dir="ltr">
                  <div className="relative flex w-[116px] shrink-0 items-center gap-2 border-r border-slate-200 bg-slate-50 px-3">
                    <span aria-hidden="true">{selectedCountry.flag}</span>
                    <span className="text-sm font-semibold text-slate-700">+{selectedCountry.dial}</span>
                    <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} aria-label={isRtl ? "اختر دولة هاتف المركز" : "Select center phone country"} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                      {CENTER_COUNTRIES.map((country) => <option key={country.code} value={country.code}>+{country.dial} · {isRtl ? country.ar : country.en}</option>)}
                    </select>
                  </div>
                  <input value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^0-9]/g, ""))} required maxLength={18} type="tel" inputMode="tel" autoComplete="tel-national" className="min-w-0 flex-1 px-3 outline-none" placeholder={selectedCountry.example} />
                </div>
                <span className="mt-1 block text-xs font-normal text-slate-500">{isRtl ? "اختر الدولة أولًا، وسيُضاف مفتاحها الدولي تلقائيًا إلى الرقم." : "Choose the country first; its calling code will be added automatically."}</span>
              </label>
              <label className="block text-sm font-semibold text-slate-700">{isRtl ? "عنوان المركز" : "Center address"}
                <input value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={250} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#0B4C96]" placeholder={isRtl ? "المحافظة، المنطقة، الشارع" : "City, area, street"} />
              </label>
            </div>
            
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
            <button type="submit" disabled={creating || uploadingLogo} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0B4C96] px-6 text-sm font-extrabold text-white transition hover:bg-[#083B75] disabled:cursor-not-allowed disabled:opacity-50">
              {(creating || uploadingLogo) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRtl ? "إنشاء المركز" : "Create center"}
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
