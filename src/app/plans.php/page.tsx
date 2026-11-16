"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Crown, ShieldCheck, Download, Loader2, AlertCircle, X, Copy, ExternalLink, Smartphone, UploadCloud } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Plan = {
  code: "free" | "essential" | "medium" | "advanced" | "maximum";
  name: string; monthly: number; yearly: number; description: string;
  limits: string[]; support: string; backup: string;
};
type PaymentConfig = {
  enabled: boolean;
  referenceCode: string;
  methods: {
    instapay: { phone: string; account: string; link: string };
    vodafone_cash: { phone: string };
  };
};

const plans: Plan[] = [
  { code: "free", name: "المجانية", monthly: 0, yearly: 0, description: "لتجهيز مركزك وتجربة إدارة العمل.", limits: ["20", "100", "1", "2,000", "1 GB", "50"], support: "البريد الإلكتروني", backup: "تصدير Excel في أي وقت" },
  { code: "essential", name: "الأساسية", monthly: 750, yearly: 7500, description: "لمركز ينمو بفريق أكبر.", limits: ["100", "500", "1", "غير محدود", "10 GB", "200"], support: "البريد الإلكتروني والمحادثة", backup: "نسخة Excel شهرية" },
  { code: "medium", name: "المتوسطة", monthly: 1500, yearly: 15000, description: "للمراكز متعددة الفروع.", limits: ["500", "1,000", "2", "غير محدود", "20 GB", "غير محدود"], support: "البريد الإلكتروني والمحادثة وزيارة فنية كل 6 أشهر", backup: "Excel شهري ونسخة قاعدة بيانات أسبوعية" },
  { code: "advanced", name: "المتقدمة", monthly: 3000, yearly: 30000, description: "للفرق الكبيرة والمراكز المتعددة.", limits: ["5,000", "غير محدود", "5", "غير محدود", "30 GB", "غير محدود"], support: "دعم مميز وزيارات فنية دورية", backup: "نسخة Excel شهرية ونسخ قاعدة بيانات يومية وأسبوعية" },
  { code: "maximum", name: "القصوى", monthly: 7500, yearly: 75000, description: "لشبكات المراكز والعمليات الكبيرة.", limits: ["غير محدود", "غير محدود", "10", "غير محدود", "50 GB", "غير محدود"], support: "دعم مميز وزيارات فنية دورية", backup: "نسخة Excel شهرية ونسخ قاعدة بيانات يومية وأسبوعية" },
];
const comparisonRows: Array<[string, number]> = [
  ["المستخدمون النشطون", 0], ["إجمالي المستخدمين", 1], ["عدد المراكز", 2],
  ["الجلسات شهريًا", 3], ["التخزين", 4], ["المرضى", 5],
];

export default function PlansPhpPage() {
  const { user } = useAuth();
  const [activePlan, setActivePlan] = useState("free");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"instapay" | "vodafone_cash">("instapay");
  const [referenceCode, setReferenceCode] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!user?.clinicId) return;
      const response = await fetch("/api/subscribe", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      if (!alive) return;
      if (data?.plan_name) {
        const code = String(data.plan_name).toLowerCase();
        setActivePlan(["free", "essential", "medium", "advanced", "maximum"].includes(code) ? code : "free");
      }
    };
    void load().catch(() => {});
    return () => { alive = false; };
  }, [user?.clinicId]);

  const choosePlan = async (plan: Plan) => {
    setError(""); setNotice("");
    if (plan.code === activePlan) return;
    if (!user?.clinicId) { setError("اختر مركزًا أولاً قبل تغيير الباقة."); return; }
    if (plan.code === "free") {
      setLoading(true);
      try {
        const response = await fetch("/api/subscribe", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinicId: user.clinicId, planId: "free" }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "تعذر تفعيل الباقة المجانية.");
        setActivePlan("free"); setNotice("تم تفعيل الباقة المجانية.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "تعذر تفعيل الباقة.");
      } finally { setLoading(false); }
      return;
    }
    setSelectedPlan(plan); setPaymentMethod("instapay"); setReferenceCode(""); setReceipt(null);
    setConfigLoading(true);
    try {
      const response = await fetch("/api/subscription/payment-methods", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تحميل بيانات الدفع.");
      setPaymentConfig(data);
      setReferenceCode(String(data.referenceCode || ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل بيانات الدفع.");
    } finally { setConfigLoading(false); }
  };

  const submitPayment = async () => {
    if (!selectedPlan || !user?.clinicId) return;
    if (!referenceCode || !receipt) {
      setError("انسخ رقم العملية المخصص وأرفق إيصال الدفع أولاً."); return;
    }
    setLoading(true); setError(""); setNotice("");
    try {
      const form = new FormData();
      form.append("clinicId", user.clinicId);
      form.append("planCode", selectedPlan.code);
      form.append("billingPeriod", billingPeriod);
      form.append("paymentMethod", paymentMethod);
      form.append("platformReference", referenceCode);
      form.append("receipt", receipt);
      const response = await fetch("/api/subscription/payments", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر إرسال طلب الدفع.");
      setSelectedPlan(null);
      setNotice("تم استلام طلب الدفع بنجاح. ستتم مراجعة التحويل وتفعيل الباقة بعد تأكيده من الإدارة.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إرسال طلب الدفع.");
    } finally { setLoading(false); }
  };

  const copyValue = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setNotice("تم نسخ البيانات."); }
    catch { setError("تعذر النسخ تلقائيًا. يمكنك تحديد البيانات ونسخها يدويًا."); }
  };

  const availableMethods = paymentConfig ? [
    paymentConfig.methods.instapay.phone && paymentConfig.methods.instapay.account ? "instapay" : null,
    paymentConfig.methods.vodafone_cash.phone ? "vodafone_cash" : null,
  ].filter(Boolean) : [];

  return (
    <main dir="rtl" className="min-h-screen w-full bg-[#F8FAFC] px-3 pb-12 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E4E1FA] bg-[#F1EFFF] px-3 py-1.5 text-xs font-bold text-[#5B50C7]"><Crown size={15} /> خطط تناسب نمو مركزك</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#153B60] sm:text-4xl">الباقات الرسمية لـ Prime Physio</h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">اختر الباقة والفترة المناسبة، ثم حوّل المبلغ عبر InstaPay أو Vodafone Cash وأرسل الإيصال لمراجعته.</p>
          <p className="mt-2 text-sm font-bold text-[#5B50C7]">باقتك الحالية: {plans.find((p) => p.code === activePlan)?.name || "المجانية"}</p>
        </header>

        {!user?.clinicId && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">اختر مركزًا من صفحة مراكزي أولاً. <Link href="/centers.php/" className="font-bold underline">إدارة المراكز</Link></div>}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm font-bold text-slate-700">فترة الاشتراك:</span>
          <button type="button" onClick={() => setBillingPeriod("monthly")} className={`rounded-full px-5 py-2 text-sm font-bold ${billingPeriod === "monthly" ? "bg-[#5B50C7] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>شهري</button>
          <button type="button" onClick={() => setBillingPeriod("yearly")} className={`rounded-full px-5 py-2 text-sm font-bold ${billingPeriod === "yearly" ? "bg-[#5B50C7] text-white" : "border border-slate-200 bg-white text-slate-600"}`}>سنوي · 12 شهرًا بسعر 10</button>
        </div>

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{notice}</div>}

        <section className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan) => {
            const current = activePlan === plan.code;
            const price = billingPeriod === "yearly" ? plan.yearly : plan.monthly;
            return (
              <article key={plan.code} className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${current ? "border-[#5B50C7] ring-2 ring-[#5B50C7]/15" : "border-slate-200"}`}>
                {current && <span className="absolute -top-3 right-4 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-extrabold text-white">باقتك الحالية</span>}
                <h2 className="text-lg font-extrabold text-[#153B60]">باقة {plan.name}</h2>
                <div className="mt-4 flex items-baseline gap-1"><strong className="text-3xl font-black text-[#5B50C7]">{price === 0 ? "مجانًا" : price.toLocaleString("en-EG")}</strong>{price > 0 && <span className="text-xs text-slate-500">جنيه {billingPeriod === "yearly" ? "/ سنويًا" : "/ شهريًا"}</span>}</div>
                {billingPeriod === "yearly" && price > 0 && <p className="mt-1 text-[11px] font-bold text-emerald-700">12 شهرًا بسعر 10 أشهر</p>}
                <p className="mt-3 min-h-10 text-xs leading-6 text-slate-500">{plan.description}</p>
                <div className="my-4 h-px bg-slate-100" />
                <ul className="flex-1 space-y-3 text-xs leading-5 text-slate-700">
                  {["مستخدم نشط", "مستخدم إجمالاً", "مركز", "جلسة شهريًا", "مساحة تخزين", "مريض"].map((label, i) => <li key={label} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span><b className="font-extrabold text-slate-900">{plan.limits[i]}</b> {label}</span></li>)}
                  <li><b>الدعم:</b> {plan.support}</li>
                  <li className="flex items-start gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span>{plan.backup}</span></li>
                  <li className="flex items-start gap-2"><Download size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span>تصدير بياناتك إلى Excel</span></li>
                </ul>
                <button type="button" disabled={current || loading || !user?.clinicId} onClick={() => void choosePlan(plan)} className={`mt-5 flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${current ? "bg-emerald-50 text-emerald-700" : "bg-[#5B50C7] text-white hover:bg-[#493FB0]"}`}>
                  {loading && selectedPlan?.code === plan.code ? <Loader2 size={17} className="animate-spin" /> : current ? "الباقة الحالية" : plan.code === "free" ? "اختيار المجانية" : "الاشتراك الآن"}
                </button>
              </article>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5"><h2 className="text-xl font-extrabold text-[#153B60]">مقارنة حدود الباقات</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-center text-xs">
              <thead className="bg-[#F7F6FF] text-[#153B60]"><tr><th className="sticky right-0 bg-[#F7F6FF] px-4 py-4 text-right">الحد</th>{plans.map((p) => <th key={p.code} className="px-3 py-4">{p.name}</th>)}</tr></thead>
              <tbody>{comparisonRows.map(([label, index], rowIndex) => <tr key={label} className={rowIndex % 2 ? "bg-slate-50" : "bg-white"}><th className="sticky right-0 bg-inherit px-4 py-3 text-right">{label}</th>{plans.map((p) => <td key={p.code} className="px-3 py-3 font-semibold text-slate-600">{p.limits[index]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
          <h2 className="mb-2 font-extrabold text-[#153B60]">معلومات مهمة عن الاشتراك</h2>
          <ul className="list-disc space-y-1 pr-5">
            <li>الأسعار بالجنيه المصري، والسعر السنوي يساوي قيمة 10 أشهر مقابل 12 شهرًا.</li>
            <li>لا يتم تفعيل أي باقة مدفوعة إلا بعد مراجعة التحويل وتأكيده من الإدارة.</li>
            <li>رفع الإيصال لا يعني نجاح الدفع أو تفعيل الاشتراك تلقائيًا.</li>
            <li>لا توجد مدفوعات بالبطاقات أو بوابة دفع وسيطة؛ التحويل مباشر إلى بيانات Prime Physio.</li>
          </ul>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-5 text-xs text-slate-400">
          <p>© Prime Physio 2026. جميع الحقوق محفوظة.</p>
          <nav className="flex gap-5"><Link href="/support" className="hover:text-[#5B50C7]">مركز المساعدة</Link><Link href="/terms" className="hover:text-[#5B50C7]">الشروط</Link><Link href="/privacy" className="hover:text-[#5B50C7]">الخصوصية</Link></nav>
        </footer>
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title">
          <div className="my-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div><h2 id="payment-dialog-title" className="text-xl font-extrabold text-[#153B60]">إتمام اشتراك باقة {selectedPlan.name}</h2><p className="mt-1 text-sm text-slate-500">المبلغ المطلوب: <b className="text-[#5B50C7]">{(billingPeriod === "yearly" ? selectedPlan.yearly : selectedPlan.monthly).toLocaleString("en-EG")} جنيه</b> · {billingPeriod === "yearly" ? "سنوي" : "شهري"}</p></div>
              <button type="button" onClick={() => setSelectedPlan(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="إغلاق"><X size={20}/></button>
            </div>
            <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-l from-white via-[#F8FAFF] to-[#F2F5FF] p-4 shadow-sm">
              <div className="mb-3 text-center text-[11px] font-bold tracking-wide text-slate-500">طرق الدفع المعتمدة لدى Prime Physio</div>
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-[#DCE7F5] bg-white px-2 py-3 shadow-sm">
                  <img src="/logo.png" alt="Prime Physio" className="h-12 max-w-full object-contain" />
                  <span className="text-center text-[10px] font-bold text-[#174A78]">Prime Physio</span>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1 text-[#7185A0]">
                  <svg viewBox="0 0 56 38" className="h-8 w-12" fill="none" aria-label="أسهم تحويل متبادلة"><path d="M5 11h39l-6-6m6 6-6 6M51 27H12l6-6m-6 6 6 6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-[9px] font-semibold text-slate-400">دفع مباشر</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#E7DDF8] bg-white px-2 py-2 shadow-sm">
                    <img src="https://play-lh.googleusercontent.com/_ks0_XUbrZOkeiXkjaiZEK1S-j1skuQgF1E8S3ff702CoVyaiGnbfXPK74WjgxMk0Q4v2hlhu8WTHxp52Wq0" alt="" aria-hidden="true" className="h-7 w-[58px] shrink-0 object-contain" />
                    <span className="text-center text-xs font-extrabold leading-tight text-[#542875]">InstaPay</span>
                  </div>
                  <div className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#F2DADA] bg-white px-2 py-2 shadow-sm">
                    <img src="/vodafone-cash-user.svg" alt="" aria-hidden="true" className="h-7 w-[58px] shrink-0 object-contain" />
                    <span className="text-center text-xs font-extrabold leading-tight text-[#E60028]">Vodafone Cash</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] leading-5 text-slate-500">تحويل مباشر وآمن — اختر وسيلة الدفع المناسبة لك</p>
            </div>
            {configLoading ? <div className="flex items-center justify-center gap-2 py-12 text-slate-500"><Loader2 className="animate-spin"/> جاري تحميل طرق الدفع...</div> :
              !paymentConfig?.enabled || availableMethods.length === 0 ? <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">طرق الدفع غير متاحة حاليًا. يرجى التواصل مع الدعم الفني.</div> : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {availableMethods.includes("instapay") && <button type="button" onClick={() => setPaymentMethod("instapay")} className={`rounded-xl border p-3 text-sm font-bold ${paymentMethod === "instapay" ? "border-[#5B50C7] bg-[#F4F2FF] text-[#5145B8]" : "border-slate-200 text-slate-600"}`}>InstaPay</button>}
                    {availableMethods.includes("vodafone_cash") && <button type="button" onClick={() => setPaymentMethod("vodafone_cash")} className={`rounded-xl border p-3 text-sm font-bold ${paymentMethod === "vodafone_cash" ? "border-[#5B50C7] bg-[#F4F2FF] text-[#5145B8]" : "border-slate-200 text-slate-600"}`}>Vodafone Cash</button>}
                  </div>
                  {paymentMethod === "instapay" ? (
                    <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-slate-700">معرف InstaPay</span><button type="button" onClick={() => void copyValue(paymentConfig.methods.instapay.account)} className="flex items-center gap-1 text-xs font-bold text-[#5B50C7]"><Copy size={14}/> نسخ</button></div>
                      <p dir="ltr" className="text-left font-bold text-slate-900">{paymentConfig.methods.instapay.account}</p>
                      <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-slate-700">رقم الهاتف المرتبط</span><button type="button" onClick={() => void copyValue(paymentConfig.methods.instapay.phone)} className="flex items-center gap-1 text-xs font-bold text-[#5B50C7]"><Copy size={14}/> نسخ</button></div>
                      <p dir="ltr" className="text-left font-bold text-slate-900">{paymentConfig.methods.instapay.phone}</p>
                      <a href={paymentConfig.methods.instapay.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#5B50C7] px-4 py-2 text-sm font-bold text-white"><ExternalLink size={15}/> فتح InstaPay</a>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-700">حوّل المبلغ إلى محفظة Vodafone Cash</p>
                      <div className="flex items-center justify-between gap-2"><p dir="ltr" className="text-lg font-extrabold text-slate-900">{paymentConfig.methods.vodafone_cash.phone}</p><button type="button" onClick={() => void copyValue(paymentConfig.methods.vodafone_cash.phone)} className="flex items-center gap-1 text-xs font-bold text-[#5B50C7]"><Copy size={14}/> نسخ الرقم</button></div>
                    </div>
                  )}
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-[#DCD7FF] bg-[#F7F6FF] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-sm font-extrabold text-[#40369C]">رقم العملية المخصص لطلبك</label>
                        <button type="button" disabled={!referenceCode} onClick={() => void copyValue(referenceCode)} className="inline-flex items-center gap-1 rounded-lg bg-[#5B50C7] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Copy size={14}/> نسخ الرقم</button>
                      </div>
                      <p dir="ltr" className="mt-2 rounded-lg border border-[#E5E1FF] bg-white px-3 py-3 text-center font-mono text-lg font-black tracking-wider text-slate-900">{referenceCode || "جارٍ إنشاء الرقم..."}</p>
                      <p className="mt-2 text-xs leading-6 text-slate-600">انسخ الرقم واكتبه في خانة «ملاحظات التحويل» داخل InstaPay أو Vodafone Cash قبل تأكيد التحويل، حتى نتمكن من مطابقة المبلغ بطلبك.</p>
                    </div>
                    <label className="block text-sm font-bold text-slate-700">إرفاق إيصال التحويل
                      <span className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm font-normal text-slate-600"><UploadCloud size={20}/><span className="min-w-0 flex-1 truncate">{receipt?.name || "اختر صورة أو PDF (حتى 10 ميجابايت)"}</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => setReceipt(e.target.files?.[0] || null)}/></span>
                    </label>
                  </div>
                  {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
                    <button type="button" onClick={() => setSelectedPlan(null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">إلغاء</button>
                    <button type="button" disabled={loading || !referenceCode || !receipt} onClick={() => void submitPayment()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#5B50C7] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={17}/> : <Smartphone size={17}/>} إرسال طلب الدفع للمراجعة</button>
                  </div>
                  <p className="mt-3 text-center text-xs leading-5 text-slate-500">لن يتم تفعيل الاشتراك قبل أن تتحقق الإدارة من وصول المبلغ.</p>
                </>
              )}
          </div>
        </div>
      )}
    </main>
  );
}
