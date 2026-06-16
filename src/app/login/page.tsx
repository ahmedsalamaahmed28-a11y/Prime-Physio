"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setAppValue } from "@/lib/appStorage";
import { ShieldAlert, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const { loginWithSupabase } = useAuth();
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeRole, setActiveRole] = useState<"admin" | "doctor" | "receptionist">("doctor");

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const { error: loginError } = await loginWithSupabase(cleanEmail, cleanPassword);
    if (loginError) {
      setError(loginError.includes("Invalid login credentials")
        ? (isRtl ? "بيانات الدخول غير صحيحة" : "Invalid login credentials")
        : loginError);
      setIsSubmitting(false);
      return;
    }

    setSuccessMsg(isRtl ? "تم تسجيل الدخول بنجاح" : "Logged in successfully");
    setIsSubmitting(false);
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsSubmitting(true);

    await setAppValue("pending_role", activeRole);

    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#085454] via-[#0b7373] to-[#0d8a8a] flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/10 p-6 space-y-4">
        <div className="text-center space-y-1">
          <div className="flex flex-col items-center justify-center mb-3">
            <div className="bg-gradient-to-br from-[#0d8a8a] to-[#085454] p-3 rounded-2xl shadow-xl border border-white/20">
              <img src="/logo.png" alt="Prime Physio Logo" className="h-24 w-auto object-contain drop-shadow-md brightness-110" />
            </div>
          </div>
          <h1 className="text-lg font-bold text-slate-800">{isRtl ? "بوابة تسجيل الدخول الآمن" : "Secure Login"}</h1>
          <p className="text-[10px] text-slate-500">{isRtl ? "نظام إدارة عيادات العلاج الطبيعي" : "Clinic management system"}</p>
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
              {role === "admin" ? (isRtl ? "مدير" : "Admin") : role === "doctor" ? (isRtl ? "طبيب معالج" : "Doctor") : (isRtl ? "استقبال" : "Reception")}
            </button>
          ))}
        </div>

        {activeRole === "admin" ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl p-3 text-center">
              {isRtl
                ? "الدخول كمدير يتم عبر حساب Google فقط للحفاظ على أعلى مستوى أمان"
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
              {isRtl ? "الدخول كمدير عبر Google" : "Sign in as Admin with Google"}
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
                    placeholder="••••••••"
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
                  <span>{isRtl ? "تذكرني على هذا الجهاز" : "Remember me"}</span>
                </label>
                <Link href="/security" className="text-[#0d8a8a] font-bold hover:underline">
                  {isRtl ? "الأمان" : "Security"}
                </Link>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full bg-[#0d8a8a] hover:bg-[#085454] text-white font-bold py-2 rounded-xl transition-all shadow-md active:scale-[0.98] text-sm">
                <Lock className="w-4 h-4" />
                {isSubmitting ? (isRtl ? "جارِ التحقق..." : "Signing in...") : (isRtl ? "تسجيل الدخول" : "Sign In")}
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <span className="h-[1px] bg-slate-100 flex-grow" />
              <span className="text-[10px] font-bold text-slate-400">{isRtl ? "أو عبر" : "Or continue with"}</span>
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
          {isRtl ? "لا تملك حساباً؟" : "Don't have an account?"}{" "}
          <Link href="/signup" className="font-bold text-[#0d8a8a] hover:underline">
            {isRtl ? "أنشئ حساباً جديداً" : "Create one"}
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600 leading-5">
          <p className="font-bold text-slate-700 mb-1">{isRtl ? "تنبيه" : "Note"}</p>
          <p>{isRtl ? "جميع البيانات مشفرة وآمنة. يتم تسجيل الدخول عبر خوادم آمنة." : "All data is encrypted and secure."}</p>
        </div>
      </div>
    </div>
  );
}
