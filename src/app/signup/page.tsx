"use client";

import React, { Suspense, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { setAppValue } from "@/lib/appStorage";
import { Loader } from "@/components/Loader";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, Eye, EyeOff, Mail, Phone, ShieldCheck, User } from "lucide-react";


function FieldHelp({ text, label, isRtl }: { text: string; label: string; isRtl: boolean }) {
  return (
    <details className="group relative inline-flex shrink-0 align-middle">
      <summary
        aria-label={label}
        title={label}
        className="flex h-[17px] w-[17px] cursor-pointer list-none items-center justify-center rounded-full bg-[#5B50C7] text-[11px] font-extrabold leading-none text-white shadow-sm transition hover:bg-[#493EAA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B50C7] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true">?</span>
      </summary>
      <div
        role="tooltip"
        className={`absolute top-7 z-30 hidden w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs font-normal leading-5 text-slate-600 shadow-xl group-open:block ${isRtl ? "right-0 text-right" : "left-0 text-left"}`}
      >
        {text}
      </div>
    </details>
  );
}


type SignupCountry = { code: string; dial: string; flag: string; ar: string; en: string; example: string };

const SIGNUP_COUNTRIES: SignupCountry[] = [
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
  { code: "DE", dial: "49", flag: "🇩🇪", ar: "ألمانيا", en: "Germany", example: "1512 3456789" },
  { code: "FR", dial: "33", flag: "🇫🇷", ar: "فرنسا", en: "France", example: "6 12 34 56 78" },
  { code: "IT", dial: "39", flag: "🇮🇹", ar: "إيطاليا", en: "Italy", example: "312 345 6789" },
  { code: "ES", dial: "34", flag: "🇪🇸", ar: "إسبانيا", en: "Spain", example: "612 345 678" },
  { code: "TR", dial: "90", flag: "🇹🇷", ar: "تركيا", en: "Türkiye", example: "501 234 5678" },
  { code: "IN", dial: "91", flag: "🇮🇳", ar: "الهند", en: "India", example: "98765 43210" },
  { code: "PK", dial: "92", flag: "🇵🇰", ar: "باكستان", en: "Pakistan", example: "301 2345678" },
  { code: "BD", dial: "880", flag: "🇧🇩", ar: "بنغلاديش", en: "Bangladesh", example: "1812 345678" },
  { code: "MY", dial: "60", flag: "🇲🇾", ar: "ماليزيا", en: "Malaysia", example: "12 345 6789" },
  { code: "ID", dial: "62", flag: "🇮🇩", ar: "إندونيسيا", en: "Indonesia", example: "812 3456 7890" },
  { code: "AU", dial: "61", flag: "🇦🇺", ar: "أستراليا", en: "Australia", example: "4XX XXX XXX" },
  { code: "ZA", dial: "27", flag: "🇿🇦", ar: "جنوب أفريقيا", en: "South Africa", example: "XX XXX XXXX" },
  { code: "BR", dial: "55", flag: "🇧🇷", ar: "البرازيل", en: "Brazil", example: "11 91234 5678" },
  { code: "JP", dial: "81", flag: "🇯🇵", ar: "اليابان", en: "Japan", example: "90 1234 5678" },
  { code: "CN", dial: "86", flag: "🇨🇳", ar: "الصين", en: "China", example: "131 2345 6789" },
  { code: "RU", dial: "7", flag: "🇷🇺", ar: "روسيا", en: "Russia", example: "912 345-67-89" },
];

function SignupPageContent() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [step, setStep] = useState<"details" | "verify">("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("EG");
  const selectedCountry = SIGNUP_COUNTRIES.find((country) => country.code === countryCode) ?? SIGNUP_COUNTRIES[0];
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const cleanPhone = useMemo(() => {
    const localDigits = phone.replace(/[^0-9]/g, "").replace(/^0+/, "");
    return localDigits ? `+${selectedCountry.dial}${localDigits}` : "";
  }, [phone, selectedCountry.dial]);
  const emailSuggestion = useMemo(() => {
    const value = email.trim();
    const at = value.lastIndexOf("@");
    if (at < 1) return "";
    const local = value.slice(0, at);
    const domain = value.slice(at + 1).toLowerCase();
    const corrections: Record<string, string> = {
      "gmail.con": "gmail.com",
      "gmai.com": "gmail.com",
      "gmial.com": "gmail.com",
      "gmal.com": "gmail.com",
      "hotmial.com": "hotmail.com",
      "hotmai.com": "hotmail.com",
      "hotmail.con": "hotmail.com",
      "yahoo.con": "yahoo.com",
      "yaho.com": "yahoo.com",
      "outlook.con": "outlook.com",
    };
    const corrected = corrections[domain];
    return corrected ? `${local}@${corrected}` : "";
  }, [email]);
  const fullName = useMemo(() => (firstName.trim() + " " + lastName.trim()).trim(), [firstName, lastName]);
  const hasLength = password.length >= 8;
  const passwordReady = hasLength;

  const isValidPhone = (value: string) => /^\+[1-9]\d{6,14}$/.test(value);

  const requestCode = async () => {
    setError("");
    setNotice("");
    if (!acceptedLegal) {
      setError(isRtl ? "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة." : "You must accept the Terms of Use and Privacy Policy to continue.");
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !cleanEmail || !cleanPhone) {
      setError(isRtl ? "يرجى إدخال الاسم الأول واسم العائلة والبريد الإلكتروني ورقم الموبايل." : "Please enter your first name, last name, email and mobile number.");
      return;
    }
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(cleanEmail)) {
      setError(isRtl ? "البريد الإلكتروني غير صحيح." : "Enter a valid email address.");
      return;
    }
    if (!isValidPhone(cleanPhone)) {
      setError(isRtl ? "أدخل رقم موبايل صحيحًا مع مفتاح الدولة عند الحاجة." : "Enter a valid mobile number, including the country code when needed.");
      return;
    }
    if (!passwordReady) {
      setError(isRtl ? "كلمة المرور يجب أن تتكون من 8 أحرف على الأقل، ويجب ألا تكون كلمة مرور شائعة أو سهلة التخمين." : "Use at least 8 characters and avoid common or easily guessed passwords.");
      return;
    }
    if (password !== confirmPassword) {
      setError(isRtl ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || (isRtl ? "تعذر إرسال رمز التحقق." : "Could not send the verification code."));
      setStep("verify");
      setNotice(isRtl
        ? "إذا كان البريد مؤهلًا للتسجيل، فسيصلك رمز التفعيل. تحقق أيضًا من مجلد الرسائل غير المرغوب فيها."
        : "If this email is eligible, an activation code will be sent. Check your spam folder too.");
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRtl ? "حدث خطأ غير متوقع." : "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  const handleDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    await requestCode();
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^\\d{6}$/.test(code)) {
      setError(isRtl ? "أدخل رمز التفعيل المكوّن من 6 أرقام." : "Enter the 6-digit activation code.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, phone: cleanPhone, code, name: fullName, password, acceptedLegal }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || (isRtl ? "تعذر تفعيل الحساب." : "Could not activate the account."));

      await setAppValue("current_user", null);
      await setAppValue("pending_role", "admin");
      const login = await signIn("credentials", { email: cleanEmail, password, redirect: false });
      if (login?.error) {
        setNotice(isRtl ? "تم إنشاء الحساب وتفعيل البريد بنجاح. يمكنك الآن تسجيل الدخول." : "Your account is created and your email is verified. You can now sign in.");
        setStep("details");
        setPassword("");
        setConfirmPassword("");
        return;
      }
      window.location.href = "/manage?onboard=1";
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRtl ? "حدث خطأ غير متوقع." : "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "h-[46px] min-h-[46px] w-full rounded-xl border-[1.5px] border-[#D9E1EA] bg-white px-[14px] py-[10px] font-[400] text-[16px] leading-[24px] text-[#263445] shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-200 placeholder:text-[#94A3B8] hover:border-[#B8C5D3] focus:border-[#5B50C7] focus:ring-4 focus:ring-[#5B50C7]/10 disabled:cursor-not-allowed disabled:opacity-60";
  const labelClass = "block text-[15px] font-bold leading-[22px] text-[#334155]";

  return (
    <main className="min-h-screen flex flex-col bg-[#f8f9fc] font-sans text-slate-800 [font-family:Cairo,system-ui,-apple-system,Segoe_UI,Tahoma,Arial,sans-serif]" dir={isRtl ? "rtl" : "ltr"}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-5 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/logo.png" alt="Prime Physio" className="h-10 w-10 object-contain" />
            <span className="text-xl font-extrabold tracking-tight text-slate-900">Prime <span className="text-[#5B50C7]">Physio</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <Link href="/#features" className="transition hover:text-[#5B50C7]">{isRtl ? "المميزات" : "Features"}</Link>
            <Link href="/#how" className="transition hover:text-[#5B50C7]">{isRtl ? "كيف يعمل" : "How it works"}</Link>
            <Link href="/manage" className="transition hover:text-[#5B50C7]">{isRtl ? "دخول المالك" : "Owner login"}</Link>
          </nav>
          <Link href="/manage" className="rounded-lg border border-[#5B50C7] px-4 py-2 text-sm font-bold text-[#5B50C7] transition hover:bg-[#5B50C7] hover:text-white">{isRtl ? "تسجيل الدخول" : "Log in"}</Link>
        </div>
      </header>

      <div className="flex w-full flex-1 min-h-[calc(100vh-76px)] flex-col lg:flex-row items-stretch" dir={isRtl ? "rtl" : "ltr"}>
        <section className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-[#4F46BA] opacity-90" />
          <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center text-white w-full max-w-lg">
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
              <div className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium backdrop-blur">{isRtl ? "فواتير" : "Billing"}</div>
              <div className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium backdrop-blur">{isRtl ? "مواعيد" : "Calendar"}</div>
            </div>
          </div>
        </section>
        <section className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 bg-white relative" dir={isRtl ? "rtl" : "ltr"}>
          <div className="w-full max-w-[440px]">
          <div className="mb-[22px] text-center">
            <span className="mb-3 inline-flex rounded-full bg-[#5B50C7]/10 px-3 py-1 text-xs font-bold text-[#5B50C7]">{isRtl ? "ابدأ مع Prime Physio" : "GET STARTED WITH PRIME PHYSIO"}</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{isRtl ? "أنشئ حسابك" : "Create your account"}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{step === "details" ? (isRtl ? "أنشئ حساب مالك المركز وابدأ في تجهيز عيادتك." : "Create your clinic owner account and get your practice ready.") : (isRtl ? "الخطوة 2 من 2 · فعّل بريدك الإلكتروني للمتابعة." : "Step 2 of 2 · Verify your email to continue.")}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-[clamp(22px,4vw,36px)] shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            {step === "verify" && <div className="mb-6 flex items-center gap-3"><div className="h-1.5 flex-1 rounded-full bg-emerald-400" /><div className="h-1.5 flex-1 rounded-full bg-[#5B50C7]" /></div>}
            {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
            {notice && <div role="status" className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-5 text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{notice}</span></div>}

            {step === "details" ? (
              <form onSubmit={handleDetails} className="mt-[22px] grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><div className="mb-1.5 flex items-center gap-2"><label className={labelClass}>{isRtl ? "الاسم الأول" : "First name"} <span className="text-red-500">*</span></label></div><div className="relative"><User className={"absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 " + (isRtl ? "right-3" : "left-3")} /><input autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass + (isRtl ? " pr-10" : " pl-10")} /></div></div>
                  <div><div className="mb-1.5 flex items-center gap-2"><label className="text-sm font-semibold leading-5 text-[#334155]">{isRtl ? "اسم العائلة" : "Last name"} <span className="text-red-500">*</span></label></div><input autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} /></div>
                </div>
                <div><div className="mb-1.5 flex items-center gap-2"><label className="text-sm font-semibold leading-5 text-[#334155]">{isRtl ? "البريد الإلكتروني" : "Email"} <span className="text-red-500">*</span></label><FieldHelp isRtl={isRtl} label={isRtl ? "مساعدة البريد الإلكتروني" : "Email help"} text={isRtl ? "يُرسل كود التفعيل إلى هذا البريد، ويصبح بريد الدخول. إذا بدا العنوان مكتوبًا بخطأ (gmail.con أو hotmial.com...) يظهر تحته سطر «هل تقصد»؛ اضغط «استخدمه» لتصحيحه." : "Your activation code is sent to this email, and it becomes your login email. If the address looks mistyped (gmail.con or hotmial.com...), a “Did you mean” suggestion appears below; click “Use it” to correct it."} /></div><div className="relative"><Mail className={"absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 " + (isRtl ? "right-3" : "left-3")} /><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={inputClass + (isRtl ? " pr-10" : " pl-10")} /></div>{emailSuggestion && emailSuggestion !== cleanEmail && <p className="mt-2 text-xs text-slate-500">{isRtl ? "هل تقصد" : "Did you mean"} <button type="button" onClick={() => setEmail(emailSuggestion)} className="font-semibold text-[#5B50C7] underline underline-offset-2">{emailSuggestion} — {isRtl ? "استخدمه" : "Use it"}</button> {isRtl ? "لتصحيح البريد الإلكتروني." : "to correct your email address."}</p>}</div>
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <label className={labelClass}>{isRtl ? "رقم الموبايل" : "Mobile number"} <span className="text-red-500">*</span></label>
                    <FieldHelp isRtl={isRtl} label={isRtl ? "مساعدة رقم الموبايل" : "Mobile number help"} text={isRtl ? "اختر الدولة أولًا، وسيظهر مفتاح الاتصال تلقائيًا. اكتب رقمك المحلي بدون مفتاح الدولة؛ سنحفظه بالصيغة الدولية." : "Choose your country first and its calling code will be added automatically. Enter your local number without the country code; we’ll save it in international format."} />
                  </div>
                  <div className="flex h-[46px] min-h-[46px] min-w-0 items-center overflow-hidden rounded-xl border-[1.5px] border-[#D9E1EA] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 hover:border-[#B8C5D3] focus-within:border-[#5B50C7] focus-within:ring-4 focus-within:ring-[#5B50C7]/10" dir="ltr">
                    <div className="relative flex h-full shrink-0 items-center border-r border-slate-200 bg-slate-50">
                      <label htmlFor="signup-country" className="sr-only">{isRtl ? "الدولة ومفتاح الاتصال" : "Country and calling code"}</label>
                      <span className="pointer-events-none absolute left-3 z-10 text-[17px] leading-none" aria-hidden="true">{selectedCountry.flag}</span>
                      <select
                        id="signup-country"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        aria-label={isRtl ? "اختر الدولة" : "Select country"}
                        className="h-full w-[112px] cursor-pointer appearance-none bg-transparent pl-9 pr-7 text-[14px] font-semibold text-slate-700 outline-none"
                      >
                        {SIGNUP_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.flag} +{country.dial} · {isRtl ? country.ar : country.en}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-2.5 text-slate-500" aria-hidden="true"><svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor"><path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg></span>
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder={selectedCountry.example}
                      aria-label={isRtl ? "رقم الهاتف بدون مفتاح الدولة" : "Phone number without country code"}
                      className="h-full min-w-0 w-full bg-transparent px-3 font-normal text-[16px] leading-[24px] text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div><div className="mb-1.5 flex items-center gap-2"><label className="text-sm font-semibold leading-5 text-[#334155]">{isRtl ? "كلمة المرور" : "Password"} <span className="text-red-500">*</span></label><FieldHelp isRtl={isRtl} label={isRtl ? "مساعدة كلمة المرور" : "Password help"} text={isRtl ? "8 أحرف على الأقل وليست كلمة مرور شائعة (مثل 12345678 أو password1). لا يُشترط حرف كبير أو رمز — الأطول أكثر أمانًا: بضع كلمات معًا سهلة التذكر وصعبة التخمين." : "At least 8 characters and not a common password (such as 12345678 or password1). No uppercase letter or symbol is required. Longer is safer: a few words together are easy to remember and hard to guess."} /></div><div className="relative"><input type={showPassword ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass + (isRtl ? " pl-12" : " pr-12")} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={isRtl ? "إظهار كلمة المرور" : "Show password"} className={"absolute top-1/2 -translate-y-1/2 p-2 text-slate-400 " + (isRtl ? "left-2" : "right-2")}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
                    <li className={hasLength ? "text-emerald-600" : ""}>{hasLength ? "✓" : "•"} {isRtl ? "8 أحرف أو أكثر" : "At least 8 characters"}</li>
                    <li>{isRtl ? "تُرفض كلمات المرور الشائعة أو التي ظهرت في تسريبات سابقة." : "Common or previously breached passwords are rejected."}</li>
                  </ul>
                </div>
                <div><div className="mb-1.5 flex items-center gap-2"><label className="text-sm font-semibold leading-5 text-[#334155]">{isRtl ? "تأكيد كلمة المرور" : "Confirm password"} <span className="text-red-500">*</span></label></div><div className="relative"><input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass + (isRtl ? " pl-12" : " pr-12")} /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={isRtl ? "إظهار تأكيد كلمة المرور" : "Show confirm password"} className={"absolute top-1/2 -translate-y-1/2 p-2 text-slate-400 " + (isRtl ? "left-2" : "right-2")}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm leading-7 text-[#475569] transition duration-200 hover:border-[#B8C5D3] hover:bg-[#F8FAFC]">
                  <input type="checkbox" checked={acceptedLegal} onChange={(e) => setAcceptedLegal(e.target.checked)} required className="mt-1 h-[18px] w-[18px] shrink-0 cursor-pointer rounded accent-[#5B50C7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B50C7] focus-visible:ring-offset-2" />
                  <span>{isRtl ? <>أوافق على <Link href="/terms" target="_blank" className="font-bold text-[#5B50C7] underline underline-offset-2">شروط الاستخدام</Link> وأقر بأنني قرأت <Link href="/privacy" target="_blank" className="font-bold text-[#5B50C7] underline underline-offset-2">سياسة الخصوصية</Link> الخاصة بـ Prime Physio.</> : <>I agree to the <Link href="/terms" target="_blank" className="font-bold text-[#5B50C7] underline underline-offset-2">Terms of Use</Link> and acknowledge that I have read the Prime Physio <Link href="/privacy" target="_blank" className="font-bold text-[#5B50C7] underline underline-offset-2">Privacy Policy</Link>.</>}</span>
                </label>
                <button type="submit" disabled={loading} className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#5146B8] to-[#7657D5] px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5B50C7]/20 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader size={18} /> : <>{isRtl ? "إنشاء الحساب" : "Create account"} {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</>}</button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-5">
                <div className="text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#5B50C7]/10 text-[#5B50C7]"><ShieldCheck className="h-7 w-7" /></div><h2 className="text-xl font-bold text-slate-900">{isRtl ? "تحقق من بريدك الإلكتروني" : "Verify your email"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{isRtl ? "أدخل رمز التفعيل المكوّن من 6 أرقام المرسل إلى" : "Enter the 6-digit activation code sent to"} <b dir="ltr" className="inline-block text-slate-800">{cleanEmail}</b></p></div>
                <input aria-label={isRtl ? "رمز التفعيل" : "Activation code"} autoComplete="one-time-code" inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\\D/g, "").slice(0, 6))} className="h-14 w-full rounded-xl border border-[#D9E1EA] bg-white text-center text-2xl font-bold tracking-[0.5em] text-[#263445] shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-200 placeholder:text-[#94A3B8] focus:border-[#5B50C7] focus:ring-4 focus:ring-[#5B50C7]/10" dir="ltr" placeholder="••••••" />
                <button type="submit" disabled={loading || code.length !== 6} className="flex min-h-[46px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#5146B8] to-[#7657D5] text-sm font-bold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5B50C7]/20 disabled:opacity-60">{loading ? <Loader size={18} /> : isRtl ? "تأكيد وإنشاء الحساب" : "Verify and create account"}</button>
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">{isRtl ? "لم يصلك الكود؟ انتظر دقيقة، وافحص مجلد الرسائل غير المرغوب فيها (Spam/Junk)، ثم أعد الإرسال. يمكنك الرجوع لتصحيح البريد الإلكتروني إذا لزم الأمر." : "Didn’t get the code? Wait a minute, check your Spam/Junk folder, then resend it. You can go back and correct your email address if needed."}</p><div className="flex items-center justify-between text-xs"><button type="button" onClick={() => { setStep("details"); setError(""); setNotice(""); }} className="font-semibold text-slate-500 hover:text-slate-800">{isRtl ? "العودة وتعديل البيانات" : "Back to edit details"}</button><button type="button" disabled={loading} onClick={requestCode} className="font-bold text-[#5B50C7] hover:underline disabled:opacity-50">{isRtl ? "إعادة إرسال الكود" : "Resend code"}</button></div>
              </form>
            )}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">{isRtl ? "لديك حساب بالفعل؟" : "Already have an account?"} <Link href="/manage" className="font-bold text-[#5B50C7] hover:underline">{isRtl ? "دخول المالك" : "Owner login"}</Link></p>
          </div>
        </section>
      </div>
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} Prime Physio. {isRtl ? "جميع الحقوق محفوظة." : "All rights reserved."}</footer>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader size={24} /></div>}><SignupPageContent /></Suspense>;
}
