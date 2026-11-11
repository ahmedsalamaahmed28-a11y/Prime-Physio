"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function FAQ() {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = [
    {
      question: isEnglish ? "Do I need technical experience to use Prime Physio?" : "هل أحتاج إلى خبرة تقنية لاستخدام Prime Physio؟",
      answer: isEnglish
        ? "The platform is designed to help clinic teams organize patient records, appointments, treatment sessions, and day-to-day clinic information in one workspace."
        : "صُممت المنصة لمساعدة فريق المركز على تنظيم ملفات المرضى والمواعيد والجلسات العلاجية ومعلومات العمل اليومية من مساحة واحدة.",
    },
    {
      question: isEnglish ? "How do I create a clinic account?" : "كيف أنشئ حسابًا للمركز؟",
      answer: isEnglish
        ? "Create an owner account, verify the email address using the code sent to your inbox, then sign in and complete the clinic setup."
        : "أنشئ حساب المالك، ثم فعّل البريد الإلكتروني باستخدام الرمز المرسل إلى بريدك، وبعدها سجّل الدخول وأكمل إعداد المركز.",
    },
    {
      question: isEnglish ? "Does the platform have a free plan?" : "هل توجد باقة مجانية؟",
      answer: isEnglish
        ? "Yes. The active Basic plan is free and currently allows up to 50 patients and 100 sessions per month. Paid plans have higher limits."
        : "نعم. باقة Basic مجانية حاليًا، وتسمح بإدارة حتى 50 مريضًا و100 جلسة شهريًا. وتوفر الباقات المدفوعة حدودًا أعلى.",
    },
    {
      question: isEnglish ? "How is access to clinic records restricted?" : "كيف يتم تقييد الوصول إلى بيانات المركز؟",
      answer: isEnglish
        ? "Clinic records are associated with a clinic identifier and access is restricted through role checks and database row-level security policies. Access isolation should be tested as part of account and permission management."
        : "ترتبط سجلات المركز بمعرّف خاص به، ويُقيّد الوصول من خلال فحص الأدوار وسياسات Row Level Security. ويجب اختبار عزل الوصول ضمن إدارة الحسابات والصلاحيات.",
    },
    {
      question: isEnglish ? "Can I manage multiple branches under one subscription?" : "هل يمكنني إدارة عدة فروع ضمن اشتراك واحد؟",
      answer: isEnglish
        ? "Multi-branch management is not listed among the currently active Basic, Silver, or Gold plan features. Contact the team before relying on a multi-branch workflow."
        : "إدارة الفروع المتعددة ليست مدرجة ضمن مميزات الباقات النشطة Basic وSilver وGold حاليًا. يُرجى التواصل مع الفريق قبل الاعتماد على هذا الاستخدام.",
    },
    {
      question: isEnglish ? "Which payment methods are available?" : "ما طرق الدفع المتاحة؟",
      answer: isEnglish
        ? "Payment options depend on the current subscription and billing setup. Please contact the Prime Physio team to confirm the available method before making a payment."
        : "تعتمد طرق الدفع على إعدادات الاشتراك والفوترة الحالية. يُرجى التواصل مع فريق Prime Physio لتأكيد طريقة الدفع المتاحة قبل السداد.",
    },
  ];

  return (
    <section id="faq" className="bg-white py-24" dir={isEnglish ? "ltr" : "rtl"}>
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">{isEnglish ? "Frequently asked questions" : "الأسئلة الشائعة"}</h2>
          <p className="mt-4 text-lg font-medium text-slate-600">
            {isEnglish ? "Clear answers about accounts, plans, and clinic access." : "إجابات واضحة حول الحسابات والباقات والوصول إلى بيانات المركز."}
          </p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={faq.question} data-csp-motion="reveal" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
                className="flex w-full items-center justify-between p-6 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span className="pr-4 font-bold text-slate-900">{faq.question}</span>
                <span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors " + (openIndex === index ? "bg-indigo-100 text-indigo-700" : "bg-slate-50 text-slate-400")}>
                  <ChevronDown className={"h-5 w-5 transition-transform duration-300 " + (openIndex === index ? "rotate-180" : "")} />
                </span>
              </button>
              {openIndex === index && (
                <div className="mt-2 border-t border-slate-100 px-6 pb-6 pt-4 font-medium leading-relaxed text-slate-600">{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
