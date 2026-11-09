"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Bell, Building, HelpCircle, CreditCard, Download, Globe,
  LayoutDashboard, RefreshCw, Sparkles, User, Menu as MenuIcon, X
} from "lucide-react";
import { useState } from "react";

const menu = [
  { label: "نظرة عامة", en: "Overview", href: "/center-management", icon: LayoutDashboard },
  { label: "مراكزي", en: "My Centers", href: "/my-centers", icon: Building },
  { label: "التصدير الكامل للبيانات", en: "Full data export", href: "/center-management#export", icon: Download },
  { label: "الحساب والاشتراك", en: "Account & subscription", href: "/subscription", icon: User },
  { label: "الباقات", en: "Plans", href: "/packages", icon: CreditCard },
  { label: "الإشعارات", en: "Notifications", href: "/notifications", icon: Bell },
];

export default function CenterManagementPage() {
  const { user, isLoading, isEnriching, logout } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isRtl = language === "ar";
  const displayName = user?.name?.replace(/^د\\.\\s*/, "").trim() || user?.email?.split("@")[0] || (isRtl ? "صاحب الحساب" : "Account owner");
  const monthLabel = new Intl.DateTimeFormat(isRtl ? "ar-EG" : "en-US", { month: "long", year: "numeric" }).format(new Date());

  if (isLoading || isEnriching || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-white"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#1769AA] border-t-transparent" /></main>;
  }

  const startSetup = () => router.push("/manage?onboard=1");
  const sidebar = (
    <>
      <Link href="/home.php" onClick={() => setMobileMenuOpen(false)} className="mb-[26px] flex h-[42px] w-full items-center justify-start gap-[9px] px-[2px]">
        <span className="text-[21px] font-black tracking-tight text-[#153B60]">Prime<span className="text-[#1769AA]">Physio</span></span>
        <span className="flex h-[35px] w-[35px] items-center justify-center rounded-[9px] bg-[#1769AA] text-white"><Building className="h-[21px] w-[21px]" /></span>
      </Link>
      <nav className="space-y-[2px]">
        {menu.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
              className={`flex h-[44px] w-full items-center gap-[12px] rounded-[9px] px-[14px] text-[14px] font-semibold transition-colors ${index === 0 ? "bg-[#EFF5FC] text-[#1769AA]" : "text-[#59616B] hover:bg-[#F7F9FB] hover:text-[#1769AA]"}`}>
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
              <span className="flex-1 text-right">{isRtl ? item.label : item.en}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-[2px] border-t border-[#EEF0F2] pt-[15px]">
        <Link href="/support" onClick={() => setMobileMenuOpen(false)} className="flex h-[42px] items-center gap-[12px] rounded-[9px] px-[14px] text-[14px] font-semibold text-[#737B85] hover:bg-[#F7F9FB]">
          <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.9} /><span>{isRtl ? "مركز المساعدة" : "Help Center"}</span>
        </Link>
        <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="flex h-[42px] items-center gap-[12px] rounded-[9px] px-[14px] text-[14px] font-semibold text-[#737B85] hover:bg-[#F7F9FB]">
          <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.9} /><span>{isRtl ? "الجديد" : "What's New"}</span>
        </Link>
      </div>
    </>
  );

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white font-sans text-[#303846]">
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-[290px] shrink-0 flex-col border-l border-[#E8EBEF] bg-white px-[12px] pb-[18px] pt-[16px] lg:flex">
          {sidebar}
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button aria-label={isRtl ? "إغلاق القائمة" : "Close menu"} onClick={() => setMobileMenuOpen(false)} className="absolute inset-0 bg-black/25" />
            <aside className="relative z-10 flex h-full w-[290px] max-w-[85vw] flex-col border-l border-[#E8EBEF] bg-white px-[12px] pb-[18px] pt-[16px] shadow-xl">
              <button onClick={() => setMobileMenuOpen(false)} aria-label="Close" className="mb-3 self-start rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              {sidebar}
            </aside>
          </div>
        )}

        <section className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="flex h-[48px] shrink-0 items-center justify-end px-4 lg:hidden">
            <button onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-2 text-[#1769AA] hover:bg-slate-50" aria-label={isRtl ? "فتح القائمة" : "Open menu"}><MenuIcon className="h-5 w-5" /></button>
          </header>

          <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-[32px] pb-[26px] pt-[40px] max-sm:px-4 max-sm:pt-7">
            <div className="mb-[24px] flex min-h-[75px] items-center justify-between gap-5 max-sm:flex-col max-sm:items-stretch">
              <div className="order-2 flex items-center gap-[13px] max-sm:order-2">
                <Link href="/my-centers" className="inline-flex h-[40px] items-center gap-[8px] rounded-full bg-[#1769AA] px-[17px] text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(23,105,170,.18)] transition hover:bg-[#12598F]">
                  {isRtl ? "مراكزي" : "My Centers"}<Building className="h-[17px] w-[17px]" />
                </Link>
                <span className="h-[8px] w-[8px] rounded-full bg-[#D9E4F0]" />
                <button onClick={() => window.location.reload()} className="inline-flex h-[40px] items-center gap-[8px] rounded-full border border-[#E7EBEF] bg-white px-[16px] text-[14px] font-semibold text-[#69727D] transition hover:bg-slate-50">
                  {isRtl ? "التحديث" : "Refresh"}<RefreshCw className="h-[17px] w-[17px]" />
                </button>
              </div>
              <div className="order-1 text-right max-sm:order-1">
                <h1 className="text-[30px] font-extrabold leading-[1.35] tracking-tight text-[#202B38] max-sm:text-[25px]">{isRtl ? `مرحباً، ${displayName}` : `Welcome, ${displayName}`}</h1>
                <p className="mt-[3px] text-[14px] text-[#8A929C]">{isRtl ? `كل مراكزك هذا الشهر · ${monthLabel}` : `All your centers this month · ${monthLabel}`}</p>
              </div>
            </div>

            <section className="flex min-h-[328px] w-full flex-col items-center justify-center rounded-[19px] border border-dashed border-[#E6E9ED] bg-white px-5 py-10 text-center">
              <Building className="mb-[15px] h-[43px] w-[43px] text-[#245B91]" strokeWidth={2.1} />
              <h2 className="text-[21px] font-extrabold leading-[1.5] text-[#303846]">{isRtl ? "جهز مركزك الأول" : "Set up your first center"}</h2>
              <p className="mt-[4px] max-w-[440px] text-[15px] leading-[29px] text-[#9299A2]">{isRtl ? "بعد إنشاء مركزك ستُعرض في هذه الصفحة كل فروعك، الجلسات والحضور والإيرادات والفريق." : "Once you create a center, this page will show all your branches, sessions, attendance, revenue and team."}</p>
              <button onClick={startSetup} className="mt-[16px] inline-flex h-[46px] items-center justify-center rounded-full bg-[#1769AA] px-[27px] text-[14px] font-extrabold text-white shadow-[0_5px_14px_rgba(23,105,170,.2)] transition hover:bg-[#12598F]">{isRtl ? "اختر باقة أولاً" : "Choose a plan first"}</button>
            </section>
          </div>

          <footer className="mt-auto flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-t border-[#E8EBEF] bg-white px-[32px] py-[15px] text-[12px] text-[#9AA1AA] max-sm:px-4">
            <div className="flex flex-wrap items-center gap-[7px]"><Link href="/support" className="hover:text-[#1769AA]">{isRtl ? "مركز المساعدة" : "Help Center"}</Link><span>·</span><Link href="/terms" className="hover:text-[#1769AA]">{isRtl ? "الشروط" : "Terms"}</Link><span>·</span><Link href="/privacy" className="hover:text-[#1769AA]">{isRtl ? "الخصوصية" : "Privacy"}</Link></div>
            <span>© Prime Physio 2026</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
