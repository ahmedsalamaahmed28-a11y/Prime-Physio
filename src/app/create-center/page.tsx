"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Building, CheckCircle2, ArrowLeft, Loader2, ChevronDown, LayoutDashboard, Download, User, CreditCard, Bell, HelpCircle, Sparkles, Menu as MenuIcon, X } from "lucide-react";

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
  { id: "basic", nameAr: "الأساسية", nameEn: "Basic", price: "0", priceLabelAr: "مجانًا", priceLabelEn: "Free", descriptionAr: "مجانية — لا تحتاج إلى بطاقة دفع", descriptionEn: "Free — no payment card required" },
  { id: "silver", nameAr: "الفضية", nameEn: "Silver", price: "1000", priceLabelAr: "1,000 جنيه / شهريًا", priceLabelEn: "EGP 1,000 / month", descriptionAr: "للمراكز النامية", descriptionEn: "For growing centers" },
  { id: "gold", nameAr: "الذهبية", nameEn: "Gold", price: "1500", priceLabelAr: "1,500 جنيه / شهريًا", priceLabelEn: "EGP 1,500 / month", descriptionAr: "للمراكز الكبيرة", descriptionEn: "For larger centers" },
];

export default function CreateCenterPage() {
  const { user, isLoading, isEnriching } = useAuth();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [planId, setPlanId] = useState("basic");
  const [step, setStep] = useState<"plan" | "details">("details");
  const [showMore, setShowMore] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState("EG");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("EG");
  const selectedCountry = CENTER_COUNTRIES.find((country) => country.code === countryCode) ?? CENTER_COUNTRIES[0];
  const selectedPhoneCountry = CENTER_COUNTRIES.find((country) => country.code === phoneCountryCode) ?? CENTER_COUNTRIES[0];
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarMenu = [
    { label: "نظرة عامة", en: "Overview", href: "/center-management", icon: LayoutDashboard },
    { label: "مراكزي", en: "My Centers", href: "/center-management", icon: Building },
    { label: "التصدير الكامل للبيانات", en: "Full data export", href: "/center-management#export", icon: Download },
    { label: "الحساب والاشتراك", en: "Account & subscription", href: "/subscription", icon: User },
    { label: "الباقات", en: "Plans", href: "/plans", icon: CreditCard },
    { label: "الإشعارات", en: "Notifications", href: "/notifications", icon: Bell },
  ];
  const sidebar = (
    <>
      <Link href="/home.php" onClick={() => setMobileMenuOpen(false)} className="mb-[26px] flex h-[42px] w-full items-center justify-start gap-[9px] px-[2px]">
        <span className="text-[21px] font-black tracking-tight text-[#153B60]">Prime<span className="text-[#5B50C7]">Physio</span></span>
        <span className="flex h-[35px] w-[35px] items-center justify-center rounded-[9px] bg-[#5B50C7] text-white"><Building className="h-[21px] w-[21px]" /></span>
      </Link>
      <nav className="space-y-[2px]">
        {sidebarMenu.map((item, index) => {
          const Icon = item.icon;
          return <Link key={`${item.href}-${index}`} href={item.href} onClick={() => setMobileMenuOpen(false)} className={`flex h-[44px] w-full items-center gap-[12px] rounded-[9px] px-[14px] text-[14px] font-semibold transition-colors ${index === 0 ? "bg-[#F1EFFF] text-[#5B50C7]" : "text-[#59616B] hover:bg-[#F7F9FB] hover:text-[#5B50C7]"}`}><Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} /><span className="flex-1 text-right">{isRtl ? item.label : item.en}</span></Link>;
        })}
      </nav>
      <div className="mt-auto space-y-[2px] border-t border-[#EEF0F2] pt-[15px]">
        <Link href="/support" onClick={() => setMobileMenuOpen(false)} className="flex h-[42px] items-center gap-[12px] rounded-[9px] px-[14px] text-[14px] font-semibold text-[#737B85] hover:bg-[#F7F9FB]"><HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.9} /><span>{isRtl ? "مركز المساعدة" : "Help Center"}</span></Link>
        <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="flex h-[42px] items-center gap-[12px] rounded-[9px] px-[14px] text-[14px] font-semibold text-[#737B85] hover:bg-[#F7F9FB]"><Sparkles className="h-[18px] w-[18px]" strokeWidth={1.9} /><span>{isRtl ? "الجديد" : "What's New"}</span></Link>
      </div>
    </>
  );

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
    if (!fullName.trim()) {
      setError(isRtl ? "يرجى إدخال اسم المركز." : "Please enter the center name.");
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
          shortName: shortName.trim() || fullName.trim(),
          fullName: fullName.trim(),
          slug: normalizeSlug(slug),
          countryCode: selectedCountry.code,
          country: isRtl ? selectedCountry.ar : selectedCountry.en,
          phone: phone.trim() ? `+${selectedPhoneCountry.dial}${phone.trim().replace(/[^0-9]/g, "").replace(/^0+/, "")}` : "",
          address: "",
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
        setCreatedCenterName(shortName.trim() || fullName.trim());
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
          <p className="mt-2 text-base font-bold text-slate-800">{createdCenterName}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{isRtl ? "أصبح للمركز رابط دخول مستقل يمكنك مشاركته مع فريق العمل." : "Your center now has its own login link that you can share with your team."}</p>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left" dir="ltr">
            <p className="break-all text-sm font-semibold text-[#4F46BA]">{centerUrl}</p>
          </div>
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(centerUrl); setLinkCopied(true); } catch { setLinkCopied(false); } }} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#5B50C7] font-bold text-[#5B50C7] transition hover:bg-[#F1EFFF]">{linkCopied ? (isRtl ? "تم نسخ الرابط" : "Link copied") : (isRtl ? "نسخ رابط المركز" : "Copy center link")}</button>
          <p className="mt-2 text-xs leading-5 text-slate-500">{isRtl ? "هذا الرابط يفتح صفحة تسجيل الدخول الخاصة بالمركز، وليس لوحة التحكم مباشرة." : "This link opens the center login page, not the dashboard directly."}</p>
          <Link href={`/${createdSlug}`} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#5B50C7] font-bold text-[#5B50C7] transition hover:bg-[#F1EFFF]">{isRtl ? "فتح صفحة دخول المركز" : "Open center login"}</Link>
          <Link href="/dashboard" className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#5B50C7] font-bold text-white transition hover:bg-[#4338A8]">{isRtl ? "الانتقال إلى لوحة التحكم" : "Continue to dashboard"}</Link>
          <Link href="/center-management" className="mt-4 inline-block text-sm font-semibold text-slate-500 hover:text-[#5B50C7]">{isRtl ? "العودة إلى إدارة المراكز" : "Back to center management"}</Link>
        </section>
      </main>
    );
  }

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen w-full bg-[#F7F9FC] font-sans text-slate-800">
      <div className="flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-[290px] shrink-0 flex-col border-l border-[#E8EBEF] bg-white px-[12px] pb-[18px] pt-[16px] lg:flex">{sidebar}</aside>
        {mobileMenuOpen && <div className="fixed inset-0 z-[90] flex lg:hidden">
          <button aria-label={isRtl ? "إغلاق القائمة" : "Close menu"} onClick={() => setMobileMenuOpen(false)} className="absolute inset-0 bg-black/25" />
          <aside className="relative z-10 flex h-full w-[290px] max-w-[85vw] flex-col border-l border-[#E8EBEF] bg-white px-[12px] pb-[18px] pt-[16px] shadow-xl">
            <button onClick={() => setMobileMenuOpen(false)} aria-label="Close" className="mb-3 self-start rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>}
        <section className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="flex min-h-[64px] shrink-0 items-center border-b border-[#E8EBEF] bg-white px-4 lg:hidden">
            <button onClick={() => setMobileMenuOpen(true)} className="inline-flex items-center gap-2 rounded-lg p-2 text-[#5B50C7] hover:bg-[#F1EFFF]" aria-label={isRtl ? "فتح القائمة" : "Open menu"}><MenuIcon className="h-5 w-5" /><span className="text-sm font-bold">{isRtl ? "القائمة" : "Menu"}</span></button>
          </header>
          <div className="flex w-full flex-1 flex-col items-center px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">
        <Link href="/center-management" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#5B50C7]"><ArrowLeft className="h-4 w-4" />{isRtl ? "العودة إلى إدارة المراكز" : "Back to center management"}</Link>
        <div className="mb-7">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5B50C7] text-white"><Building className="h-6 w-6" /></div>
          <h1 className="text-2xl font-extrabold text-[#202B38]">{isRtl ? "إنشاء مركز مستقل جديد" : "Create a new independent center"}</h1>
          <p className="mt-2 text-sm text-[#7C8794]">{isRtl ? "كل مركز يحصل على رابط دخول وبيانات واشتراك منفصل." : "Every center gets its own login URL, data and subscription."}</p>
        </div>

        <form onSubmit={createCenter} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <h2 className="md:col-span-2 mb-1 text-base font-extrabold text-slate-800">{isRtl ? "بيانات المركز" : "Center details"}</h2>
            <label className="block min-w-0 text-sm font-semibold text-slate-700">
              {isRtl ? "اسم المركز" : "Center name"}
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={200} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 outline-none transition focus:border-[#5B50C7] focus:ring-4 focus:ring-[#5B50C7]/10" placeholder={isRtl ? "اكتب اسم المركز" : "Enter center name"} />
            </label>
            <label className="block min-w-0 text-sm font-semibold text-slate-700">
              {isRtl ? "الدولة" : "Country"}
              <div className="relative mt-2 flex h-[46px] min-h-[46px] items-center overflow-hidden rounded-xl border-[1.5px] border-[#D9E1EA] bg-white px-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 hover:border-[#B8C5D3] focus-within:border-[#5B50C7] focus-within:ring-4 focus-within:ring-[#5B50C7]/10">
                <img src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`} alt="" aria-hidden="true" width="28" height="20" className="pointer-events-none h-4 w-6 object-contain" />
                <span className="min-w-0 flex-1 px-3 text-[15px] font-semibold text-slate-700">{isRtl ? selectedCountry.ar : selectedCountry.en}</span>
                <ChevronDown className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" aria-hidden="true" />
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} aria-label={isRtl ? "دولة المركز" : "Center country"} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                  {CENTER_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} {isRtl ? country.ar : country.en}</option>)}
                </select>
              </div>
            </label>
            <label className="block min-w-0 text-sm font-semibold text-slate-700 md:col-span-2">
              {isRtl ? "رابط المركز" : "Center URL"}
              <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 transition focus-within:border-[#5B50C7] focus-within:ring-4 focus-within:ring-[#5B50C7]/10" dir="ltr">
                <span className="flex shrink-0 items-center bg-slate-50 px-3 text-xs text-slate-500 sm:text-sm">primephysio.vercel.app/</span>
                <input value={slug} onChange={(e) => setSlug(normalizeSlug(e.target.value))} required maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="h-12 min-w-0 flex-1 px-3 text-sm outline-none" placeholder="my-center" />
              </div>
              <span className="mt-1 block text-xs font-normal text-slate-400">{isRtl ? "استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطة فقط." : "Use lowercase English letters, numbers and hyphens only."}</span>
            </label>
          </section>

          <section className="border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setShowMore((value) => !value)} aria-expanded={showMore} className="flex w-full items-center justify-between rounded-xl py-2 text-sm font-bold text-[#5B50C7] transition hover:text-[#4338A8]">
              <span>{isRtl ? "أضف المزيد الآن" : "Add more now"}</span>
              <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${showMore ? "rotate-180" : ""}`} />
            </button>
            {showMore && <div dir="ltr" className="mt-4 grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-top-2 duration-200 md:grid-cols-2 md:grid-rows-2">
              <label dir={isRtl ? "rtl" : "ltr"} className="block min-w-0 text-sm font-semibold text-slate-700 md:col-start-2 md:row-start-1">
                {isRtl ? "الاسم المختصر" : "Short name"}
                <input value={shortName} onChange={(e) => setShortName(e.target.value)} maxLength={120} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-[#5B50C7]" placeholder={isRtl ? "اسم مختصر يظهر داخل المنصة" : "A short name shown in the platform"} />
              </label>

              <div className="min-w-0 md:col-start-1 md:row-span-2 md:row-start-1">
                <label className="mb-2 block text-sm font-semibold text-slate-700">{isRtl ? "الشعار" : "Logo"}</label>
                <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center">
                  {logoPreview ? (
                    <img src={logoPreview} alt={isRtl ? "معاينة شعار المركز" : "Center logo preview"} className="h-24 w-24 rounded-xl border border-slate-200 bg-white object-contain p-2" />
                  ) : (
                    <img src="/logo.png" alt="Prime Physio" className="h-24 w-24 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-2" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">{isRtl ? "الشعار الافتراضي هو شعار Prime Physio" : "The default logo is the Prime Physio logo"}</p>
                    <p className="mt-1 text-xs text-slate-500">{isRtl ? "يمكنك اختيار شعار آخر بصيغة PNG أو JPG أو WebP حتى 5 ميجابايت." : "Choose another PNG, JPG or WebP logo up to 5 MB."}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full bg-[#5B50C7] px-4 text-xs font-bold text-white hover:bg-[#4338A8]">
                        {isRtl ? (logoFile ? "اختيار ملف آخر" : "Choose file") : (logoFile ? "Choose another file" : "Choose file")}
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
                      {logoFile && <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(""); }} className="h-9 rounded-full border border-[#5B50C7] bg-white px-4 text-xs font-bold text-[#5B50C7] transition hover:bg-[#F1EFFF]">{isRtl ? "إزالة الصورة" : "Remove image"}</button>}
                    </div>
                  </div>
                </div>
              </div>

              <label dir={isRtl ? "rtl" : "ltr"} className="block min-w-0 text-sm font-semibold text-slate-700 md:col-start-2 md:row-start-2">{isRtl ? "الهاتف" : "Phone"}
                <div className="mt-2 flex h-[46px] min-h-[46px] min-w-0 items-center overflow-hidden rounded-xl border-[1.5px] border-[#D9E1EA] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 hover:border-[#B8C5D3] focus-within:border-[#5B50C7] focus-within:ring-4 focus-within:ring-[#5B50C7]/10" dir="ltr">
                  <div className="relative flex h-full w-[60px] shrink-0 items-center justify-center gap-1 bg-transparent">
                    <label htmlFor="center-phone-country" className="sr-only">{isRtl ? "اختيار الدولة" : "Select country"}</label>
                    <img src={`https://flagcdn.com/w40/${selectedPhoneCountry.code.toLowerCase()}.png`} alt="" aria-hidden="true" width="28" height="20" className="pointer-events-none h-3.5 w-5 object-contain" />
                    <ChevronDown className="pointer-events-none h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                    <select id="center-phone-country" value={phoneCountryCode} onChange={(event) => setPhoneCountryCode(event.target.value)} aria-label={isRtl ? "اختر دولة الهاتف" : "Select phone country"} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                      {CENTER_COUNTRIES.map((country) => <option key={country.code} value={country.code}>+{country.dial} · {isRtl ? country.ar : country.en}</option>)}
                    </select>
                  </div>
                  <div className="flex h-full min-w-0 flex-1 items-center pl-1">
                    <span className="mr-2 shrink-0 whitespace-nowrap text-[16px] font-normal leading-[24px] text-slate-800" aria-label={isRtl ? "مفتاح الدولة" : "Country calling code"}>+{selectedPhoneCountry.dial}</span>
                    <input type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^0-9]/g, ""))} maxLength={18} placeholder={selectedPhoneCountry.example} aria-label={isRtl ? "رقم الهاتف" : "Phone number"} className="h-full min-w-0 w-full bg-transparent py-0 pr-3 font-normal text-[16px] leading-[24px] text-slate-800 outline-none placeholder:text-slate-400" />
                  </div>
                </div>
              </label>
            </div>}
          </section>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
          <div className="grid grid-cols-2 gap-3">
            <button type="submit" disabled={creating || uploadingLogo} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#5B50C7] px-4 text-sm font-extrabold text-white transition hover:bg-[#4338A8] disabled:cursor-not-allowed disabled:opacity-50">
              {(creating || uploadingLogo) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRtl ? "إنشاء المركز" : "Create center"}
            </button>
            <Link href="/center-management" className="inline-flex h-12 items-center justify-center rounded-xl border border-[#5B50C7] bg-white px-4 text-sm font-bold text-[#5B50C7] transition hover:bg-[#F1EFFF]">{isRtl ? "إلغاء" : "Cancel"}</Link>
          </div>
          <p className="text-center text-[11px] leading-5 text-slate-400">{isRtl ? "سيتم إنشاء مركز مستقل. لا يمكن للمراكز الأخرى الوصول إلى مرضاه أو سجلاته." : "A separate tenant will be created. Other centers cannot access its patients or records."}</p>
        </form>
          </div>
          </div>
        </section>
      </div>
    </main>
  );
}