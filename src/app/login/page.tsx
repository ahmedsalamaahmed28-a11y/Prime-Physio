"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useLanguage } from "@/lib/LanguageContext";
import { setAppValue } from "@/lib/appStorage";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Eye, EyeClosed, ArrowRight, ShieldAlert, CheckCircle2, X, Activity, Users, Calendar, TrendingUp, Quote } from "lucide-react";
import { CustomCheckbox } from "@/components/ui/checkbox";

export default function LoginPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "reset" | "success">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState(["", "", "", ""]);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotShowCode, setForgotShowCode] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    if (forgotStep === "otp") {
      otpRefs[0].current?.focus();
    }
  }, [forgotStep]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();
    const result = await signIn("credentials", {
      email: cleanEmail,
      password: password.trim(),
      redirect: false,
    });

    if (result?.error) {
      setError(result.error === "CredentialsSignin"
        ? (isRtl ? "بيانات الدخول غير صحيحة" : "Invalid login credentials")
        : result.error);
      setIsSubmitting(false);
      return;
    }

    window.location.href = "/";
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsSubmitting(true);
    await setAppValue("pending_role", "admin");
    await setAppValue("pending_google_signup", "true");
    signIn("google", { callbackUrl: "/" });
  };

  const handleForgotSendEmail = async () => {
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
      if (!res.ok) throw new Error(data.error || (isRtl ? "فشل إرسال الرمز" : "Failed to send code"));
      if (data.devCode) setForgotShowCode(data.devCode);
      setForgotLoading(false);
      setForgotStep("otp");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
      setForgotLoading(false);
    }
  };

  const handleForgotOtpChange = (idx: number, val: string) => {
    if (val && !/^\d$/.test(val)) return;
    const newOtp = [...forgotOtp];
    newOtp[idx] = val;
    setForgotOtp(newOtp);
    if (val && idx < 3) otpRefs[idx + 1].current?.focus();
  };

  const handleForgotOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !forgotOtp[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  const handleForgotVerifyOtp = async () => {
    const code = forgotOtp.join("");
    if (code.length !== 4) {
      setForgotError(isRtl ? "يرجى إدخال رمز التحقق كاملاً" : "Please enter the full code");
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "رمز غير صحيح" : "Invalid code"));
      setForgotLoading(false);
      setForgotStep("reset");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async () => {
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), code: forgotOtp.join(""), newPassword: forgotNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "فشل تحديث كلمة المرور" : "Failed to update password"));
      setForgotLoading(false);
      setForgotStep("success");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
      setForgotLoading(false);
    }
  };

  const navTabs = [
    { key: "centers", ar: "المراكز", en: "Centers" },
    { key: "management", ar: "إدارة", en: "Management" },
    { key: "packages", ar: "الباقات", en: "Packages" },
    { key: "about", ar: "من نحن", en: "About" },
    { key: "support", ar: "الدعم", en: "Support" },
  ];

  const features = [
    { icon: Activity, ar: "سجلات طبية ذكية", en: "Smart Medical Records", descAr: "إدارة متكاملة لملفات المرضى مع توثيق آلي", descEn: "Complete patient file management with auto-documentation" },
    { icon: Calendar, ar: "جدولة مواعيد ذكية", en: "Smart Scheduling", descAr: "نظام حجز متطور مع تذكيرات تلقائية", descEn: "Advanced booking system with auto reminders" },
    { icon: Users, ar: "فريق عمل متكامل", en: "Team Management", descAr: "إدارة صلاحيات الأطباء والموظفين بسهولة", descEn: "Easy doctor and staff permission management" },
    { icon: TrendingUp, ar: "تقارير وتحليلات", en: "Reports & Analytics", descAr: "إحصائيات دقيقة لأداء العيادة والإيرادات", descEn: "Accurate clinic performance and revenue stats" },
  ];

  const testimonials = [
    { textAr: "من أفضل أنظمة إدارة العيادات اللي استخدمتها. وفر علينا وقت ومجهود كبير.", textEn: "One of the best clinic management systems I've used. Saved us so much time and effort.", nameAr: "د. أحمد سالم", nameEn: "Dr. Ahmed Salem", roleAr: "استشاري علاج طبيعي", roleEn: "PT Consultant" },
    { textAr: "بعد استخدام Prime Physio، زادت إنتاجية العيادة بشكل ملحوظ.", textEn: "After using Prime Physio, our clinic productivity increased significantly.", nameAr: "د. محمد علي", nameEn: "Dr. Mohamed Ali", roleAr: "أخصائي علاج طبيعي", roleEn: "PT Specialist" },
  ];

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      {/* Navbar */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Prime Physio" className="w-7 h-7 object-contain" />
              <span className="text-sm font-bold text-[#4F46BA]">Prime Physio</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {navTabs.map((tab) => (
                <span key={tab.key} className="px-3 py-1.5 text-xs font-medium text-slate-500 rounded-lg cursor-pointer hover:text-[#4F46BA] hover:bg-slate-50 transition-all">
                  {isRtl ? tab.ar : tab.en}
                </span>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-[calc(100vh-4rem)] flex items-center py-12 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 w-full items-center">

            {/* Right side - Content */}
            <div className={`${isRtl ? "lg:order-2" : "lg:order-1"}`}>
              <div className="max-w-lg mx-auto lg:mx-0">
                <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-[#4F46BA] tracking-wide">
                    {isRtl ? "نظام إدارة عيادات متكامل" : "All-in-One Clinic Management"}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight mb-4">
                  {isRtl ? (
                    <>الطريق نحو عيادة<br />أكثر <span className="text-[#4F46BA]">كفاءة</span> و<span className="text-[#4F46BA]">تنظيماً</span></>
                  ) : (
                    <>The Path to a More<br /><span className="text-[#4F46BA]">Efficient</span> & <span className="text-[#4F46BA]">Organized</span> Clinic</>
                  )}
                </h1>

                <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-8">
                  {isRtl
                    ? "منصة متكاملة لإدارة عيادات العلاج الطبيعي — سجلات طبية، جدولة مواعيد، فواتير، تقارير، وأكثر. كل ما تحتاجه لإدارة عيادتك بكفاءة."
                    : "A complete platform for physical therapy clinics — medical records, scheduling, billing, reports, and more. Everything you need to run your clinic efficiently."
                  }
                </p>

                <div className="grid sm:grid-cols-2 gap-4 mb-10">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <f.icon className="w-4 h-4 text-[#4F46BA]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{isRtl ? f.ar : f.en}</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{isRtl ? f.descAr : f.descEn}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Testimonials */}
                <div className="hidden lg:block space-y-4">
                  {testimonials.map((t, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <Quote className="w-3 h-3 text-[#4F46BA] mb-1 opacity-50" />
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        {isRtl ? `"${t.textAr}"` : `"${t.textEn}"`}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#4F46BA] flex items-center justify-center text-[9px] font-bold text-white">
                          {isRtl ? t.nameAr.charAt(2) : t.nameEn.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-700">{isRtl ? t.nameAr : t.nameEn}</p>
                          <p className="text-[9px] text-slate-400">{isRtl ? t.roleAr : t.roleEn}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Left side - Login Form */}
            <div className={`${isRtl ? "lg:order-1" : "lg:order-2"}`}>
              <div className="max-w-sm mx-auto w-full">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800">{isRtl ? "تسجيل الدخول" : "Sign In"}</h2>
                    <p className="text-xs text-slate-400 mt-1">{isRtl ? "مرحباً بعودتك!" : "Welcome back!"}</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4 text-center flex items-center justify-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {successMsg && (
                    <div className="bg-green-50 border border-green-200 text-green-600 text-xs rounded-lg p-3 mb-4 text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">{isRtl ? "البريد الإلكتروني" : "Email"}</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="example@primephysio.com"
                          className="w-full pl-10 text-slate-700 bg-white"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">{isRtl ? "كلمة المرور" : "Password"}</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 text-slate-700 bg-white"
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-300 hover:text-slate-500 transition-colors"
                        >
                          {showPassword ? <EyeClosed className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <CustomCheckbox
                          id="remember-me"
                          checked={rememberMe}
                          onChange={() => setRememberMe(!rememberMe)}
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
                      disabled={isSubmitting}
                      className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          {isRtl ? "تسجيل الدخول" : "Sign In"}
                          <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                        </span>
                      )}
                    </button>
                  </form>

                  <div className="relative flex items-center py-2 my-2">
                    <div className="flex-grow border-t border-slate-100" />
                    <span className="mx-3 text-xs text-slate-300">{isRtl ? "أو" : "or"}</span>
                    <div className="flex-grow border-t border-slate-100" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
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

                  <p className="text-center text-xs text-slate-400 mt-4">
                    {isRtl ? "ليس لديك حساب؟" : "Don't have an account?"}{' '}
                    <Link href="/signup" className="text-[#4F46BA] hover:text-[#4338ca] font-medium transition-colors">
                      {isRtl ? "إنشاء حساب" : "Create one"}
                    </Link>
                  </p>
                </div>

                {/* Mobile testimonials */}
                <div className="lg:hidden mt-6 space-y-3">
                  {testimonials.map((t, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <Quote className="w-3 h-3 text-[#4F46BA] mb-1 opacity-50" />
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        {isRtl ? `"${t.textAr}"` : `"${t.textEn}"`}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#4F46BA] flex items-center justify-center text-[9px] font-bold text-white">
                          {isRtl ? t.nameAr.charAt(2) : t.nameEn.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-700">{isRtl ? t.nameAr : t.nameEn}</p>
                          <p className="text-[9px] text-slate-400">{isRtl ? t.roleAr : t.roleEn}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowForgotModal(false); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-8 relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-3 left-3 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {forgotStep === "email" && (
              <div className="space-y-4">
                <div className="text-center">
                  <Lock className="w-8 h-8 text-[#4F46BA] mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">{isRtl ? "نسيت كلمة المرور" : "Forgot Password"}</h3>
                  <p className="text-xs text-slate-400 mt-1">{isRtl ? "أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور" : "Enter your email to reset your password"}</p>
                </div>

                {forgotError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 text-center">{forgotError}</div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">{isRtl ? "البريد الإلكتروني" : "Email"}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="example@primephysio.com"
                      className="w-full pl-10 text-slate-700 bg-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleForgotSendEmail}
                  disabled={forgotLoading}
                  className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-10 rounded-lg transition-all duration-200 text-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1">
                      {isRtl ? "إرسال رمز التحقق" : "Send Code"}
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    </span>
                  )}
                </button>
              </div>
            )}

            {forgotStep === "otp" && (
              <div className="space-y-4">
                <div className="text-center">
                  <ShieldAlert className="w-8 h-8 text-[#4F46BA] mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">{isRtl ? "تأكيد رمز التحقق" : "Verify Code"}</h3>
                  <p className="text-xs text-slate-400 mt-1">{isRtl ? `أدخل الرمز المرسل إلى ${forgotEmail}` : `Enter the code sent to ${forgotEmail}`}</p>
                </div>

                {forgotError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 text-center">{forgotError}</div>
                )}

                {forgotShowCode && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg p-2 text-center">
                    {isRtl ? `رمز التحقق: ${forgotShowCode}` : `Dev code: ${forgotShowCode}`}
                  </div>
                )}

                <div className="flex items-center justify-center gap-3" dir="ltr">
                  {forgotOtp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={otpRefs[idx]}
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
                  onClick={handleForgotVerifyOtp}
                  disabled={forgotLoading || forgotOtp.join("").length !== 4}
                  className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-10 rounded-lg transition-all duration-200 text-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1">
                      {isRtl ? "تأكيد" : "Verify"}
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    </span>
                  )}
                </button>

                <button onClick={() => setForgotStep("email")} className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  {isRtl ? "تغيير البريد الإلكتروني" : "Change email"}
                </button>
              </div>
            )}

            {forgotStep === "reset" && (
              <div className="space-y-4">
                <div className="text-center">
                  <Lock className="w-8 h-8 text-[#4F46BA] mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">{isRtl ? "كلمة مرور جديدة" : "New Password"}</h3>
                  <p className="text-xs text-slate-400 mt-1">{isRtl ? "أدخل كلمة المرور الجديدة" : "Enter your new password"}</p>
                </div>

                {forgotError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 text-center">{forgotError}</div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">{isRtl ? "كلمة المرور الجديدة" : "New Password"}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 text-slate-700 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">{isRtl ? "تأكيد كلمة المرور" : "Confirm Password"}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 text-slate-700 bg-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleForgotResetPassword}
                  disabled={forgotLoading}
                  className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-10 rounded-lg transition-all duration-200 text-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1">
                      {isRtl ? "تحديث كلمة المرور" : "Update Password"}
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    </span>
                  )}
                </button>
              </div>
            )}

            {forgotStep === "success" && (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-slate-800">{isRtl ? "تم تحديث كلمة المرور" : "Password Updated"}</h3>
                <p className="text-xs text-slate-400">{isRtl ? "تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول." : "Your password has been updated. You can now sign in."}</p>
                <button
                  onClick={() => { setShowForgotModal(false); }}
                  className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-10 rounded-lg transition-all duration-200 text-sm"
                >
                  {isRtl ? "تسجيل الدخول" : "Sign In"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Prime Physio" className="w-5 h-5 object-contain" />
            <span className="text-[10px] font-bold text-slate-400">Prime Physio © 2026</span>
          </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
            <span className="cursor-pointer hover:text-slate-600 transition-colors">{isRtl ? "سياسة الخصوصية" : "Privacy"}</span>
            <span className="cursor-pointer hover:text-slate-600 transition-colors">{isRtl ? "الشروط" : "Terms"}</span>
            <Link href="/login" className="cursor-pointer hover:text-slate-600 transition-colors">{isRtl ? "اتصل بنا" : "Contact"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
