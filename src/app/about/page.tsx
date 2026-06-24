"use client";
import React from 'react';
import { useLanguage } from "@/lib/LanguageContext";
import PublicLayout from "@/components/PublicLayout";

export default function AboutPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4F46BA]/10 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4F46BA]" />
          <span className="text-[11px] font-medium text-[#4F46BA]">
            {isRtl ? "من نحن" : "About Us"}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">
          {isRtl ? "Prime Physio — نظام إدارة العيادات الذكي" : "Prime Physio — Smart Clinic Management"}
        </h2>
        <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
          {isRtl
            ? "برايم فيزيو هو نظام متكامل لإدارة عيادات العلاج الطبيعي، مصمم خصيصاً لتلبية احتياجات العيادات العربية. نوفر أدوات إدارة المرضى، والجلسات، والتقارير، والفواتير، والتقييمات العلاجية — كل ذلك في منصة واحدة سهلة الاستخدام."
            : "Prime Physio is a complete management system for physical therapy clinics, designed for Arabic-speaking clinics. We provide tools for patients, sessions, reports, billing, and therapeutic assessments — all in one easy-to-use platform."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {[
            { icon: "👥", titleAr: "إدارة المرضى", titleEn: "Patient Management", descAr: "سجل كامل للمرضى مع تاريخ طبي وجلسات", descEn: "Complete patient records with medical history" },
            { icon: "📊", titleAr: "تقارير وتحليلات", titleEn: "Reports & Analytics", descAr: "إحصائيات دقيقة عن أداء العيادة", descEn: "Accurate clinic performance statistics" },
            { icon: "🔒", titleAr: "آمن وموثوق", titleEn: "Secure & Reliable", descAr: "بيانات مشفرة وحماية متقدمة للخصوصية", descEn: "Encrypted data with advanced privacy" },
          ].map((item, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl p-5 text-center shadow-sm">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-semibold text-slate-700">{isRtl ? item.titleAr : item.titleEn}</div>
              <div className="text-[11px] text-slate-400 mt-1">{isRtl ? item.descAr : item.descEn}</div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
