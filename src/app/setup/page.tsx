"use client";
import React, { useState, useEffect, useRef } from "react";
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
  const redirectDone = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated" && !redirectDone.current) {
      redirectDone.current = true;
      const t = setTimeout(() => { window.location.href = "/login"; }, 3000);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f9ff] to-white" dir={isRtl ? "rtl" : "ltr"}>
        <Loader size={32} color="#4F46BA" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f9ff] to-white" dir={isRtl ? "rtl" : "ltr"}>
        <div className="text-center">
          <Loader size={32} color="#4F46BA" />
          <p className="text-xs text-slate-400 mt-3">{isRtl ? "جاري التحقق من الحساب..." : "Checking session..."}</p>
        </div>
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
        <OnboardingFlow step={step} setStep={setStep} clinicId={null} isRtl={isRtl} sessionEmail={session?.user?.email || ""} sessionName={session?.user?.name || ""} />
      </main>
    </div>
  );
}
