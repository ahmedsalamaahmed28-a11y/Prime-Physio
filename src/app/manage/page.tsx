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
import PublicLayout from "@/components/PublicLayout";

import { cn } from "@/lib/utils"
import { GradientCheckbox as CustomCheckbox } from "@/components/ui/checkbox"

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
    <PublicLayout>
      <Suspense fallback={<div className="flex items-center justify-center min-h-[500px]"><div className="w-8 h-8 border-4 border-[#4F46BA] border-t-transparent rounded-full animate-spin" /></div>}>
        <ManageContent />
      </Suspense>
    </PublicLayout>
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
  const [forgotOtp, setForgotOtp] = useState(["", "", "", ""]);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotShowConfirm, setForgotShowConfirm] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotShowCode, setForgotShowCode] = useState("");
  const forgotOtpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

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
      if (data.devCode) {
        setForgotOtp(data.devCode.split("").slice(0, 4));
        setForgotShowCode(data.devCode);
      } else {
        setForgotShowCode("");
      }
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
    if (val && idx < 3) forgotOtpRefs[idx + 1].current?.focus();
  };

  const handleForgotOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !forgotOtp[idx] && idx > 0) forgotOtpRefs[idx - 1].current?.focus();
  };

  const handleForgotVerify = async () => {
    const code = forgotOtp.join("");
    setForgotError("");
    if (code.length !== 4) {
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
    if (forgotNewPassword.length < 6) {
      setForgotError(isRtl ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
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
    const cleanPassword = password.trim();

    await setAppValue("pending_role", "doctor");
    const result = await signIn("credentials", {
      email: cleanEmail,
      password: cleanPassword,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error === "CredentialsSignin"
        ? (isRtl ? "بيانات الدخول غير صحيحة" : "Invalid login credentials")
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
    await setAppValue("pending_role", "admin");
    await setAppValue("pending_google_signup", "true");
    try {
      const result = await signIn("google", { callbackUrl: "/", redirect: false });
      if (result?.error) {
        setError(isRtl ? "فشل الاتصال بخدمة Google. تأكد من إعدادات الحساب." : "Failed to connect to Google. Check account configuration.");
        setIsLoading(false);
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (e) {
      setError(isRtl ? "حدث خطأ أثناء الاتصال بخدمة Google" : "An error occurred while connecting to Google");
      setIsLoading(false);
    }
  };

  if (isOnboarding) {
    return <OnboardingFlow step={onboardStep} setStep={setOnboardStep} clinicId={user?.clinicId} isRtl={isRtl} />;
  }

  return (
    <>
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-16 justify-center">
              <div className="flex-1 max-w-md space-y-4 pt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4F46BA]/10 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46BA]" />
                  <span className="text-[11px] font-medium text-[#4F46BA]">
                    {isRtl ? "إدارة العيادة" : "Clinic Management"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                  {isRtl ? "سجل الدخول لإدارة عيادتك" : "Sign in to Manage Your Clinic"}
                </h2>
                <p className="text-slate-400 text-sm">
                  {isRtl
                    ? "قم بتسجيل الدخول للوصول إلى لوحة التحكم وإدارة المرضى والجلسات والتقارير."
                    : "Sign in to access the dashboard and manage patients, sessions, and reports."}
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  {[
                    { icon: "👥", labelAr: "إدارة المرضى", labelEn: "Patients" },
                    { icon: "📅", labelAr: "الجلسات", labelEn: "Sessions" },
                    { icon: "📊", labelAr: "التقارير", labelEn: "Reports" },
                    { icon: "💰", labelAr: "الفواتير", labelEn: "Billing" },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-sm">{f.icon}</span>
                      <span className="text-[11px] font-medium text-slate-500">{isRtl ? f.labelAr : f.labelEn}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full max-w-[380px]">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800">
                      {isRtl ? "تسجيل الدخول" : "Sign In"}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {isRtl ? "أدخل بياناتك للمتابعة" : "Enter your details to continue"}
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4 text-center">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">
                        {isRtl ? "البريد الإلكتروني" : "Email"}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input
                          type="email"
                          placeholder="example@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">
                        {isRtl ? "كلمة المرور" : "Password"}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 text-slate-700"
                        />
                        <div
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                        >
                          {showPassword ? (
                            <Eye className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                          ) : (
                            <EyeClosed className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <CustomCheckbox
                          id="remember-me"
                          checked={rememberMe}
                          onChange={() => setRememberMe(!rememberMe)}
                          className="!h-[18px] !w-[18px]"
                        />
                        <label htmlFor="remember-me" className="text-xs text-slate-400 cursor-pointer select-none">
                          {isRtl ? "تذكرني" : "Remember me"}
                        </label>
                      </div>
                      <button type="button" onClick={() => { setShowForgotModal(true); setForgotStep("email"); setForgotOtp(["","","",""]); setForgotNewPassword(""); setForgotConfirmPassword(""); setForgotShowCode(""); setForgotError(""); }} className="group text-xs text-[#4F46BA] transition-all duration-300 hover:scale-105 relative after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#4338ca] after:transition-all after:duration-300 hover:after:w-full">
                        {isRtl ? "نسيت كلمة المرور؟" : "Forgot password?"}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          {isRtl ? "تسجيل الدخول" : "Sign In"}
                          <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                        </span>
                      )}
                    </button>

                    <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-slate-100" />
                      <span className="mx-3 text-xs text-slate-300">{isRtl ? "أو" : "or"}</span>
                      <div className="flex-grow border-t border-slate-100" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full border border-slate-200 hover:border-slate-300 bg-white text-slate-600 font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
                        <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
                        <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
                        <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
                      </svg>
                      {isRtl ? "الدخول عبر Google" : "Sign in with Google"}
                    </button>

                    <p className="text-center text-xs text-slate-400">
                      {isRtl ? "ليس لديك حساب؟" : "Don't have an account?"}{' '}
                      <Link href="/signup" className="text-[#4F46BA] hover:text-[#4338ca] font-medium transition-colors">
                        {isRtl ? "إنشاء حساب" : "Sign up"}
                      </Link>
                    </p>
                  </form>
                </div>
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
                      {forgotShowCode
                        ? (isRtl
                            ? `رمز التحقق: ${forgotShowCode}`
                            : `Verification code: ${forgotShowCode}`)
                        : (isRtl ? "تم إرسال رمز التحقق إلى بريدك الإلكتروني" : "Code sent to your email")}
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
                    disabled={forgotOtp.join("").length !== 4 || forgotLoading}
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
