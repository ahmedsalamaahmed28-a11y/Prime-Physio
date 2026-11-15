"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check, X, Crown, CreditCard, ShieldCheck, Download,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Plan = {
  name: string;
  price: string;
  annual: string;
  description: string;
  limits: [string, string, string, string, string];
  support: string;
  backup: string;
  featured?: boolean;
};

const plans: Plan[] = [
  { name: "المجانية", price: "مجاناً", annual: "مجاناً", description: "لتجهيز مركزك وتجربة كل شيء.", limits: ["20", "100", "1", "2,000", "1 GB"], support: "البريد الإلكتروني", backup: "تصدير Excel في أي وقت" },
  { name: "الأساسية", price: "750 جنيه", annual: "", description: "لمركز ينمو بفريق أكبر.", limits: ["100", "500", "1", "غير محدود", "10 GB"], support: "البريد الإلكتروني والمحادثة الفورية", backup: "نسخة Excel شهرية تلقائية بالبريد", featured: true },
  { name: "المتوسطة", price: "1,500 جنيه", annual: "", description: "لملاك الفروع المتعددة.", limits: ["500", "1,000", "2", "غير محدود", "20 GB"], support: "البريد الإلكتروني والمحادثة الفورية وزيارة فنية كل 6 أشهر لكل مركز", backup: "نسخة Excel شهرية + نسخة قاعدة بيانات أسبوعية" },
  { name: "Advanced", price: "3,000 جنيه", annual: "", description: "للمراكز متعددة الفروع والفرق الكبيرة.", limits: ["5,000", "غير محدود", "5", "غير محدود", "30 GB"], support: "البريد الإلكتروني والمحادثة الفورية وزيارة فنية كل شهرين لكل مركز", backup: "نسخة Excel شهرية + نسخ قاعدة البيانات ليلياً وأسبوعياً" },
  { name: "Maximum", price: "7,500 جنيه", annual: "", description: "لشبكات المراكز والعمليات الكبيرة.", limits: ["غير محدود", "غير محدود", "10", "غير محدود", "50 GB"], support: "البريد الإلكتروني والمحادثة الفورية وزيارة فنية كل شهرين لكل مركز", backup: "نسخة Excel شهرية + نسخ قاعدة البيانات ليلياً وأسبوعياً" },
];

const comparisonRows = [
  ["السعر / شهرياً", "مجاناً", "750 جنيه", "1,500 جنيه", "3,000 جنيه", "7,500 جنيه"],
  ["المستخدمون النشطون", "20", "100", "500", "5,000", "غير محدود"],
  ["إجمالي المستخدمين", "100", "500", "1,000", "غير محدود", "غير محدود"],
  ["المراكز", "1", "1", "2", "5", "10"],
  ["الجلسات / شهرياً", "2,000", "غير محدود", "غير محدود", "غير محدود", "غير محدود"],
  ["التخزين", "1 GB", "10 GB", "20 GB", "30 GB", "50 GB"],
  ["كل المزايا: الحجوزات والملفات والمدفوعات والمرتبات والحضور والتقارير", "✓", "✓", "✓", "✓", "✓"],
  ["العربية والإنجليزية", "✓", "✓", "✓", "✓", "✓"],
  ["تصدير البيانات إلى Excel في أي وقت", "✓", "✓", "✓", "✓", "✓"],
  ["المخزن: المخزون والمشتريات والمبيعات وطلبات الفريق والجرد", "—", "—", "✓", "✓", "✓"],
  ["نسخة Excel احتياطية شهرية تلقائية بالبريد", "—", "✓", "✓", "✓", "✓"],
  ["نسخة قاعدة البيانات على الخادم", "—", "—", "أسبوعياً (آخر 4)", "ليلياً (آخر 14) + أسبوعياً (آخر 4)", "ليلياً (آخر 14) + أسبوعياً (آخر 4)"],
  ["التصدير الكامل لبيانات المركز", "الأول مجاناً", "الأول مجاناً", "الأول مجاناً", "الأول مجاناً", "الأول مجاناً"],
  ["الدعم الهاتفي", "—", "✓", "✓", "✓", "✓"],
];

const faqs = [
  { q: "كيف أدفع؟", a: "سيكون الدفع للباقات المدفوعة عبر إنستاباي بالجنيه المصري. تفاصيل التحويل وإرسال إثبات الدفع وتأكيد الاشتراك ستظهر هنا بعد إعداد آلية الدفع." },
  { q: "هل يتجدد الاشتراك تلقائياً؟", a: "لا يوجد خصم أو تجديد تلقائي عبر بوابة دفع. يتم تجديد الاشتراك بعد إتمام تحويل إنستاباي وتأكيده وفق آلية الدفع التي سيتم توضيحها." },
  { q: "هل يمكنني تغيير باقتي لاحقاً؟", a: "نعم، يمكنك طلب ترقية باقتك في أي وقت. تظل مراكزك وبياناتك كما هي." },
  { q: "هل بياناتي محفوظة احتياطياً؟ وهل يمكنني أخذها معي؟", a: "يمكنك في كل الباقات تصدير بياناتك إلى Excel في أي وقت. وتشمل الباقات المدفوعة نسخاً احتياطية وفق الجدول الموضح في المقارنة. كما يمكنك طلب التصدير الكامل لبيانات المركز، شاملاً الحالات وملفاتها وتقييماتها والجلسات والمدفوعات والموظفين؛ أول تصدير لكل مركز مجاناً، وتُحدد أي رسوم إضافية بالجنيه المصري قبل تنفيذ الطلب." },
  { q: "من هو المستخدم النشط؟", a: "يُحتسب مالك المركز وكل فرد من فريق العمل ضمن إجمالي المستخدمين. ويُحتسب الحساب ضمن المستخدمين النشطين إذا كانت حالته نشطة؛ أما الحسابات المحذوفة فلا تُحتسب." },
  { q: "هل يوجد اشتراك سنوي؟", a: "نعم، يمكنك دفع قيمة 10 أشهر مقدماً والاستفادة من 12 شهراً. جميع الأسعار بالجنيه المصري، والدفع عبر إنستاباي فقط." },
];

function CheckMark({ value }: { value: string }) {
  if (value === "✓") return <Check size={17} className="mx-auto text-emerald-600" />;
  if (value === "—") return <X size={16} className="mx-auto text-slate-300" />;
  return <span>{value}</span>;
}

export default function PlansPhpPage() {
  const { user } = useAuth();
  const [activePlan, setActivePlan] = useState("free");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!user?.clinicId) return;
      const { data } = await supabase.from("subscriptions")
        .select("plan_name").eq("clinic_id", user.clinicId).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (alive && data?.plan_name) setActivePlan(String(data.plan_name).toLowerCase());
    };
    load();
    return () => { alive = false; };
  }, [user?.clinicId]);

  const normalize = (name: string) => {
    const key = name.toLowerCase();
    if (["basic", "free", "starter", "المجانية", "الباقة المجانية"].includes(key)) return "free";
    if (["silver", "standard", "essential", "الأساسية"].includes(key)) return "essential";
    if (["gold", "medium", "المتوسطة"].includes(key)) return "medium";
    if (key === "advanced") return "advanced";
    if (key === "maximum") return "maximum";
    return key;
  };

  return (
    <>
      <main dir="rtl" className="min-h-screen w-full bg-[#F8FAFC] px-3 pb-12 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E4E1FA] bg-[#F1EFFF] px-3 py-1.5 text-xs font-bold text-[#5B50C7]"><Crown size={15} /> خطط تناسب نمو مركزك</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#153B60] sm:text-4xl">باقات بسيطة لكل مركز</h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">ابدأ مجاناً، ورقِّ باقتك عندما يكبر فريقك أو عدد فروعك. جميع الأسعار بالجنيه المصري فقط، والدفع للباقات المدفوعة عبر إنستاباي.</p>
          </header>

          <section>
            <div className="mb-4 flex items-center gap-2 text-lg font-extrabold text-slate-900"><CreditCard size={20} className="text-[#5B50C7]" /> باقتك</div>
            <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {plans.map((plan) => {
                const isCurrent = normalize(activePlan) === normalize(plan.name === "المجانية" ? "free" : plan.name);
                return (
                  <article key={plan.name} className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.045)] transition hover:-translate-y-1 hover:shadow-lg ${plan.featured ? "border-[#8C83E0] ring-2 ring-[#5B50C7]/10" : "border-slate-200"}`}>
                    {plan.featured && <span className="absolute -top-3 right-1/2 -translate-x-1/2 translate-x-1/2 whitespace-nowrap rounded-full bg-[#5B50C7] px-3 py-1 text-[11px] font-extrabold text-white shadow">الأكثر اختياراً</span>}
                    <h2 className="text-lg font-extrabold text-[#153B60]">{plan.name === "المجانية" ? "الباقة المجانية" : plan.name === "الأساسية" ? "الباقة الأساسية" : plan.name === "المتوسطة" ? "الباقة المتوسطة" : plan.name}</h2>
                    <div className="mt-4 flex items-baseline gap-1"><strong className="whitespace-nowrap text-[1.7rem] font-black tracking-tight text-[#5B50C7] sm:text-3xl">{plan.price}</strong>{plan.name !== "المجانية" && <span className="whitespace-nowrap text-xs leading-none text-slate-500">/ شهرياً</span>}</div>
                    {plan.name !== "المجانية" && plan.annual && <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{plan.annual}</p>}
                    {plan.name !== "المجانية" && <p className="mt-1 text-[11px] font-semibold text-emerald-700">ادفع 12 شهراً بسعر 10 أشهر فقط عبر إنستاباي</p>}
                    <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">{plan.description}</p>
                    <div className="my-4 h-px bg-slate-100" />
                    <ul className="flex-1 space-y-3 text-xs leading-5 text-slate-700">
                      {["مستخدم نشط", "مستخدم إجمالاً", "مركز", "جلسة شهرياً", "مساحة تخزين"].map((label, i) => <li key={label} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span><b className="font-extrabold text-slate-900">{plan.limits[i]}</b> {label}{i === 0 || i === 1 ? "" : ""}</span></li>)}
                      <li className="flex items-start gap-2"><span><b>الدعم:</b> {plan.name === "المجانية" ? <a href="mailto:support@prime-physio.com" className="font-bold text-[#5B50C7] underline underline-offset-2">البريد الإلكتروني</a> : plan.support}</span></li>
                      <li className="flex items-start gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span>{plan.backup}</span></li>
                      <li className="flex items-start gap-2"><Download size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span>تصدير بياناتك إلى Excel في أي وقت</span></li>
                    </ul>
                    {isCurrent ? <div className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F1EFFF] px-3 text-sm font-extrabold text-[#5B50C7]"><CheckCircleLabel /> باقتك الحالية</div> : plan.name === "المجانية" ? <Link href="/account.php" className="mt-5 flex min-h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:border-[#5B50C7] hover:text-[#5B50C7]">تفاصيل حسابك</Link> : <Link href={`/subscription?plan=${encodeURIComponent(plan.name)}`} className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-[#5B50C7] px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#493FB0]">ترقية الباقة</Link>}
                  </article>
                );
              })}
            </div>
            <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-6 text-slate-500">
              تُحتسب حسابات مالك المركز وفريق العمل ضمن المستخدمين. الجلسات تُحسب شهرياً، ومساحة التخزين تشمل ملفات ومرفقات المرضى، وعدد المراكز يُحسب على مستوى مالك الحساب.
            </p>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6"><h2 className="text-xl font-extrabold text-[#153B60]">مقارنة الباقات</h2><p className="mt-1 text-xs text-slate-500">قارن حدود الاستخدام والمزايا قبل اختيار الباقة المناسبة.</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-center text-xs">
                <thead className="bg-[#F7F6FF] text-[#153B60]"><tr><th className="sticky right-0 min-w-[230px] bg-[#F7F6FF] px-4 py-4 text-right font-extrabold">الميزة</th>{plans.map(p => <th key={p.name} className="min-w-[130px] px-3 py-4 font-extrabold">{p.name}</th>)}</tr></thead>
                <tbody>{comparisonRows.map((row, idx) => <tr key={row[0]} className={idx % 2 ? "bg-slate-50/70" : "bg-white"}><th className="sticky right-0 bg-inherit px-4 py-3 text-right font-bold leading-5 text-slate-700">{row[0]}</th>{row.slice(1).map((cell, i) => <td key={i} className="px-3 py-3 font-semibold leading-5 text-slate-600"><CheckMark value={cell} /></td>)}</tr>)}</tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2"><h2 className="text-xl font-extrabold text-[#153B60]">أسئلة عن الاشتراك</h2></div>
            <div className="grid gap-3 md:grid-cols-2">
              {faqs.map((faq) => <details key={faq.q} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm open:border-[#C9C4F2]"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-slate-800"><span>{faq.q}</span><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1EFFF] text-[#5B50C7] transition group-open:rotate-45"><span className="text-lg leading-none">+</span></span></summary><p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-7 text-slate-600">{faq.a}</p></details>)}
            </div>
          </section>

          <section className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-gradient-to-l from-[#153B60] to-[#5B50C7] px-6 py-6 text-center text-white sm:flex-row sm:text-right">
            <div><h2 className="text-lg font-extrabold">هل تحتاج مساعدة في اختيار باقتك؟</h2><p className="mt-1 text-xs leading-6 text-white/80">تواصل معنا وسنساعدك في اختيار الأنسب لمركزك.</p></div>
            <a href="https://wa.me/201222688400" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-[#5B50C7] transition hover:bg-[#F1EFFF]">تواصل عبر واتساب</a>
          </section>

          <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row">
            <p>© Prime Physio 2026. جميع الحقوق محفوظة.</p>
            <nav className="flex flex-wrap items-center justify-center gap-5"><Link href="/support" className="hover:text-[#5B50C7]">مركز المساعدة</Link><Link href="/terms" className="hover:text-[#5B50C7]">الشروط</Link><Link href="/privacy" className="hover:text-[#5B50C7]">الخصوصية</Link></nav>
          </footer>
        </div>
      </main>
    </>
  );
}

function CheckCircleLabel() {
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#5B50C7] text-white"><Check size={13} /></span>;
}
