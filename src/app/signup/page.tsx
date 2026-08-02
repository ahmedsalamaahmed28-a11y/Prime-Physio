"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { setAppValue } from "@/lib/appStorage";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { Loader } from "@/components/Loader";
import SetupSteps from "@/components/SetupSteps";
import { AlertCircle } from "lucide-react";

function SignupPageContent() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignup = async () => {
    setError("");
    setIsLoading(true);
    try {
      await setAppValue("pending_google_signup", "true");
      const result = await signIn("google", { callbackUrl: "/home", redirect: false });
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
    <>
      <SetupSteps />
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex flex-col items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src="/logo.png" alt="Prime Physio" className="w-10 h-10 object-contain" />
              <span className="text-lg font-bold text-[#4F46BA]">Prime Physio</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              {isRtl ? "إنشاء عيادة جديدة" : "Create New Clinic"}
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              {isRtl ? "سجل الآن لبدء إدارة عيادتك بسهولة" : "Sign up now to start managing your clinic easily"}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-4 mb-6 text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 mb-8 text-center">
              <p className="text-[13px] leading-relaxed text-blue-800 font-medium">
                {isRtl
                  ? "تسجيل حساب مدير عيادة جديد متاح فقط عبر حساب Google. إذا كنت طبيباً أو موظف استقبال، سيقوم مدير العيادة بإضافتك وإرسال بيانات الدخول إليك."
                  : "Creating a new clinic admin account is only available via Google. If you are a doctor or receptionist, your clinic admin will create your account and provide login details."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="w-full border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold h-12 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 text-sm shadow-sm active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader size={20} />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
                    <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
                    <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
                    <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
                  </svg>
                  {isRtl ? "التسجيل كمدير عيادة بـ Google" : "Sign up as Admin with Google"}
                </>
              )}
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-8 font-medium">
            {isRtl ? "لديك حساب بالفعل؟" : "Already have an account?"}{' '}
            <Link href="/login" className="text-[#4F46BA] hover:text-[#4338ca] font-bold transition-colors">
              {isRtl ? "تسجيل الدخول" : "Sign in"}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageContent />
    </Suspense>
  );
}