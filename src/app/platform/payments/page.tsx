"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { DollarSign, Loader2, CheckCircle, XCircle, Save, ExternalLink, RefreshCw, Copy, Smartphone } from "lucide-react";

type PaymentRequest = {
  id: string; clinicName: string; clinicEmail: string; plan_code: string;
  billing_period: string; amount: number; payment_method: string;
  transfer_reference: string; receiptUrl: string | null; status: string; created_at: string;
};
type PaymentSettings = {
  instapay_phone: string; instapay_account: string; instapay_link: string;
  vodafone_cash_phone: string; subscription_payments_enabled: boolean;
};

const EMPTY_SETTINGS: PaymentSettings = {
  instapay_phone: "", instapay_account: "", instapay_link: "",
  vodafone_cash_phone: "", subscription_payments_enabled: false
};

export default function PlatformPaymentsPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [settings, setSettings] = useState<PaymentSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscription-payments", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "تعذر تحميل طلبات الدفع");
      setRequests(data.requests || []);
      setSettings({ ...EMPTY_SETTINGS, ...(data.settings || {}) });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "تعذر تحميل البيانات", error: true });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    if (user.roleKey !== "platform_admin") { router.replace("/"); return; }
    void loadData();
  }, [user]);

  const saveSettings = async () => {
    setSaving(true); setMessage(null);
    try {
      const res = await fetch("/api/admin/subscription-payments", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "تعذر حفظ بيانات الدفع");
      setMessage({ text: "تم حفظ بيانات الدفع بنجاح." });
      await loadData();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "تعذر الحفظ", error: true });
    } finally { setSaving(false); }
  };

  const reviewRequest = async (id: string, action: "approve" | "reject") => {
    const prompt = action === "approve"
      ? "تأكيد استلام المبلغ وتفعيل الباقة لهذا المركز؟"
      : "هل تريد رفض طلب الدفع؟";
    if (!window.confirm(prompt)) return;
    setBusyId(id); setMessage(null);
    try {
      const res = await fetch("/api/admin/subscription-payments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id, action })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "تعذر تنفيذ الإجراء");
      setMessage({ text: action === "approve" ? "تم تأكيد التحويل وتفعيل الاشتراك." : "تم رفض طلب الدفع." });
      await loadData();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "تعذر تنفيذ الإجراء", error: true });
    } finally { setBusyId(""); }
  };

  if (!user || user.roleKey !== "platform_admin") return null;
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const confirmedRevenue = requests.filter((r) => r.status === "approved").reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-indigo-600" />
          <div><h1 className="text-xl font-bold text-slate-800">المدفوعات والاشتراكات</h1><p className="text-sm text-slate-500">إدارة وسائل التحويل ومراجعة إيصالات الاشتراك يدويًا</p></div>
        </div>
        <button onClick={() => void loadData()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/> تحديث</button>
      </div>

      {message && <div role="status" className={`rounded-xl p-3 text-sm font-semibold ${message.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message.text}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">طلبات قيد المراجعة</p><p className="mt-2 text-3xl font-black text-amber-600">{pendingCount}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">إجمالي الطلبات</p><p className="mt-2 text-3xl font-black text-slate-800">{requests.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">إجمالي التحويلات المؤكدة</p><p className="mt-2 text-3xl font-black text-emerald-600">{confirmedRevenue.toLocaleString("en-EG")} ج.م</p></div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3"><Smartphone className="h-5 w-5 text-indigo-600"/><div><h2 className="font-extrabold text-slate-800">بيانات استقبال التحويلات</h2><p className="text-xs text-slate-500">هذه البيانات تظهر لمالك المركز في صفحة الباقات فقط.</p></div></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700">رقم InstaPay المرتبط
            <input dir="ltr" value={settings.instapay_phone} onChange={(e) => setSettings({...settings, instapay_phone: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-left font-normal"/>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">معرف InstaPay
            <input dir="ltr" value={settings.instapay_account} onChange={(e) => setSettings({...settings, instapay_account: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-left font-normal"/>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 md:col-span-2">رابط التحويل الرسمي
            <input dir="ltr" value={settings.instapay_link} onChange={(e) => setSettings({...settings, instapay_link: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-left font-normal"/>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">رقم Vodafone Cash
            <input dir="ltr" value={settings.vodafone_cash_phone} onChange={(e) => setSettings({...settings, vodafone_cash_phone: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-left font-normal"/>
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
            <span>تفعيل استقبال طلبات الدفع</span>
            <input type="checkbox" checked={settings.subscription_payments_enabled} onChange={(e) => setSettings({...settings, subscription_payments_enabled: e.target.checked})} className="h-5 w-5 accent-indigo-600"/>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={() => void saveSettings()} disabled={saving || loading} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{saving ? <Loader2 size={17} className="animate-spin"/> : <Save size={17}/>} حفظ بيانات الدفع</button>
          <button onClick={() => void navigator.clipboard?.writeText(settings.instapay_link)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"><Copy size={15}/> نسخ رابط InstaPay</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-5"><div><h2 className="font-extrabold text-slate-800">طلبات الدفع الواردة</h2><p className="mt-1 text-xs text-slate-500">افتح الإيصال وطابق المبلغ والمرجع مع التحويل الفعلي قبل التأكيد.</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{pendingCount} قيد المراجعة</span></div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-500"/></div> :
          requests.length === 0 ? <div className="py-16 text-center text-sm text-slate-400">لا توجد طلبات دفع حتى الآن.</div> :
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-right text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">التاريخ</th><th className="px-4 py-3">المركز / البريد</th><th className="px-4 py-3">الباقة والفترة</th><th className="px-4 py-3">المبلغ</th><th className="px-4 py-3">طريقة الدفع والمرجع</th><th className="px-4 py-3">الإيصال</th><th className="px-4 py-3">الحالة والإجراء</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-xs" dir="ltr">{new Date(r.created_at).toLocaleString("ar-EG")}</td>
                  <td className="px-4 py-4"><b className="block text-slate-800">{r.clinicName}</b><span className="text-xs" dir="ltr">{r.clinicEmail}</span></td>
                  <td className="px-4 py-4"><b className="block uppercase text-slate-800">{r.plan_code}</b><span className="text-xs">{r.billing_period === "yearly" ? "سنوي" : "شهري"}</span></td>
                  <td className="whitespace-nowrap px-4 py-4 font-extrabold text-slate-800">{Number(r.amount).toLocaleString("en-EG")} ج.م</td>
                  <td className="px-4 py-4"><b className="block text-slate-800">{r.payment_method === "instapay" ? "InstaPay" : "Vodafone Cash"}</b><span className="font-mono text-xs" dir="ltr">{r.transfer_reference}</span></td>
                  <td className="px-4 py-4">{r.receiptUrl ? <a href={r.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700"><ExternalLink size={14}/> فتح الإيصال</a> : <span className="text-xs text-slate-400">غير متاح</span>}</td>
                  <td className="px-4 py-4">
                    {r.status === "pending" ? <div className="flex flex-col gap-2"><span className="text-xs font-bold text-amber-600">قيد المراجعة</span><button disabled={busyId === r.id} onClick={() => void reviewRequest(r.id, "approve")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busyId === r.id ? "جارٍ التنفيذ..." : "تأكيد التحويل"}</button><button disabled={busyId === r.id} onClick={() => void reviewRequest(r.id, "reject")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50">رفض الطلب</button></div> :
                      <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${r.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{r.status === "approved" ? <CheckCircle size={14}/> : <XCircle size={14}/>} {r.status === "approved" ? "تم التأكيد" : "مرفوض"}</span>}
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>}
      </section>
    </div>
  );
}
