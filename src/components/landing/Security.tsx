"use client";

import { ShieldCheck, Lock, Database, FileCheck } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function Security() {
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const features = [
    {
      title: isEnglish ? "Clinic-scoped data access" : "وصول مقيّد ببيانات المركز",
      description: isEnglish
        ? "Clinic records are associated with a clinic identifier, with database row-level policies used to restrict access."
        : "ترتبط سجلات المركز بمعرّفه، وتُستخدم سياسات Row Level Security على مستوى الصفوف لتقييد الوصول إلى البيانات.",
      icon: <Database className="h-6 w-6 text-indigo-600" />,
    },
    {
      title: isEnglish ? "Role-based permissions" : "صلاحيات حسب دور المستخدم",
      description: isEnglish
        ? "Access is governed by the user's account and assigned role, rather than treating every team member as an administrator."
        : "يُحدد الوصول وفق حساب المستخدم والدور الممنوح له، بدلًا من منح جميع أعضاء الفريق صلاحيات المدير.",
      icon: <ShieldCheck className="h-6 w-6 text-indigo-600" />,
    },
    {
      title: isEnglish ? "Protected account activation" : "تفعيل آمن للحساب",
      description: isEnglish
        ? "Owner registration requires email verification before the account can proceed to clinic creation."
        : "يتطلب تسجيل المالك تفعيل البريد الإلكتروني قبل الانتقال إلى إنشاء المركز.",
      icon: <FileCheck className="h-6 w-6 text-indigo-600" />,
    },
    {
      title: isEnglish ? "HTTPS connection" : "اتصال عبر HTTPS",
      description: isEnglish
        ? "The production website is served over HTTPS to protect information while it travels between the browser and the service."
        : "يعمل الموقع عبر HTTPS لحماية المعلومات أثناء انتقالها بين المتصفح والخدمة.",
      icon: <Lock className="h-6 w-6 text-indigo-600" />,
    },
  ];

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-24" dir={isEnglish ? "ltr" : "rtl"}>
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-indigo-50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-50 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div data-csp-motion="reveal" className="mx-auto mb-14 max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
            <Lock className="h-4 w-4" />{isEnglish ? "Privacy & security" : "الخصوصية والأمان"}
          </span>
          <h2 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            {isEnglish ? "Your clinic data deserves careful protection" : "بيانات مركزك تستحق الحماية"}
          </h2>
          <p className="mt-4 text-lg font-medium leading-8 text-slate-600">
            {isEnglish
              ? "Prime Physio combines clinic-scoped access controls, role permissions, email verification, and encrypted connections."
              : "يجمع Prime Physio بين ضوابط الوصول المرتبطة بالمركز، وصلاحيات الأدوار، والتحقق من البريد، والاتصال المشفّر."}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((feature) => (
            <article key={feature.title} data-csp-motion="reveal" className="group flex gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg sm:p-7">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 transition-colors group-hover:bg-indigo-100">{feature.icon}</div>
              <div>
                <h3 className="mb-2 text-lg font-extrabold text-slate-900">{feature.title}</h3>
                <p className="font-medium leading-7 text-slate-600">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
