"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, CalendarDays, Check, ChevronLeft, HelpCircle,
  ExternalLink, RefreshCw, Users, User, CreditCard, Building,
  Stethoscope, Check
} from "lucide-react";

type Center = {
  id: string; name: string; slug: string | null; logoUrl: string | null;
  todayAppointments: number; monthAppointments: number; previousAppointments: number;
  attendanceRate: number | null; receivedPayments: number; previousPayments: number;
  activeStaff: number; activePatients: number; setupProgress: { completed: number; total: number }; setupChecks?: boolean[];
  subscription: string; activeUsers: number; createdAt: string;
};
type OverviewData = {
  centers: Center[];
  totals: {
    todayAppointments: number; monthAppointments: number; previousAppointments: number;
    attendanceRate: number | null; receivedPayments: number; previousPayments: number;
    activeStaff: number; activePatients: number; activeUsers: number; userLimit: number;
  } | null;
  updatedAt: string;
};

const setupItems = [
  { title: "بيانات مركزك", guide: "إعداد مركزك", href: "/settings.php/" },
  { title: "اللغة والمنطقة الزمنية والعملة", guide: "إعداد مركزك", href: "/settings.php/" },
  { title: "خدماتك", guide: "إعداد مركزك", href: "/services.php/" },
  { title: "قائمة أسعارك", guide: "إعداد مركزك", href: "/services.php/" },
  { title: "أضف أول أخصائي", guide: "بناء فريقك", href: "/staff.php/" },
  { title: "سجّل أول حالة", guide: "أول حالة من البداية للنهاية", href: "/patients.php/" },
  { title: "احجز الجلسات", guide: "أول حالة من البداية للنهاية", href: "/appointments.php/" },
  { title: "استلم أول دفعة", guide: "أول حالة من البداية للنهاية", href: "/invoices.php/" },
];

function MetricCard({ title, value, note, icon: Icon, tone = "blue" }: {
  title: string; value: string | number; note?: string; icon: any; tone?: "blue" | "green" | "violet" | "amber";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-700",
  };
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,.025)] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold leading-6 text-slate-500 sm:text-sm">{title}</span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-[18px] w-[18px]" /></span>
      </div>
      <div className="mt-3 text-[27px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums sm:text-[30px]">{value}</div>
      {note && <p className="mt-2 text-[11px] leading-5 text-slate-400 sm:text-xs">{note}</p>}
    </article>
  );
}

export default function OverviewDashboard() {
  const { user, isLoading, isEnriching } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const month = useMemo(() => new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric", timeZone: "Africa/Cairo" }).format(new Date()), []);
  const displayName = user?.name?.replace(/^د\\.\\s*/, "").trim() || user?.email?.split("@")[0] || "Ahmed";
  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch("/api/overview", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر تحميل البيانات");
      setData(body);
      setLastUpdated(new Date());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isEnriching && user?.email) load();
  }, [isLoading, isEnriching, user?.email, load]);

  if (isLoading || isEnriching || !user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#1262A8] border-t-transparent" /></main>;
  }

  const totals = data?.totals;
  const currency = (value: number) => new Intl.NumberFormat("en-EG", { maximumFractionDigits: 0 }).format(value);
  const ago = lastUpdated ? (Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 60000)) <= 1 ? "منذ دقيقة" : `منذ ${Math.floor((Date.now() - lastUpdated.getTime()) / 60000)} دقيقة`) : "—";

  return (
    <main dir="rtl" className="min-h-screen bg-[#F7F9FC] font-sans text-[#263445]">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-8 pt-7 sm:px-6 lg:px-9 lg:pt-9">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-[#172B42] sm:text-[32px]">مرحباً، {displayName}</h1>
            <p className="mt-2 text-[13px] leading-6 text-slate-500 sm:text-sm">كل مراكزك هذا الشهر · {month} · آخر تحديث {ago}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => load(true)} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-[#1262A8] disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> تحديث
            </button>
            <button type="button" title="مساعدة حول النظرة العامة" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-[#1262A8]"><HelpCircle className="h-[18px] w-[18px]" /></button>
            <Link href="/centers.php/" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1262A8] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0D528E]"><Building className="h-4 w-4" /> مراكزي</Link>
          </div>
        </header>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mb-9">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-[19px] font-extrabold text-[#20364D] sm:text-[21px]">هذا الشهر، كل المراكز</h2>
            <button title="تعرض هذه المؤشرات ملخص جميع المراكز التابعة لحسابك" className="text-slate-400 hover:text-[#1262A8]"><HelpCircle className="h-4 w-4" /></button>
          </div>
          {loading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{Array.from({length:8}).map((_,i)=><div key={i} className="h-[126px] animate-pulse rounded-2xl border border-slate-100 bg-white" />)}</div> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              <MetricCard title="جلسات اليوم" value={totals?.todayAppointments ?? 0} icon={CalendarDays} tone="blue" />
              <MetricCard title="جلسات هذا الشهر" value={totals?.monthAppointments ?? 0} note={`الشهر الماضي: ${totals?.previousAppointments ?? 0}`} icon={Activity} tone="violet" />
              <MetricCard title="نسبة الحضور" value={totals?.attendanceRate == null ? "—" : `${totals.attendanceRate}%`} note="من الجلسات المستحقة حتى اليوم، دون الملغاة" icon={Check} tone="green" />
              <MetricCard title="المدفوعات المستلمة (EGP)" value={currency(totals?.receivedPayments ?? 0)} note={`الشهر الماضي: ${currency(totals?.previousPayments ?? 0)} EGP`} icon={CreditCard} tone="amber" />
              <MetricCard title="الأخصائيون النشطون" value={totals?.activeStaff ?? 0} icon={Stethoscope} />
              <MetricCard title="الحالات النشطة" value={totals?.activePatients ?? 0} icon={User} tone="green" />
              <MetricCard title="حسابات المستخدمين النشطة" value={`${totals?.activeUsers ?? 0} / ${totals?.userLimit ?? 20}`} icon={Users} tone="violet" />
              <article className="flex min-h-[126px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,.025)] sm:p-5">
                <span className="text-[13px] font-semibold text-slate-500 sm:text-sm">من باقتك</span>
                <div className="flex items-end justify-between gap-2"><span className="text-sm font-bold text-slate-700">{data?.centers?.[0]?.subscription || "—"}</span><Link href="/account.php/" className="inline-flex items-center gap-1 text-xs font-bold text-[#1262A8] hover:underline">التفاصيل <ChevronLeft className="h-3.5 w-3.5" /></Link></div>
              </article>
            </div>
          )}
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-[19px] font-extrabold text-[#20364D] sm:text-[21px]">الفروع جنباً إلى جنب</h2>
            <button title="مقارنة الجلسات والحضور والمدفوعات والفرق بين الفروع" className="text-slate-400 hover:text-[#1262A8]"><HelpCircle className="h-4 w-4" /></button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,.025)]">
            <div className="hidden grid-cols-[minmax(190px,1.7fr)_repeat(6,minmax(75px,.7fr))_minmax(90px,.8fr)] items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[11px] font-bold text-slate-500 lg:grid">
              <span>المركز</span><span>اليوم</span><span>هذا الشهر</span><span>الحضور</span><span>المدفوعات</span><span>الأخصائيون</span><span>الحالات</span><span>إجراء</span>
            </div>
            {loading ? <div className="h-24 animate-pulse bg-white" /> : !data?.centers?.length ? (
              <div className="px-5 py-12 text-center"><Building className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-bold text-slate-700">لا توجد مراكز مرتبطة بحسابك</p><Link href="/addcenter.php/" className="mt-3 inline-flex text-sm font-bold text-[#1262A8] hover:underline">إنشاء مركز جديد</Link></div>
            ) : data.centers.map((center, index) => (
              <div key={center.id} className={`grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(190px,1.7fr)_repeat(6,minmax(75px,.7fr))_minmax(90px,.8fr)] lg:items-center lg:gap-3 ${index ? "border-t border-slate-100" : ""}`}>
                <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white">{center.logoUrl ? <img src={center.logoUrl} alt="" className="h-full w-full object-contain" /> : <Building className="h-5 w-5 text-[#1262A8]" />}</div>
                  <div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-800">{center.name}</p><p dir="ltr" className="mt-1 truncate text-left text-[11px] text-slate-400">{center.slug ? `primephysio.vercel.app/${center.slug}` : "—"}</p></div>
                </div>
                <div className="flex items-center justify-between text-xs lg:block"><span className="text-slate-400 lg:hidden">جلسات اليوم</span><strong className="text-sm tabular-nums text-slate-700">{center.todayAppointments}</strong></div>
                <div className="flex items-center justify-between text-xs lg:block"><span className="text-slate-400 lg:hidden">جلسات الشهر</span><strong className="text-sm tabular-nums text-slate-700">{center.monthAppointments}</strong></div>
                <div className="flex items-center justify-between text-xs lg:block"><span className="text-slate-400 lg:hidden">الحضور</span><strong className="text-sm tabular-nums text-slate-700">{center.attendanceRate == null ? "—" : `${center.attendanceRate}%`}</strong></div>
                <div className="flex items-center justify-between text-xs lg:block"><span className="text-slate-400 lg:hidden">المدفوعات</span><strong className="text-sm tabular-nums text-slate-700">{currency(center.receivedPayments)} <small className="text-[10px] text-slate-400">EGP</small></strong></div>
                <div className="flex items-center justify-between text-xs lg:block"><span className="text-slate-400 lg:hidden">الأخصائيون</span><strong className="text-sm tabular-nums text-slate-700">{center.activeStaff}</strong></div>
                <div className="flex items-center justify-between text-xs lg:block"><span className="text-slate-400 lg:hidden">الحالات</span><strong className="text-sm tabular-nums text-slate-700">{center.activePatients}</strong></div>
                <div className="col-span-2 flex items-center justify-between gap-3 lg:col-span-1 lg:justify-start">
                  <span className="text-[11px] text-slate-400 lg:hidden">آخر تحديث: {center.createdAt ? new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium"}).format(new Date(center.createdAt)) : "—"}</span>
                  <a href={`/dashboard/?clinicId=${encodeURIComponent(center.id)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 min-w-[92px] items-center justify-center gap-2 rounded-lg bg-[#1262A8] px-4 text-xs font-extrabold text-white transition hover:bg-[#0D528E]">فتح <ExternalLink className="h-3.5 w-3.5" /></a>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-6 text-slate-400">الحضور = الجلسات التي حضرها المرضى من الجلسات المستحقة حتى اليوم هذا الشهر (دون الملغاة). المدفوعات = المبالغ المسجلة كمدفوعة في المركز هذا الشهر.</p>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-[19px] font-extrabold text-[#20364D] sm:text-[21px]">أكمل تجهيز مراكزك</h2>
            <button title="أكمل الخطوات لمساعدة مركزك على البدء" className="text-slate-400 hover:text-[#1262A8]"><HelpCircle className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {(data?.centers || []).map((center) => {
              const done = center.setupProgress?.completed ?? 0;
              const total = center.setupProgress?.total ?? 8;
              return <article key={center.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,.025)] sm:p-5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div><h3 className="text-base font-extrabold text-slate-800">{center.name}</h3><p className="mt-1 text-xs text-slate-400">قائمة إكمال إعداد المركز</p></div>
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-[#1262A8]">{done} / {total}</span>
                </div>
                <div className="mt-4 space-y-1">
                  {setupItems.map((item, i) => {
                    const completed = center.setupChecks ? !!center.setupChecks[i] : i < done;
                    return <div key={item.title} className="flex min-h-[42px] items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                      <span className={`flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full border ${completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"}`}>{completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />}</span>
                      <span className={`min-w-0 flex-1 text-[13px] font-semibold ${completed ? "text-slate-400 line-through" : "text-slate-700"}`}>{item.title}</span>
                      <Link href={item.href} className="shrink-0 text-[10px] font-semibold text-[#1262A8] hover:underline">دليل الإعداد: {item.guide}</Link>
                    </div>;
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Link href={`/dashboard/?clinicId=${encodeURIComponent(center.id)}&wizgo=c_info`} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1262A8] px-4 text-xs font-extrabold text-white transition hover:bg-[#0D528E]">تابِع التجهيز <ChevronLeft className="h-4 w-4" /></Link>
                  <Link href={`/editcenter.php/?centerlink=${encodeURIComponent(center.slug || "")}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:text-[#1262A8]">تعديل المركز</Link>
                </div>
              </article>;
            })}
          </div>
        </section>

        <footer className="flex flex-col-reverse items-center justify-between gap-3 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row">
          <span>© 2026 Prime Physio</span>
          <div className="flex flex-wrap items-center justify-center gap-2"><Link href="/support.php/" className="hover:text-[#1262A8]">مركز المساعدة</Link><span>·</span><Link href="/terms.php/" className="hover:text-[#1262A8]">الشروط</Link><span>·</span><Link href="/privacy.php/" className="hover:text-[#1262A8]">الخصوصية</Link></div>
        </footer>
      </div>
    </main>
  );
}
