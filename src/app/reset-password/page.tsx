"use client";

import React, { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeClosed, ArrowRight, CheckCircle, Mail } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { Loader } from "@/components/Loader";
import Link from "next/link";

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

export default function ResetPasswordPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email") || "";
    const codeParam = params.get("code") || "";
    if (emailParam) setEmail(emailParam);
    if (codeParam.length === 4) {
      setOtp(codeParam.split("").slice(0, 4));
    }
  }, []);

  const handleOtpChange = (idx: number, val: string) => {
    if (val && !/^\d$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 3) otpRefs[idx + 1].current?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs[idx - 1].current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError(isRtl ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email");
      return;
    }

    const code = otp.join("");
    if (code.length !== 4) {
      setError(isRtl ? "رمز التحقق غير صالح" : "Invalid verification code");
      return;
    }

    if (newPassword.length < 6) {
      setError(isRtl ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(isRtl ? "كلمة المرور غير متطابقة" : "Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (isRtl ? "فشل إعادة تعيين كلمة المرور" : "Failed to reset password"));
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
    } finally {
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
            {isRtl ? "إنشاء كلمة مرور جديدة" : "Create New Password"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? "أدخل رمز التحقق وكلمة المرور الجديدة"
              : "Enter the verification code and your new password"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {isRtl ? "تم إعادة تعيين كلمة المرور بنجاح" : "Password reset successfully"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? "يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة"
                  : "You can now sign in with your new password"}
              </p>
              <Link
                href="/login"
                className="inline-block bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-10 px-6 rounded-lg transition-all duration-200 flex items-center justify-center text-sm"
              >
                {isRtl ? "تسجيل الدخول" : "Sign In"}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4 text-center">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  {isRtl ? "البريد الإلكتروني" : "Email"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 text-slate-700"
                    placeholder="example@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  {isRtl ? "رمز التحقق" : "Verification Code"}
                </label>
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
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  {isRtl ? "كلمة المرور الجديدة" : "New Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                  <Loader size={16} color="white" />
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    {isRtl ? "تغيير كلمة المرور" : "Change Password"}
                    <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                  </span>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link href="/login" className="text-xs text-[#4F46BA] hover:text-[#4338ca] font-medium transition-colors">
                  {isRtl ? "العودة لتسجيل الدخول" : "Back to Sign In"}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}