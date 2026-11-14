"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowLeft, ArrowRight, Bell, Building, Check, CheckCircle2,
  ChevronLeft, HelpCircle, CreditCard, Crown, Database, Download,
  ExternalLink, FileText, Key, Loader2, Lock, LogOut,
  Mail, MessageSquare, Save, ShieldCheck, Smartphone, Users, User,
  CreditCard, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";

type SubscriptionRow = {
  id: string;
  plan_name: string;
  plan_price: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  order_id?: string | null;
  transaction_id?: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  basic: "المجانية",
  free: "المجانية",
  starter: "المجانية",
  silver: "الفضية",
  gold: "الذهبية",
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "numeric" }).format(date);
};

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)] ${className}`}>{children}</section>;
}

function SectionHeading({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon size={19} /></span>
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export default function AccountPhpPage() {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const clinicId = user?.clinicId;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [newsletter, setNewsletter] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [mailBusy, setMailBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [mailMessage, setMailMessage] = useState("");
  const [subscriptionRows, setSubscriptionRows] = useState<SubscriptionRow[]>([]);
  const [activePlan, setActivePlan] = useState("basic");
  const [staffTotal, setStaffTotal] = useState<number | null>(null);
  const [staffActive, setStaffActive] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let alive = true;
    const loadAccount = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!alive) return;
      const metadata = authUser?.user_metadata || {};
      const fullName = String(metadata.full_name || metadata.name || user?.name || "").replace(/^(Dr\.?\s*|د\.\s*)/i, "").trim();
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      setFirstName(String(metadata.first_name || nameParts[0] || ""));
      setLastName(String(metadata.last_name || nameParts.slice(1).join(" ") || ""));
      setPhone(String(metadata.phone || authUser?.phone || ""));
      setEmail(authUser?.email || user?.email || "");
      setNewsletter(Boolean(metadata.product_updates_email));

      if (clinicId) {
        const [subs, staff] = await Promise.all([
          supabase.from("subscriptions")
            .select("id, plan_name, plan_price, status, start_date, end_date, created_at, order_id, transaction_id")
            .eq("clinic_id", clinicId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase.from("staff").select("id, status", { count: "exact" }).eq("clinic_id", clinicId),
        ]);
        if (!alive) return;
        if (!subs.error && subs.data) {
          const rows = subs.data as SubscriptionRow[];
          setSubscriptionRows(rows);
          const current = rows.find((row) => row.status === "active");
          if (current?.plan_name) setActivePlan(current.plan_name.toLowerCase());
        }
        if (!staff.error) {
          const rows = staff.data || [];
          setStaffTotal(staff.count ?? rows.length);
          setStaffActive(rows.filter((row: any) => ["نشط", "active", "مفعل"].includes(String(row.status || "").toLowerCase())).length);
        }
      }
      if (alive) setLoadingData(false);
    };
    loadAccount();
    return () => { alive = false; };
  }, [clinicId, user?.email, user?.name]);

  const planLabel = PLAN_LABELS[activePlan] || activePlan;
  const isFree = ["basic", "free", "starter"].includes(activePlan);
  const userLimit = activePlan === "gold" ? "∞" : activePlan === "silver" ? "50" : "20";

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileBusy(true);
    setProfileMessage("");
    const { error } = await supabase.auth.updateUser({
      data: { first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() },
    });
    setProfileBusy(false);
    setProfileMessage(error ? "تعذر حفظ البيانات. حاول مرة أخرى." : "تم حفظ بيانات الملف الشخصي بنجاح.");
  };

  const saveMailPreferences = async () => {
    setMailBusy(true);
    setMailMessage("");
    const { error } = await supabase.auth.updateUser({ data: { product_updates_email: newsletter } });
    setMailBusy(false);
    setMailMessage(error ? "تعذر حفظ تفضيلات البريد الإلكتروني." : "تم حفظ تفضيلات البريد الإلكتروني.");
  };

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const usageCards = useMemo(() => [
    {
      title: "المستخدمون النشطون",
      value: staffActive === null ? "—" : String(staffActive),
      limit: userLimit,
      icon: Activity,
      tone: "teal",
      progress: staffActive === null || userLimit === "∞" ? 0 : Math.min(100, (staffActive / Number(userLimit)) * 100),
    },
    {
      title: "إجمالي المستخدمين",
      value: staffTotal === null ? "—" : String(staffTotal),
      limit: null,
      icon: Users,
      tone: "blue",
      progress: 0,
    },
    {
      title: "المراكز",
      value: clinicId ? "1" : "—",
      limit: "1",
      icon: Building,
      tone: "violet",
      progress: clinicId ? 100 : 0,
    },
    {
      title: "التخزين المستخدم",
      value: "—",
      limit: "1 GB",
      icon: Database,
      tone: "amber",
      progress: 0,
      note: "سيظهر الاستهلاك بعد تفعيل قياس مساحة الملفات.",
    },
  ], [staffActive, staffTotal, userLimit, clinicId]);

  return (
    <main dir="rtl" className="min-h-screen bg-[#f6f8fb] px-3 pb-10 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-teal-700">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              إعدادات الحساب
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">الحساب والاشتراك</h1>
            <p className="mt-2 text-sm text-slate-500" dir="ltr">{email || user?.email || "—"}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={16} className="text-teal-600" />
            بيانات حسابك وإعدادات اشتراكك في مكان واحد
          </div>
        </header>

        <SectionCard className="overflow-hidden">
          <div className="flex flex-col gap-5 bg-gradient-to-l from-[#073f43] via-[#075b60] to-[#0b7778] p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10"><Crown size={27} /></div>
              <div>
                <p className="text-sm font-medium text-teal-100">باقتك الحالية</p>
                <h2 className="mt-1 text-2xl font-extrabold">الباقة {planLabel}</h2>
                <p className="mt-1 text-sm text-teal-100">{isFree ? "$0 / شهرياً" : "اشتراك Prime Physio"}</p>
              </div>
            </div>
            <Link href="/subscription" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#075b60] shadow-sm transition hover:bg-teal-50">
              تغيير الباقة <ChevronLeft size={17} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">حالة الاشتراك</p>
              <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-800"><CheckCircle2 size={16} className="text-emerald-600" /> {subscriptionRows.some((row) => row.status === "active") ? "نشط" : "الباقة المجانية"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">تاريخ بداية الاشتراك</p>
              <p className="mt-2 text-sm font-bold text-slate-800">{formatDate(subscriptionRows.find((row) => row.status === "active")?.start_date || subscriptionRows[0]?.created_at)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">تاريخ الانتهاء</p>
              <p className="mt-2 text-sm font-bold text-slate-800">{formatDate(subscriptionRows.find((row) => row.status === "active")?.end_date)}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading icon={Activity} title="الاستخدام في كل مراكزك" description="ملخص استخدام موارد المنصة حسب باقتك الحالية."
            action={<span className="inline-flex items-center gap-1 text-xs text-slate-400"><HelpCircle size={15} /> الاستخدام الحالي</span>} />
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-5">
            {usageCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-slate-100 bg-white p-4 transition hover:border-teal-200 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><Icon size={18} /></span>
                    <span className="text-[11px] font-medium text-slate-400">الاستخدام</span>
                  </div>
                  <p className="mt-4 text-xs font-medium text-slate-500">{item.title}</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <strong className="text-2xl font-extrabold tabular-nums text-slate-900">{loadingData ? "…" : item.value}</strong>
                    {item.limit && <span className="text-xs text-slate-400">/ {item.limit}</span>}
                  </div>
                  {item.limit && item.progress > 0 && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${item.progress}%` }} /></div>}
                  {item.note && <p className="mt-2 text-[10px] leading-4 text-slate-400">{item.note}</p>}
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading icon={CreditCard} title="سجل المدفوعات" description={`تغييرات الباقة (${subscriptionRows.length})`}
            action={<span className="text-xs text-slate-400">آخر العمليات أولاً</span>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr><th className="px-5 py-3 font-semibold">التاريخ</th><th className="px-5 py-3 font-semibold">الباقة</th><th className="px-5 py-3 font-semibold">حتى</th><th className="px-5 py-3 font-semibold">المبلغ</th><th className="px-5 py-3 font-semibold">المرجع</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptionRows.length ? subscriptionRows.map((row) => (
                  <tr key={row.id} className="text-slate-700 hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4">{formatDate(row.created_at)}</td>
                    <td className="px-5 py-4 font-semibold">الباقة {PLAN_LABELS[row.plan_name?.toLowerCase()] || row.plan_name}</td>
                    <td className="whitespace-nowrap px-5 py-4">{formatDate(row.end_date)}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold">{Number(row.plan_price || 0).toLocaleString("en-US")} ج.م</td>
                    <td className="max-w-[160px] truncate px-5 py-4 font-mono text-xs text-slate-400" dir="ltr">{row.transaction_id || row.order_id || "—"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-5 py-10 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><FileText size={20} /></div>
                    <p className="mt-3 text-sm font-semibold text-slate-600">لا توجد مدفوعات مسجلة حتى الآن</p>
                    <p className="mt-1 text-xs text-slate-400">ستظهر هنا تغييرات الباقة وسجلات الدفع عند توفرها.</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading icon={User} title="الملف الشخصي" description="حدّث بيانات التواصل المرتبطة بحسابك." />
          <form onSubmit={saveProfile} className="space-y-5 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-2"><span className="text-xs font-bold text-slate-700">الاسم الأول</span><input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" placeholder="الاسم الأول" /></label>
              <label className="block space-y-2"><span className="text-xs font-bold text-slate-700">اسم العائلة</span><input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" placeholder="اسم العائلة" /></label>
              <label className="block space-y-2"><span className="flex items-center gap-1 text-xs font-bold text-slate-700">رقم الهاتف المحمول <HelpCircle size={13} className="text-slate-400" /></span><div className="flex h-11 overflow-hidden rounded-xl border border-slate-200 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10" dir="ltr"><span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">+20</span><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel-national" className="min-w-0 flex-1 px-3 text-sm outline-none" placeholder="10XXXXXXXX" /></div></label>
              <label className="block space-y-2"><span className="text-xs font-bold text-slate-700">البريد الإلكتروني</span><input value={email} readOnly dir="ltr" className="h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-500 outline-none" /><span className="block text-[11px] text-slate-400">لتغيير بريد حسابك تواصل مع الدعم.</span></label>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <button type="submit" disabled={profileBusy} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#087b7b] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#066565] disabled:opacity-60">{profileBusy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ</button>
              {profileMessage && <p className={`text-xs ${profileMessage.startsWith("تم") ? "text-emerald-600" : "text-rose-600"}`}>{profileMessage}</p>}
            </div>
          </form>
        </SectionCard>

        <SectionCard>
          <SectionHeading icon={Mail} title="الرسائل على البريد الإلكتروني" description="تحكم في الرسائل الاختيارية التي تصلك من Prime Physio." />
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-bold text-slate-800">أخبار Prime Physio والميزات الجديدة والتحديثات</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">يمكنك إيقاف الرسائل التعريفية في أي وقت. رسائل المدفوعات والإيصالات وباقتك والصيانة والأمان تصل دائماً.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-3 self-start sm:self-center">
              <span className="text-xs font-semibold text-slate-600">{newsletter ? "مفعّلة" : "متوقفة"}</span>
              <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="peer sr-only" />
              <span className="relative h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-teal-600 after:absolute after:right-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:-translate-x-5" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
            <button type="button" onClick={saveMailPreferences} disabled={mailBusy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-60">{mailBusy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ</button>
            {mailMessage && <p className={`text-xs ${mailMessage.startsWith("تم") ? "text-emerald-600" : "text-rose-600"}`}>{mailMessage}</p>}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading icon={Lock} title="الدخول والأمان" description="حافظ على أمان حسابك وبيانات مركزك." />
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><ShieldCheck size={18} /></span>
              <div><p className="text-sm font-bold text-slate-800">استخدم كلمة مرور قوية</p><p className="mt-1 text-xs text-slate-500">لا تستخدم كلمة مرور حسابك في مواقع أخرى.</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/forgot-password" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"><Key size={15} /> تغيير كلمة المرور</Link>
              <button type="button" onClick={handleLogout} className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 text-xs font-bold text-rose-700 transition hover:bg-rose-100"><LogOut size={15} /> تسجيل الخروج</button>
            </div>
          </div>
        </SectionCard>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row">
          <p>© 2026 Prime Physio. جميع الحقوق محفوظة.</p>
          <nav className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/support" className="transition hover:text-teal-700">مركز المساعدة</Link>
            <Link href="/terms" className="transition hover:text-teal-700">الشروط</Link>
            <Link href="/privacy" className="transition hover:text-teal-700">الخصوصية</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
