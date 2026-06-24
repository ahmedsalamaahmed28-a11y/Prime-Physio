"use client";
import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useSession } from "next-auth/react";
import { useAuth } from "@/lib/auth";
import { Loader } from "@/components/Loader";
import OnboardingFlow from "@/components/OnboardingFlow";

import PublicLayout from "@/components/PublicLayout";

export default function SetupPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { data: session, status } = useSession();
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<"plan" | "clinic" | "done">(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("step") === "clinic" ? "clinic" : "plan"
  );
  const redirectDone = useRef(false);

  const isAuthenticated = status === "authenticated" || !!user;
  const isAuthLoading = status === "loading" || authLoading;

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated && !redirectDone.current) {
      redirectDone.current = true;
      const t = setTimeout(() => { window.location.href = "/login"; }, 3000);
      return () => clearTimeout(t);
    }
  }, [isAuthLoading, isAuthenticated]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f9ff] to-white" dir={isRtl ? "rtl" : "ltr"}>
        <Loader size={32} color="#4F46BA" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f9ff] to-white" dir={isRtl ? "rtl" : "ltr"}>
        <div className="text-center">
          <Loader size={32} color="#4F46BA" />
          <p className="text-xs text-slate-400 mt-3">{isRtl ? "جاري التحويل لتسجيل الدخول..." : "Redirecting to login..."}</p>
        </div>
      </div>
    );
  }

  return (
    <PublicLayout>
      <div className="px-4 py-8 sm:py-12">
        <OnboardingFlow step={step} setStep={setStep} clinicId={user?.clinicId || null} isRtl={isRtl} sessionEmail={session?.user?.email || ""} sessionName={session?.user?.name || ""} />
      </div>
    </PublicLayout>
  );
}
