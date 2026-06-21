"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";

const STEPS = [
  { key: "signup", labelAr: "إنشاء الحساب", labelEn: "Create Account" },
  { key: "login", labelAr: "تسجيل الدخول", labelEn: "Login" },
  { key: "center", labelAr: "إنشاء مركز", labelEn: "Create Center" },
  { key: "plan", labelAr: "الباقة", labelEn: "Plan" },
];

const STEP_MAP: Record<string, number> = {
  "/signup": 0,
  "/setup/center": 2,
  "/subscribe": 3,
};

export default function SetupSteps() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const currentIdx = pathname ? STEP_MAP[pathname] ?? -1 : -1;

  // On /signup, only steps 0 and 1 are active (signup + login)
  const activeIdx = pathname === "/signup" ? 1 : currentIdx;

  return (
    <div className="flex items-center justify-center gap-1 mb-6" dir="ltr">
      {STEPS.map((step, idx) => {
        const isActive = idx <= activeIdx;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-[#4F46BA] text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {idx + 1}
              </div>
              <span
                className={`text-[10px] mt-1 whitespace-nowrap ${
                  isActive ? "text-[#4F46BA] font-semibold" : "text-slate-400"
                }`}
              >
                {isRtl ? step.labelAr : step.labelEn}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-12 h-0.5 mb-5 ${
                  idx < activeIdx ? "bg-[#4F46BA]" : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
