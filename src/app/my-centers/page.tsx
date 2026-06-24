"use client";
import React from 'react';
import { useLanguage } from "@/lib/LanguageContext";
import PublicLayout from "@/components/PublicLayout";

export default function PlansPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4F46BA]/10 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4F46BA]" />
          <span className="text-[11px] font-medium text-[#4F46BA]">
            {isRtl ? "الباقات" : "Plans"}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">
          {isRtl ? "اختر الباقة المناسبة لعيادتك" : "Choose the Right Plan for Your Clinic"}
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          {isRtl
            ? "الباقة الأساسية مثالية للعيادات الصغيرة. الباقة الفضية للنمو. والباقة الذهبية لكل الإمكانيات."
            : "Basic is ideal for small clinics. Silver for growth. Gold unlocks everything."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {[
            { plan: isRtl ? "أساسي" : "Basic", price: isRtl ? "مجاني" : "Free", feat: isRtl ? "50 مريض\n100 جلسة/شهر" : "50 patients\n100 sessions/month", color: "border-slate-200 bg-white", badge: "" },
            { plan: isRtl ? "فضي" : "Silver", price: isRtl ? "مدفوع" : "Paid", feat: isRtl ? "200 مريض\n500 جلسة/شهر" : "200 patients\n500 sessions/month", color: "border-slate-300 bg-white", badge: "" },
            { plan: isRtl ? "ذهبي" : "Gold", price: isRtl ? "غير محدود" : "Unlimited", feat: isRtl ? "مرضى غير محدودين\nجلسات غير محدودة" : "Unlimited patients\nUnlimited sessions", color: "border-yellow-300 bg-yellow-50/50", badge: isRtl ? "الأفضل" : "Best" },
          ].map((p, i) => (
            <div key={i} className={`relative border-2 ${p.color} rounded-2xl p-6 shadow-sm`}>
              {p.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full">
                  {p.badge}
                </div>
              )}
              <div className="text-lg font-bold text-slate-800">{p.plan}</div>
              <div className="text-2xl font-bold text-[#4F46BA] mt-2">{p.price}</div>
              <div className="mt-4 text-xs text-slate-500 space-y-1 whitespace-pre-line">
                {p.feat}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
