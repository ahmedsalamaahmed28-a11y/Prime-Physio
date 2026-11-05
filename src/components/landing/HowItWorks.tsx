"use client";

import { motion } from "framer-motion";
import { Building, UserPlus, Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "أنشئ حسابك",
      description: "سجّل كمالك مركز علاج طبيعي، وأكمل تفعيل حسابك من خلال رسالة التأكيد التي تصلك على بريدك الإلكتروني.",
      icon: <UserPlus className="h-6 w-6 text-[#4F46E5]" />,
    },
    {
      number: "02",
      title: "جهّز مركزك",
      description: "اختر رابطًا مميزًا لمركزك، وأضف الخدمات والأسعار وبيانات فريق العمل حتى يصبح مركزك جاهزًا لاستقبال الحجوزات.",
      icon: <Building className="h-6 w-6 text-[#4F46E5]" />,
    },
    {
      number: "03",
      title: "ابدأ الحجز",
      description: "شارك رابط مركزك مع المرضى وفريق العمل، وابدأ في تنظيم المواعيد ومتابعة الحجوزات من مكان واحد.",
      icon: <Zap className="h-6 w-6 text-[#4F46E5]" />,
    },
  ];

  return (
    <section id="how" className="relative overflow-hidden bg-[#F8FAFC] py-20 sm:py-24" dir="rtl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          className="mx-auto mb-16 max-w-2xl text-center"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45 }}
        >
          <span className="mb-4 inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
            ابدأ الآن
          </span>
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
            جاهز للعمل في ثلاث خطوات
          </h2>
          <p className="mt-4 text-lg font-medium leading-8 text-slate-600">
            من إنشاء حساب المركز إلى استقبال أول حجز — ابدأ بسهولة مع Prime Physio.
          </p>
        </motion.div>

        <div className="relative grid gap-10 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-l from-transparent via-indigo-200 to-transparent md:block" />
          {steps.map((step, index) => (
            <motion.article
              key={step.number}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.12 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-white shadow-md">
                {step.icon}
                <span className="absolute -left-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#4F46E5] px-1.5 text-xs font-extrabold text-white">
                  {step.number}
                </span>
              </div>
              <h3 className="mb-3 text-xl font-extrabold text-slate-900">{step.title}</h3>
              <p className="max-w-sm font-medium leading-8 text-slate-600">{step.description}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          className="mt-14 flex justify-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-l from-[#4F46E5] to-[#7C3AED] px-7 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:from-[#4338CA] hover:to-[#6D28D9]"
          >
            أنشئ حساب مركزك الآن
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
