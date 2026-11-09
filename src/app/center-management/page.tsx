"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Bell, Building2, CircleHelp, CreditCard, Download, Globe,
  LayoutDashboard, LogOut, RefreshCw, Sparkles, UserRound
} from "lucide-react";

const menu = [
  { label: "نظرة عامة", en: "Overview", href: "/center-management", icon: LayoutDashboard },
  { label: "مراكزي", en: "My Centers", href: "/my-centers", icon: Building2 },
  { label: "التصدير الكامل للبيانات", en: "Full data export", href: "/center-management#export", icon: Download },
  { label: "الحساب والاشتراك", en: "Account & subscription", href: "/subscription", icon: UserRound },
  { label: "الباقات", en: "Plans", href: "/packages", icon: CreditCard },
  { label: "الإشعارات", en: "Notifications", href: "/notifications", icon: Bell },
];

export default function CenterManagementPage() {
  const { user, isLoading, isEnriching, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const router = useRouter();
  const isRtl = language === "ar";
  const displayName = user?.name?.replace(/^د\\.\\s*/, "").trim() || user?.email?.split("@")[0] || (isRtl ? "صاحب الحساب" : "Account owner");
  const monthLabel = new Intl.DateTimeFormat(isRtl ? "ar-EG" : "en-US", { month: "long", year: "numeric" }).format(new Date());

  if (isLoading || isEnriching || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-white"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#1769AA] border-t-transparent" /></main>;
  }

  const startSetup = () => router.push("/manage?onboard=1");

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white font-sans text-[#303846]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[290px] shrink-0 flex-col border-l border-[#E8EBEF] bg-white px-4 pb-5 pt-5 lg:flex">
          <Link href="/home.php" className="mb-7 flex h-9 items-center justify-end gap-2 px-1">
            <span className="text-[21px] font-black tracking-tight text-[#153B60]">Prime<span className="text-[#1769AA]">Physio</span></span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1769AA] text-white"><Building2 className="h-5 w-5" /></span>
          </Link>
          <nav className="space-y-1">
            {menu.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={`flex min-h-[44px] items-center gap-3 rounded-lg px-4 py-2.5 text-[14px] font-semibold transition-colors ${index === 0 ? "bg-[#EFF5FC] text-[#1769AA]" : "text-[#59616B] hover:bg-slate-50 hover:text-[#1769AA]"}`}>
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1">{isRtl ? item.label : item.en}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-1 border-t border-[#EEF0F2] pt-4">
            <Link href="/support" className="flex min-h-[42px] items-center gap-3 rounded-lg px-4 py-2 text-[14px] font-semibold text-[#737B85] hover:bg-slate-50"><CircleHelp className="h-[18px] w-[18px]" />{isRtl ? "مركز المساعدة" : "Help Center"}</Link>
            <Link href="/about" className="flex min-h-[42px] items-center gap-3 rounded-lg px-4 py-2 text-[14px] font-semibold text-[#737B85] hover:bg-slate-50"><Sparkles className="h-[18px] w-[18px]" />{isRtl ? "الجديد" : "What's New"}</Link>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[68px] shrink-0 items-center justify-between border-b border-[#E8EBEF] bg-white px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => logout()} className="flex items-center gap-2 rounded-full px-1 py-1 text-start hover:bg-slate-50" aria-label={isRtl ? "تسجيل الخروج" : "Log out"}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1769AA] text-sm font-extrabold text-white">{displayName.slice(0, 1)}</span>
                <span className="hidden text-sm font-bold text-[#3E4650] sm:block">{displayName}</span>
                <LogOut className="h-4 w-4 text-slate-400" />
              </button>
              <button aria-label={isRtl ? "الإشعارات" : "Notifications"} onClick={() => router.push("/notifications")} className="rounded-full p-2 text-[#68717C] hover:bg-slate-100"><Bell className="h-5 w-5" /></button>
              <button onClick={toggleLanguage} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-[#5E6670] hover:bg-slate-50"><span>{isRtl ? "English" : "العربية"}</span><Globe className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-base font-black text-[#153B60]">Prime<span className="text-[#1769AA]">Physio</span></span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1769AA] text-white"><Building2 className="h-4 w-4" /></span>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1240px] flex-1 px-5 pb-10 pt-9 sm:px-8 sm:pt-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[27px] font-extrabold leading-tight tracking-tight text-[#202B38] sm:text-[30px]">{isRtl ? `مرحباً، ${displayName}` : `Welcome, ${displayName}`}</h1>
                <p className="mt-2 text-[14px] text-[#8A929C]">{isRtl ? `كل مراكزك هذا الشهر · ${monthLabel}` : `All your centers this month · ${monthLabel}`}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/my-centers" className="inline-flex items-center gap-2 rounded-full bg-[#1769AA] px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(23,105,170,.18)] transition hover:bg-[#12598F]"><Building2 className="h-4 w-4" />{isRtl ? "مراكزي" : "My Centers"}</Link>
                <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-full border border-[#E7EBEF] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#69727D] transition hover:bg-slate-50"><RefreshCw className="h-4 w-4" />{isRtl ? "التحديث" : "Refresh"}</button>
              </div>
            </div>

            <section className="flex min-h-[325px] w-full flex-col items-center justify-center rounded-[20px] border border-dashed border-[#E6E9ED] bg-white px-5 py-10 text-center sm:min-h-[328px]">
              <Building2 className="mb-4 h-11 w-11 text-[#245B91]" strokeWidth={2.1} />
              <h2 className="text-[21px] font-extrabold text-[#303846]">{isRtl ? "جهز مركزك الأول" : "Set up your first center"}</h2>
              <p className="mt-2 max-w-[440px] text-[15px] leading-7 text-[#9299A2]">{isRtl ? "بعد إنشاء مركزك ستُعرض في هذه الصفحة كل فروعك، الجلسات والحضور والإيرادات والفريق." : "Once you create a center, this page will show all your branches, sessions, attendance, revenue and team."}</p>
              <button onClick={startSetup} className="mt-5 inline-flex items-center justify-center rounded-full bg-[#1769AA] px-7 py-3 text-[14px] font-extrabold text-white shadow-[0_5px_14px_rgba(23,105,170,.2)] transition hover:-translate-y-0.5 hover:bg-[#12598F]">{isRtl ? "اختر باقة أولاً" : "Choose a plan first"}</button>
            </section>
          </div>

          <footer className="mt-auto flex min-h-[54px] flex-wrap items-center justify-between gap-3 border-t border-[#E8EBEF] bg-white px-5 py-4 text-[12px] text-[#9AA1AA] sm:px-8">
            <div className="flex flex-wrap items-center gap-3"><Link href="/support" className="hover:text-[#1769AA]">{isRtl ? "مركز المساعدة" : "Help Center"}</Link><span>·</span><Link href="/terms" className="hover:text-[#1769AA]">{isRtl ? "الشروط" : "Terms"}</Link><span>·</span><Link href="/privacy" className="hover:text-[#1769AA]">{isRtl ? "الخصوصية" : "Privacy"}</Link></div>
            <span>© 2026 Prime Physio</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
