"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Bell, Building, HelpCircle, CreditCard, Download, Globe, Wifi,
  LayoutDashboard, RefreshCw, Sparkles, User, Menu as MenuIcon, X,
  Copy, Check, Users, CalendarDays, Activity
} from "lucide-react";
import { useEffect, useState } from "react";

const menu = [
  { label: "نظرة عامة", en: "Overview", href: "/center-management", icon: LayoutDashboard },
  { label: "مراكزي", en: "My Centers", href: "/center-management", icon: Building },
  { label: "التصدير الكامل للبيانات", en: "Full data export", href: "/center-management#export", icon: Download },
  { label: "الحساب والاشتراك", en: "Account & subscription", href: "/subscription", icon: User },
  { label: "الباقات", en: "Plans", href: "/plans", icon: CreditCard },
  { label: "الإشعارات", en: "Notifications", href: "/notifications", icon: Bell },
];

function ActionIcon({ kind, className = "h-4 w-4" }: { kind: "open" | "qr" | "edit" | "print"; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (kind === "open") return <svg {...common}><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" /></svg>;
  if (kind === "qr") return <svg {...common}><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z" /><path d="M14 14h3v3h-3zM20 14v2M20 20h-2M14 20v1M17 20v1M20 17v1" /></svg>;
  if (kind === "edit") return <svg {...common}><path d="m16 4 4 4L9 19l-5 1 1-5L16 4Z" /><path d="m14 6 4 4" /></svg>;
  return <svg {...common}><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6zM18 12h.01" /></svg>;
}

export default function CenterManagementPage() {
  const { user, isLoading, isEnriching, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [centers, setCenters] = useState<Array<any>>([]);
  const [centersLoading, setCentersLoading] = useState(true);
  const [centersError, setCentersError] = useState("");
  const [qrCenter, setQrCenter] = useState<any>(null);
  const [editCenter, setEditCenter] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", phone: "", address: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const publicUrl = (slug: string) => `${window.location.origin}/clinic/${slug}`;
  const copyCenterUrl = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(slug));
      setActionMessage(isRtl ? "تم نسخ رابط المركز العام" : "Public center link copied");
      window.setTimeout(() => setActionMessage(""), 2500);
    } catch {
      setActionMessage(isRtl ? "تعذر النسخ تلقائيًا. انسخ الرابط يدويًا." : "Copy failed. Please copy the link manually.");
    }
  };
  const downloadCenterExport = (centerId: string) => {
    window.location.href = `/api/center-management/export?clinicId=${encodeURIComponent(centerId)}`;
  };
  const openEdit = (center: any) => {
    setEditCenter(center);
    setEditForm({ name: center.name || "", slug: center.slug || "", phone: center.phone || "", address: center.address || "" });
  };
  const saveCenterEdit = async () => {
    if (!editCenter) return;
    setEditLoading(true);
    setActionMessage("");
    try {
      const response = await fetch("/api/center-management/centers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId: editCenter.id, ...editForm }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ التعديلات");
      setCenters((items) => items.map((item) => item.id === editCenter.id ? { ...item, ...data.center } : item));
      setEditCenter(null);
      setActionMessage(isRtl ? "تم حفظ بيانات المركز" : "Center details saved");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "تعذر حفظ التعديلات");
    } finally {
      setEditLoading(false);
    }
  };

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
    return <main className="flex min-h-screen items-center justify-center bg-white"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#5B50C7] border-t-transparent" /></main>;
  }

  const startSetup = () => router.push("/my-centers/create");
  const sidebar = (
    <>
      <Link href="/home.php" onClick={() => setMobileMenuOpen(false)} className="mb-[26px] flex h-[42px] w-full items-center justify-start gap-[9px] px-[2px]">
        <span className="text-[21px] font-black tracking-tight text-[#153B60]">Prime<span className="text-[#5B50C7]">Physio</span></span>
        <span className="flex h-[35px] w-[35px] items-center justify-center rounded-[9px] bg-[#5B50C7] text-white"><Building className="h-[21px] w-[21px]" /></span>
      </Link>
      <nav className="space-y-[2px]">
        {menu.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
              className={`flex h-[44px] w-full items-center gap-[12px] rounded-[9px] px-[14px] text-[14px] font-semibold transition-colors ${index === 0 ? "bg-[#F1EFFF] text-[#5B50C7]" : "text-[#59616B] hover:bg-[#F7F9FB] hover:text-[#5B50C7]"}`}>
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
              <button onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-2 text-[#5B50C7] transition hover:bg-[#F1EFFF] lg:hidden" aria-label={isRtl ? "فتح القائمة" : "Open menu"}>
                <MenuIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[12px] font-semibold text-emerald-700 sm:inline-flex">
                <Wifi className="h-3.5 w-3.5" />
                {isRtl ? "متصل" : "Online"}
              </span>
              <button
                onClick={toggleLanguage}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#5B50C7]/20 bg-[#F1EFFF] px-3 text-[12px] font-bold text-[#5B50C7] transition hover:bg-[#5B50C7] hover:text-white"
                aria-label={isRtl ? "Switch to English" : "التبديل إلى العربية"}
              >
                <Globe className="h-4 w-4" />
                {isRtl ? "ENG" : "عربي"}
              </button>
              <Link href="/notifications" aria-label={isRtl ? "الإشعارات" : "Notifications"} className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#5B50C7]/20 bg-white text-[#5B50C7] transition hover:bg-[#5B50C7] hover:text-white">
                <Bell className="h-[18px] w-[18px]" />
              </Link>
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  className="flex max-w-[190px] items-center gap-2 rounded-lg border border-[#E8EBEF] bg-white px-2 py-1.5 text-start transition hover:border-[#5B50C7]/40 hover:bg-[#F1EFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B50C7]/40"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5B50C7] text-[12px] font-bold text-white">
                    {(displayName.trim().charAt(0) || "A").toUpperCase()}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block truncate text-[12px] font-bold text-[#303846]">{displayName}</span>
                    <span className="block text-[10px] text-[#8A929C]">{isRtl ? "صاحب الحساب" : "Account owner"}</span>
                  </span>
                  <User className="hidden h-4 w-4 text-[#5B50C7] sm:block" />
                </button>
                {accountMenuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label={isRtl ? "إغلاق قائمة الحساب" : "Close account menu"}
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setAccountMenuOpen(false)}
                    />
                    <div role="menu" className="absolute end-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-[#E8EBEF] bg-white py-1.5 shadow-[0_12px_35px_rgba(25,48,75,.16)]">
                      <div className="border-b border-[#F0F2F6] px-4 py-3">
                        <p className="truncate text-xs font-bold text-[#303846]">{displayName}</p>
                        <p className="mt-0.5 text-[10px] text-[#8A929C]">{user.email}</p>
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setAccountMenuOpen(false); router.push("/subscription"); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#4B5563] transition hover:bg-[#F7F6FF] hover:text-[#5B50C7]"
                      >
                        <CreditCard className="h-4 w-4" />
                        {isRtl ? "الحساب والاشتراك" : "Account & subscription"}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setAccountMenuOpen(false); router.push("/forgot-password"); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#4B5563] transition hover:bg-[#F7F6FF] hover:text-[#5B50C7]"
                      >
                        <User className="h-4 w-4" />
                        {isRtl ? "تغيير كلمة المرور" : "Change password"}
                      </button>
                      <div className="my-1 border-t border-[#F0F2F6]" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={async () => { setAccountMenuOpen(false); await logout(); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                        {isRtl ? "تسجيل الخروج" : "Log out"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-[32px] pb-[26px] pt-[40px] max-sm:px-4 max-sm:pt-7">
            <div className="mb-[24px] flex min-h-[75px] items-center justify-between gap-5 max-sm:flex-col max-sm:items-stretch">
              <div className="order-2 flex items-center gap-[13px] max-sm:order-2">
                <button onClick={() => window.location.reload()} className="inline-flex h-[40px] items-center gap-[8px] rounded-full border border-[#E7EBEF] bg-white px-[16px] text-[14px] font-semibold text-[#69727D] transition hover:bg-slate-50">
                  {isRtl ? "التحديث" : "Refresh"}<RefreshCw className="h-[17px] w-[17px]" />
                </button>
                <Link href="/my-centers" className="inline-flex h-[40px] items-center gap-[8px] rounded-full bg-[#5B50C7] px-[17px] text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(91,80,199,.18)] transition hover:bg-[#4338A8]">
                  {isRtl ? "مراكزي" : "My Centers"}<Building className="h-[17px] w-[17px]" />
                </Link>
              </div>
              <div className="order-1 text-right max-sm:order-1">
                <h1 className="text-[30px] font-extrabold leading-[1.35] tracking-tight text-[#202B38] max-sm:text-[25px]">{isRtl ? `مرحباً، ${displayName}` : `Welcome, ${displayName}`}</h1>
                <p className="mt-[3px] text-[14px] text-[#8A929C]">{isRtl ? `كل مراكزك هذا الشهر · ${monthLabel}` : `All your centers this month · ${monthLabel}`}</p>
              </div>
            </div>

            <section className="w-full">
              {centersLoading ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-[18px] border border-[#E8EBEF] bg-white">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5B50C7] border-t-transparent" />
                </div>
              ) : centersError ? (
                <div className="rounded-[18px] border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{centersError}</div>
              ) : centers.length === 0 ? (
                <div className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-[19px] border border-dashed border-[#E6E9ED] bg-white px-5 py-10 text-center">
                  <Building className="mb-[15px] h-[43px] w-[43px] text-[#5B50C7]" strokeWidth={2.1} />
                  <h3 className="text-[21px] font-extrabold leading-[1.5] text-[#303846]">{isRtl ? "لم تنشئ أي مركز بعد" : "You haven't created a center yet"}</h3>
                  <p className="mt-[4px] max-w-[440px] text-[15px] leading-[29px] text-[#9299A2]">{isRtl ? "اختر الباقة المناسبة ثم أنشئ مركزك الأول. ستظهر روابط جميع مراكزك هنا." : "Choose a plan and create your first center. All your center links will appear here."}</p>
                  <button onClick={startSetup} className="mt-[16px] inline-flex h-[46px] items-center justify-center rounded-full bg-[#5B50C7] px-[27px] text-[14px] font-extrabold text-white shadow-[0_5px_14px_rgba(91,80,199,.2)] transition hover:bg-[#4338A8]">{isRtl ? "اختر باقة وأنشئ مركزك" : "Choose a plan and create a center"}</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {centers.map((center) => {
                    const shareUrl = center.slug ? `/clinic/${center.slug}` : "";
                    const setupSteps = center.setupProgress || { completed: 0, total: 7 };
                    return (
                      <article key={center.id} className="overflow-hidden rounded-[20px] border border-[#E5EAF2] bg-white shadow-[0_8px_28px_rgba(25,48,75,.06)]">
                        <div className="p-5 sm:p-6">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E8EBEF] bg-[#F5F6FF]">
                              {center.logoUrl ? <img src={center.logoUrl} alt="" className="h-full w-full object-contain" /> : <img src="/logo.png" alt="Prime Physio" className="h-9 w-9 object-contain" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-[17px] font-extrabold leading-7 text-[#24364A]">{center.name}</h3>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#66758A]">
                                <span>{isRtl ? `التجهيز ${setupSteps.completed}/${setupSteps.total}` : `Setup ${setupSteps.completed}/${setupSteps.total}`}</span>
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E9EDF5]"><div className="h-full rounded-full bg-[#5B50C7]" style={{ width: `${Math.round((setupSteps.completed / setupSteps.total) * 100)}%` }} /></div>
                                <span className="rounded-full bg-[#F1EFFF] px-2 py-1 text-[#5B50C7]">{center.planName || (isRtl ? "الخطة الأساسية" : "Basic plan")}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#E7EAF1] bg-[#F8FAFD] p-2.5">
                            <span className="min-w-0 flex-1 truncate text-left text-[12px] font-medium text-[#52647A]" dir="ltr">{center.slug ? `${typeof window !== "undefined" ? window.location.host : "primephysio.vercel.app"}${shareUrl}` : "—"}</span>
                            <button type="button" disabled={!center.slug} onClick={() => center.slug && copyCenterUrl(center.slug)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#EDF0FF] px-3 text-xs font-bold text-[#5147B8] hover:bg-[#E2E6FF] disabled:opacity-40"><Copy className="h-4 w-4" />{isRtl ? "نسخ" : "Copy"}</button>
                          </div>

                          <div className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-[#EDF0F4] rounded-xl border border-[#EDF0F4] bg-white py-3 text-center">
                            <div className="px-2"><CalendarDays className="mx-auto mb-1 h-4 w-4 text-[#5B50C7]" /><strong className="block text-xl font-extrabold tabular-nums text-[#24364A]">{center.todayAppointments ?? 0}</strong><span className="text-[11px] text-[#8792A0]">{isRtl ? "جلسات اليوم" : "Today"}</span></div>
                            <div className="border-x border-[#EDF0F4] px-2"><Activity className="mx-auto mb-1 h-4 w-4 text-[#5B50C7]" /><strong className="block text-xl font-extrabold tabular-nums text-[#24364A]">{center.monthAppointments ?? 0}</strong><span className="text-[11px] text-[#8792A0]">{isRtl ? "هذا الشهر" : "This month"}</span></div>
                            <div className="px-2"><Users className="mx-auto mb-1 h-4 w-4 text-[#5B50C7]" /><strong className="block text-xl font-extrabold tabular-nums text-[#24364A]">{center.activeUsers ?? 0}</strong><span className="text-[11px] text-[#8792A0]">{isRtl ? "مستخدمون نشطون" : "Active users"}</span></div>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Link href={`/center-management/open/${center.id}`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#5147B8] text-sm font-extrabold text-white shadow-sm transition hover:bg-[#40369F]"><ActionIcon kind="open" />{isRtl ? "فتح" : "Open"}</Link>
                            <button type="button" disabled={!center.slug} onClick={() => setQrCenter(center)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#DCE2F0] bg-white text-sm font-bold text-[#4E5D72] hover:bg-[#F7F8FC] disabled:opacity-40"><ActionIcon kind="qr" />{isRtl ? "ملصق QR" : "QR sticker"}</button>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button type="button" onClick={() => openEdit(center)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E3E8F0] text-sm font-bold text-[#536276] hover:bg-slate-50"><ActionIcon kind="edit" />{isRtl ? "تعديل" : "Edit"}</button>
                            <button type="button" onClick={() => downloadCenterExport(center.id)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E3E8F0] text-sm font-bold text-[#536276] hover:bg-slate-50"><Download className="h-4 w-4" />{isRtl ? "التصدير الكامل" : "Full export"}</button>
                          </div>
                          <div className="mt-4 flex items-start gap-2 border-t border-[#F0F2F6] pt-3 text-[11px] leading-6 text-[#8994A2]"><HelpCircle className="mt-1 h-4 w-4 shrink-0 text-[#5B50C7]" /><span>{isRtl ? "انسخ الرابط لإرساله على واتساب، أو اطبع ملصق QR لمكتب الاستقبال." : "Copy the link to share on WhatsApp, or print the QR sticker for reception."}</span></div>
                          <div className="mt-2 rounded-lg bg-[#F4F5F7] px-3 py-2 text-[11px] text-[#7B8490]">{isRtl ? "٦ · اضغط «فتح» لتدخل مركزك" : "6 · Press Open to enter your center"}</div>
                          <div className="mt-3 flex items-center justify-between border-t border-[#F0F2F6] pt-3 text-xs">
                            <span className="text-[#7B8490]">{isRtl ? "الاشتراك" : "Subscription"}: <strong className="text-[#303846]">{center.subscriptionStatus === "active" ? (isRtl ? "نشط" : "Active") : (isRtl ? "قيد التفعيل" : "Pending")}</strong></span>
                            <span className="text-[#7B8490]">{center.status || ""}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {actionMessage && <div role="status" className="fixed bottom-5 left-5 z-[70] rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">{actionMessage}</div>}
          {qrCenter && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-label={isRtl ? "ملصق QR للمركز" : "Center QR sticker"}>
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
                <div className="flex items-center justify-between"><h3 className="text-lg font-extrabold text-[#24364A]">{isRtl ? "ملصق QR للمركز" : "Center QR sticker"}</h3><button onClick={() => setQrCenter(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
                <p className="mt-1 text-sm text-slate-500">{qrCenter.name}</p>
                <img className="mx-auto my-5 h-56 w-56" alt="Center public QR code" src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=20&data=${encodeURIComponent(publicUrl(qrCenter.slug))}`} />
                <p className="break-all text-xs text-slate-500" dir="ltr">{publicUrl(qrCenter.slug)}</p>
                <button onClick={() => window.print()} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#5147B8] text-sm font-bold text-white"><ActionIcon kind="print" />{isRtl ? "طباعة الملصق" : "Print sticker"}</button>
              </div>
            </div>
          )}
          {editCenter && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-label={isRtl ? "تعديل بيانات المركز" : "Edit center"}>
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
                <div className="flex items-center justify-between"><h3 className="text-lg font-extrabold text-[#24364A]">{isRtl ? "تعديل بيانات المركز" : "Edit center details"}</h3><button onClick={() => setEditCenter(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
                <div className="mt-5 space-y-3">
                  <label className="block text-sm font-semibold text-slate-600">{isRtl ? "اسم المركز" : "Center name"}<input value={editForm.name} onChange={e=>setEditForm(v=>({...v,name:e.target.value}))} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5B50C7]" /></label>
                  <label className="block text-sm font-semibold text-slate-600">{isRtl ? "الرابط المختصر" : "URL slug"}<input value={editForm.slug} onChange={e=>setEditForm(v=>({...v,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-")}))} dir="ltr" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5B50C7]" /><span className="mt-1 block text-xs text-slate-400">{isRtl ? "تغيير الرابط قد يؤثر على الروابط القديمة." : "Changing this affects previously shared links."}</span></label>
                  <label className="block text-sm font-semibold text-slate-600">{isRtl ? "الهاتف" : "Phone"}<input value={editForm.phone} onChange={e=>setEditForm(v=>({...v,phone:e.target.value}))} dir="ltr" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5B50C7]" /></label>
                  <label className="block text-sm font-semibold text-slate-600">{isRtl ? "العنوان" : "Address"}<input value={editForm.address} onChange={e=>setEditForm(v=>({...v,address:e.target.value}))} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#5B50C7]" /></label>
                </div>
                <button disabled={editLoading} onClick={saveCenterEdit} className="mt-5 h-11 w-full rounded-xl bg-[#5147B8] text-sm font-extrabold text-white disabled:opacity-60">{editLoading ? (isRtl ? "جارٍ الحفظ..." : "Saving...") : (isRtl ? "حفظ التعديلات" : "Save changes")}</button>
              </div>
            </div>
          )}
          <footer className="mt-auto flex min-h-[64px] flex-wrap items-center justify-between gap-3 border-t border-[#E8EBEF] bg-white px-[32px] py-[15px] text-[12px] text-[#9AA1AA] max-sm:px-4">
            <div className="flex flex-wrap items-center gap-[7px]"><Link href="/support" className="hover:text-[#5B50C7]">{isRtl ? "مركز المساعدة" : "Help Center"}</Link><span>·</span><Link href="/terms" className="hover:text-[#5B50C7]">{isRtl ? "الشروط" : "Terms"}</Link><span>·</span><Link href="/privacy" className="hover:text-[#5B50C7]">{isRtl ? "الخصوصية" : "Privacy"}</Link></div>
            <span>© Prime Physio 2026</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
