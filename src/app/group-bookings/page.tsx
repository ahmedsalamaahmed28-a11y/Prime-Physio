"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, ClipboardCheck, RefreshCw, User, CheckCircle2, AlertCircle } from "lucide-react";

type GroupRequest = {
  id: string; patient_id: string; group_code: "A" | "B"; selected_times: Record<string, string>; selected_dates?: Record<string, string>;
  status: string; created_at: string; sessions_total: number | null; evaluated: boolean;
  patient: { id: string; nameAr: string; age: number | null; phone: string | null; address: string | null } | null;
};
const DAY_LABELS: Record<string, string> = { saturday: "السبت", monday: "الاثنين", wednesday: "الأربعاء", sunday: "الأحد", tuesday: "الثلاثاء", thursday: "الخميس" };
const GROUP_DAYS: Record<string, string[]> = { A: ["saturday", "monday", "wednesday"], B: ["sunday", "tuesday", "thursday"] };

export default function GroupBookingsPage() {
  const [requests, setRequests] = useState<GroupRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/group-bookings", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل الطلبات");
      setRequests(Array.isArray(payload.requests) ? payload.requests : []);
    } catch (err) { setError(err instanceof Error ? err.message : "تعذر تحميل الطلبات"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const approve = async (item: GroupRequest) => {
    const sessionsTotal = Number(counts[item.id]);
    if (!item.evaluated) { setError("يجب حفظ التقييم السريري للمريض أولًا من ملفه الطبي."); return; }
    if (!Number.isInteger(sessionsTotal) || sessionsTotal < 1 || sessionsTotal > 150) { setError("أدخل عدد الجلسات الذي حدده الأخصائي بعد التقييم (من 1 إلى 150)."); return; }
    setBusyId(item.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/group-bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: item.id, sessionsTotal }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تعذر اعتماد المجموعة");
      setNotice("تم اعتماد المجموعة وإنشاء " + payload.sessionsCreated + " جلسة متكررة بنجاح.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "تعذر اعتماد المجموعة"); }
    finally { setBusyId(""); }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-black tracking-wider text-indigo-600">PRIME PHYSIO</p><h1 className="mt-1 text-2xl font-black text-slate-900">طلبات المجموعات العلاجية</h1><p className="mt-2 text-sm text-slate-500">راجع طلب المريض، احفظ تقييمه السريري، ثم حدد عدد الجلسات واعتمد الجدول.</p></div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"><RefreshCw size={16}/> تحديث</button>
        </header>
        {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</div>}
        {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{error}</div>}
        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">جاري تحميل الطلبات...</div>
          : requests.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><CalendarDays className="mx-auto mb-3 text-slate-300" size={34}/><h2 className="font-bold text-slate-800">لا توجد طلبات مجموعات حاليًا</h2><p className="mt-1 text-sm text-slate-500">ستظهر هنا طلبات المرضى المرسلة من صفحة المركز.</p></div>
          : <div className="space-y-4">{requests.map(item => {
            const patient = item.patient; const pending = item.status === "pending";
            return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><User size={21}/></span><div><h2 className="font-black text-slate-900">{patient?.nameAr || "مريض غير متاح"}</h2><p className="mt-1 text-xs text-slate-500">ملف المريض: {item.patient_id}{patient?.phone ? " • " + patient.phone : ""}</p></div></div>
                <span className={"rounded-full px-3 py-1.5 text-xs font-extrabold " + (pending ? "bg-amber-50 text-amber-700" : item.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{pending ? "بانتظار اعتماد الأخصائي" : item.status === "approved" ? "تم الاعتماد" : "مرفوض"}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">{GROUP_DAYS[item.group_code].map(day => <div key={day} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{DAY_LABELS[day]}</p><p className="mt-1 flex items-center gap-2 font-black text-slate-800"><Clock size={15} className="text-indigo-600"/>{item.selected_times?.[day] || "—"}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{item.selected_dates?.[day] || ""}</p></div>)}</div>
              {pending && <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-extrabold text-slate-800">التقييم السريري وعدد الجلسات</p>{item.evaluated ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={15}/> التقييم محفوظ</span> : <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700"><AlertCircle size={15}/> التقييم مطلوب أولًا</span>}</div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1"><label className="mb-1 block text-xs font-bold text-slate-600">عدد الجلسات الذي حدده الأخصائي</label><input type="number" min="1" max="150" step="1" value={counts[item.id] || ""} onChange={e => setCounts(prev => ({ ...prev, [item.id]: e.target.value }))} placeholder="مثال: 18" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"/></div>
                  <Link href={"/patients?search=" + encodeURIComponent(patient?.nameAr || item.patient_id)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-xs font-extrabold text-indigo-700 hover:bg-indigo-50"><ClipboardCheck size={15}/> فتح ملف المريض والتقييم</Link>
                  <button disabled={busyId === item.id || !item.evaluated} onClick={() => void approve(item)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 text-xs font-extrabold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">{busyId === item.id ? "جاري الاعتماد..." : "اعتماد وإنشاء الجلسات"}</button>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">سيتم إنشاء العدد المحدد فقط، بواقع ثلاثة أيام أسبوعيًا وفق المجموعة. لا تُنشأ أي جلسة إذا وُجد تعارض في أحد المواعيد.</p>
              </div>}
              <p className="mt-3 text-[11px] text-slate-400">تاريخ الطلب: {new Date(item.created_at).toLocaleString("ar-EG")}</p>
            </article>;
          })}</div>}
      </div>
    </main>
  );
}
