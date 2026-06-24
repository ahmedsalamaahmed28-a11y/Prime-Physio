"use client";
import React from 'react';
import { useLanguage } from "@/lib/LanguageContext";
import PublicLayout from "@/components/PublicLayout";

export default function SupportPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4F46BA]/10 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46BA]" />
            <span className="text-[11px] font-medium text-[#4F46BA]">
              {isRtl ? "الدعم الفني" : "Technical Support"}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isRtl ? "نحن هنا لمساعدتك" : "We're Here to Help"}
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            {isRtl
              ? "تواصل مع فريق الدعم الفني عبر القنوات التالية"
              : "Contact our support team through the following channels"}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          {[
            { icon: "📧", labelAr: "البريد الإلكتروني", labelEn: "Email", value: "support@prime-physio.com" },
            { icon: "📱", labelAr: "واتساب", labelEn: "WhatsApp", value: "+201234567890" },
            { icon: "💬", labelAr: "تيليجرام", labelEn: "Telegram", value: "@prime_physio" },
            { icon: "▶️", labelAr: "يوتيوب", labelEn: "YouTube", value: "Prime Physio" },
          ].map((item, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <span className="text-xl">{item.icon}</span>
              <div>
                <div className="text-[11px] text-slate-400">{isRtl ? item.labelAr : item.labelEn}</div>
                <div className="text-sm font-medium text-slate-700">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-5 max-w-xl mx-auto shadow-sm text-center">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            {isRtl ? "الأسئلة الشائعة" : "FAQ"}
          </h3>
          <div className="space-y-2 text-right">
            {[
              { qAr: "كيف يمكنني إنشاء حساب جديد؟", qEn: "How do I create a new account?", aAr: "يمكنك إنشاء حساب جديد من خلال صفحة التسجيل باستخدام البريد الإلكتروني أو حساب Google.", aEn: "You can create a new account from the signup page using email or Google." },
              { qAr: "هل يمكنني تجربة النظام قبل الاشتراك؟", qEn: "Can I try the system before subscribing?", aAr: "نعم، الباقة الأساسية مجانية وتتيح لك تجربة جميع الميزات الأساسية.", aEn: "Yes, the Basic plan is free and lets you try all core features." },
              { qAr: "كيف يمكنني ترقية باقتي؟", qEn: "How do I upgrade my plan?", aAr: "يمكنك الترقية من صفحة الباقات داخل لوحة التحكم بعد تسجيل الدخول.", aEn: "You can upgrade from the plans page in your dashboard after logging in." },
            ].map((faq, i) => (
              <details key={i} className="group border border-slate-100 rounded-lg p-3">
                <summary className="text-xs font-medium text-slate-600 cursor-pointer list-none flex items-center justify-between">
                  <span>{isRtl ? faq.qAr : faq.qEn}</span>
                  <span className="text-slate-300 group-open:rotate-180 transition-transform duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                  </span>
                </summary>
                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">{isRtl ? faq.aAr : faq.aEn}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
