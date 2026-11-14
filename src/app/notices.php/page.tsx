"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Smartphone, Monitor, Download, CheckCircle2, Building, LayoutDashboard, CreditCard, User, Globe, Wifi, Menu, X, LogOut, HelpCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function HelpLink({ label }: { label: string }) {
  return (
    <a href="https://ptset.com/img/icons/help.png" target="_blank" rel="noreferrer"
      aria-label={`مساعدة: ${label}`} title={label}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full align-middle transition hover:bg-slate-100">
      <img src="https://ptset.com/img/icons/help.png" alt="" className="h-4 w-4 object-contain" />
    </a>
  );
}

export default function NoticesPhpPage() {
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const isRtl = language === "ar";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => { setIsInstalled(true); setInstallPrompt(null); };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const activateNotifications = async () => {
    if (!("Notification" in window)) {
      setMessage("هذا المتصفح لا يدعم إشعارات النظام.");
      return;
    }
    setIsActivating(true);
    setMessage("");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") setMessage("تم السماح لـ Prime Physio بإرسال الإشعارات على هذا الجهاز.");
      else if (result === "denied") setMessage("تم حظر الإشعارات. يمكنك السماح بها من إعدادات الموقع في المتصفح.");
      else setMessage("لم يتم تغيير إعدادات الإشعارات.");
    } catch {
      setMessage("تعذر طلب إذن الإشعارات من المتصفح.");
    } finally {
      setIsActivating(false);
    }
  };

  const installApp = async () => {
    if (!installPrompt) {
      setMessage("لتثبيت التطبيق، افتح قائمة المتصفح ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setMessage("تم قبول تثبيت Prime Physio.");
    setInstallPrompt(null);
  };

  const displayName = user?.name?.replace(/^د\.\s*/, "").trim() || user?.email?.split("@")[0] || (isRtl ? "صاحب الحساب" : "Account owner");
  const menuItems = [
    { label: "نظرة عامة", en: "Overview", href: "/overview.php/", icon: LayoutDashboard },
    { label: "مراكزي", en: "My Centers", href: "/centers.php/", icon: Building },
    { label: "التصدير الكامل للبيانات", en: "Full data export", href: "/export.php/", icon: Download },
    { label: "الحساب والاشتراك", en: "Account & subscription", href: "/account.php/", icon: User },
    { label: "الباقات", en: "Plans", href: "/plans.php/", icon: CreditCard },
    { label: "الإشعارات", en: "Notifications", href: "/notices.php/", icon: Bell },
  ];

  const sidebar = (
    <>
      <Link href="/home.php" onClick={() => setMobileMenuOpen(false)} className="mb-[26px] flex h-[42px] w-full items-center justify-start gap-[9px] px-[2px]">
        <span className="text-[21px] font-black tracking-tight text-[#153B60]">Prime<span className="text-[#5B50C7]">Physio</span></span>
        <span className="flex h-[35px] w-[35px] items-center justify-center rounded-[9px] bg-[#5B50C7] text-white"><Building className="h-[21px] w-[21px]" /></span>
      </Link>
      <nav className="space-y-[2px]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/notices.php/";
          return <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
            className={`flex h-[44px] w-full items-center gap-[12px] rounded-[9px] px-[14px] text-[14px] font-semibold transition-colors ${active ? "bg-[#F1EFFF] text-[#5B50C7]" : "text-[#59616B] hover:bg-[#F7F9FB] hover:text-[#5B50C7]"}`}>
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
            <span className="flex-1 text-right">{isRtl ? item.label : item.en}</span>
          </Link>;
        })}
      </nav>
      <div className="mt-auto space-y-[2px] border-t border-[#EEF0F2] pt-[15px]">
        <Link href="/support" className="flex h-[42px] items-center gap-[12px] rounded-[9px] px-[14px] text-[14px] font-semibold text-[#737B85] hover:bg-[#F7F9FB]"><HelpCircle className="h-[18px] w-[18px]" /><span>{isRtl ? "مركز المساعدة" : "Help Center"}</span></Link>
        <Link href="/about" className="flex h-[42px] items-center gap-[12px] rounded-[9px] px-[14px] text-[14px] font-semibold text-[#737B85] hover:bg-[#F7F9FB]"><Sparkles className="h-[18px] w-[18px]" /><span>{isRtl ? "الجديد" : "What's New"}</span></Link>
      </div>
    </>
  );

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white font-sans text-[#303846]">
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-[290px] shrink-0 flex-col border-l border-[#E8EBEF] bg-white px-[12px] pb-[18px] pt-[16px] lg:flex">{sidebar}</aside>
        {mobileMenuOpen && <div className="fixed inset-0 z-50 flex lg:hidden">
          <button aria-label={isRtl ? "إغلاق القائمة" : "Close menu"} onClick={() => setMobileMenuOpen(false)} className="absolute inset-0 bg-black/25" />
          <aside className="relative z-10 flex h-full w-[290px] max-w-[85vw] flex-col border-l border-[#E8EBEF] bg-white px-[12px] pb-[18px] pt-[16px] shadow-xl">
            <button onClick={() => setMobileMenuOpen(false)} aria-label="Close" className="mb-3 self-start rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>}
        <section className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-[#E8EBEF] bg-white px-4 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-2 text-[#5B50C7] transition hover:bg-[#F1EFFF] lg:hidden" aria-label={isRtl ? "فتح القائمة" : "Open menu"}><Menu className="h-5 w-5" /></button>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[12px] font-semibold text-emerald-700 sm:inline-flex"><Wifi className="h-4 w-4" />{isRtl ? "متصل" : "Online"}</span>
              <button onClick={toggleLanguage} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#5B50C7]/20 bg-[#F1EFFF] px-3 text-[12px] font-bold text-[#5B50C7] transition hover:bg-[#5B50C7] hover:text-white"><Globe className="h-4 w-4" />{isRtl ? "ENG" : "عربي"}</button>
              <Link href="/notices.php/" aria-label={isRtl ? "الإشعارات" : "Notifications"} className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#5B50C7]/20 bg-white text-[#5B50C7]"><Bell className="h-[18px] w-[18px]" /></Link>
              <div className="relative">
                <button type="button" aria-haspopup="menu" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen(v => !v)} className="flex max-w-[190px] items-center gap-2 rounded-lg border border-[#E8EBEF] bg-white px-2 py-1.5 text-start hover:border-[#5B50C7]/40 hover:bg-[#F1EFFF]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5B50C7] text-[12px] font-bold text-white">{displayName.trim().charAt(0).toUpperCase()}</span>
                  <span className="hidden min-w-0 sm:block"><span className="block truncate text-[12px] font-bold text-[#303846]">{displayName}</span><span className="block text-[10px] text-[#8A929C]">{isRtl ? "صاحب الحساب" : "Account owner"}</span></span>
                  <User className="hidden h-4 w-4 text-[#5B50C7] sm:block" />
                </button>
                {accountMenuOpen && <div role="menu" className="absolute end-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-[#E8EBEF] bg-white py-1.5 shadow-xl">
                  <div className="border-b border-[#F0F2F6] px-4 py-3"><p className="truncate text-xs font-bold text-[#303846]">{displayName}</p><p className="mt-0.5 text-[10px] text-[#8A929C]">{user?.email}</p></div>
                  <Link href="/account.php/" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-3 text-sm font-semibold text-[#4B5563] hover:bg-[#F7F6FF]">{isRtl ? "الحساب والاشتراك" : "Account & subscription"}</Link>
                  <button onClick={() => { setAccountMenuOpen(false); logout(); }} className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#4B5563] hover:bg-[#F7F6FF]"><LogOut className="h-4 w-4" />{isRtl ? "تسجيل الخروج" : "Log out"}</button>
                </div>}
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 p-4 text-slate-800 sm:p-6 lg:p-8">
            <header className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46BA]"><Bell className="h-6 w-6" /></div>
              <div><h1 className="flex items-center gap-2 text-2xl font-extrabold text-[#153B60]">الإشعارات <HelpLink label="الإشعارات" /></h1><p className="mt-1 text-sm text-slate-500">ما يبلغك به Prime Physio عن حسابك ومراكزك.</p></div>
            </header>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#153B60]">الإشعارات على هذا الجهاز <HelpLink label="الإشعارات على هذا الجهاز" /></h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">استقبل إشعارات Prime Physio على هذا الهاتف أو الكمبيوتر حتى عندما يكون Prime Physio مغلقاً.</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="button" onClick={activateNotifications} disabled={isActivating || permission === "granted"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#4F46BA] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#4338A8] disabled:cursor-not-allowed disabled:bg-emerald-600">
                  {permission === "granted" ? <CheckCircle2 className="h-4 w-4" /> : <Bell className="h-4 w-4" />}{isActivating ? "جارٍ التفعيل..." : permission === "granted" ? "تم السماح بالإشعارات" : "تفعيل"}
                </button>
                <button type="button" onClick={installApp} disabled={isInstalled} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#4F46BA] hover:text-[#4F46BA] disabled:cursor-not-allowed disabled:opacity-60">
                  {isInstalled ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}{isInstalled ? "التطبيق مثبّت بالفعل" : "ثبّت التطبيق"}
                </button>
                <HelpLink label="تفعيل الإشعارات وتثبيت التطبيق" />
              </div>
              {message && <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"><Bell className="mt-1 h-4 w-4 shrink-0 text-[#4F46BA]" />{message}</p>}
              {permission === "denied" && <p className="mt-3 text-xs leading-6 text-amber-700">الإشعارات محظورة حالياً من إعدادات المتصفح لهذا الموقع. غيّر الإذن إلى «السماح» ثم أعد تحميل الصفحة.</p>}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6"><h2 className="flex items-center gap-2 text-lg font-extrabold text-[#153B60]">سجل الإشعارات <HelpLink label="سجل الإشعارات" /></h2></div>
              <div className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center"><div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300"><Bell className="h-7 w-7" /></div><p className="text-sm font-semibold text-slate-500">لا توجد إشعارات بعد.</p></div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#153B60]">أجهزتي <HelpLink label="أجهزتي" /></h2>
              <div className="flex min-h-28 items-center justify-center gap-3 text-center text-sm text-slate-500"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-300">{typeof navigator !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent) ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}</div>لا يوجد جهاز يستقبل إشعاراتك بعد.</div>
            </section>

            <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row">
              <p>© Prime Physio 2026</p><nav className="flex flex-wrap items-center justify-center gap-4"><Link href="/support" className="transition hover:text-[#4F46BA]">مركز المساعدة</Link><Link href="/terms" className="transition hover:text-[#4F46BA]">الشروط</Link><Link href="/privacy" className="transition hover:text-[#4F46BA]">الخصوصية</Link></nav>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
