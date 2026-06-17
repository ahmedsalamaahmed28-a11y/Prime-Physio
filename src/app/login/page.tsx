"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useLanguage } from "@/lib/LanguageContext";
import { setAppValue } from "@/lib/appStorage";
import { ShieldAlert, CheckCircle2 } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-[#085454] via-[#0b7373] to-[#0d8a8a] flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>

      <form onSubmit={handleManualLogin} className="form_main">

        <p className="heading">{isRtl ? "تسجيل الدخول" : "Login"}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2 w-full mb-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl p-3 flex items-center gap-2 w-full mb-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl w-full mb-2">
          {(["admin", "doctor", "receptionist"] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                activeRole === role ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {role === "admin" ? (isRtl ? "مدير" : "Admin") : role === "doctor" ? (isRtl ? "طبيب" : "Doctor") : (isRtl ? "استقبال" : "Reception")}
            </button>
          ))}
        </div>

        {activeRole === "admin" ? (
          <div className="w-full space-y-3">
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl p-3 text-center leading-relaxed">
              {isRtl
                ? "الدخول كمدير متاح عبر Google فقط" : "Admin: Google login only"}
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              id="button"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
                <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
                <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
                <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
              </svg>
              {isRtl ? "الدخول عبر Google" : "Sign in with Google"}
            </button>
          </div>
        ) : (
          <>
            <div className="inputContainer">
              <svg viewBox="0 0 16 16" fill="#2e2e2e" height="16" width="16" xmlns="http://www.w3.org/2000/svg" className="inputIcon">
                <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914z"></path>
              </svg>
              <input
                placeholder={isRtl ? "البريد الإلكتروني" : "Email"}
                id="email"
                className="inputField"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={{ direction: "ltr" }}
              />
            </div>

            <div className="inputContainer">
              <svg viewBox="0 0 16 16" fill="#2e2e2e" height="16" width="16" xmlns="http://www.w3.org/2000/svg" className="inputIcon">
                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
              </svg>
              <input
                placeholder={isRtl ? "كلمة المرور" : "Password"}
                id="password"
                className="inputField"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute text-slate-400 hover:text-slate-600 text-[11px] font-bold cursor-pointer shrink-0"
                style={{ [isRtl ? "left" : "right"]: "10px", background: "none", border: "none", padding: 0 }}
              >
                {showPassword ? (isRtl ? "إخفاء" : "Hide") : (isRtl ? "إظهار" : "Show")}
              </button>
            </div>

            <button id="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isRtl ? "جارِ التحقق..." : "Signing in...") : (isRtl ? "تسجيل الدخول" : "Submit")}
            </button>
          </>
        )}

        {activeRole !== "admin" && (
          <>
            <div className="flex items-center gap-3 w-full my-1">
              <span className="h-[1px] bg-slate-200 flex-grow" />
              <span className="text-[10px] font-bold text-slate-400">{isRtl ? "أو" : "or"}</span>
              <span className="h-[1px] bg-slate-200 flex-grow" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              id="button"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
                <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
                <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
                <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
              </svg>
              Google
            </button>
          </>
        )}

        <div className="signupContainer">
          <p>{isRtl ? "ليس لديك حساب؟" : "Don't have any account?"}</p>
          <Link href="/signup">{isRtl ? "إنشاء حساب" : "Sign up"}</Link>
        </div>

      </form>

      <style jsx>{`
        .form_main {
          width: 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: rgb(255, 255, 255);
          padding: 30px 30px 30px 30px;
          border-radius: 30px;
          box-shadow: 0px 0px 40px rgba(0, 0, 0, 0.062);
        }

        .heading {
          font-size: 2.5em;
          color: #2e2e2e;
          font-weight: 700;
          margin: 15px 0 30px 0;
        }

        .inputContainer {
          width: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .inputIcon {
          position: absolute;
          left: 10px;
        }

        .inputField {
          width: 100%;
          height: 40px;
          background-color: transparent;
          border: none;
          border-bottom: 2px solid rgb(173, 173, 173);
          border-radius: 30px;
          margin: 10px 0;
          color: black;
          font-size: .8em;
          font-weight: 500;
          box-sizing: border-box;
          padding-left: 30px;
        }

        .inputField:focus {
          outline: none;
          border-bottom: 2px solid rgb(199, 114, 255);
        }

        .inputField::placeholder {
          color: rgb(80, 80, 80);
          font-size: 1em;
          font-weight: 500;
        }

        #button {
          position: relative;
          width: 100%;
          border: 2px solid #8000ff;
          background-color: #8000ff;
          height: 40px;
          color: white;
          font-size: .8em;
          font-weight: 500;
          letter-spacing: 1px;
          border-radius: 30px;
          margin: 10px;
          cursor: pointer;
          overflow: hidden;
        }

        #button::after {
          content: "";
          position: absolute;
          background-color: rgba(255, 255, 255, 0.253);
          height: 100%;
          width: 150px;
          top: 0;
          left: -200px;
          border-bottom-right-radius: 100px;
          border-top-left-radius: 100px;
          filter: blur(10px);
          transition-duration: .5s;
        }

        #button:hover::after {
          transform: translateX(600px);
          transition-duration: .5s;
        }

        .signupContainer {
          margin: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }

        .signupContainer p {
          font-size: .9em;
          font-weight: 500;
          color: black;
        }

        .signupContainer a {
          font-size: .7em;
          font-weight: 500;
          background-color: #2e2e2e;
          color: white;
          text-decoration: none;
          padding: 8px 15px;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
