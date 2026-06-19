"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { setAppValue } from "@/lib/appStorage";
import Link from "next/link";
import { Crown, ShieldAlert } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-[#085454] via-[#0b7373] to-[#0d8a8a] flex items-center justify-center p-4">

      <div className="form_main">

        <p className="heading">إنشاء حساب عيادة</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center gap-2 w-full mb-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button id="button" type="button" onClick={handleGoogleSignup} disabled={isLoading}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ verticalAlign: "middle", marginLeft: "6px" }}>
            <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
            <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
            <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
            <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
          </svg>
          {isLoading ? "جاري الاتصال..." : "التسجيل بواسطة Google"}
        </button>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 w-full" style={{ margin: "10px 0" }}>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-800">للمدراء فقط</span>
          </div>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            هذا التسجيل مخصص لإنشاء عيادة جديدة وحساب مدير لها.
            يتم إنشاء حسابات الأطباء وموظفي الاستقبال بواسطة مدير العيادة من لوحة التحكم بعد التسجيل.
          </p>
        </div>

        <div className="signupContainer">
          <p>لديك حساب بالفعل؟</p>
          <Link href="/login">تسجيل الدخول</Link>
        </div>

      </div>

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
          display: flex;
          align-items: center;
          justify-content: center;
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
