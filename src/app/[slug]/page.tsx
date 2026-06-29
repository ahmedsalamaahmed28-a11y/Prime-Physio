"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useAuth } from "@/lib/auth";
import { Mail, Lock, Eye, EyeClosed, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { Loader } from "@/components/Loader";
import { cn } from "@/lib/utils";

interface BranchData {
  id: string;
  short_name: string;
  full_name: string;
  slug: string;
  logo_url: string | null;
  clinic_id: string;
}

export default function BrandedLoginPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [branch, setBranch] = useState<BranchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const { data: session, status } = useSession();
  const { user } = useAuth();

  useEffect(() => {
    if ((status === "authenticated" || user) && branch) {
      if (branch.clinic_id) {
        sessionStorage.setItem("preferred_clinic_id", branch.clinic_id);
      }
      window.location.href = "/home";
    }
  }, [status, user, branch]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/branches/by-slug?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.branch) {
          setBranch(data.branch);
        } else {
          setError(isRtl ? "المركز غير موجود" : "Center not found");
        }
        setLoading(false);
      })
      .catch(() => {
        setError(isRtl ? "حدث خطأ في الاتصال" : "Connection error");
        setLoading(false);
      });
  }, [slug, isRtl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setLoginError(isRtl ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password");
        setLoginLoading(false);
        return;
      }

      // Store clinic context for dashboard
      if (branch?.clinic_id) {
        sessionStorage.setItem("preferred_clinic_id", branch.clinic_id);
      }

      window.location.href = "/home";
    } catch {
      setLoginError(isRtl ? "حدث خطأ في الاتصال" : "Connection error");
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f9ff] to-white" dir={isRtl ? "rtl" : "ltr"}>
        <Loader size={32} color="#4F46BA" />
      </div>
    );
  }

  if (error && !branch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f9ff] to-white" dir={isRtl ? "rtl" : "ltr"}>
        <div className="text-center space-y-4">
          <h1 className="text-lg font-bold text-slate-800">
            {isRtl ? "المركز غير موجود" : "Center Not Found"}
          </h1>
          <p className="text-sm text-slate-400">
            {isRtl
              ? "المركز الذي تبحث عنه غير موجود أو تم إزالته"
              : "The center you're looking for doesn't exist or has been removed."}
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2 bg-[#4F46BA] text-white font-medium rounded-xl text-sm"
          >
            {isRtl ? "العودة للصفحة الرئيسية" : "Back to Home"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {branch?.logo_url ? (
              <img src={branch.logo_url} alt="" className="w-7 h-7 object-contain rounded" />
            ) : (
              <img src="/logo.png" alt="Prime Physio" className="w-7 h-7 object-contain" />
            )}
            <span className="text-sm font-bold text-[#4F46BA]">
              {branch?.short_name || "Prime Physio"}
            </span>
          </div>
          <Link
            href="/login"
            className="text-xs text-slate-400 hover:text-[#4F46BA] transition-colors"
          >
            {isRtl ? "جميع المراكز" : "All Centers"}
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {branch?.logo_url ? (
                <img src={branch.logo_url} alt={branch.short_name} className="w-20 h-20 object-contain rounded-2xl shadow-lg border border-slate-100" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4F46BA] to-[#7c3aed] flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {branch?.short_name?.substring(0, 2) || "PP"}
                  </span>
                </div>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-800">{branch?.full_name || branch?.short_name}</h1>
            <p className="text-xs text-slate-400 mt-1">
              {isRtl ? "تسجيل الدخول للوحة التحكم" : "Sign in to the dashboard"}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4 text-center">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  {isRtl ? "البريد الإلكتروني" : "Email"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  {isRtl ? "كلمة المرور" : "Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeClosed className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-11 rounded-xl transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50 shadow-md"
              >
                {loginLoading ? (
                  <Loader size={16} color="white" />
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    {isRtl ? "تسجيل الدخول" : "Sign In"}
                    <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                  </span>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-4">
              {isRtl ? "جميع المراكز تستخدم نفس البريد الإلكتروني وكلمة المرور" : "All centers use the same email and password"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
