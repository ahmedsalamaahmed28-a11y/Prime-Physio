"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useAuth } from "@/lib/auth";
import { setAppValue } from "@/lib/appStorage";
import Link from "next/link";
import { ShieldAlert, Check } from "lucide-react";

export default function SignupPage() {
  const { registerWithSupabase } = useAuth();
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"doctor" | "receptionist">("doctor");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleManualSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!clinicName || !email || !phone || !password || !confirmPassword) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("البريد الإلكتروني غير صحيح");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمة المرور غير متطابقة في الحقلين");
      return;
    }
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      setError("كلمة المرور ضعيفة! يجب ألا تقل عن 8 أحرف، وتحتوي على حرف كبير، حرف صغير، ورقم");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, clinicName, phone, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error === "User already registered"
          ? "البريد الإلكتروني مسجل بالفعل - يمكنك تسجيل الدخول مباشرة"
          : data.error || "فشل إنشاء الحساب");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("فشل الاتصال بالخادم");
    }
    setIsLoading(false);
  };

  const handleGoogleSignup = async () => {
    setError("");
    setIsLoading(true);

    await setAppValue("pending_role", role);

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
          <p className="text-xs text-slate-500">سجل حسابك للبدء في إدارة عيادتك</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>تم إنشاء الحساب بنجاح!</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              تم إرسال رابط تأكيد إلى بريدك الإلكتروني. بعد التأكيد، يمكنك
              {' '}
              <Link href="/login" className="font-bold text-emerald-800 underline">
                تسجيل الدخول من هنا
              </Link>
            </p>
          </div>
        )}

        {!success && (
          <form onSubmit={handleManualSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl mb-2">
              {(["doctor", "receptionist"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    role === r
                      ? "bg-[#0d8a8a] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {r === "doctor" ? "طبيب معالج" : "موظف استقبال"}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block pr-1">اسم العيادة / المركز</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => { setError(""); setClinicName(e.target.value); }}
                placeholder="عيادة برايم للعلاج الطبيعي"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0d8a8a] rounded-xl px-4 py-2 text-sm outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block pr-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setError(""); setEmail(e.target.value); }}
                placeholder="example@primephysio.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0d8a8a] rounded-xl px-4 py-2 text-sm outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block pr-1">رقم الهاتف</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setError(""); setPhone(e.target.value); }}
                placeholder="01xxxxxxxxx"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0d8a8a] rounded-xl px-4 py-2 text-sm outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block pr-1">كلمة المرور</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setError(""); setPassword(e.target.value); }}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0d8a8a] rounded-xl px-4 py-2 text-sm outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block pr-1">تأكيد كلمة المرور</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setError(""); setConfirmPassword(e.target.value); }}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0d8a8a] rounded-xl px-4 py-2 text-sm outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-500">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword((v) => !v)}
                className="rounded text-[#0d8a8a] focus:ring-[#0d8a8a]"
              />
              إظهار كلمة المرور
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full text-white font-bold py-2.5 rounded-xl transition-all shadow-md text-sm ${
                isLoading ? "bg-slate-400 cursor-not-allowed" : "bg-[#0d8a8a] hover:bg-[#085454] active:scale-[0.98]"
              }`}
            >
              {isLoading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
            </button>
          </form>
        )}

        {!success && (
          <>
            <div className="flex items-center justify-between gap-3 my-1">
              <span className="h-[1px] bg-slate-100 flex-grow" />
              <span className="text-[10px] font-bold text-slate-400">أو عن طريق</span>
              <span className="h-[1px] bg-slate-100 flex-grow" />
            </div>

            <button
              onClick={handleGoogleSignup}
              disabled={isLoading}
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] text-sm cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              التسجيل بواسطة Google
            </button>
          </>
        )}

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
