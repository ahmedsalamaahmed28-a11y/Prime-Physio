"use client";

import { useState } from "react";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

export default function Pricing() {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const [isAnnual, setIsAnnual] = useState(false);
  // These prices and limits match the active public.subscription_plans records.
  const plans = [
    {
      id: "basic",
      name: isEnglish ? "Basic" : "الأساسية (Basic)",
      description: isEnglish ? "A free starting point for a small clinic." : "بداية مجانية لتنظيم مركزك.",
      monthly: 0,
      yearly: 0,
      features: [
        isEnglish ? "Up to 50 patients" : "إدارة حتى 50 مريضًا",
        isEnglish ? "Up to 100 sessions per month" : "حتى 100 جلسة شهريًا",
        isEnglish ? "Patient records management" : "إدارة ملفات المرضى",
        isEnglish ? "Appointment scheduling" : "جدولة المواعيد",
        isEnglish ? "Basic reports" : "تقارير أساسية",
      ],
      popular: false,
    },
    {
      id: "silver",
      name: isEnglish ? "Silver" : "الفضية (Silver)",
      description: isEnglish ? "For clinics that need more capacity and tools." : "للمراكز التي تحتاج إلى سعة وأدوات إضافية.",
      monthly: 1000,
      yearly: 9600,
      features: [
        isEnglish ? "Up to 200 patients" : "إدارة حتى 200 مريض",
        isEnglish ? "Up to 500 sessions per month" : "حتى 500 جلسة شهريًا",
        isEnglish ? "Treatment session management" : "إدارة الجلسات العلاجية",
        isEnglish ? "Financial reports" : "تقارير مالية",
        isEnglish ? "Technical support" : "دعم فني",
        isEnglish ? "Includes Basic plan features" : "تشمل مميزات الباقة الأساسية",
      ],
      popular: true,
    },
    {
      id: "gold",
      name: isEnglish ? "Gold" : "الذهبية (Gold)",
      description: isEnglish ? "For clinics that need higher operating capacity." : "للمراكز التي تحتاج إلى سعة تشغيلية أكبر.",
      monthly: 1500,
      yearly: 14400,
      features: [
        isEnglish ? "Unlimited patients" : "عدد غير محدود من المرضى",
        isEnglish ? "Unlimited sessions per month" : "عدد غير محدود من الجلسات شهريًا",
        isEnglish ? "Exercise management" : "إدارة التمارين الرياضية",
        isEnglish ? "Treatment prescriptions" : "روشتات علاجية",
        isEnglish ? "Includes Silver plan features" : "تشمل مميزات الباقة الفضية",
      ],
      popular: false,
    },
  ];
  const formatPrice = (price: number) => new Intl.NumberFormat(isEnglish ? "en-EG" : "ar-EG").format(price);

  return (
    <section id="pricing" className="relative bg-white py-24">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">{isEnglish ? "Simple, transparent pricing" : "أسعار واضحة وبسيطة"}</h2>
          <p className="mt-4 text-lg font-medium text-slate-600">
            {isEnglish ? "Choose the plan that fits your clinic. Published prices and limits are shown below." : "اختر الباقة المناسبة لمركزك. الأسعار والحدود المعروضة أدناه مطابقة للباقات النشطة."}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="relative flex rounded-full border border-slate-200 bg-slate-100/80 p-1.5 shadow-inner">
              <button type="button" onClick={() => setIsAnnual(false)} aria-pressed={!isAnnual} className={"relative z-10 w-28 rounded-full py-2.5 text-sm font-bold transition-colors " + (!isAnnual ? "text-white" : "text-slate-600 hover:text-slate-900")}>
                {!isAnnual && <span className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#6366F1] shadow-md" />}
                {isEnglish ? "Monthly" : "شهري"}
              </button>
              <button type="button" onClick={() => setIsAnnual(true)} aria-pressed={isAnnual} className={"relative z-10 w-32 rounded-full py-2.5 text-sm font-bold transition-colors " + (isAnnual ? "text-white" : "text-slate-600 hover:text-slate-900")}>
                {isAnnual && <span className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#6366F1] shadow-md" />}
                {isEnglish ? "Yearly" : "سنوي"}
              </button>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100/80 px-3 py-1.5 text-xs font-bold text-emerald-700">
              {isEnglish ? "Save 20%" : "خصم 20%"}
            </span>
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} data-csp-motion="reveal" className={"relative flex flex-col rounded-3xl bg-white p-8 xl:p-10 " + (plan.popular ? "z-10 scale-105 border-2 border-[#4F46E5] shadow-2xl shadow-indigo-500/10" : "my-4 border border-slate-200 shadow-sm")}>
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 mx-auto flex w-36 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-3 py-1 text-center text-xs font-bold text-white">
                  <Star className="h-3 w-3 fill-white" />{isEnglish ? "Most popular" : "الأكثر طلبًا"}
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
              </div>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">{formatPrice(isAnnual ? plan.yearly : plan.monthly)}</span>
                <span className="text-sm font-semibold text-slate-500">{isEnglish ? "EGP" : "ج.م"} / {isAnnual ? (isEnglish ? "year" : "سنويًا") : (isEnglish ? "month" : "شهريًا")}</span>
              </div>
              <ul className="mb-8 flex-1 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={"h-5 w-5 shrink-0 " + (plan.popular ? "text-[#4F46E5]" : "text-slate-400")} />
                    <span className="text-sm font-medium text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/rgstr.php" className={"w-full rounded-full py-3 text-center font-bold transition-all " + (plan.popular ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-lg hover:scale-[1.02] hover:shadow-xl" : "bg-slate-100 text-slate-900 hover:bg-slate-200")}>
                {isEnglish ? (plan.id === "basic" ? "Start for free" : "Choose " + plan.name) : (plan.id === "basic" ? "ابدأ مجانًا" : "اختر باقة " + plan.name)}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
