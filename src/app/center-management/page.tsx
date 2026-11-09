"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Bell, Building, HelpCircle, CreditCard, Download, Globe, Search, Wifi,
  LayoutDashboard, RefreshCw, Sparkles, User, Menu as MenuIcon, X
} from "lucide-react";
import { useEffect, useState } from "react";

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
  const { language, toggleLanguage } = useLanguage();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [centers, setCenters] = useState<Array<{id:string;name:string;slug:string|null;loginUrl:string|null;status:string;logoUrl:string|null;planName:string|null;subscriptionStatus:string}>>([]);
  const [centersLoading, setCentersLoading] = useState(true);
  const [centersError, setCentersError] = useState("");

  useEffect(() => {
    if (isLoading || isEnriching || !user?.email) return;
    let active = true;
    setCentersLoading(true);
    fetch("/api/center-management/centers", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not load centers");
        if (active) setCenters(Array.isArray(data.centers) ? data.centers : []);
      })
      .catch((error) => {
        if (active) setCentersError(error instanceof Error ? error.message : "Could not load centers");
      })
      .finally(() => {
        if (active) setCentersLoading(false);
      });
    return () => { active = false; };
  }, [user?.email, isLoading, isEnriching]);
  const isRtl = language === "ar";
  const displayName = user?.name?.replace(/^د\\.\\s*/, "").trim() || user?.email?.split("@")[0] || (isRtl ? "صاحب الحساب" : "Account owner");
  const monthLabel = new Intl.DateTimeFormat(isRtl ? "ar-EG" : "en-US", { month: "long", year: "numeric" }).format(new Date());

  if (isLoading || isEnriching || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-white"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#1769AA] border-t-transparent" /></main>;
  }

  const startSetup = () => router.push("/create-center");
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
          <header className="sticky top-0 z-30 flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-[#E8EBEF] bg-white px-4 sm:px-6" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-2 text-[#1769AA] transition hover:bg-[#EFF5FC] lg:hidden" aria-label={isRtl ? "فتح القائمة" : "Open menu"}>
                <MenuIcon className="h-5 w-5" />
              </button>
              <div className="hidden max-w-[340px] flex-1 items-center gap-2 rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2 sm:flex">
                <Search className="h-4 w-4 shrink-0 text-[#8A929C]" />
                <input
                  type="search"
                  placeholder={isRtl ? "ابحث عن مركز أو مريض..." : "Search centers or patients..."}
                  aria-label={isRtl ? "بحث" : "Search"}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && event.currentTarget.value.trim()) {
                      router.push(`/patients?search=${encodeURIComponent(event.currentTarget.value.trim())}`);
                    }
                  }}
                  className={`w-full bg-transparent text-[13px] text-[#303846] outline-none placeholder:text-[#A0A7B0] ${isRtl ? "text-right" : "text-left"}`}
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[12px] font-semibold text-emerald-700 sm:inline-flex">
                <Wifi className="h-3.5 w-3.5" />
                {isRtl ? "متصل" : "Online"}
              </span>
              <button
                onClick={toggleLanguage}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#1769AA]/20 bg-[#EFF5FC] px-3 text-[12px] font-bold text-[#1769AA] transition hover:bg-[#1769AA] hover:text-white"
                aria-label={isRtl ? "Switch to English" : "التبديل إلى العربية"}
              >
                <Globe className="h-4 w-4" />
                {isRtl ? "ENG" : "عربي"}
              </button>
              <Link href="/notifications" aria-label={isRtl ? "الإشعارات" : "Notifications"} className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#1769AA]/20 bg-white text-[#1769AA] transition hover:bg-[#1769AA] hover:text-white">
                <Bell className="h-[18px] w-[18px]" />
              </Link>
              <Link href="/profile" className="flex max-w-[190px] items-center gap-2 rounded-lg border border-[#E8EBEF] bg-white px-2 py-1.5 transition hover:border-[#1769AA]/40 hover:bg-[#EFF5FC]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1769AA] text-[12px] font-bold text-white">
                  {(displayName.trim().charAt(0) || "A").toUpperCase()}
                </span>
                <span className="hidden min-w-0 text-start sm:block">
                  <span className="block truncate text-[12px] font-bold text-[#303846]">{displayName}</span>
                  <span className="block text-[10px] text-[#8A929C]">{isRtl ? "صاحب الحساب" : "Account owner"}</span>
                </span>
                <User className="hidden h-4 w-4 text-[#1769AA] sm:block" />
              </Link>
            </div>
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

            <section className="w-full">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-extrabold text-[#202B38]">{isRtl ? "المراكز التابعة لحسابك" : "Your independent centers"}</h2>
                  <p className="mt-1 text-[13px] text-[#9299A2]">{isRtl ? "كل مركز له رابط دخول وبيانات واشتراك مستقل." : "Each center has its own login URL, data and subscription."}</p>
                </div>
                <button onClick={startSetup} className="inline-flex h-[42px] shrink-0 items-center justify-center rounded-full bg-[#1769AA] px-5 text-[13px] font-extrabold text-white transition hover:bg-[#12598F]">{isRtl ? "+ إنشاء مركز" : "+ Create center"}</button>
              </div>
              {centersLoading ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-[18px] border border-[#E8EBEF] bg-white">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1769AA] border-t-transparent" />
                </div>
              ) : centersError ? (
                <div className="rounded-[18px] border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{centersError}</div>
              ) : centers.length === 0 ? (
                <div className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-[19px] border border-dashed border-[#E6E9ED] bg-white px-5 py-10 text-center">
                  <Building className="mb-[15px] h-[43px] w-[43px] text-[#245B91]" strokeWidth={2.1} />
                  <h3 className="text-[21px] font-extrabold leading-[1.5] text-[#303846]">{isRtl ? "لم تنشئ أي مركز بعد" : "You haven't created a center yet"}</h3>
                  <p className="mt-[4px] max-w-[440px] text-[15px] leading-[29px] text-[#9299A2]">{isRtl ? "اختر الباقة المناسبة ثم أنشئ مركزك الأول. ستظهر روابط جميع مراكزك هنا." : "Choose a plan and create your first center. All your center links will appear here."}</p>
                  <button onClick={startSetup} className="mt-[16px] inline-flex h-[46px] items-center justify-center rounded-full bg-[#1769AA] px-[27px] text-[14px] font-extrabold text-white shadow-[0_5px_14px_rgba(23,105,170,.2)] transition hover:bg-[#12598F]">{isRtl ? "اختر باقة وأنشئ مركزك" : "Choose a plan and create a center"}</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {centers.map((center) => (
                    <article key={center.id} className="rounded-[18px] border border-[#E8EBEF] bg-white p-5 shadow-[0_2px_10px_rgba(20,45,70,.03)]">
                      <div className="flex items-center gap-3">
                        {center.logoUrl ? <img src={center.logoUrl} alt="" className="h-12 w-12 rounded-xl border border-[#E8EBEF] object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF5FC] text-[#1769AA]"><Building className="h-6 w-6" /></div>}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-[16px] font-extrabold text-[#263442]">{center.name}</h3>
                          <p className="mt-1 truncate text-[12px] text-[#8A929C]">{center.slug ? `primephysio.vercel.app/${center.slug}` : "URL not assigned"}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-[#F0F2F4] pt-3 text-[12px]">
                        <span className="text-[#7B8490]">{isRtl ? "الباقة" : "Plan"}: <strong className="text-[#303846]">{center.planName || (isRtl ? "لم تُفعّل بعد" : "Not activated")}</strong></span>
                        <span className={center.subscriptionStatus === "active" ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>{center.subscriptionStatus === "active" ? (isRtl ? "نشط" : "Active") : (isRtl ? "قيد التفعيل" : "Pending")}</span>
                      </div>
                      {center.loginUrl && <Link href={center.loginUrl} className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-[#1769AA] text-[13px] font-bold text-white transition hover:bg-[#12598F]">{isRtl ? "فتح المركز" : "Open center"}</Link>}
                    </article>
                  ))}
                </div>
              )}
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
