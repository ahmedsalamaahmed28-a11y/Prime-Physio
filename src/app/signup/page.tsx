"use client";

import React, { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { setAppValue } from "@/lib/appStorage";
import Link from "next/link";
import { Mail, Lock, Eye, EyeClosed, ArrowRight, User, Shield } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

import { cn } from "@/lib/utils"

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

export default function SignupPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [step, setStep] = useState<"form" | "otp">("form");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [showSuccess, setShowSuccess] = useState(false);
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    if (step === "otp") {
      otpRefs[0].current?.focus();
    }
  }, [step]);

  const handleSendOtp = async () => {
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError(isRtl ? "يرجى إدخال الاسم" : "Please enter your name");
      return false;
    }
    if (!email.trim()) {
      setError(isRtl ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email");
      return false;
    }
    if (password.length < 6) {
      setError(isRtl ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError(isRtl ? "كلمة المرور غير متطابقة" : "Passwords do not match");
      return false;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (isRtl ? "فشل إرسال رمز التحقق" : "Failed to send code"));
      }

      if (data.devCode) {
        setOtp(data.devCode.split("").slice(0, 4));
      }

      setIsLoading(false);
      setStep("otp");
      return true;
    } catch (err: any) {
      setError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
      setIsLoading(false);
      return false;
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (val && !/^\d$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);

    if (val && idx < 3) {
      otpRefs[idx + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 4) {
      setError(isRtl ? "يرجى إدخال رمز التحقق كاملاً" : "Please enter the full code");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
          clinicName: `${firstName.trim()} ${lastName.trim()}`,
          phone: "",
          password,
          role: "admin",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (isRtl ? "فشل التحقق" : "Verification failed"));
      }

      setShowSuccess(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (err: any) {
      setError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setIsLoading(true);
    await setAppValue("pending_google_signup", "true");
    await setAppValue("pending_role", "admin");
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex flex-col items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/logo.png" alt="Prime Physio" className="w-8 h-8 object-contain" />
            <span className="text-sm font-bold text-[#4F46BA]">Prime Physio</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            {step === "form"
              ? (isRtl ? "إنشاء حساب جديد" : "Create Account")
              : (isRtl ? "تأكيد البريد الإلكتروني" : "Verify Email")}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {step === "form"
              ? (isRtl ? "أدخل بياناتك لإنشاء حساب جديد" : "Enter your details to create a new account")
              : (isRtl ? `أدخل رمز التحقق المرسل إلى ${email}` : `Enter the code sent to ${email}`)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          {step === "form" ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">
                    {isRtl ? "الاسم الأول" : "First Name"}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type="text"
                      placeholder={isRtl ? "أحمد" : "Ahmed"}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-10 text-slate-700"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">
                    {isRtl ? "الاسم الأخير" : "Last Name"}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type="text"
                      placeholder={isRtl ? "سلامة" : "Salama"}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-10 text-slate-700"
                    />
                  </div>
                </div>
              </div>

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

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  {isRtl ? "تأكيد كلمة المرور" : "Confirm Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 text-slate-700"
                  />
                  <div
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showConfirm ? (
                      <Eye className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                    ) : (
                      <EyeClosed className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                    )}
                  </div>
                </div>
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
                    {isRtl ? "إنشاء حساب" : "Create Account"}
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
                onClick={handleGoogleSignup}
                disabled={isLoading}
                className="w-full border border-slate-200 hover:border-slate-300 bg-white text-slate-600 font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
                  <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
                  <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
                  <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
                </svg>
                {isRtl ? "التسجيل بواسطة Google" : "Sign up with Google"}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {isRtl ? "تم إرسال رمز التحقق إلى بريدك الإلكتروني" : "A verification code has been sent to your email"}
                </span>
              </div>

              <p className="text-[11px] text-amber-600 text-center -mt-4">
                {isRtl ? "يرجى التحقق من مجلد Spam إذا لم تجد الكود" : "Check your Spam folder if you don't see the code"}
              </p>

              <div className="flex items-center justify-center gap-3" dir="ltr">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={otpRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-lg font-bold text-slate-800 border border-slate-200 rounded-lg focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none transition-all"
                  />
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.join("").length !== 4}
                  className="flex-1 bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      {isRtl ? "تأكيد" : "Verify"}
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setStep("form")}
                  disabled={isLoading}
                  className="px-4 border border-slate-200 text-slate-500 font-medium h-10 rounded-lg transition-all duration-200 text-sm hover:bg-slate-50"
                >
                  {isRtl ? "تعديل" : "Edit"}
                </button>
              </div>
            </div>
          )}

          {showSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-700 text-sm font-bold rounded-xl p-4 mt-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
              {isRtl ? "✅ تم إنشاء الحساب بنجاح! جاري تحويلك إلى صفحة تسجيل الدخول..." : "✅ Account created successfully! Redirecting to login..."}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          {isRtl ? "لديك حساب بالفعل؟" : "Already have an account?"}{' '}
          <Link href="/login" className="text-[#4F46BA] hover:text-[#4338ca] font-medium transition-colors">
            {isRtl ? "تسجيل الدخول" : "Sign in"}
          </Link>
        </p>
      </div>
    </div>
  );
}