"use client";

import { ShieldCheck, Lock, Database, FileCheck } from "lucide-react";

const securityFeatures = [
  {
    title: "عزل بيانات كل مركز",
    description:
      "تُخزَّن بيانات المراكز في قاعدة Supabase مشتركة، مع ربط سجلات المركز بمعرّفه وتطبيق سياسات Row Level Security (RLS) لتقييد الوصول إلى بياناته.",
    icon: <Database className="h-6 w-6 text-indigo-600" />,
  },
  {
    title: "صلاحيات حسب الدور",
    description:
      "تُطبَّق صلاحيات الوصول وفق حساب المستخدم ودوره داخل المركز، بحيث لا يحصل كل مستخدم إلا على الصلاحيات الممنوحة له.",
    icon: <ShieldCheck className="h-6 w-6 text-indigo-600" />,
  },
  {
    title: "سجل تدقيق للتغييرات",
    description:
      "يوفر النظام سجل تدقيق لتوثيق الإجراءات المرتبطة بالمستخدم والمركز، بما يساعد على مراجعة الأنشطة وتتبعها.",
    icon: <FileCheck className="h-6 w-6 text-indigo-600" />,
  },
  {
    title: "اتصال آمن عبر HTTPS",
    description:
      "يُقدَّم الموقع عبر اتصال HTTPS مشفّر لحماية البيانات أثناء انتقالها بين المتصفح والخدمة.",
    icon: <Lock className="h-6 w-6 text-indigo-600" />,
  },
];

export default function Security() {
  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-24" dir="rtl">
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-indigo-50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-50 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div data-csp-motion="reveal" className="mx-auto mb-14 max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
            <Lock className="h-4 w-4" />
            الخصوصية والأمان
          </span>
          <h2 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            بيانات مركزك تبقى لمركزك
          </h2>
          <p className="mt-4 text-lg font-medium leading-8 text-slate-600">
            نستخدم ضوابط وصول وعزل على مستوى البيانات لحماية معلومات كل مركز، مع اتصال مشفّر وسجل لمراجعة الأنشطة.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {securityFeatures.map((feature, index) => (
            <article key={feature.title} data-csp-motion="reveal" className="group flex gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg sm:p-7">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 transition-colors group-hover:bg-indigo-100">
                {feature.icon}
              </div>
              <div>
                <h3 className="mb-2 text-lg font-extrabold text-slate-900">
                  {feature.title}
                </h3>
                <p className="font-medium leading-7 text-slate-600">
                  {feature.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
