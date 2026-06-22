"use client";
import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useSession } from "next-auth/react";
import { Loader } from "@/components/Loader";
import OnboardingFlow from "@/components/OnboardingFlow";

export default function SetupPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { data: session, status } = useSession();
  const [step, setStep] = useState<"plan" | "clinic" | "done">(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("step") === "clinic" ? "clinic" : "plan"
  );

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f9ff] to-white" dir={isRtl ? "rtl" : "ltr"}>
        {status === "loading" ? (
          <Loader size={32} color="#4F46BA" />
        ) : (
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-4">{isRtl ? "يرجى تسجيل الدخول أولاً" : "Please sign in first"}</p>
            <a href="/login" className="text-[#4F46BA] font-medium underline">{isRtl ? "تسجيل الدخول" : "Sign in"}</a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white" dir={isRtl ? "rtl" : "ltr"}>
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2">
          <img src="/logo.png" alt="Prime Physio" className="w-7 h-7 object-contain" />
          <span className="text-sm font-bold text-[#4F46BA]">Prime Physio</span>
        </div>
      </nav>
      <main className="px-4 py-8 sm:py-12">
        <OnboardingFlow step={step} setStep={setStep} clinicId={null} isRtl={isRtl} sessionEmail={session.user?.email || ""} sessionName={session.user?.name || ""} />
      </main>
    </div>
  );
}
