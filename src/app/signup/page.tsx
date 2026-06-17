"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { setAppValue } from "@/lib/appStorage";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignup = async () => {
    setError("");
    setIsLoading(true);

    await setAppValue("pending_google_signup", "true");
    await setAppValue("pending_role", "admin");

    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#085454] via-[#0b7373] to-[#0d8a8a] flex items-center justify-center p-4" dir="rtl">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/10 p-8 space-y-6">

        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <div className="text-center pt-2">
              <span className="font-extrabold text-3xl text-[#0d8a8a] tracking-widest block">PRIME PHYSIO</span>
              <span className="text-[10px] text-[#085454]/70 block tracking-widest mt-1 font-bold">PHYSICAL THERAPY CLINIC</span>
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-800">إنشاء حساب جديد</h1>
          <p className="text-xs text-slate-500">سجل بحساب Google لبدء إدارة عيادتك</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleGoogleSignup}
          disabled={isLoading}
          type="button"
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all shadow-md active:scale-[0.98] text-sm cursor-pointer"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          {isLoading ? "جاري التحويل إلى Google..." : "التسجيل بواسطة Google"}
        </button>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 leading-relaxed space-y-1">
          <p className="font-bold">لماذا Google؟</p>
          <p>
            نستخدم حساب Google للتأكد من أن الحساب حقيقي وموثق. بعد التسجيل سيتم إنشاء عيادتك تلقائياً.
          </p>
        </div>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-[#0d8a8a] font-bold hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>

      </div>

    </div>
  );
}
