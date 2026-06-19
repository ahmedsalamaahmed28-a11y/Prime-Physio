"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setAppValue } from "@/lib/appStorage";
import { ShieldAlert, Lock, Eye, EyeOff, CheckCircle2, Zap, Shield, Crown, Check } from "lucide-react";

const PLANS = [
  {
    id: "basic",
    name: "الأساسية",
    nameEn: "STARTER",
    price: "500",
    icon: Zap,
    badge: "أساسي",
    features: [
      { label: "المرضى", value: "50" },
      { label: "الجلسات/شهر", value: "100" },
      { label: "الأخصائيين", value: "20" },
      { label: "إدارة المواعيد", value: "✓" },
    ],
    gradient: "from-slate-400 to-slate-500",
    borderColor: "border-slate-200",
    badgeStyle: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    id: "silver",
    name: "الفضية",
    nameEn: "PROFESSIONAL",
    price: "1,000",
    icon: Shield,
    badge: "الأكثر طلباً",
    featured: true,
    features: [
      { label: "المرضى", value: "200" },
      { label: "الجلسات/شهر", value: "500" },
      { label: "الأخصائيين", value: "50" },
      { label: "التقارير", value: "✓" },
      { label: "التغذية العلاجية", value: "✓" },
    ],
    gradient: "from-teal-500 to-teal-600",
    borderColor: "border-teal-500",
    badgeStyle: "bg-teal-100 text-teal-700 border-teal-200",
  },
  {
    id: "gold",
    name: "الذهبية",
    nameEn: "ENTERPRISE",
    price: "1,500",
    icon: Crown,
    badge: "كامل",
    features: [
      { label: "المرضى", value: "غير محدود" },
      { label: "الجلسات/شهر", value: "غير محدود" },
      { label: "الأخصائيين", value: "غير محدود" },
      { label: "كل المميزات", value: "✓" },
      { label: "دعم VIP", value: "24/7" },
    ],
    gradient: "from-amber-400 via-amber-500 to-yellow-300",
    borderColor: "border-amber-300",
    badgeStyle: "bg-amber-100 text-amber-700 border-amber-200",
  },
];

const FEATURES_EN = [
  { label: "Patients", value: "50" },
  { label: "Sessions/mo", value: "100" },
  { label: "Therapists", value: "20" },
  { label: "Appointments", value: "✓" },
];

const FEATURES_EN_SILVER = [
  { label: "Patients", value: "200" },
  { label: "Sessions/mo", value: "500" },
  { label: "Therapists", value: "50" },
  { label: "Reports", value: "✓" },
  { label: "Nutrition", value: "✓" },
];

const FEATURES_EN_GOLD = [
  { label: "Patients", value: "Unlimited" },
  { label: "Sessions/mo", value: "Unlimited" },
  { label: "Therapists", value: "Unlimited" },
  { label: "All Features", value: "✓" },
  { label: "VIP Support", value: "24/7" },
];

export default function LoginPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeRole, setActiveRole] = useState<"admin" | "doctor" | "receptionist">("doctor");

  const enFeatures = [FEATURES_EN, FEATURES_EN_SILVER, FEATURES_EN_GOLD];

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    await setAppValue("pending_role", activeRole);
    const result = await signIn("credentials", {
      email: cleanEmail,
      password: cleanPassword,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error === "CredentialsSignin"
        ? (isRtl ? "بيانات الدخول غير صحيحة" : "Invalid login credentials")
        : result.error);
      setIsSubmitting(false);
      return;
    }

    setSuccessMsg(isRtl ? "تم تسجيل الدخول بنجاح" : "Logged in successfully");
    setIsSubmitting(false);
    window.location.href = "/";
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsSubmitting(true);

    await setAppValue("pending_role", activeRole);
    await setAppValue("pending_google_signup", "true");

    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#085454] via-[#0b7373] to-[#0d8a8a] flex items-start justify-center p-4 md:p-8 overflow-x-hidden" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 items-start mt-4 md:mt-12">
        {/* ── Login Card ───────────────────────────────────────────────────── */}
        <div className="w-full lg:w-[380px] shrink-0 bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/10 p-6 space-y-4">
          <div className="text-center space-y-1">
            <div className="flex flex-col items-center justify-center mb-3">
              <div className="bg-gradient-to-br from-[#0d8a8a] to-[#085454] p-3 rounded-2xl shadow-xl border border-white/20">
                <img src="/logo.png" alt="Prime Physio Logo" className="h-20 w-auto object-contain drop-shadow-md brightness-110" />
              </div>
            </div>
            <h1 className="text-lg font-bold text-slate-800">{isRtl ? "تسجيل الدخول" : "Secure Login"}</h1>
            <p className="text-[10px] text-slate-500">{isRtl ? "نظام إدارة عيادات متكامل" : "Clinic management system"}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
            {(["admin", "doctor", "receptionist"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setActiveRole(role)}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  activeRole === role ? "bg-[#0d8a8a] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {role === "admin" ? (isRtl ? "مدير" : "Admin") : role === "doctor" ? (isRtl ? "طبيب/أخصائي" : "Doctor") : (isRtl ? "استقبال" : "Reception")}
              </button>
            ))}
          </div>

          {activeRole === "admin" ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl p-3 text-center">
                {isRtl
                  ? "تسجيل الدخول متاح فقط عبر Google للمديرين لحماية الحساب"
                  : "Admin access is only available via Google login for maximum security"}
              </div>
              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="w-full bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] text-sm flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
                  <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
                  <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
                  <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
                </svg>
                {isRtl ? "تسجيل الدخول كمدير عبر Google" : "Sign in as Admin with Google"}
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleManualLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block pr-1">{isRtl ? "البريد الإلكتروني" : "Email"}</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@primephysio.com"
                    autoComplete="email"
                    className="bg-slate-50 border-slate-200 focus-visible:ring-[#0d8a8a] rounded-xl"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block pr-1">{isRtl ? "كلمة المرور" : "Password"}</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      autoComplete="current-password"
                      className="bg-slate-50 border-slate-200 focus-visible:ring-[#0d8a8a] rounded-xl pr-10"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mt-1 px-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-800 transition-colors">
                    <input type="checkbox" className="rounded text-[#0d8a8a] focus:ring-[#0d8a8a]" />
                    <span>{isRtl ? "تذكرني" : "Remember me"}</span>
                  </label>
                  <Link href="/security" className="text-[#0d8a8a] font-bold hover:underline">
                    {isRtl ? "نسيت كلمة المرور" : "Forgot password"}
                  </Link>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full bg-[#0d8a8a] hover:bg-[#085454] text-white font-bold py-2 rounded-xl transition-all shadow-md active:scale-[0.98] text-sm">
                  <Lock className="w-4 h-4" />
                  {isSubmitting ? (isRtl ? "جاري تسجيل الدخول..." : "Signing in...") : (isRtl ? "تسجيل الدخول" : "Sign In")}
                </Button>
              </form>

              <div className="flex items-center gap-3">
                <span className="h-[1px] bg-slate-100 flex-grow" />
                <span className="text-[10px] font-bold text-slate-400">{isRtl ? "أو" : "Or"}</span>
                <span className="h-[1px] bg-slate-100 flex-grow" />
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-xl transition-all shadow-sm active:scale-[0.98] text-sm flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
                  <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
                  <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
                  <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
                </svg>
                {isRtl ? "الدخول عبر Google" : "Continue with Google"}
              </button>
            </>
          )}

          <div className="text-center text-xs text-slate-500">
            {isRtl ? "ليس لديك حساب؟ " : "Don't have an account? "}
            <Link href="/signup" className="font-bold text-[#0d8a8a] hover:underline">
              {isRtl ? "إنشاء حساب جديد" : "Create one"}
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600 leading-5">
            <p className="font-bold text-slate-700 mb-1">{isRtl ? "ملاحظة" : "Note"}</p>
            <p>{isRtl ? "جميع البيانات مشفرة وآمنة." : "All data is encrypted and secure."}</p>
          </div>
        </div>

        {/* ── Pricing Plans ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-white drop-shadow-sm">
              {isRtl ? "خطط الاشتراك" : "Subscription Plans"}
            </h2>
            <p className="text-sm text-white/80 mt-1">
              {isRtl ? "اختر الخطة المناسبة لعيادتك" : "Choose the right plan for your clinic"}
            </p>
          </div>
          <div className="flex flex-wrap items-stretch justify-center gap-4">
            {PLANS.map((plan, idx) => {
              const Icon = plan.icon;
              const features = isRtl ? plan.features : enFeatures[idx];

              return (
                <div
                  key={plan.id}
                  className={`w-56 text-center p-5 rounded-2xl relative flex flex-col ${
                    plan.featured
                      ? "bg-white text-slate-800 border-2 border-teal-400 shadow-xl shadow-teal-900/20 scale-105"
                      : "bg-white/95 text-slate-800 border border-white/30 backdrop-blur-sm"
                  }`}
                >
                  {plan.featured && (
                    <p className="absolute px-2.5 text-[10px] -top-3 left-1/2 -translate-x-1/2 py-1 bg-teal-500 text-white rounded-full font-bold whitespace-nowrap shadow-md">
                      {isRtl ? plan.badge : "Most Popular"}
                    </p>
                  )}

                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mx-auto mb-3 shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <p className="font-bold text-sm">{isRtl ? plan.name : plan.nameEn}</p>

                  <div className="mt-2 mb-4">
                    <span className="text-3xl font-extrabold">{plan.price}</span>
                    <span className="text-[10px] text-slate-500 mr-1">{isRtl ? "ج.م/شهر" : "EGP/mo"}</span>
                  </div>

                  <ul className="list-none text-xs space-y-1.5 flex-1">
                    {features.map((f: { label: string; value: string }) => (
                      <li key={f.label} className="flex items-center gap-1.5">
                        <Check className={`w-3.5 h-3.5 shrink-0 ${plan.featured ? "text-teal-500" : "text-teal-600"}`} />
                        <span className="text-slate-600">{f.label}</span>
                        <span className="font-bold text-slate-800 mr-auto text-[10px]">{f.value}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className={`w-full py-2 rounded-xl text-xs font-bold text-center ${
                      plan.featured
                        ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {isRtl ? `باقة ${plan.name}` : plan.nameEn}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
