"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Crown, CreditCard, ShieldCheck, Download, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Plan = {
  code: "free" | "essential" | "medium" | "advanced" | "maximum";
  name: string;
  monthly: number;
  yearly: number;
  description: string;
  limits: string[];
  support: string;
  backup: string;
};

const plans: Plan[] = [
  { code: "free", name: "المجانية", monthly: 0, yearly: 0, description: "لتجهيز مركزك وتجربة إدارة العمل.", limits: ["20", "100", "1", "2,000", "1 GB", "50"], support: "البريد الإلكتروني", backup: "تصدير Excel في أي وقت" },
  { code: "essential", name: "الأساسية", monthly: 750, yearly: 7500, description: "لمركز ينمو بفريق أكبر.", limits: ["100", "500", "1", "غير محدود", "10 GB", "200"], support: "البريد الإلكتروني والمحادثة", backup: "نسخة Excel شهرية" },
  { code: "medium", name: "المتوسطة", monthly: 1500, yearly: 15000, description: "للمراكز متعددة الفروع.", limits: ["500", "1,000", "2", "غير محدود", "20 GB", "غير محدود"], support: "البريد الإلكتروني والمحادثة وزيارة فنية كل 6 أشهر", backup: "Excel شهري ونسخة قاعدة بيانات أسبوعية" },
  { code: "advanced", name: "المتقدمة", monthly: 3000, yearly: 30000, description: "للفرق الكبيرة والمراكز المتعددة.", limits: ["5,000", "غير محدود", "5", "غير محدود", "30 GB", "غير محدود"], support: "دعم مميز وزيارات فنية دورية", backup: "نسخة Excel شهرية ونسخ قاعدة بيانات يومية وأسبوعية" },
  { code: "maximum", name: "القصوى", monthly: 7500, yearly: 75000, description: "لشبكات المراكز والعمليات الكبيرة.", limits: ["غير محدود", "غير محدود", "10", "غير محدود", "50 GB", "غير محدود"], support: "دعم مميز وزيارات فنية دورية", backup: "نسخة Excel شهرية ونسخ قاعدة بيانات يومية وأسبوعية" },
];

const comparisonRows = [
  ["المستخدمون النشطون", 0], ["إجمالي المستخدمين", 1], ["عدد المراكز", 2],
  ["الجلسات شهريًا", 3], ["التخزين", 4], ["المرضى", 5],
];

export default function PlansPhpPage() {
  const { user } = useAuth();
  const [activePlan, setActivePlan] = useState("free");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!user?.clinicId) return;
      const [{ data: subscription }, { data: clinic }] = await Promise.all([
        supabase.from("subscriptions").select("plan_name").eq("clinic_id", user.clinicId).eq("status", "active").or("end_date.is.null,end_date.gt." + new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("clinics").select("phone").eq("id", user.clinicId).maybeSingle(),
      ]);
      if (!alive) return;
      if (subscription?.plan_name) {
        const code = String(subscription.plan_name).toLowerCase();
        setActivePlan(["free", "essential", "medium", "advanced", "maximum"].includes(code) ? code : "free");
      }
      if (clinic?.phone) setPhone(String(clinic.phone));
    };
    void load();
    return () => { alive = false; };
  }, [user?.clinicId]);

  const selectedPrice = useMemo(() => selectedPlan ? (billingPeriod === "yearly" ? selectedPlan.yearly : selectedPlan.monthly) : 0, [selectedPlan, billingPeriod]);

  const choosePlan = async (plan: Plan) => {
    setError("");
    setNotice("");
    if (plan.code === activePlan) return;
    if (!user?.clinicId) {
      setError("اختر مركزًا أولاً قبل تغيير الباقة.");
      return;
    }
    if (plan.code === "free") {
      setLoading(true);
      try {
        const response = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinicId: user.clinicId, planId: "free" }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "تعذر تفعيل الباقة المجانية.");
        setActivePlan("free");
        setNotice("تم تفعيل الباقة المجانية.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "تعذر تفعيل الباقة.");
      } finally {
        setLoading(false);
      }
      return;
    }
    setSelectedPlan(plan);
  };

  const startPayment = async () => {
    if (!selectedPlan || !user?.email) return;
    const normalizedPhone = phone.trim().replace(/[\s()-]/g, "");
    if (!/^\+[1-9]\d{6,14}$/.test(normalizedPhone)) {
      setError("أدخل رقم هاتف صحيحًا بالصيغة الدولية، مثل +201001234567.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const nameParts = (user.name || user.email.split("@")[0]).trim().split(/\s+/);
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.code,
          billingPeriod,
          billingData: {
            first_name: nameParts[0] || "Prime",
            last_name: nameParts.slice(1).join(" ") || "Physio",
            email: user.email,
            phone_number: normalizedPhone,
            city: "Cairo",
            state: "Cairo",
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || "تعذر بدء الدفع.");
      window.location.assign(data.checkoutUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر بدء الدفع.");
      setLoading(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen w-full bg-[#F8FAFC] px-3 pb-12 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E4E1FA] bg-[#F1EFFF] px-3 py-1.5 text-xs font-bold text-[#5B50C7]"><Crown size={15} /> خطط تناسب نمو مركزك</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#153B60] sm:text-4xl">الباقات الرسمية لـ Prime Physio</h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">اختر الباقة والفترة، وتُفعّل الباقة المدفوعة بعد تأكيد Paymob الآمن فقط. لا يوجد تجديد تلقائي.</p>
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
                  {loading ? <Loader2 size={17} className="animate-spin" /> : current ? "الباقة الحالية" : plan.code === "free" ? "اختيار المجانية" : "ترقية الباقة"}
                </button>
              </article>
            );
          })}
        </section>

        {selectedPlan && (
          <section className="mx-auto w-full max-w-xl rounded-2xl border border-[#DCD8F7] bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-extrabold text-[#153B60]">إتمام طلب باقة {selectedPlan.name}</h2>
            <p className="mt-2 text-sm text-slate-600">القيمة المستحقة: <b className="text-[#5B50C7]">{selectedPrice.toLocaleString("en-EG")} جنيه مصري</b> · {billingPeriod === "yearly" ? "سنوي" : "شهري"}</p>
            <label className="mt-5 block text-sm font-bold text-slate-700">رقم الهاتف للتوثيق لدى بوابة الدفع
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" dir="ltr" placeholder="+201001234567" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-left outline-none focus:border-[#5B50C7] focus:ring-4 focus:ring-[#5B50C7]/10" />
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-500">لن يتم تفعيل الباقة إلا بعد التحقق من إشعار الدفع الموقّع من Paymob. الرجوع من صفحة الدفع وحده لا يفعّل الاشتراك.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => void startPayment()} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5B50C7] px-4 text-sm font-extrabold text-white hover:bg-[#493FB0] disabled:opacity-60">{loading ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />} متابعة الدفع</button>
              <button type="button" onClick={() => setSelectedPlan(null)} disabled={loading} className="h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">إلغاء</button>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5"><h2 className="text-xl font-extrabold text-[#153B60]">مقارنة حدود الباقات</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-center text-xs">
              <thead className="bg-[#F7F6FF] text-[#153B60]"><tr><th className="sticky right-0 bg-[#F7F6FF] px-4 py-4 text-right">الحد</th>{plans.map((p) => <th key={p.code} className="px-3 py-4">{p.name}</th>)}</tr></thead>
              <tbody>{comparisonRows.map(([label, index], rowIndex) => <tr key={String(label)} className={rowIndex % 2 ? "bg-slate-50" : "bg-white"}><th className="sticky right-0 bg-inherit px-4 py-3 text-right">{label}</th>{plans.map((p) => <td key={p.code} className="px-3 py-3 font-semibold text-slate-600">{p.limits[Number(index)]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
          <h2 className="mb-2 font-extrabold text-[#153B60]">معلومات مهمة عن الاشتراك</h2>
          <ul className="list-disc space-y-1 pr-5">
            <li>الأسعار بالجنيه المصري، والسعر السنوي يساوي قيمة 10 أشهر مقابل 12 شهرًا.</li>
            <li>الاشتراك لا يتجدد تلقائيًا؛ التجديد يتم بعملية دفع جديدة.</li>
            <li>تأكيد الدفع يتم من إشعار Paymob الموقّع، وليس من صفحة الرجوع للمتصفح.</li>
            <li>ترقية الباقة تُطبّق بعد نجاح الدفع، وتظل بيانات المركز محفوظة.</li>
          </ul>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 py-5 text-xs text-slate-400">
          <p>© Prime Physio 2026. جميع الحقوق محفوظة.</p>
          <nav className="flex gap-5"><Link href="/support" className="hover:text-[#5B50C7]">مركز المساعدة</Link><Link href="/terms" className="hover:text-[#5B50C7]">الشروط</Link><Link href="/privacy" className="hover:text-[#5B50C7]">الخصوصية</Link></nav>
        </footer>
      </div>
    </main>
  );
}
