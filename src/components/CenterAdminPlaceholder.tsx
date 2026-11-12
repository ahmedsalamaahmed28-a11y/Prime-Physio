"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, Building, CreditCard, Download, LayoutDashboard, Menu, User, X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const items = [
  { href: "/overview.php/", key: "overview", ar: "نظرة عامة", en: "Overview", icon: LayoutDashboard },
  { href: "/centers.php/", key: "centers", ar: "مراكزي", en: "My Centers", icon: Building },
  { href: "/export.php/", key: "export", ar: "التصدير الكامل للبيانات", en: "Full data export", icon: Download },
  { href: "/account.php/", key: "account", ar: "الحساب والاشتراك", en: "Account & subscription", icon: User },
  { href: "/plans.php/", key: "plans", ar: "الباقات", en: "Plans", icon: CreditCard },
  { href: "/notices.php/", key: "notices", ar: "الإشعارات", en: "Notifications", icon: Bell },
];

const pageCopy: Record<string, { ar: string; en: string; descAr: string; descEn: string }> = {
  "/overview.php": { ar: "نظرة عامة", en: "Overview", descAr: "صفحة النظرة العامة قيد التجهيز. سنصمم محتواها معًا لاحقًا.", descEn: "The overview page is being prepared. We’ll design its content together later." },
  "/export.php": { ar: "التصدير الكامل للبيانات", en: "Full data export", descAr: "صفحة التصدير قيد التجهيز. سنصمم أدوات تصدير البيانات لاحقًا.", descEn: "The export page is being prepared. Data export tools will be designed later." },
  "/account.php": { ar: "الحساب والاشتراك", en: "Account & subscription", descAr: "صفحة الحساب والاشتراك قيد التجهيز. سنصممها معًا لاحقًا.", descEn: "The account and subscription page is being prepared. We’ll design it together later." },
  "/plans.php": { ar: "الباقات", en: "Plans", descAr: "صفحة الباقات قيد التجهيز. سنصممها معًا لاحقًا.", descEn: "The plans page is being prepared. We’ll design it together later." },
  "/notices.php": { ar: "الإشعارات", en: "Notifications", descAr: "صفحة الإشعارات قيد التجهيز. سنصممها معًا لاحقًا.", descEn: "The notifications page is being prepared. We’ll design it together later." },
};

export default function CenterAdminPlaceholder() {
  const { language, toggleLanguage } = useLanguage();
  const pathname = usePathname() || "/";
  const normalized = pathname.replace(/\\/+$/, "") || "/";
  const isRtl = language === "ar";
  const [mobileOpen, setMobileOpen] = useState(false);
  const copy = pageCopy[normalized] || pageCopy["/overview.php"];

  const navigation = (
    <>
      <Link href="/home.php" onClick={() => setMobileOpen(false)} className="mb-7 flex items-center gap-2 px-2 text-xl font-black tracking-tight text-[#153B60]">
        Prime<span className="text-[#5B50C7]">Physio</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B50C7] text-white"><Building className="h-5 w-5" /></span>
      </Link>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = normalized === item.href.replace(/\\/+$/, "");
          return (
            <Link key={item.key} href={item.href} onClick={() => setMobileOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${active ? "bg-[#F1EFFF] text-[#5B50C7]" : "text-[#59616B] hover:bg-[#F7F9FB] hover:text-[#5B50C7]"}`}>
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1">{isRtl ? item.ar : item.en}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#F8FAFC] text-[#303846]">
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-[270px] shrink-0 flex-col border-l border-[#E8EBEF] bg-white px-3 py-5 lg:flex">{navigation}</aside>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button aria-label={isRtl ? "إغلاق القائمة" : "Close menu"} onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/25" />
            <aside className="relative z-10 flex h-full w-[285px] max-w-[85vw] flex-col bg-white px-3 py-5 shadow-xl">
              <button onClick={() => setMobileOpen(false)} aria-label="Close" className="mb-4 self-start rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              {navigation}
            </aside>
          </div>
        )}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#E8EBEF] bg-white px-4 sm:px-6">
            <button onClick={() => setMobileOpen(true)} aria-label={isRtl ? "فتح القائمة" : "Open menu"} className="rounded-lg p-2 text-[#5B50C7] hover:bg-[#F1EFFF] lg:hidden"><Menu className="h-5 w-5" /></button>
            <button onClick={toggleLanguage} className="rounded-lg border border-[#5B50C7]/20 bg-[#F1EFFF] px-3 py-2 text-xs font-bold text-[#5B50C7]">{isRtl ? "ENG" : "عربي"}</button>
          </header>
          <div className="flex flex-1 items-center justify-center p-5 sm:p-8">
            <div className="w-full max-w-3xl rounded-2xl border border-[#E8EBEF] bg-white px-6 py-16 text-center shadow-sm sm:px-10">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1EFFF] text-[#5B50C7]"><Building className="h-7 w-7" /></div>
              <h1 className="text-2xl font-extrabold text-[#24364A]">{isRtl ? copy.ar : copy.en}</h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#8994A2]">{isRtl ? copy.descAr : copy.descEn}</p>
              <Link href="/centers.php/" className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[#5B50C7] px-6 text-sm font-bold text-white transition hover:bg-[#4338A8]">{isRtl ? "العودة إلى مراكزي" : "Back to My Centers"}</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
