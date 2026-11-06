"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { Loader } from "@/components/Loader";

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

export default function ForgotPasswordPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(isRtl ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "فشل إرسال رمز التحقق" : "Failed to send code"));
      if (data.devCode) {
        setDevCode(data.devCode);
        setOtp(data.devCode.split("").slice(0, 6));
      }
      setStep("otp");
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err: any) {
      setError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (val && !/^\d$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) otpRefs[idx + 1].current?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs[idx - 1].current?.focus();
  };

  const handleVerify = () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError(isRtl ? "يرجى إدخال رمز التحقق كاملاً" : "Please enter the full code");
      return;
    }
    window.sessionStorage.setItem("prime_physio_password_reset_code", code);
    window.location.href = `/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`;
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
            {step === "email"
              ? (isRtl ? "نسيت كلمة المرور؟" : "Forgot Password?")
              : (isRtl ? "أدخل رمز التحقق" : "Enter Verification Code")}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {step === "email"
              ? (isRtl
                  ? "أدخل بريدك الإلكتروني وسنرسل لك رمز التحقق لإعادة تعيين كلمة المرور"
                  : "Enter your email and we'll send you a verification code to reset your password")
              : (isRtl
                  ? `تم إرسال رمز التحقق إلى ${email}`
                  : `Verification code sent to ${email}`)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
          {step === "otp" && devCode && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg p-3 mb-4 text-center">
              {isRtl
                ? `⚠️ وضع التطوير: رمز التحقق هو ${devCode}`
                : `⚠️ Development mode: Verification code is ${devCode}`}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader size={16} color="white" />
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    {isRtl ? "إرسال رمز التحقق" : "Send Verification Code"}
                    <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                  </span>
                )}
              </button>

              <div className="pt-2">
                <Link href="/login" className="text-xs text-[#4F46BA] hover:text-[#4338ca] font-medium transition-colors">
                  {isRtl ? "العودة لتسجيل الدخول" : "Back to Sign In"}
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {isRtl
                    ? "تم إرسال رمز التحقق إلى بريدك الإلكتروني"
                    : "Verification code sent to your email"}
                </span>
              </div>
              <div className="text-xs text-slate-500 text-center">
                {isRtl ? "الرمز صالح لمدة 10 دقائق" : "The code is valid for 10 minutes"}
              </div>

              <div className="flex items-center justify-center gap-2" dir="ltr">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={otpRefs[idx]}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-12 text-center text-lg font-bold border border-slate-200 rounded-lg focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none transition-all"
                  />
                ))}
              </div>

              <button
                onClick={handleVerify}
                disabled={otp.join("").length !== 6}
                className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
              >
                {isRtl ? "تأكيد" : "Confirm"}
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => { setStep("email"); setError(""); setDevCode(""); setOtp(["", "", "", ""]); }}
                  className="text-xs text-[#4F46BA] hover:text-[#4338ca] font-medium transition-colors"
                >
                  {isRtl ? "تغيير البريد الإلكتروني" : "Change email"}
                </button>
                <Link href="/login" className="text-xs text-[#4F46BA] hover:text-[#4338ca] font-medium transition-colors">
                  {isRtl ? "العودة لتسجيل الدخول" : "Back to Sign In"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}