"use client";
import React from 'react';
import { useLanguage } from "@/lib/LanguageContext";
import PublicLayout from "@/components/PublicLayout";

export default function CentersPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4F46BA]/10 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46BA]" />
            <span className="text-[11px] font-medium text-[#4F46BA]">
              {isRtl ? "ابحث عن مركز" : "Search Center"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            {isRtl ? "Prime Physio" : "Prime Physio"}
            <span className="text-[#4F46BA]"> — {isRtl ? "نظام إدارة عيادات العلاج الطبيعي" : "Physical Therapy Management"}</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            {isRtl
              ? "منصة متكاملة لإدارة عيادات العلاج الطبيعي - المرضى، الجلسات، التقارير، والفواتير"
              : "Complete platform for managing physical therapy clinics — patients, sessions, reports, and billing."}
          </p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <img src="/logo.png" alt="" fetchPriority="high" className="w-8 h-8 object-contain" />
            <span className="text-sm font-semibold text-[#4F46BA]">Prime Physio</span>
          </div>
          <input
            type="text"
            placeholder={isRtl ? "ابحث عن مركز..." : "Search for a center..."}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 transition-all"
          />
          <p className="mt-4 text-xs text-slate-400 text-center">
            {isRtl ? "Prime Physio — نظام إدارة عيادات العلاج الطبيعي" : "Prime Physio — Physical Therapy Clinics Management"}
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-4 pt-4 border-t border-slate-50 text-center">
            <div>
              <div className="text-lg font-bold text-[#4F46BA]">144+</div>
              <div className="text-[10px] text-slate-400">{isRtl ? "مركز" : "Centers"}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#4F46BA]">2K+</div>
              <div className="text-[10px] text-slate-400">{isRtl ? "مستخدم" : "Users"}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#4F46BA]">10K+</div>
              <div className="text-[10px] text-slate-400">{isRtl ? "جلسة" : "Sessions"}</div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
