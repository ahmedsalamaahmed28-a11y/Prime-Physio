"use client";

import "./dashboard.css";

import {
  Activity, AlertTriangle, BarChart3, Bell, Building, Calendar, Check, ChevronLeft,
  Clock, CreditCard, FileText, Home, LogOut, Menu, MessageSquare, Plus, Search,
  Settings, Sparkles, User
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DashboardPageLoadingContext } from "@/lib/DashboardPageLoadingContext";

type Row = Record<string, any>;
type DashboardData = {
  appointments: Row[];
  patients: Row[];
  invoices: Row[];
  staff: Row[];
  evaluations: Row[];
  notifications: Row[];
  branches: Row[];
};

const EMPTY_DATA: DashboardData = {
  appointments: [], patients: [], invoices: [], staff: [], evaluations: [], notifications: [], branches: [],
};

const arWeekdays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const enWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseDateTime(dateValue: unknown, timeValue: unknown, timestampValue?: unknown): Date | null {
  if (timestampValue) {
    const timestamp = new Date(String(timestampValue));
    if (!Number.isNaN(timestamp.getTime())) return timestamp;
  }
  const dateText = String(dateValue || "").slice(0, 10);
  const timeText = String(timeValue || "").trim();
  if (!dateText) return null;
  const match = timeText.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) {
    const fallback = new Date(dateText);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  const meridiem = (match[4] || "").toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  const result = new Date(dateText + "T00:00:00");
  result.setHours(hours, minutes, seconds, 0);
  return Number.isNaN(result.getTime()) ? null : result;
}

function appointmentStart(row: Row): Date | null {
  return parseDateTime(row.date, row.time || row.start_time, row.starts_at || row.start_time);
}
function appointmentEnd(row: Row): Date | null {
  return parseDateTime(row.date, row.end_time, row.ends_at || row.end_time);
}
function amountValue(value: unknown): number {
  const normalized = String(value ?? "").replace(/,/g, "").replace(/[^\d.-]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}
function isPaid(status: unknown): boolean {
  return ["مدفوع", "paid", "مكتمل", "مسدد"].includes(String(status || "").trim().toLowerCase());
}
function statusKind(status: unknown): "active" | "waiting" | "completed" | "cancelled" | "upcoming" {
  const value = String(status || "").trim().toLowerCase();
  if (["ملغي", "ملغى", "cancelled", "canceled"].includes(value)) return "cancelled";
  if (["منتهي", "مكتمل", "مكتملة", "completed", "done"].includes(value)) return "completed";
  if (["جاري", "جارية", "في الجلسة", "in progress", "ongoing"].includes(value)) return "active";
  if (["انتظار", "في الانتظار", "pending", "waiting"].includes(value)) return "waiting";
  return "upcoming";
}
function formatTime(date: Date | null, locale: string): string {
  if (!date) return "—";
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: true });
}
function shortId(value: unknown): string {
  const text = String(value || "");
  return text ? text.slice(-6).toUpperCase() : "—";
}

function downloadCsv(rows: Row[], filename: string) {
  const headers = ["المريض", "الأخصائي", "نوع الموعد", "التاريخ", "من", "إلى", "الحالة"];
  const lines = rows.map((row) => {
    const start = appointmentStart(row);
    const end = appointmentEnd(row);
    return [
      row.patient_name || "",
      row.doctor_name || row.therapist || "",
      row.appointment_type || "",
      start ? start.toLocaleDateString("ar-EG") : row.date || "",
      formatTime(start, "ar-EG"),
      formatTime(end, "ar-EG"),
      row.status || "",
    ];
  });
  const csv = [headers, ...lines].map((line) => line.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const router = useRouter();
  const { language, toggleLanguage } = useLanguage();
  const isRtl = language === "ar";
  const locale = isRtl ? "ar-EG" : "en-US";
  const { user, logout, activeBranchId, setActiveBranchId, isEnriching } = useAuth();
  const setDashboardPageLoading = useContext(DashboardPageLoadingContext);
  const clinicId = user?.clinicId;
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "completed">("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    setError("");
    try {
      let appointmentsQuery = supabase.from("appointments")
        .select("id,clinic_id,branch_id,patient_id,patient_name,doctor_name,therapist,therapist_id,appointment_type,status,date,time,start_time,end_time,starts_at,ends_at,room_id,treatment_plan_id,session_intervention,session_objectives,is_group_session")
        .eq("clinic_id", clinicId);
      let patientsQuery = supabase.from("patients")
        .select("id,clinic_id,branch_id,nameAr,nameEn,doctor,status,sessionsUsed,sessionsTotal,created_at")
        .eq("clinic_id", clinicId);
      let invoicesQuery = supabase.from("invoices")
        .select("id,clinic_id,branch_id,patient_id,patient_name,description,amount,status,date,created_at")
        .eq("clinic_id", clinicId);
      let staffQuery = supabase.from("staff")
        .select("id,clinic_id,name,role,specialty,status,branch_id")
        .eq("clinic_id", clinicId);
      let evaluationsQuery = supabase.from("patient_evaluations")
        .select("id,clinic_id,patient_id,evaluation_date,evaluation_type,vas_score,rom_data,mmt_data,notes")
        .eq("clinic_id", clinicId)
        .order("evaluation_date", { ascending: false })
        .limit(500);
      let notificationsQuery = supabase.from("notifications")
        .select("id,clinic_id,title_ar,title_en,body_ar,body_en,type,action_url,is_read,created_at")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (activeBranchId) {
        appointmentsQuery = appointmentsQuery.eq("branch_id", activeBranchId);
        patientsQuery = patientsQuery.eq("branch_id", activeBranchId);
        invoicesQuery = invoicesQuery.eq("branch_id", activeBranchId);
        staffQuery = staffQuery.eq("branch_id", activeBranchId);
      }
      const [appointmentsResult, patientsResult, invoicesResult, staffResult, evaluationsResult, notificationsResult, branchesResult] = await Promise.all([
        appointmentsQuery, patientsQuery, invoicesQuery, staffQuery, evaluationsQuery, notificationsQuery,
        supabase.from("branches").select("id,short_name,full_name,slug").eq("clinic_id", clinicId).order("created_at", { ascending: true }),
      ]);
      if (appointmentsResult.error) throw appointmentsResult.error;
      if (patientsResult.error) throw patientsResult.error;
      const nextData: DashboardData = {
        appointments: appointmentsResult.data || [],
        patients: patientsResult.data || [],
        invoices: invoicesResult.data || [],
        staff: staffResult.data || [],
        evaluations: evaluationsResult.error ? [] : (evaluationsResult.data || []),
        notifications: notificationsResult.error ? [] : (notificationsResult.data || []),
        branches: branchesResult.error ? [] : (branchesResult.data || []),
      };
      setData(nextData);
      setUnreadCount(nextData.notifications.filter((item) => !item.is_read).length);
    } catch (err: any) {
      console.error("Dashboard data load failed", err);
      setError(isRtl ? "تعذر تحميل بيانات لوحة التحكم. تحقق من الاتصال والصلاحيات ثم أعد المحاولة." : "Dashboard data could not be loaded. Check your connection and permissions, then try again.");
    } finally {
      setLoading(false);
      setDashboardPageLoading(false);
    }
  }, [clinicId, activeBranchId, isRtl, setDashboardPageLoading]);

  useEffect(() => {
    if (clinicId === undefined && isEnriching) return;
    if (!clinicId) {
      setLoading(false);
      setDashboardPageLoading(false);
      setError(isRtl ? "هذا الحساب غير مرتبط بمركز علاجي." : "This account is not linked to a clinic.");
      return;
    }
    refresh();
  }, [clinicId, isEnriching, refresh, isRtl, setDashboardPageLoading]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("pp-dashboard-search")?.focus();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const today = new Date();
  const todayKey = today.toDateString();
  const todayAppointments = useMemo(() => data.appointments
    .filter((item) => {
      const start = appointmentStart(item);
      return start && start.toDateString() === todayKey && statusKind(item.status) !== "cancelled";
    })
    .sort((a, b) => (appointmentStart(a)?.getTime() || 0) - (appointmentStart(b)?.getTime() || 0)), [data.appointments, todayKey]);

  const activeAppointments = todayAppointments.filter((item) => statusKind(item.status) === "active");
  const waitingAppointments = todayAppointments.filter((item) => statusKind(item.status) === "waiting");
  const completedAppointments = todayAppointments.filter((item) => statusKind(item.status) === "completed");
  const upcomingAppointments = todayAppointments.filter((item) => statusKind(item.status) === "upcoming");
  const visibleAppointments = filter === "active" ? activeAppointments
    : filter === "upcoming" ? upcomingAppointments
    : filter === "completed" ? completedAppointments : todayAppointments;

  const todayInvoices = data.invoices.filter((invoice) => {
    const dateText = String(invoice.date || invoice.created_at || "").slice(0, 10);
    return dateText === today.toISOString().slice(0, 10);
  });
  const expectedIncome = todayInvoices.reduce((sum, invoice) => sum + amountValue(invoice.amount), 0);
  const collectedIncome = todayInvoices.filter((invoice) => isPaid(invoice.status)).reduce((sum, invoice) => sum + amountValue(invoice.amount), 0);
  const activeClinicians = data.staff.filter((item) => !["inactive", "غير نشط", "موقوف", "إجازة", "في إجازة"].includes(String(item.status || "").toLowerCase())).length;
  const utilization = activeClinicians > 0 ? Math.min(100, Math.round((activeAppointments.length / activeClinicians) * 100)) : 0;

  const patientNameById = useMemo(() => new Map(data.patients.map((patient) => [String(patient.id), patient.nameAr || patient.nameEn || String(patient.id)])), [data.patients]);
  const evaluationsByPatient = useMemo(() => {
    const map = new Map<string, Row[]>();
    data.evaluations.forEach((item) => {
      if (!item.patient_id || item.vas_score === null || item.vas_score === undefined) return;
      const key = String(item.patient_id);
      map.set(key, [...(map.get(key) || []), item]);
    });
    return map;
  }, [data.evaluations]);
  const comparisons = Array.from(evaluationsByPatient.values()).filter((rows) => rows.length >= 2);
  const painImprovement = comparisons.length
    ? Math.round(comparisons.reduce((sum, rows) => {
        const ordered = [...rows].sort((a, b) => new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime());
        const first = Number(ordered[0].vas_score);
        const latest = Number(ordered[ordered.length - 1].vas_score);
        return sum + (first > 0 ? ((first - latest) / first) * 100 : 0);
      }, 0) / comparisons.length)
    : null;

  const modalityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    todayAppointments.forEach((item) => {
      const label = String(item.session_intervention || item.appointment_type || (isRtl ? "جلسة علاج" : "Therapy session")).trim();
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [todayAppointments, isRtl]);
  const modalityTotal = modalityCounts.reduce((sum, item) => sum + item[1], 0);

  const rooms = useMemo(() => {
    const grouped = new Map<string, Row[]>();
    todayAppointments.filter((item) => item.room_id).forEach((item) => {
      const key = String(item.room_id);
      grouped.set(key, [...(grouped.get(key) || []), item]);
    });
    return Array.from(grouped.entries()).map(([id, appointments]) => ({
      id,
      appointments,
      active: appointments.filter((item) => statusKind(item.status) === "active"),
      waiting: appointments.filter((item) => statusKind(item.status) === "waiting"),
    }));
  }, [todayAppointments]);

  const clinicalAlerts = useMemo(() => {
    const alerts: Row[] = [];
    data.evaluations.filter((item) => Number(item.vas_score) >= 7).slice(0, 3).forEach((item) => {
      alerts.push({
        id: "vas-" + item.id,
        titleAr: "درجة ألم مرتفعة في آخر تقييم",
        titleEn: "High pain score in latest assessment",
        bodyAr: "درجة الألم المسجلة " + item.vas_score + "/10 للمريض " + (patientNameById.get(String(item.patient_id)) || ""),
        bodyEn: "Recorded pain score " + item.vas_score + "/10 for " + (patientNameById.get(String(item.patient_id)) || "a patient"),
        href: item.patient_id ? "/patients/" + item.patient_id : "/patients",
      });
    });
    data.patients.filter((patient) => Number(patient.sessionsTotal) > 0 && Number(patient.sessionsUsed) >= Number(patient.sessionsTotal) && !["inactive", "غير نشط"].includes(String(patient.status || "").toLowerCase())).slice(0, 2).forEach((patient) => {
      alerts.push({
        id: "sessions-" + patient.id,
        titleAr: "اكتملت جلسات الباقة",
        titleEn: "Treatment package sessions completed",
        bodyAr: "اكتملت الجلسات المسجلة للمريض " + (patient.nameAr || patient.nameEn || ""),
        bodyEn: "The recorded package sessions are complete for " + (patient.nameEn || patient.nameAr || "a patient"),
        href: "/patients/" + patient.id,
      });
    });
    data.notifications.filter((item) => item.type && ["clinical", "urgent", "warning", "تنبيه سريري"].includes(String(item.type).toLowerCase())).slice(0, 3).forEach((item) => {
      alerts.push({
        id: "notification-" + item.id,
        titleAr: item.title_ar || "تنبيه سريري",
        titleEn: item.title_en || "Clinical alert",
        bodyAr: item.body_ar || "",
        bodyEn: item.body_en || "",
        href: item.action_url || "/notifications",
      });
    });
    return alerts.slice(0, 4);
  }, [data.evaluations, data.patients, data.notifications, patientNameById]);

  const trend = useMemo(() => {
    const days: { label: string; average: number | null }[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = date.toDateString();
      const values = data.evaluations.filter((item) => item.evaluation_date && new Date(item.evaluation_date).toDateString() === key && item.vas_score !== null && item.vas_score !== undefined).map((item) => Number(item.vas_score)).filter(Number.isFinite);
      days.push({ label: date.toLocaleDateString(locale, { weekday: "short" }), average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null });
    }
    return days;
  }, [data.evaluations, locale]);
  const trendValues = trend.filter((item) => item.average !== null);
  const trendPath = trendValues.length >= 2 ? trendValues.map((item, index) => {
    const x = (index / (trendValues.length - 1)) * 380 + 10;
    const y = 108 - ((10 - Math.max(0, Math.min(10, item.average || 0))) / 10) * 90;
    return (index === 0 ? "M" : "L") + x + "," + y;
  }).join(" ") : "";

  const greetingName = (isRtl ? user?.name : (user?.nameEn || user?.name)) || "";
  const cleanName = greetingName.replace(/^(د\.?\s*|د\/\s*|Dr\.\s*)/i, "").trim().split(/\s+/)[0] || "";
  const branchName = activeBranchId
    ? (data.branches.find((item) => item.id === activeBranchId)?.short_name || data.branches.find((item) => item.id === activeBranchId)?.full_name)
    : (user?.shortName || (isRtl ? "الفرع الرئيسي" : "Main branch"));
  const navItems = [
    { label: isRtl ? "لوحة التحكم" : "Dashboard", href: "/dashboard", icon: Home },
    { label: isRtl ? "جدول المواعيد" : "Appointments", href: "/calendar", icon: Calendar },
    { label: isRtl ? "سجلات المرضى" : "Patient records", href: "/patients", icon: FileText },
    { label: isRtl ? "خطط العلاج والتمارين" : "Treatment plans", href: "/protocols", icon: Activity },
    { label: isRtl ? "الفواتير والمالية" : "Billing & finance", href: "/billing", icon: FileText },
    { label: isRtl ? "تقارير الأداء" : "Performance reports", href: "/analytics", icon: BarChart3 },
    { label: isRtl ? "إعدادات العيادة" : "Clinic settings", href: "/profile", icon: Settings },
  ];

  const handleSearch = () => {
    if (search.trim()) router.push("/patients?search=" + encodeURIComponent(search.trim()));
  };
  const exportReport = () => downloadCsv(todayAppointments, "prime-physio-daily-report.csv");

  if (loading) return <div className="pp-stitch-loading"><LoadingSpinner /></div>;
  if (error) return (
    <div className="pp-stitch-error" dir={isRtl ? "rtl" : "ltr"}>
      <div className="pp-stitch-error-card"><AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h1 className="text-lg font-bold">{isRtl ? "تعذر تحميل لوحة التحكم" : "Dashboard unavailable"}</h1>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button onClick={refresh} className="mt-5 rounded-xl bg-[#3525cd] px-5 py-2.5 text-sm font-bold text-white">{isRtl ? "إعادة المحاولة" : "Try again"}</button>
      </div>
    </div>
  );

  return (
    <div className="pp-stitch-shell" dir={isRtl ? "rtl" : "ltr"}>
      {mobileNavOpen && <button className="pp-stitch-backdrop md:hidden" aria-label="Close menu" onClick={() => setMobileNavOpen(false)} />}
      <aside className={"pp-stitch-sidebar " + (mobileNavOpen ? "is-open" : "")}>
        <div className="pp-stitch-brand">
          <img src={user?.logoUrl || "/logo.png"} alt="Prime Physio" onError={(event) => { event.currentTarget.src = "/logo.png"; }} />
          <div><strong>برايم فيزيو</strong><span>{isRtl ? "تأهيل وعلاج طبيعي متقدم" : "Advanced physiotherapy"}</span></div>
        </div>
        <div className="pp-stitch-branch-wrap">
          <button className="pp-stitch-branch" onClick={() => setBranchMenuOpen((value) => !value)}>
            <span className="pp-stitch-branch-icon"><Building size={18} /></span>
            <span className="min-w-0 flex-1 text-start"><small>{isRtl ? "الفرع الحالي" : "Current branch"}</small><b className="block truncate">{branchName}</b></span>
            <ChevronLeft size={17} />
          </button>
          {branchMenuOpen && <div className="pp-stitch-branch-menu">
            <button onClick={() => { setActiveBranchId(null); setBranchMenuOpen(false); }}>{isRtl ? "كل الفروع" : "All branches"}</button>
            {data.branches.map((branch) => <button key={branch.id} onClick={() => { setActiveBranchId(branch.id); setBranchMenuOpen(false); }}>{branch.short_name || branch.full_name}</button>)}
          </div>}
        </div>
        <nav className="pp-stitch-nav">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)} className={index === 0 ? "active" : ""}>
              <span><Icon size={19} />{item.label}</span>
              {item.href === "/calendar" && <small>{todayAppointments.length} {isRtl ? "اليوم" : "today"}</small>}
            </Link>;
          })}
        </nav>
        <div className="pp-stitch-account">
          <div className="pp-stitch-account-user">
            <div className="pp-stitch-avatar"><User size={19} /></div>
            <div className="min-w-0 flex-1"><b className="block truncate">{user?.name || "—"}</b><small className="block truncate">{user?.role || (isRtl ? "فريق العيادة" : "Clinic team")}</small></div>
          </div>
          <div className="pp-stitch-account-actions">
            <span className="pp-stitch-online"><i />{isRtl ? "متصل" : "Online"}</span>
            <Link href="/support" title={isRtl ? "المساعدة والدعم" : "Help & support"}><FileText size={17} /></Link>
            <button onClick={logout} title={isRtl ? "تسجيل الخروج" : "Log out"}><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <div className="pp-stitch-main">
        <header className="pp-stitch-topbar">
          <div className="pp-stitch-search-wrap">
            <button className="pp-stitch-mobile-menu md:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
            <div className="pp-stitch-search">
              <Search size={19} />
              <input id="pp-dashboard-search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleSearch(); }} placeholder={isRtl ? "بحث عن مريض، ملف طبي، أو موعد..." : "Search patients, records or appointments..."} />
              <kbd>Ctrl+K</kbd>
            </div>
          </div>
          <div className="pp-stitch-top-actions">
            <div className="pp-stitch-date hidden xl:flex"><Clock size={19} /><span><b>{today.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</b><small>{isRtl ? "ملخص نشاط العيادة" : "Clinic activity overview"}</small></span></div>
            <button className="pp-stitch-icon-btn" onClick={toggleLanguage} title={isRtl ? "تغيير اللغة" : "Change language"}><Sparkles size={19} /><span>{isRtl ? "EN" : "عربي"}</span></button>
            <Link className="pp-stitch-icon-btn" href="/chat" title={isRtl ? "الرسائل" : "Messages"}><MessageSquare size={19} /></Link>
            <Link className="pp-stitch-icon-btn pp-stitch-bell" href="/notifications" title={isRtl ? "الإشعارات" : "Notifications"}><Bell size={19} />{unreadCount > 0 && <i />}</Link>
            <Link href="/calendar" className="pp-stitch-new-appointment"><Plus size={19} /><span>{isRtl ? "موعد جديد" : "New appointment"}</span></Link>
          </div>
        </header>

        <main className="pp-stitch-content">
          <section className="pp-stitch-hero">
            <div className="pp-stitch-glow pp-stitch-glow-one" /><div className="pp-stitch-glow pp-stitch-glow-two" />
            <div className="pp-stitch-hero-content">
              <div>
                <div className="pp-stitch-hero-title">
                  <h1>{isRtl ? "مرحباً " + (cleanName ? "د. " + cleanName : "بعودتك") + "، نتمنى لك يوماً مثمراً 👋" : "Welcome " + (cleanName ? "Dr. " + cleanName : "back") + ", have a productive day 👋"}</h1>
                  <span className="pp-stitch-capacity"><i />{isRtl ? activeClinicians + " أخصائي نشط في المركز" : activeClinicians + " active clinicians"}</span>
                </div>
                <p><Calendar size={17} />{isRtl ? "نظرة عامة على نشاط العيادة اليوم — " : "Today's clinic overview — "}{today.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}{branchName ? " • " + branchName : ""}</p>
              </div>
              <div className="pp-stitch-hero-actions">
                <button onClick={exportReport} className="pp-stitch-export"><FileText size={18} />{isRtl ? "تصدير التقرير اليومي" : "Export daily report"}</button>
                <Link href="/patients" className="pp-stitch-primary"><User size={18} />{isRtl ? "إضافة مريض جديد" : "Add new patient"}</Link>
              </div>
            </div>
          </section>

          <section className="pp-stitch-kpis">
            <article className="pp-stitch-kpi">
              <div className="pp-stitch-kpi-top"><div><span>{isRtl ? "إجمالي مواعيد اليوم" : "Today's appointments"}</span><strong>{todayAppointments.length.toLocaleString(locale)}</strong><small>{isRtl ? "موعداً" : "appointments"}</small></div><i className="kpi-indigo"><Calendar size={25} /></i></div>
              <div className="pp-stitch-kpi-foot"><span><BarChart3 size={15} />{completedAppointments.length} {isRtl ? "مكتمل" : "completed"}</span><small>{isRtl ? "من جدول اليوم" : "scheduled today"}</small></div>
            </article>
            <article className="pp-stitch-kpi">
              <div className="pp-stitch-kpi-top"><div><span>{isRtl ? "جلسات نشطة الآن" : "Active sessions now"}</span><strong>{activeAppointments.length.toLocaleString(locale)}</strong><small>{isRtl ? "جلسات جارية" : "sessions in progress"}</small></div><i className="kpi-green"><Activity size={25} /></i></div>
              <div className="pp-stitch-kpi-foot"><span><i className="pp-stitch-status-dot" />{activeClinicians} {isRtl ? "أخصائي نشط" : "active clinicians"}</span><small>{isRtl ? "إشغال الأخصائيين" : "clinician utilization"} {utilization}%</small></div>
            </article>
            <article className="pp-stitch-kpi">
              <div className="pp-stitch-kpi-top"><div><span>{isRtl ? "تحسن الألم وفق التقييمات" : "Pain improvement from assessments"}</span><strong>{painImprovement === null ? "—" : painImprovement + "%"}</strong><small>{isRtl ? "مقارنة درجات VAS المتتابعة" : "Compared sequential VAS scores"}</small></div><i className="kpi-violet"><Activity size={25} /></i></div>
              <div className="pp-stitch-kpi-foot"><span>{comparisons.length} {isRtl ? "مريض بتقييمين أو أكثر" : "patients with 2+ assessments"}</span><small>{isRtl ? "لا تُحسب دون تقييمات مقارنة" : "No estimate without comparisons"}</small></div>
            </article>
            <article className="pp-stitch-kpi">
              <div className="pp-stitch-kpi-top"><div><span>{isRtl ? "الإيراد المتوقع اليوم" : "Expected revenue today"}</span><strong>{expectedIncome.toLocaleString(locale)}</strong><small>{isRtl ? "ج.م" : "EGP"}</small></div><i className="kpi-blue"><CreditCard size={25} /></i></div>
              <div className="pp-stitch-kpi-foot"><span>{isRtl ? "تم تحصيل: " : "Collected: "}<b>{collectedIncome.toLocaleString(locale)} {isRtl ? "ج.م" : "EGP"}</b></span><small>{expectedIncome > 0 ? Math.round((collectedIncome / expectedIncome) * 100) + "%" : "—"}</small></div>
            </article>
          </section>

          <div className="pp-stitch-columns">
            <div className="pp-stitch-primary-column">
              <section className="pp-stitch-panel">
                <div className="pp-stitch-panel-heading">
                  <div><h2><Calendar size={22} />{isRtl ? "جدول جلسات ومواعيد اليوم" : "Today's sessions and appointments"}</h2><p>{isRtl ? "حالة المواعيد المسجلة في المركز" : "Live status of appointments recorded in this clinic"}</p></div>
                  <div className="pp-stitch-tabs">
                    {[
                      { id: "all", label: isRtl ? "الكل" : "All", count: todayAppointments.length },
                      { id: "active", label: isRtl ? "جارية" : "Active", count: activeAppointments.length },
                      { id: "upcoming", label: isRtl ? "القادمة" : "Upcoming", count: upcomingAppointments.length },
                      { id: "completed", label: isRtl ? "مكتملة" : "Completed", count: completedAppointments.length },
                    ].map((tab) => <button key={tab.id} onClick={() => setFilter(tab.id as typeof filter)} className={filter === tab.id ? "active" : ""}>{tab.label} ({tab.count})</button>)}
                  </div>
                </div>
                <div className="pp-stitch-table-wrap">
                  <table className="pp-stitch-table">
                    <thead><tr><th>{isRtl ? "المريض والرقم الطبي" : "Patient & record"}</th><th>{isRtl ? "الأخصائي المعالج" : "Therapist"}</th><th>{isRtl ? "نوع الخطة والتدخل" : "Plan & intervention"}</th><th>{isRtl ? "التوقيت" : "Time"}</th><th>{isRtl ? "الحالة" : "Status"}</th><th>{isRtl ? "إجراءات" : "Actions"}</th></tr></thead>
                    <tbody>
                      {visibleAppointments.length ? visibleAppointments.slice(0, 8).map((item) => {
                        const kind = statusKind(item.status);
                        const start = appointmentStart(item);
                        const end = appointmentEnd(item);
                        const patientId = item.patient_id;
                        const patientName = item.patient_name || patientNameById.get(String(patientId)) || "—";
                        const stateLabel = kind === "active" ? (isRtl ? "في الجلسة" : "In session") : kind === "waiting" ? (isRtl ? "في الانتظار" : "Waiting") : kind === "completed" ? (isRtl ? "مكتملة" : "Completed") : (isRtl ? "مؤكد / قادم" : "Confirmed / upcoming");
                        return <tr key={item.id}>
                          <td><div className="pp-stitch-patient-cell"><span className="pp-stitch-patient-avatar">{String(patientName).trim().slice(0, 2)}</span><span><b>{patientName}</b><small>#{shortId(patientId || item.id)}</small></span></div></td>
                          <td><b>{item.doctor_name || item.therapist || "—"}</b><small className="pp-stitch-subline">{item.therapist_id ? (isRtl ? "أخصائي مسند" : "Assigned therapist") : ""}</small></td>
                          <td><b>{item.appointment_type || (isRtl ? "جلسة علاج" : "Therapy session")}</b><small className="pp-stitch-subline">{item.session_intervention || item.session_objectives || "—"}</small></td>
                          <td><b>{formatTime(start, locale)} – {formatTime(end, locale)}</b><small className="pp-stitch-subline">{item.room_id ? (isRtl ? "غرفة " : "Room ") + shortId(item.room_id) : (isRtl ? "لم تحدد غرفة" : "No room assigned")}</small></td>
                          <td><span className={"pp-stitch-status status-" + kind}><i />{stateLabel}</span></td>
                          <td><div className="pp-stitch-row-actions"><Link href={patientId ? "/patients/" + patientId : "/calendar"} title={isRtl ? "تفاصيل الملف الطبي" : "Patient record"}><ChevronLeft size={17} /></Link><Link href="/calendar" title={isRtl ? "جدول المواعيد" : "Appointment schedule"}><Calendar size={16} /></Link></div></td>
                        </tr>;
                      }) : <tr><td colSpan={6} className="pp-stitch-empty">{isRtl ? "لا توجد مواعيد في هذه الفئة اليوم" : "No appointments in this category today"}</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="pp-stitch-panel-footer"><span>{isRtl ? "عرض " + Math.min(visibleAppointments.length, 8) + " من أصل " + visibleAppointments.length + " موعداً" : "Showing " + Math.min(visibleAppointments.length, 8) + " of " + visibleAppointments.length + " appointments"}</span><Link href="/calendar">{isRtl ? "الانتقال إلى جدول المواعيد بالكامل" : "Open full appointment calendar"}<ChevronLeft size={15} /></Link></div>
              </section>

              <section className="pp-stitch-panel">
                <div className="pp-stitch-panel-heading">
                  <div><h2><Activity size={22} />{isRtl ? "مؤشرات جودة التأهيل وتوزيع التدخلات" : "Rehabilitation quality & intervention mix"}</h2><p>{isRtl ? "ملخص درجات الألم المسجلة والتدخلات في المواعيد" : "Summary of recorded pain scores and today's appointment interventions"}</p></div>
                  <span className="pp-stitch-neutral-chip"><Activity size={15} />{comparisons.length} {isRtl ? "مقارنة تقييم" : "assessment comparisons"}</span>
                </div>
                <div className="pp-stitch-insights">
                  <div className="pp-stitch-trend">
                    <div className="pp-stitch-insight-title"><b>{isRtl ? "متوسط درجة الألم (VAS) خلال آخر 7 أيام" : "Average pain score (VAS), last 7 days"}</b><small>{isRtl ? "من 0 إلى 10 — الأقل أفضل" : "Scale 0–10 — lower is better"}</small></div>
                    <div className="pp-stitch-chart">
                      {trendValues.length >= 2 ? <svg viewBox="0 0 400 125" preserveAspectRatio="none" role="img" aria-label="VAS trend">
                        <line x1="0" y1="18" x2="400" y2="18" /><line x1="0" y1="62" x2="400" y2="62" /><line x1="0" y1="106" x2="400" y2="106" />
                        <path d={trendPath} className="pp-stitch-chart-line" />
                      </svg> : <div className="pp-stitch-chart-empty">{isRtl ? "لا توجد تقييمات كافية لعرض منحنى زمني" : "Not enough assessments for a trend chart"}</div>}
                      <div className="pp-stitch-chart-labels">{trend.map((item, index) => <span key={index}>{item.label}</span>)}</div>
                    </div>
                  </div>
                  <div className="pp-stitch-modality">
                    <b>{isRtl ? "توزيع التدخلات المسجلة اليوم" : "Today's recorded interventions"}</b>
                    {modalityCounts.length ? modalityCounts.map(([label, count], index) => {
                      const percent = modalityTotal ? Math.round((count / modalityTotal) * 100) : 0;
                      return <div className="pp-stitch-modality-item" key={label}><div><span title={label}>{label}</span><b>{percent}% ({count})</b></div><progress className={"pp-stitch-progress progress-" + index} value={percent} max={100} /></div>;
                    }) : <p className="pp-stitch-no-data">{isRtl ? "ستظهر أنواع التدخلات هنا بعد تسجيل مواعيد اليوم." : "Intervention types will appear here when today's appointments are recorded."}</p>}
                  </div>
                </div>
              </section>
            </div>

            <div className="pp-stitch-secondary-column">
              <section className="pp-stitch-panel">
                <div className="pp-stitch-panel-heading compact"><div><h2><Building size={22} />{isRtl ? "الغرف والتجهيزات الحية" : "Live rooms & equipment"}</h2><p>{isRtl ? "حالة الغرف المرتبطة بمواعيد اليوم" : "Room assignments linked to today's appointments"}</p></div><span className="pp-stitch-live-dot" /></div>
                <div className="pp-stitch-room-list">
                  {rooms.length ? rooms.map((room) => <div className="pp-stitch-room" key={room.id}>
                    <div><span className={"pp-stitch-room-dot " + (room.active.length ? "busy" : "free")} /><b>{isRtl ? "غرفة " : "Room "}{shortId(room.id)}</b><span className={"pp-stitch-room-badge " + (room.active.length ? "busy" : "free")}>{room.active.length ? (isRtl ? "مشغولة" : "Occupied") : (isRtl ? "لا توجد جلسة جارية" : "No active session")}</span></div>
                    <small>{room.active[0]?.patient_name || room.waiting[0]?.patient_name || (isRtl ? "لا يوجد مريض مرتبط حاليًا" : "No patient currently assigned")}</small>
                  </div>) : <div className="pp-stitch-section-empty"><Building size={25} /><b>{isRtl ? "لا توجد غرف مسجلة للمواعيد بعد" : "No rooms are linked to appointments yet"}</b><span>{isRtl ? "عند ربط الغرف بالمواعيد ستظهر حالة الإشغال هنا دون بيانات تجريبية." : "Room occupancy will appear here when rooms are linked to appointments."}</span><Link href="/clinic-settings">{isRtl ? "إعدادات العيادة" : "Clinic settings"}</Link></div>}
                </div>
              </section>

              <section className="pp-stitch-panel">
                <div className="pp-stitch-panel-heading compact"><div><h2><Clock size={22} />{isRtl ? "صالة الانتظار" : "Waiting queue"}</h2><p>{isRtl ? "المرضى المسجلون بحالة انتظار اليوم" : "Patients marked as waiting today"}</p></div><span className="pp-stitch-count-chip">{waitingAppointments.length} {isRtl ? "بالانتظار" : "waiting"}</span></div>
                <div className="pp-stitch-waiting-list">
                  {waitingAppointments.length ? waitingAppointments.slice(0, 5).map((item) => <div className="pp-stitch-waiting" key={item.id}>
                    <span className="pp-stitch-waiting-avatar">{String(item.patient_name || "؟").trim().slice(0, 2)}</span>
                    <span className="min-w-0 flex-1"><b>{item.patient_name || patientNameById.get(String(item.patient_id)) || "—"}</b><small>{item.doctor_name || item.therapist || (isRtl ? "لم يحدد الأخصائي" : "Therapist not assigned")} • {item.appointment_type || ""}</small></span>
                    <small className="pp-stitch-waiting-time">{formatTime(appointmentStart(item), locale)}</small>
                  </div>) : <div className="pp-stitch-section-empty compact-empty"><Clock size={22} /><span>{isRtl ? "لا يوجد مرضى في قائمة الانتظار حاليًا." : "There are no patients in the waiting queue."}</span></div>}
                </div>
              </section>

              <section className="pp-stitch-panel">
                <div className="pp-stitch-panel-heading compact"><div><h2><AlertTriangle size={22} />{isRtl ? "تنبيهات وملاحظات سريرية" : "Clinical alerts & notes"}</h2><p>{isRtl ? "تنبيهات مستندة إلى سجلات المركز" : "Alerts derived from clinic records"}</p></div>{clinicalAlerts.length > 0 && <span className="pp-stitch-alert-indicator" />}</div>
                <div className="pp-stitch-alert-list">
                  {clinicalAlerts.length ? clinicalAlerts.map((alert, index) => <Link href={alert.href} className="pp-stitch-alert" key={alert.id}>
                    <div className={index === 0 ? "alert-icon urgent" : "alert-icon"}>{index === 0 ? <Activity size={17} /> : <FileText size={17} />}</div>
                    <div><b>{isRtl ? alert.titleAr : alert.titleEn}</b><p>{isRtl ? alert.bodyAr : alert.bodyEn}</p><small>{isRtl ? "فتح السجل" : "Open record"} <ChevronLeft size={12} /></small></div>
                  </Link>) : <div className="pp-stitch-section-empty compact-empty"><Check size={23} /><span>{isRtl ? "لا توجد تنبيهات سريرية مستخلصة من البيانات الحالية." : "No clinical alerts were found in the current records."}</span></div>}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
