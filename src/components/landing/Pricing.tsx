"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "الأساسية (Starter)",
      description: "مثالية للعيادات الصغيرة والناشئة.",
      priceMonthly: "0",
      priceYearly: "0",
      features: [
        "إدارة حتى 50 مريض",
        "100 جلسة شهرياً",
        "20 حساب للأخصائيين",
        "إدارة مركز واحد",
        "دعم فني عبر البريد",
      ],
      cta: "ابدأ مجانًا",
      popular: false,
    },
    {
      name: "الفضية (Silver)",
      description: "للمراكز المتنامية التي تحتاج لأدوات احترافية.",
      priceMonthly: "1000",
      priceYearly: "9600",
      features: [
        "إدارة حتى 200 مريض",
        "500 جلسة شهرياً",
        "50 حساب للأخصائيين",
        "التقارير والتحليلات والتغذية العلاجية",
        "دعم فني هاتفي",
      ],
      cta: "ابدأ الإصدار الفضي",
      popular: true,
    },
    {
      name: "الذهبية (Gold)",
      description: "للمستشفيات وسلاسل المراكز المتعددة.",
      priceMonthly: "1500",
      priceYearly: "14400",
      features: [
        "عدد لا محدود من المرضى والجلسات",
        "حسابات غير محدودة للأخصائيين",
        "المكتبة العلاجية ورسائل التذكير",
        "إدارة فروع متعددة (حتى مركزين)",
        "دعم VIP على مدار الساعة",
      ],
      cta: "ابدأ الإصدار الذهبي",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-white relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">أسعار شفافة وبسيطة</h2>
          <p className="mt-4 text-lg text-slate-600 font-medium">
            اختر الباقة التي تناسب حجم وطموح مركزك. يمكنك الترقية أو الإلغاء في أي وقت.
          </p>
          
          <div className="mt-8 flex justify-center items-center gap-4">
            <div className="relative flex p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-full border border-slate-200 shadow-inner">
              <button
                onClick={() => setIsAnnual(false)}
                className={`relative z-10 w-28 py-2.5 text-sm font-bold rounded-full transition-colors ${
                  !isAnnual ? "text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {!isAnnual && (
                  <motion.div
                    layoutId="pricing-toggle"
                    className="absolute inset-0 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-full shadow-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                شهري
              </button>
              
              <button
                onClick={() => setIsAnnual(true)}
                className={`relative z-10 w-32 py-2.5 text-sm font-bold rounded-full transition-colors flex items-center justify-center gap-2 ${
                  isAnnual ? "text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {isAnnual && (
                  <motion.div
                    layoutId="pricing-toggle"
                    className="absolute inset-0 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-full shadow-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                سنوي
              </button>
            </div>
            
            <div className="hidden sm:block">
              <span className="px-3 py-1.5 rounded-full bg-emerald-100/80 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-sm inline-flex items-center gap-1 animate-bounce">
                خصم 20% 🚀
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-3xl bg-white p-8 xl:p-10 ${
                plan.popular 
                  ? "border-2 border-[#4F46E5] shadow-2xl shadow-indigo-500/10 scale-105 z-10" 
                  : "border border-slate-200 shadow-sm mt-4 mb-4"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-3 py-1 text-center text-xs font-bold text-white flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 fill-white" /> الأكثر طلباً
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
              </div>
              
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">
                  {isAnnual ? plan.priceYearly : plan.priceMonthly}
                </span>
                <span className="text-sm font-semibold text-slate-500">ج.م / {isAnnual ? "سنوياً" : "شهرياً"}</span>
              </div>
              
              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 shrink-0 ${plan.popular ? "text-[#4F46E5]" : "text-slate-400"}`} />
                    <span className="text-sm font-medium text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link
                href="/signup"
                className={`w-full py-3 rounded-full text-center font-bold transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-lg hover:shadow-xl hover:scale-105"
                    : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
