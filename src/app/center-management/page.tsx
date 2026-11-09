"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Activity, Bell, Building, ChevronLeft, HelpCircle, CreditCard,
  Download, Globe, LayoutDashboard, LogOut, Plus, RefreshCw,
  Sparkles, User
} from "lucide-react";

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
  const isRtl = language === "ar";
  const displayName = user?.name?.replace(/^د\.\s*/, "").trim() || user?.email?.split("@")[0] || (isRtl ? "صاحب الحساب" : "Account owner");
  const monthLabel = new Intl.DateTimeFormat(isRtl ? "ar-EG" : "en-US", { month: "long", year: "numeric" }).format(new Date());

  if (isLoading || isEnriching || !user) {
    return <main className="min-h-screen flex items-center justify-center bg-[#F7F8FC]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#5147B8] border-t-transparent" /></main>;
  }

  const startSetup = () => router.push("/manage?onboard=1");

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#F7F8FC] font-sans text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-[270px] shrink-0 flex-col border-l border-slate-200 bg-white px-5 py-6 lg:flex">
          <Link href="/" className="mb-10 flex items-center gap-3 px-2">
            <img src="/logo.png" alt="Prime Physio" className="h-10 w-10 object-contain" />
            <span className="text-lg font-extrabold tracking-tight text-slate-900">Prime <span className="text-[#5147B8]">Physio</span></span>
          </Link>
          <p className="mb-3 px-3 text-[11px] font-bold tracking-wider text-slate-400">{isRtl ? "إدارة الحساب" : "ACCOUNT MANAGEMENT"}</p>
          <nav className="space-y-1">
            {menu.map((item, index) => {
              const Icon = item.icon;
              return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${index === 0 ? "bg-[#F0EEFF] text-[#5147B8]" : "text-slate-600 hover:bg-slate-50 hover:text-[#5147B8]"}`}>
                <Icon className="h-[18px] w-[18px]" /><span className="flex-1">{isRtl ? item.label : item.en}</span>
                <ChevronLeft className="h-4 w-4 opacity-40" />
              </Link>;
            })}
          </nav>
          <div className="mt-auto space-y-1 border-t border-slate-100 pt-5">
            <Link href="/support" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><HelpCircle className="h-[18px] w-[18px]" />{isRtl ? "مركز المساعدة" : "Help Center"}</Link>
            <Link href="/about" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Sparkles className="h-[18px] w-[18px]" />{isRtl ? "الجديد" : "What's New"}</Link>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <img src="/logo.png" alt="Prime Physio" className="h-9 w-9 object-contain" />
              <span className="font-extrabold text-slate-900">Prime <span className="text-[#5147B8]">Physio</span></span>
            </div>
            <div className="hidden items-center gap-2 text-sm font-bold text-slate-700 lg:flex"><Activity className="h-5 w-5 text-[#5147B8]" />Center Management</div>
            <div className="flex items-center gap-3">
              <button onClick={toggleLanguage} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><Globe className="h-4 w-4" />{isRtl ? "English" : "العربية"}</button>
              <button aria-label={isRtl ? "الإشعارات" : "Notifications"} onClick={() => router.push("/notifications")} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"><Bell className="h-5 w-5" /></button>
              <div className="hidden h-9 w-px bg-slate-200 sm:block" />
              <button onClick={() => logout()} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-start hover:bg-slate-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEEAFE] text-sm font-extrabold text-[#5147B8]">{displayName.slice(0,1)}</span>
                <span className="hidden sm:block"><span className="block max-w-[180px] truncate text-sm font-bold text-slate-800">{displayName}</span><span className="block text-[11px] text-slate-400">{user.email}</span></span>
                <LogOut className="mr-1 h-4 w-4 text-slate-400" />
              </button>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-8 sm:py-10">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-[#5147B8]">{isRtl ? "مساحة إدارة حسابك" : "Your account workspace"}</p>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{isRtl ? `مرحباً، ${displayName}` : `Welcome, ${displayName}`}</h1>
                <p className="mt-2 text-sm text-slate-500">{isRtl ? `كل مراكزك هذا الشهر · ${monthLabel}` : `All your centers this month · ${monthLabel}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.location.reload()} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50"><RefreshCw className="h-4 w-4" />{isRtl ? "تحديث" : "Refresh"}</button>
                <Link href="/my-centers" className="flex items-center gap-2 rounded-xl bg-[#5147B8] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#4338A5]"><Building className="h-4 w-4" />{isRtl ? "مراكزي" : "My Centers"}</Link>
              </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">{isRtl ? "إجمالي المراكز" : "Total centers"}</p><p className="mt-3 text-3xl font-extrabold text-slate-900">0</p><p className="mt-1 text-xs text-slate-400">{isRtl ? "ابدأ بإضافة مركزك الأول" : "Add your first center to get started"}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">{isRtl ? "حالة الاشتراك" : "Subscription status"}</p><p className="mt-3 text-xl font-extrabold text-amber-600">{isRtl ? "لم يتم اختيار باقة" : "No plan selected"}</p><p className="mt-1 text-xs text-slate-400">{isRtl ? "يمكنك اختيار الباقة عند بدء التجهيز" : "Choose a plan when you begin setup"}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">{isRtl ? "مساحة العمل" : "Workspace"}</p><p className="mt-3 text-xl font-extrabold text-emerald-600">{isRtl ? "جاهزة" : "Ready"}</p><p className="mt-1 text-xs text-slate-400">{isRtl ? "حسابك مفعل ويمكنك البدء" : "Your account is active and ready"}</p></div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#E5E2FA] bg-white shadow-sm">
              <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="p-7 sm:p-10">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0EEFF] text-[#5147B8]"><Building className="h-6 w-6" /></div>
                  <span className="rounded-full bg-[#F0EEFF] px-3 py-1 text-[11px] font-extrabold text-[#5147B8]">{isRtl ? "خطوتك الأولى" : "Your first step"}</span>
                  <h2 className="mt-4 text-2xl font-extrabold text-slate-900">{isRtl ? "جهز مركزك الأول" : "Set up your first center"}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">{isRtl ? "ابدأ باختيار الباقة المناسبة، ثم أضف بيانات مركزك وفريق العمل. بعد الإعداد ستظهر هنا جلساتك والحضور والإيرادات وبيانات فريقك في مكان واحد." : "Choose the right plan, then add your center and team details. Once setup is complete, your sessions, attendance, revenue and team information will appear here."}</p>
                  <button onClick={startSetup} className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-[#5147B8] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#5147B8]/20 transition hover:-translate-y-0.5 hover:bg-[#4338A5]"><Plus className="h-4 w-4" />{isRtl ? "اختر باقة أولاً" : "Choose a plan first"}</button>
                </div>
                <div className="relative hidden min-h-[330px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#F3F1FF] via-[#F8F7FF] to-[#E9E7FA] p-8 lg:flex">
                  <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#C9C2F2]/40 blur-3xl" />
                  <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[#A8A0E8]/30 blur-3xl" />
                  <div className="relative w-full max-w-[360px] rounded-2xl border border-white/80 bg-white/80 p-6 shadow-xl backdrop-blur">
                    <div className="mb-6 flex items-center justify-between"><span className="text-xs font-extrabold text-slate-700">{isRtl ? "ملخص المركز" : "Center overview"}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">{isRtl ? "بانتظار الإعداد" : "Setup pending"}</span></div>
                    <div className="mb-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{isRtl ? "الجلسات" : "Sessions"}</p><p className="mt-2 text-xl font-extrabold text-slate-300">—</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">{isRtl ? "الحضور" : "Attendance"}</p><p className="mt-2 text-xl font-extrabold text-slate-300">—</p></div></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[12%] rounded-full bg-[#5147B8]" /></div>
                    <p className="mt-3 text-[10px] text-slate-400">{isRtl ? "أكمل إعداد مركزك لبدء عرض المؤشرات" : "Complete setup to see your metrics"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div id="export" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5">
              <div><p className="text-sm font-bold text-slate-700">{isRtl ? "تصدير بيانات الحساب" : "Export account data"}</p><p className="mt-1 text-xs text-slate-400">{isRtl ? "ستتوفر خيارات التصدير بعد إنشاء مركز وربط بياناته." : "Export options will be available after a center is created and its data is connected."}</p></div>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-400">{isRtl ? "غير متاح بعد" : "Not available yet"}</span>
            </div>
          </div>

          <footer className="border-t border-slate-200 bg-white px-5 py-5 text-xs text-slate-400">
            <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-5"><Link href="/support" className="hover:text-[#5147B8]">{isRtl ? "مركز المساعدة" : "Help Center"}</Link><Link href="/terms" className="hover:text-[#5147B8]">{isRtl ? "الشروط" : "Terms"}</Link><Link href="/privacy" className="hover:text-[#5147B8]">{isRtl ? "الخصوصية" : "Privacy"}</Link></div>
              <span>© 2026 Prime Physio. {isRtl ? "جميع الحقوق محفوظة." : "All rights reserved."}</span>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
