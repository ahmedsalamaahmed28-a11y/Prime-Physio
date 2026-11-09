"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { language, toggleLanguage } = useLanguage();
  const isRtl = language === "ar";
  const pathname = usePathname();
  const { user } = useAuth();

  const TABS = [
    { id: "centers", path: "/centers", labelAr: "المراكز", labelEn: "Centers" },
    { id: "manage", path: "/manage", labelAr: "إدارة", labelEn: "Manage" },
    { id: "plans", path: "/plans", labelAr: "الباقات", labelEn: "Plans" },
    { id: "about", path: "/about", labelAr: "من نحن", labelEn: "About" },
    { id: "support", path: "/support", labelAr: "الدعم", labelEn: "Support" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      {/* Navigation */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center py-4 gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Prime Physio" fetchPriority="high" className="w-8 h-8 object-contain" />
              <span className="text-sm font-bold text-[#4F46BA]">Prime Physio</span>
            </Link>
            <div className="flex items-center gap-2">
              {TABS.map((tab) => {
                const isActive = pathname === tab.path || pathname?.startsWith(tab.path + "/");
                return (
                  <Link
                    key={tab.id}
                    href={tab.path}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-[#4F46BA] text-white shadow-md"
                        : "text-slate-500 hover:text-[#4F46BA] hover:bg-[#4F46BA]/5"
                    }`}
                  >
                    {isRtl ? tab.labelAr : tab.labelEn}
                  </Link>
                );
              })}
            </div>
            <div className="absolute left-4 sm:left-8 top-4 flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-500 hover:text-[#4F46BA] hover:border-[#4F46BA]/30 transition-all duration-200"
              >
                {isRtl ? "English" : "العربية"}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-4 py-8 sm:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-slate-400">
                {isRtl ? "نظام إدارة عيادات العلاج الطبيعي" : "Physical Therapy Clinic Management System"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-[11px] font-medium text-slate-500 hover:text-[#4F46BA] transition-colors">{isRtl ? "سياسة الخصوصية" : "Privacy Policy"}</Link>

            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
