"use client";

import { Building, UserPlus, Zap, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

export default function HowItWorks() {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const steps = [
    {
      number: "01",
      title: isEnglish ? "Create your account" : "أنشئ حسابك",
      description: isEnglish
        ? "Register as a clinic owner and verify your email using the activation code sent to your inbox."
        : "سجّل كمالك مركز علاج طبيعي، ثم فعّل بريدك الإلكتروني باستخدام رمز التحقق المرسل إلى بريدك.",
      icon: <UserPlus className="h-6 w-6 text-[#4F46E5]" />,
    },
    {
      number: "02",
      title: isEnglish ? "Set up your clinic" : "جهّز مركزك",
      description: isEnglish
        ? "Choose a unique clinic URL, then add your clinic details and prepare your workspace."
        : "اختر رابطًا مميزًا لمركزك، وأكمل بياناته الأساسية لتجهيز مساحة العمل الخاصة بك.",
      icon: <Building className="h-6 w-6 text-[#4F46E5]" />,
    },
    {
      number: "03",
      title: isEnglish ? "Start managing" : "ابدأ الإدارة",
      description: isEnglish
        ? "Add your team and patients, organize appointments, and document treatment sessions."
        : "أضف فريق العمل والمرضى، ونظّم المواعيد، وسجّل تفاصيل الجلسات العلاجية.",
      icon: <Zap className="h-6 w-6 text-[#4F46E5]" />,
    },
  ];

  return (
    <section id="how" className="relative overflow-hidden bg-[#F8FAFC] py-20 sm:py-24" dir={isEnglish ? "ltr" : "rtl"}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div data-csp-motion="reveal" className="mx-auto mb-16 max-w-2xl text-center">
          <span className="mb-4 inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
            {isEnglish ? "Get started" : "ابدأ الآن"}
          </span>
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">{isEnglish ? "Ready in three simple steps" : "جاهز للعمل في ثلاث خطوات"}</h2>
          <p className="mt-4 text-lg font-medium leading-8 text-slate-600">
            {isEnglish ? "From account creation to managing your clinic — get started with Prime Physio." : "من إنشاء حساب المالك إلى إدارة المركز — ابدأ بسهولة مع Prime Physio."}
          </p>
        </div>
        <div className="relative grid gap-10 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-l from-transparent via-indigo-200 to-transparent md:block" />
          {steps.map((step) => (
            <article key={step.number} data-csp-motion="reveal" className="relative flex flex-col items-center text-center">
              <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-white shadow-md">
                {step.icon}
                <span className="absolute -left-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#4F46E5] px-1.5 text-xs font-extrabold text-white">{step.number}</span>
              </div>
              <h3 className="mb-3 text-xl font-extrabold text-slate-900">{step.title}</h3>
              <p className="max-w-sm font-medium leading-8 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
        <div data-csp-motion="reveal" className="mt-14 flex justify-center">
          <Link href="/rgstr.php" className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-l from-[#4F46E5] to-[#7C3AED] px-7 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:from-[#4338CA] hover:to-[#6D28D9]">
            {isEnglish ? "Create your clinic account" : "أنشئ حساب مركزك الآن"}
            {isEnglish ? <ArrowRight className="h-5 w-5" aria-hidden="true" /> : <ArrowLeft className="h-5 w-5" aria-hidden="true" />}
          </Link>
        </div>
      </div>
    </section>
  );
}
