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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const fullName = useMemo(() => (firstName.trim() + " " + lastName.trim()).trim(), [firstName, lastName]);
  const strongPassword = password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);

  const requestCode = async () => {
    setError("");
    setNotice("");
    if (!firstName.trim() || !lastName.trim() || !cleanEmail || !phone.trim()) {
      setError(isRtl ? "يرجى إدخال جميع البيانات المطلوبة." : "Please complete all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(isRtl ? "البريد الإلكتروني غير صحيح." : "Enter a valid email address.");
      return;
    }
    const localPhone = phone.replace(/\D/g, "");
    if (!/^1[0125]\d{8}$/.test(localPhone)) {
      setError(isRtl ? "أدخل رقم هاتف مصري صحيحًا مكوّنًا من 10 أرقام بعد +20." : "Enter a valid Egyptian mobile number after +20.");
      return;
    }
    if (!strongPassword) {
      setError(isRtl ? "كلمة المرور يجب أن تكون 12 حرفًا على الأقل، وبها حرف كبير وصغير ورقم ورمز." : "Password must be at least 12 characters and include uppercase, lowercase, a number and a symbol.");
      return;
    }
    if (password !== confirmPassword) {
      setError(isRtl ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setError(isRtl ? "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة." : "Please accept the Terms of Use and Privacy Policy.");
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
        ? "إذا كان البريد مؤهلًا للتسجيل، فسيصلك رمز التفعيل خلال دقائق. تحقق أيضًا من مجلد الرسائل غير المرغوب فيها."
        : "If this email is eligible, the activation code will arrive shortly. Check your spam folder too.");
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
    if (!/^\d{6}$/.test(code)) {
      setError(isRtl ? "أدخل رمز التفعيل المكوّن من 6 أرقام." : "Enter the 6-digit activation code.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code,
          name: fullName,
          phone: "+20" + phone.replace(/\D/g, ""),
          password,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || (isRtl ? "تعذر تفعيل الحساب." : "Could not activate the account."));

      await setAppValue("current_user", null);
      await setAppValue("pending_role", "admin");
      const login = await signIn("credentials", { email: cleanEmail, password, redirect: false });
      if (login?.error) {
        setNotice(isRtl
          ? "تم إنشاء الحساب وتفعيل البريد بنجاح. يمكنك الآن تسجيل الدخول."
          : "Your account is created and your email is verified. You can now sign in.");
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

  const inputClass = "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-[#4F46BA] focus:ring-4 focus:ring-[#4F46BA]/10 placeholder:text-slate-400";
  const labelClass = "mb-2 block text-xs font-bold text-slate-700";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-4 py-8 sm:py-12" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-[480px]">
        <header className="mb-7 text-center">
          <Link href="/" className="mb-6 inline-flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Prime Physio" className="h-10 w-10 object-contain" />
            <span className="text-lg font-extrabold text-[#4F46BA]">Prime Physio</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-[28px]">{isRtl ? "أنشئ حسابك" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === "details"
              ? (isRtl ? "الخطوة 1 من 2 · ثم فعّله بالكود الذي نرسله لبريدك." : "Step 1 of 2 · Then activate it with the code we email you.")
              : (isRtl ? "الخطوة 2 من 2 · أدخل كود التفعيل المرسل إلى بريدك." : "Step 2 of 2 · Enter the activation code sent to your email.")}
          </p>
        </header>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="mb-7 flex items-center gap-3">
            {[1, 2].map((number) => (
              <React.Fragment key={number}>
                <div className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold " + ((step === "details" ? number === 1 : number === 2) ? "bg-[#4F46BA] text-white" : number === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400")}>
                  {step === "verify" && number === 1 ? <CheckCircle2 className="h-4 w-4" /> : number}
                </div>
                {number === 1 && <div className={"h-px flex-1 " + (step === "verify" ? "bg-emerald-300" : "bg-slate-200")} />}
              </React.Fragment>
            ))}
          </div>

          {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
          {notice && <div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{notice}</span></div>}

          {step === "details" ? (
            <form onSubmit={handleDetails} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>{isRtl ? "الاسم الأول" : "First name"} *</label><div className="relative"><User className={"absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 " + (isRtl ? "right-3" : "left-3")} /><input autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass + (isRtl ? " pr-10" : " pl-10")} /></div></div>
                <div><label className={labelClass}>{isRtl ? "اسم العائلة" : "Last name"} *</label><input autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} /></div>
              </div>

              <div><label className={labelClass}>{isRtl ? "البريد الإلكتروني" : "Email"} *</label><div className="relative"><Mail className={"absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 " + (isRtl ? "right-3" : "left-3")} /><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={inputClass + (isRtl ? " pr-10" : " pl-10")} /></div><p className="mt-1.5 text-[11px] text-slate-400">{isRtl ? "سنرسل كود التفعيل إلى هذا البريد." : "We’ll send the activation code to this email."}</p></div>

              <div><label className={labelClass}>{isRtl ? "رقم الهاتف المحمول" : "Mobile number"} *</label><div className="flex gap-2" dir="ltr"><span className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">+20</span><div className="relative flex-1"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="tel" inputMode="numeric" autoComplete="tel-national" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))} placeholder="10xxxxxxxx" className={inputClass + " pl-10"} /></div></div><p className="mt-1.5 text-[11px] leading-5 text-slate-400">{isRtl ? "يُفضّل أن يكون عليه واتساب؛ يستخدمه فريق Prime Physio لمساعدتك في تجهيز مركزك. لا يظهر للآخرين." : "Preferably WhatsApp-enabled. Our team may use it to help set up your center; it is not shown publicly."}</p></div>

              <div><label className={labelClass}>{isRtl ? "كلمة المرور" : "Password"} *</label><div className="relative"><input type={showPassword ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass + (isRtl ? " pl-11" : " pr-11")} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={isRtl ? "إظهار كلمة المرور" : "Show password"} className={"absolute top-1/2 -translate-y-1/2 p-2 text-slate-400 " + (isRtl ? "left-2" : "right-2")}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                <ul className="mt-2 space-y-1 text-[11px] text-slate-500"><li className={password.length >= 12 ? "text-emerald-600" : ""}>{password.length >= 12 ? "✓" : "•"} {isRtl ? "12 حرفًا أو أكثر" : "12 characters or more"}</li><li className={/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password) ? "text-emerald-600" : ""}>{/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password) ? "✓" : "•"} {isRtl ? "حرف كبير وصغير ورقم ورمز" : "Uppercase, lowercase, number and symbol"}</li><li>{isRtl ? "يتم رفض كلمات المرور الشائعة أو التي ظهرت في تسريبات." : "Common or previously breached passwords are rejected."}</li></ul>
              </div>

              <div><label className={labelClass}>{isRtl ? "أعد كتابة كلمة المرور" : "Confirm password"} *</label><div className="relative"><input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass + (isRtl ? " pl-11" : " pr-11")} /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={isRtl ? "إظهار تأكيد كلمة المرور" : "Show confirm password"} className={"absolute top-1/2 -translate-y-1/2 p-2 text-slate-400 " + (isRtl ? "left-2" : "right-2")}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>

              <label className="flex cursor-pointer items-start gap-2 pt-1 text-xs leading-5 text-slate-600"><input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 h-4 w-4 accent-[#4F46BA]" /><span>{isRtl ? "أوافق على شروط الاستخدام وسياسة الخصوصية." : "I agree to the Terms of Use and Privacy Policy."}</span></label>

              <button type="submit" disabled={loading} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? <Loader size={18} /> : <>{isRtl ? "إنشاء الحساب" : "Create account"} {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-[#4F46BA]"><ShieldCheck className="h-7 w-7" /></div><h2 className="text-lg font-extrabold text-slate-800">{isRtl ? "تحقق من بريدك الإلكتروني" : "Verify your email"}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{isRtl ? "أدخل رمز التفعيل المكوّن من 6 أرقام الذي أرسلناه إلى" : "Enter the 6-digit activation code sent to"} <b dir="ltr" className="inline-block text-slate-700">{cleanEmail}</b></p></div>
              <input aria-label={isRtl ? "رمز التفعيل" : "Activation code"} autoComplete="one-time-code" inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 text-center text-2xl font-extrabold tracking-[0.5em] text-slate-800 outline-none focus:border-[#4F46BA] focus:ring-4 focus:ring-[#4F46BA]/10" dir="ltr" placeholder="••••••" />
              <button type="submit" disabled={loading || code.length !== 6} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-sm font-bold text-white disabled:opacity-60">{loading ? <Loader size={18} /> : isRtl ? "تأكيد وإنشاء الحساب" : "Verify and create account"}</button>
              <div className="flex items-center justify-between text-xs"><button type="button" onClick={() => { setStep("details"); setError(""); setNotice(""); }} className="font-semibold text-slate-500 hover:text-slate-800">{isRtl ? "تعديل البيانات" : "Edit details"}</button><button type="button" disabled={loading} onClick={requestCode} className="font-bold text-[#4F46BA] hover:text-[#3730a3] disabled:opacity-50">{isRtl ? "إعادة إرسال الكود" : "Resend code"}</button></div>
            </form>
          )}
        </section>

        <p className="mt-6 text-center text-sm text-slate-500">{isRtl ? "لديك حساب بالفعل؟" : "Already have an account?"} <Link href="/manage" className="font-bold text-[#4F46BA] hover:underline">{isRtl ? "سجّل الدخول" : "Sign in"}</Link></p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader size={24} /></div>}><SignupPageContent /></Suspense>;
}
