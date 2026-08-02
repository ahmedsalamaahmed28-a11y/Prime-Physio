"use client";

import React from "react";
import { Construction } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function PlaceholderPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
      <Construction className="w-20 h-20 mb-6 text-indigo-300" />
      <h1 className="text-2xl font-bold mb-2 text-slate-700">
        {isRtl ? "قريباً" : "Coming Soon"}
      </h1>
      <p className="text-center max-w-md text-slate-500">
        {isRtl 
          ? "هذه الصفحة قيد التطوير حالياً. سيتم إضافتها في التحديثات القادمة للمنصة." 
          : "This page is currently under development. It will be available in future updates."}
      </p>
    </div>
  );
}
