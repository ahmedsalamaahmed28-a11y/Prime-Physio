"use client";
import React, { useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeClosed, ArrowRight, X, Shield } from 'lucide-react';
import { signIn } from "next-auth/react";
import { setAppValue } from "@/lib/appStorage";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import OnboardingFlow from "@/components/OnboardingFlow";

import { cn } from "@/lib/utils"
import { GradientCheckbox } from "@/components/ui/checkbox"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-lg border bg-white px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[#4F46BA] focus-visible:ring-[3px] focus-visible:ring-[#4F46BA]/20",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export default function ManagePage() {
  return (
    <div className="min-h-screen bg-white flex w-full">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#4F46BA] border-t-transparent rounded-full animate-spin" /></div>}>
        <ManageContent />
      </Suspense>
    </div>
  )
}

function ManageContent() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isOnboarding = searchParams?.get("onboard") === "1";
  const [onboardStep, setOnboardStep] = useState<"plan" | "clinic" | "done">("plan");

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "reset" | "success">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState(["", "", "", "", "", ""]);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotShowConfirm, setForgotShowConfirm] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  
  const forgotOtpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleForgotSendOtp = async () => {
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError(isRtl ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "فشل إرسال رمز التحقق" : "Failed to send code"));
      setForgotStep("otp");
      setTimeout(() => forgotOtpRefs[0].current?.focus(), 100);
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotOtpChange = (idx: number, val: string) => {
    if (val && !/^\\d$/.test(val)) return;
    const newOtp = [...forgotOtp];
    newOtp[idx] = val;
    setForgotOtp(newOtp);
    if (val && idx < 5) forgotOtpRefs[idx + 1].current?.focus();
  };

  const handleForgotOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !forgotOtp[idx] && idx > 0) forgotOtpRefs[idx - 1].current?.focus();
  };

  const handleForgotVerify = async () => {
    const code = forgotOtp.join("");
    setForgotError("");
    if (code.length !== 6) {
      setForgotError(isRtl ? "يرجى إدخال رمز التحقق كاملاً" : "Please enter the full code");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "رمز التحقق غير صحيح" : "Invalid code"));
      setForgotStep("reset");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (forgotNewPassword.length < 10) {
      setForgotError(isRtl ? "كلمة المرور يجب أن تكون 10 أحرف على الأقل" : "Password must be at least 10 characters");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError(isRtl ? "كلمة المرور غير متطابقة" : "Passwords do not match");
      return;
    }
    setForgotLoading(true);
    try {
      const code = forgotOtp.join("");
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code,
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "فشل إعادة تعيين كلمة المرور" : "Failed to reset password"));
      setForgotStep("success");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    await setAppValue("current_user", null);
    await setAppValue("pending_role", "doctor");
    const result = await signIn("credentials", {
      email: cleanEmail,
      password: cleanPassword,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error === "CredentialsSignin"
        ? (isRtl ? "عذراً، البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى." : "Sorry, the email or password you entered is incorrect. Please try again.")
        : result.error);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    window.location.href = "/home";
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    await setAppValue("current_user", null);
    await setAppValue("pending_role", "admin");
    await setAppValue("pending_google_signup", "true");
    try {
      const result = await signIn("google", { callbackUrl: "/home", redirect: false });
      if (result?.error) {
        setError(isRtl ? "عذراً، تعذر الاتصال بحساب Google. يرجى التحقق من اتصالك والمحاولة مجدداً." : "Unable to sign in with Google. Please check your connection and try again.");
        setIsLoading(false);
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (e) {
      setError(isRtl ? "حدث خطأ غير متوقع أثناء محاولة تسجيل الدخول بواسطة Google." : "An unexpected error occurred during Google sign-in.");
      setIsLoading(false);
    }
  };

  if (isOnboarding) {
    return <OnboardingFlow step={onboardStep} setStep={setOnboardStep} clinicId={user?.clinicId} isRtl={isRtl} />;
  }

  return (
    <>
    <div className="w-full min-h-screen flex flex-col lg:flex-row font-sans" dir={isRtl ? "rtl" : "ltr"}>
      {/* Brand Side (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-[#4F46BA] opacity-90" />
        
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center text-white w-full max-w-lg">
          <Link href="/" className="mb-10 transform hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Prime Physio" className="w-24 h-24 object-contain drop-shadow-2xl brightness-0 invert" />
          </Link>
          <h1 className="text-4xl font-bold mb-6 leading-tight">
            {isRtl ? "مستقبل إدارة عيادات" : "The Future of Clinic"} <br /> 
            <span className="text-indigo-400">{isRtl ? "العلاج الطبيعي" : "Management"}</span>
          </h1>
          <p className="text-lg text-slate-300 mb-12 leading-relaxed">
            {isRtl 
              ? "نظام متكامل يجمع بين السجلات الطبية، الإدارة المالية، وجدولة المواعيد في منصة واحدة سهلة الاستخدام."
              : "An integrated system combining EMR, billing, and scheduling in one easy-to-use platform."}
          </p>

          <div className="flex gap-4 justify-center">
             <div className="px-5 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-medium">{isRtl ? "سجلات طبية" : "EMR"}</div>
             <div className="px-5 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-medium">{isRtl ? "فواتير" : "Billing"}</div>
             <div className="px-5 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-medium">{isRtl ? "مواعيد" : "Calendar"}</div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white relative">
        <Link href="/" className={`absolute top-6 ${isRtl ? "left-6" : "right-6"} text-sm text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors font-medium`}>
          <ArrowRight className={`w-4 h-4 ${isRtl ? "" : "rotate-180"}`} />
          {isRtl ? "العودة للرئيسية" : "Back to Home"}
        </Link>
        
        <div className="w-full max-w-[400px]">
          {/* Logo for mobile only */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/logo.png" alt="Prime Physio" className="w-16 h-16 object-contain" />
          </div>

          <div className="mb-8 text-center lg:text-start">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              {isRtl ? "مرحباً بعودتك" : "Welcome Back"}
            </h2>
            <p className="text-sm text-slate-500">
              {isRtl ? "سجل الدخول لإدارة عيادتك" : "Sign in to manage your clinic"}
            </p>
          </div>

          {error && (
            <div className="bg-red-50/80 border border-red-200/60 text-red-600 text-[13px] font-medium rounded-xl p-4 mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-red-500">
                <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
              </svg>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {isRtl ? "البريد الإلكتروني" : "Email"}
              </label>
              <div className="relative">
                <Mail className={`absolute ${isRtl ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400`} />
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full h-11 bg-slate-50 border-slate-200 text-slate-800 rounded-xl focus:bg-white ${isRtl ? "pr-10" : "pl-10"}`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {isRtl ? "كلمة المرور" : "Password"}
              </label>
              <div className="relative">
                <Lock className={`absolute ${isRtl ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400`} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full h-11 bg-slate-50 border-slate-200 text-slate-800 rounded-xl focus:bg-white ${isRtl ? "pr-10 pl-10" : "pl-10 pr-10"}`}
                />
                <div
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isRtl ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 cursor-pointer p-1`}
                >
                  {showPassword ? (
                    <Eye className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
                  ) : (
                    <EyeClosed className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <GradientCheckbox 
                  id="remember-me" 
                  checked={rememberMe} 
                  onChange={() => setRememberMe(!rememberMe)}
                  className="!h-[18px] !w-[18px]"
                />
                <label htmlFor="remember-me" className="text-sm text-slate-600 cursor-pointer select-none">
                  {isRtl ? "تذكرني" : "Remember me"}
                </label>
              </div>
              <button type="button" onClick={() => { setShowForgotModal(true); setForgotStep("email"); setForgotOtp(["","","","","",""]); setForgotNewPassword(""); setForgotConfirmPassword("");  setForgotError(""); }} className="text-sm font-semibold text-[#4F46BA] hover:text-[#3730a3] transition-colors">
                {isRtl ? "نسيت كلمة المرور؟" : "Forgot password?"}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-semibold h-11 rounded-xl transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50 mt-4 shadow-md shadow-indigo-200"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isRtl ? "تسجيل الدخول" : "Sign In"}
                  <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
                </span>
              )}
            </button>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-slate-200" />
              <span className="mx-4 text-xs font-medium text-slate-400 bg-white px-2">{isRtl ? "أو" : "OR"}</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold h-11 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
                <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
                <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
                <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
              </svg>
              {isRtl ? "الدخول باستخدام Google" : "Continue with Google"}
            </button>

            <p className="text-center text-sm font-medium text-slate-500 mt-8">
              {isRtl ? "ليس لديك حساب؟" : "Don't have an account?"}{' '}
              <Link href="/signup" className="text-[#4F46BA] hover:text-[#3730a3] transition-colors underline underline-offset-4 decoration-2 decoration-[#4F46BA]/30 hover:decoration-[#4F46BA]">
                {isRtl ? "إنشاء حساب جديد" : "Sign up"}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setShowForgotModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">
                  {isRtl ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                </h3>
                <button onClick={() => setShowForgotModal(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {forgotError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4 text-center">
                  {forgotError}
                </div>
              )}

              {forgotStep === "email" ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    {isRtl
                      ? "أدخل بريدك الإلكتروني المسجل به الحساب وسنرسل لك رمز تحقق"
                      : "Enter your registered email and we'll send you a verification code"}
                  </p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 text-slate-700"
                    />
                  </div>
                  <button
                    onClick={handleForgotSendOtp}
                    disabled={forgotLoading}
                    className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-9 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      isRtl ? "إرسال رمز التحقق" : "Send Code"
                    )}
                  </button>
                </div>
              ) : forgotStep === "otp" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium">
                      {isRtl ? "تم إرسال رمز التحقق إلى بريدك الإلكتروني" : "A verification code has been sent to your email"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3" dir="ltr">
                    {forgotOtp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={forgotOtpRefs[idx]}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleForgotOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleForgotOtpKeyDown(idx, e)}
                        className="w-12 h-14 text-center text-lg font-bold text-slate-800 border border-slate-200 rounded-lg focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none transition-all"
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleForgotVerify}
                    disabled={forgotOtp.join("").length !== 6 || forgotLoading}
                    className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-9 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      isRtl ? "تأكيد" : "Verify"
                    )}
                  </button>
                  <button
                    onClick={() => { setForgotStep("email"); setForgotError(""); }}
                    className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {isRtl ? "العودة" : "Back"}
                  </button>
                </div>
              ) : forgotStep === "reset" ? (
                <form onSubmit={handleForgotResetPassword} className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium">
                      {isRtl ? "تم التحقق. أدخل كلمة المرور الجديدة" : "Verified. Enter your new password"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">
                      {isRtl ? "كلمة المرور الجديدة" : "New Password"}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <Input
                        type={forgotShowPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        className="w-full pl-10 pr-10 text-slate-700"
                      />
                      <div
                        onClick={() => setForgotShowPassword(!forgotShowPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        {forgotShowPassword ? (
                          <Eye className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                        ) : (
                          <EyeClosed className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">
                      {isRtl ? "تأكيد كلمة المرور" : "Confirm Password"}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <Input
                        type={forgotShowConfirm ? "text" : "password"}
                        placeholder="••••••••"
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-10 text-slate-700"
                      />
                      <div
                        onClick={() => setForgotShowConfirm(!forgotShowConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        {forgotShowConfirm ? (
                          <Eye className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                        ) : (
                          <EyeClosed className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-9 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        {isRtl ? "تغيير كلمة المرور" : "Change Password"}
                        <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                      </span>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span className="text-sm font-medium">
                      {isRtl ? "تم إعادة تعيين كلمة المرور بنجاح" : "Password reset successfully"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {isRtl
                      ? "يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة"
                      : "You can now sign in with your new password"}
                  </p>
                  <button
                    onClick={() => setShowForgotModal(false)}
                    className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-9 rounded-lg transition-all duration-200 text-sm"
                  >
                    {isRtl ? "تسجيل الدخول" : "Sign In"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
    </>
  );
}
