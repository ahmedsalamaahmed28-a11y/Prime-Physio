"use client";
import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import OnboardingFlow from "@/components/OnboardingFlow";

export default function NewCenterPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const [step, setStep] = useState<"plan" | "clinic" | "done">("clinic");

  return (
    <div className="min-h-screen bg-neutral-100" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <OnboardingFlow step={step} setStep={setStep} clinicId={user?.clinicId || null} isRtl={isRtl} sessionEmail={user?.email || ""} sessionName={user?.name || ""} hidePlanStep={true} />
      </div>
    </div>
  );
}
