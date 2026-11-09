"use client";

import React, { Suspense, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { setAppValue } from "@/lib/appStorage";
import { Loader } from "@/components/Loader";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Mail, Phone, ShieldCheck, User } from "lucide-react";

function SignupPageContent() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [step, setStep] = useState<"details" | "verify">("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const cleanPhone = useMemo(() => phone.trim(), [phone]);
  const fullName = useMemo(() => (firstName.trim() + " " + lastName.trim()).trim(), [firstName, lastName]);
  const hasLength = password.length >= 8;
  const passwordReady = hasLength;

  const isValidPhone = (value: string) => {
    const digits = value.replace(/\\D/g, "");
    return /^\\+?[0-9][0-9\\s().-]*$/.test(value) && digits.length >= 7 && digits.length <= 15;
  };

  const requestCode = async () => {
    setError("");
    setNotice("");
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
        body: JSON.stringify({ email: cleanEmail, phone: cleanPhone, code, name: fullName, password }),
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

  const inputClass = "h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#5B50C7] focus:ring-4 focus:ring-[#5B50C7]/10";
  const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

  return (
    <main className="min-h-screen bg-[#f8f9fc] text-slate-800" dir={isRtl ? "rtl" : "ltr"}>
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

      <div className="mx-auto flex max-w-6xl justify-center px-4 py-12 sm:py-16">
        <section className="w-full max-w-[590px]">
          <div className="mb-8 text-center">
            <span className="mb-3 inline-flex rounded-full bg-[#5B50C7]/10 px-3 py-1 text-xs font-bold text-[#5B50C7]">{isRtl ? "ابدأ مع Prime Physio" : "GET STARTED WITH PRIME PHYSIO"}</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{isRtl ? "أنشئ حسابك" : "Create your account"}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{step === "details" ? (isRtl ? "أنشئ حساب مالك المركز وابدأ في تجهيز عيادتك." : "Create your clinic owner account and get your practice ready.") : (isRtl ? "الخطوة 2 من 2 · فعّل بريدك الإلكتروني للمتابعة." : "Step 2 of 2 · Verify your email to continue.")}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-9">
            {step === "verify" && <div className="mb-6 flex items-center gap-3"><div className="h-1.5 flex-1 rounded-full bg-emerald-400" /><div className="h-1.5 flex-1 rounded-full bg-[#5B50C7]" /></div>}
            {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
            {notice && <div role="status" className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-5 text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{notice}</span></div>}

            {step === "details" ? (
              <form onSubmit={handleDetails} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div><label className={labelClass}>{isRtl ? "الاسم الأول" : "First name"} <span className="text-red-500">*</span></label><div className="relative"><User className={"absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 " + (isRtl ? "right-3" : "left-3")} /><input autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass + (isRtl ? " pr-10" : " pl-10")} /></div></div>
                  <div><label className={labelClass}>{isRtl ? "اسم العائلة" : "Last name"} <span className="text-red-500">*</span></label><input autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} /></div>
                </div>
                <div><label className={labelClass}>{isRtl ? "البريد الإلكتروني" : "Email"} <span className="text-red-500">*</span></label><div className="relative"><Mail className={"absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 " + (isRtl ? "right-3" : "left-3")} /><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={inputClass + (isRtl ? " pr-10" : " pl-10")} /></div></div>
                <div><label className={labelClass}>{isRtl ? "رقم الموبايل" : "Mobile number"} <span className="text-red-500">*</span></label><div className="relative"><Phone className={"absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 " + (isRtl ? "right-3" : "left-3")} /><input type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+20 10 1234 5678" className={inputClass + (isRtl ? " pr-10" : " pl-10")} dir="ltr" /></div></div>
                <div><label className={labelClass}>{isRtl ? "كلمة المرور" : "Password"} <span className="text-red-500">*</span></label><div className="relative"><input type={showPassword ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass + (isRtl ? " pl-12" : " pr-12")} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={isRtl ? "إظهار كلمة المرور" : "Show password"} className={"absolute top-1/2 -translate-y-1/2 p-2 text-slate-400 " + (isRtl ? "left-2" : "right-2")}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
                    <li className={hasLength ? "text-emerald-600" : ""}>{hasLength ? "✓" : "•"} {isRtl ? "8 أحرف أو أكثر" : "At least 8 characters"}</li>
                    <li>{isRtl ? "تُرفض كلمات المرور الشائعة أو التي ظهرت في تسريبات سابقة." : "Common or previously breached passwords are rejected."}</li>
                  </ul>
                </div>
                <div><label className={labelClass}>{isRtl ? "تأكيد كلمة المرور" : "Confirm password"} <span className="text-red-500">*</span></label><div className="relative"><input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass + (isRtl ? " pl-12" : " pr-12")} /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={isRtl ? "إظهار تأكيد كلمة المرور" : "Show confirm password"} className={"absolute top-1/2 -translate-y-1/2 p-2 text-slate-400 " + (isRtl ? "left-2" : "right-2")}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#5146B8] to-[#7657D5] px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader size={18} /> : <>{isRtl ? "إنشاء الحساب" : "Create account"} {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</>}</button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-5">
                <div className="text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#5B50C7]/10 text-[#5B50C7]"><ShieldCheck className="h-7 w-7" /></div><h2 className="text-xl font-bold text-slate-900">{isRtl ? "تحقق من بريدك الإلكتروني" : "Verify your email"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{isRtl ? "أدخل رمز التفعيل المكوّن من 6 أرقام المرسل إلى" : "Enter the 6-digit activation code sent to"} <b dir="ltr" className="inline-block text-slate-800">{cleanEmail}</b></p></div>
                <input aria-label={isRtl ? "رمز التفعيل" : "Activation code"} autoComplete="one-time-code" inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\\D/g, "").slice(0, 6))} className="h-14 w-full rounded-lg border border-slate-300 bg-slate-50 text-center text-2xl font-bold tracking-[0.5em] text-slate-800 outline-none focus:border-[#5B50C7] focus:ring-4 focus:ring-[#5B50C7]/10" dir="ltr" placeholder="••••••" />
                <button type="submit" disabled={loading || code.length !== 6} className="flex h-12 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#5146B8] to-[#7657D5] text-sm font-bold text-white disabled:opacity-60">{loading ? <Loader size={18} /> : isRtl ? "تأكيد وإنشاء الحساب" : "Verify and create account"}</button>
                <div className="flex items-center justify-between text-xs"><button type="button" onClick={() => { setStep("details"); setError(""); setNotice(""); }} className="font-semibold text-slate-500 hover:text-slate-800">{isRtl ? "العودة وتعديل البيانات" : "Back to edit details"}</button><button type="button" disabled={loading} onClick={requestCode} className="font-bold text-[#5B50C7] hover:underline disabled:opacity-50">{isRtl ? "إعادة إرسال الكود" : "Resend code"}</button></div>
              </form>
            )}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">{isRtl ? "لديك حساب بالفعل؟" : "Already have an account?"} <Link href="/manage" className="font-bold text-[#5B50C7] hover:underline">{isRtl ? "دخول المالك" : "Owner login"}</Link></p>
        </section>
      </div>
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} Prime Physio. {isRtl ? "جميع الحقوق محفوظة." : "All rights reserved."}</footer>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader size={24} /></div>}><SignupPageContent /></Suspense>;
}
