"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

type Plan = {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  monthly: number;
  activeUsers: string;
  totalUsers: string;
  centers: string;
  sessions: string;
  storage: string;
  patientsAr: string;
  patientsEn: string;
  inventory?: boolean;
  supportAr: string;
  supportEn: string;
  backupAr: string;
  backupEn: string;
  featured?: boolean;
};

const plans: Plan[] = [
  {
    id: "free",
    nameAr: "الباقة المجانية",
    nameEn: "Free",
    descriptionAr: "لتجهيز مركزك والبدء في تنظيم العمل.",
    descriptionEn: "Get your clinic set up and organized.",
    monthly: 0,
    activeUsers: "20",
    totalUsers: "100",
    centers: "1",
    sessions: "2,000",
    storage: "1 GB",
    patientsAr: "50",
    patientsEn: "50",
    supportAr: "البريد الإلكتروني",
    supportEn: "Email support",
    backupAr: "تصدير Excel في أي وقت",
    backupEn: "Export to Excel at any time",
  },
  {
    id: "essential",
    nameAr: "الباقة الأساسية",
    nameEn: "Essential",
    descriptionAr: "لمركز ينمو بفريق أكبر وسعة تشغيلية أعلى.",
    descriptionEn: "For a growing clinic with a larger team.",
    monthly: 750,
    activeUsers: "100",
    totalUsers: "500",
    centers: "1",
    sessions: "غير محدود",
    storage: "10 GB",
    patientsAr: "200",
    patientsEn: "200",
    supportAr: "البريد الإلكتروني والمحادثة الفورية والهاتف",

    supportEn: "Email, live chat and phone support",
    backupAr: "نسخة Excel شهرية تلقائية بالبريد",
    backupEn: "Automatic monthly Excel backup by email",
    featured: true,
  },
  {
    id: "medium",
    nameAr: "الباقة المتوسطة",
    nameEn: "Medium",
    descriptionAr: "للمراكز التي تدير أكثر من فرع وفريقًا أكبر.",
    descriptionEn: "For clinics managing multiple branches and larger teams.",
    monthly: 1500,
    activeUsers: "500",
    totalUsers: "1,000",
    centers: "2",
    sessions: "غير محدود",
    storage: "20 GB",
    patientsAr: "غير محدود",
    patientsEn: "Unlimited",
    inventory: true,
    supportAr: "البريد الإلكتروني والمحادثة والهاتف وزيارة فنية كل 6 أشهر لكل مركز",
    supportEn: "Email, live chat, phone and an on-site visit every 6 months per center",
    backupAr: "نسخة Excel شهرية + نسخة قاعدة بيانات أسبوعية (آخر 4 نسخ)",
    backupEn: "Monthly Excel backup + weekly database backups (last 4)",
  },
  {
    id: "advanced",
    nameAr: "Advanced",
    nameEn: "Advanced",
    descriptionAr: "للمراكز متعددة الفروع والفرق الكبيرة.",
    descriptionEn: "For multi-branch clinics and large teams.",
    monthly: 3000,
    activeUsers: "5,000",
    totalUsers: "غير محدود",
    centers: "5",
    sessions: "غير محدود",
    storage: "30 GB",
    patientsAr: "غير محدود",
    patientsEn: "Unlimited",
    inventory: true,
    supportAr: "البريد الإلكتروني والمحادثة والهاتف وزيارة فنية كل شهرين لكل مركز",
    supportEn: "Email, live chat, phone and an on-site visit every 2 months per center",
    backupAr: "نسخة Excel شهرية + نسخ قاعدة البيانات ليليًا (آخر 14) وأسبوعيًا (آخر 4)",
    backupEn: "Monthly Excel + nightly database backups (last 14) and weekly backups (last 4)",
  },
  {
    id: "maximum",
    nameAr: "Maximum",
    nameEn: "Maximum",
    descriptionAr: "لشبكات المراكز والعمليات الكبيرة.",
    descriptionEn: "For clinic networks and large-scale operations.",
    monthly: 7500,
    activeUsers: "غير محدود",
    totalUsers: "غير محدود",
    centers: "10",
    sessions: "غير محدود",
    storage: "50 GB",
    patientsAr: "غير محدود",
    patientsEn: "Unlimited",
    inventory: true,
    supportAr: "البريد الإلكتروني والمحادثة والهاتف وزيارة فنية كل شهرين لكل مركز",
    supportEn: "Email, live chat and an on-site visit every 2 months per center",
    backupAr: "نسخة Excel شهرية + نسخ قاعدة البيانات ليليًا وأسبوعيًا",
    backupEn: "Monthly Excel + nightly and weekly database backups",
  },
];

export default function Pricing() {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const [isAnnual, setIsAnnual] = useState(false);
  const formatPrice = (price: number) => new Intl.NumberFormat(isEnglish ? "en-EG" : "ar-EG").format(price);
  const labels = isEnglish
    ? ["Active users", "Total users", "Centers", "Sessions / month", "Storage", "Patients"]
    : ["مستخدم نشط", "إجمالي المستخدمين", "مركز", "جلسة شهريًا", "مساحة التخزين", "مريض"];

  return (
    <section id="pricing" className="relative bg-[#F8FAFC] py-20 sm:py-24">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      <div className="relative z-10 mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-3xl font-black text-[#153B60] sm:text-4xl">{isEnglish ? "Plans for every clinic" : "باقات تناسب نمو مركزك"}</h2>
          <p className="mt-4 text-base font-medium leading-7 text-slate-600">
            {isEnglish ? "Start free and upgrade as your team, branches and storage needs grow. The same plans and limits are used across Prime Physio." : "ابدأ مجانًا، ورقِّ باقتك عندما يكبر فريقك أو عدد فروعك. نفس الباقات والحدود المعروضة داخل لوحة التحكم."}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <div className="relative flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              <button type="button" onClick={() => setIsAnnual(false)} aria-pressed={!isAnnual} className={"relative z-10 min-w-24 rounded-full px-5 py-2.5 text-sm font-bold transition-colors " + (!isAnnual ? "bg-[#5B50C7] text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}>
                {isEnglish ? "Monthly" : "شهري"}
              </button>
              <button type="button" onClick={() => setIsAnnual(true)} aria-pressed={isAnnual} className={"relative z-10 min-w-28 rounded-full px-5 py-2.5 text-sm font-bold transition-colors " + (isAnnual ? "bg-[#5B50C7] text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}>
                {isEnglish ? "Yearly" : "سنوي"}
              </button>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              {isEnglish ? "2 months free on annual billing" : "وفّر قيمة شهرين عند الدفع السنوي"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan) => {
            const name = isEnglish ? plan.nameEn : plan.nameAr;
            const amount = isAnnual && plan.monthly > 0 ? plan.monthly * 10 : plan.monthly;
            const features = [
              [labels[0], plan.activeUsers],
              [labels[1], plan.totalUsers],
              [labels[2], plan.centers],
              [labels[3], plan.sessions],
              [labels[4], plan.storage],
              [labels[5], isEnglish ? plan.patientsEn : plan.patientsAr],
            ];
            return (
              <article key={plan.id} data-csp-motion="reveal" className={"relative flex min-w-0 flex-col rounded-2xl border bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.045)] transition hover:-translate-y-1 hover:shadow-lg " + (plan.featured ? "border-[#8C83E0] ring-2 ring-[#5B50C7]/10" : "border-slate-200")}>
                {plan.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#5B50C7] px-3 py-1 text-[11px] font-extrabold text-white shadow">{isEnglish ? "Most popular" : "الأكثر اختيارًا"}</span>}
                <h3 className="mt-1 text-lg font-extrabold text-[#153B60]">{name}</h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{isEnglish ? plan.descriptionEn : plan.descriptionAr}</p>
                <div className="mt-4 flex flex-wrap items-baseline gap-1">
                  <strong className="text-3xl font-black tracking-tight text-[#5B50C7]">{amount === 0 ? (isEnglish ? "Free" : "مجانًا") : formatPrice(amount)}</strong>
                  {amount > 0 && <span className="text-xs text-slate-500">{isEnglish ? "EGP" : "جنيه"} / {isEnglish ? (isAnnual ? "year" : "month") : (isAnnual ? "سنويًا" : "شهريًا")}</span>}
                </div>
                {isAnnual && plan.monthly > 0 && <p className="mt-1 text-[11px] font-bold text-emerald-700">{isEnglish ? "12 months for the price of 10" : "12 شهرًا بسعر 10 أشهر فقط"}</p>}
                <div className="my-4 h-px bg-slate-100" />
                <ul className="flex-1 space-y-3 text-xs leading-5 text-slate-700">
                  {features.map(([label, value]) => <li key={label} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span><b className="font-extrabold text-slate-900">{isEnglish && value === "غير محدود" ? "Unlimited" : value}</b> {label}</span></li>)}
                  <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span>{isEnglish ? "Bookings, patient files, payments, payroll, attendance and reports" : "الحجوزات وملفات المرضى والمدفوعات والمرتبات والحضور والتقارير"}</span></li>
                  <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span>{isEnglish ? "Arabic and English interface" : "واجهة باللغتين العربية والإنجليزية"}</span></li>
                  {plan.inventory && <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span>{isEnglish ? "Inventory: stock, purchases, sales, team requests and stocktaking" : "المخزن: المخزون والمشتريات والمبيعات وطلبات الفريق والجرد"}</span></li>}
                  <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span><b>{isEnglish ? "Support:" : "الدعم:"}</b> {isEnglish ? plan.supportEn : plan.supportAr}</span></li>
                  <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span>{isEnglish ? plan.backupEn : plan.backupAr}</span></li>
                  <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#5B50C7]" /><span>{isEnglish ? "Export clinic data to Excel at any time" : "تصدير بيانات المركز إلى Excel في أي وقت"}</span></li>
                </ul>
                <Link href={`/rgstr.php?plan=${encodeURIComponent(plan.id)}`} className={"mt-5 flex min-h-11 w-full items-center justify-center rounded-xl px-3 py-2 text-center text-sm font-extrabold transition " + (plan.featured ? "bg-[#5B50C7] text-white shadow-sm hover:bg-[#493FB0]" : "border border-slate-200 text-[#153B60] hover:border-[#5B50C7] hover:text-[#5B50C7]")}>
                  {isEnglish ? (plan.id === "free" ? "Start for free" : "Choose plan") : (plan.id === "free" ? "ابدأ مجانًا" : "ترقية الباقة")}
                </Link>
              </article>
            );
          })}
        </div>
        <p className="mx-auto mt-5 max-w-5xl rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-xs leading-6 text-slate-500">
          {isEnglish ? "Users include the clinic owner and staff. Monthly sessions are counted by calendar month. Storage covers patient files and attachments. Center limits are counted across the account owner." : "تُحتسب حسابات مالك المركز وفريق العمل ضمن المستخدمين. الجلسات تُحسب شهريًا، ومساحة التخزين تشمل ملفات ومرفقات المرضى، وعدد المراكز يُحسب على مستوى مالك الحساب."}
        </p>
      </div>
    </section>
  );
}
