"use client";

import {
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Sparkles,
  Check,
} from "lucide-react";

const features = [
  {
    title: "الحجوزات والجداول",
    description:
      "جدول مرن بالسحب والإفلات لكل أخصائي وغرفة، مع الحجوزات المتكررة والجلسات الجماعية وإعادة الجدولة.",
    details: ["عرض يومي وأسبوعي واضح", "سجل كامل لتغييرات المواعيد"],
    icon: CalendarDays,
    tone: "blue",
  },
  {
    title: "ملفات الحالات والتقييمات",
    description:
      "ملف متكامل لكل حالة يشمل التشخيص والتاريخ المرضي والتقييمات والبرامج العلاجية وتوثيق مهام كل جلسة.",
    details: ["متابعة تطور الحالة", "توثيق التقييمات والجلسات"],
    icon: ClipboardCheck,
    tone: "rose",
  },
  {
    title: "المدفوعات والمستحقات",
    description:
      "إدارة الإيصالات والفواتير وقوائم الأسعار وأسعار التأمين والتعاقدات، مع متابعة واضحة للمستحقات المتأخرة.",
    details: ["متابعة الدفعات والفواتير", "كشف بالمبالغ المستحقة"],
    icon: CreditCard,
    tone: "emerald",
  },
  {
    title: "المرتبات والحضور بالـ QR",
    description:
      "تسجيل حضور الفريق بمسح QR، وربط التأخيرات والأذونات والإجازات بسجلات المرتبات والحوافز وكشوف الرواتب.",
    details: ["تسجيل حضور سريع", "احتساب التأخيرات والإجازات"],
    icon: ClipboardCheck,
    tone: "amber",
  },
  {
    title: "التقارير ولوحة المتابعة",
    description:
      "لوحة متابعة مباشرة وتقارير مالية وتقارير للجلسات والأخصائيين وتطور الحالات، جاهزة للطباعة والمشاركة.",
    details: ["مؤشرات أداء واضحة", "تقارير قابلة للطباعة والمشاركة"],
    icon: BarChart3,
    tone: "violet",
  },
  {
    title: "الأدوار والصلاحيات",
    description:
      "صلاحيات مرنة للمدير والمشرف والسكرتارية والأخصائي والحالة، بحيث يرى كل مستخدم المعلومات المسموح بها فقط.",
    details: ["تحديد الصلاحيات حسب الدور", "تحكم الإدارة في الوصول"],
    icon: ShieldCheck,
    tone: "cyan",
  },
];

const toneClasses: Record<string, { icon: string; glow: string }> = {
  blue: { icon: "bg-blue-50 text-blue-600", glow: "group-hover:border-blue-200" },
  rose: { icon: "bg-rose-50 text-rose-600", glow: "group-hover:border-rose-200" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", glow: "group-hover:border-emerald-200" },
  amber: { icon: "bg-amber-50 text-amber-600", glow: "group-hover:border-amber-200" },
  violet: { icon: "bg-violet-50 text-violet-600", glow: "group-hover:border-violet-200" },
  cyan: { icon: "bg-cyan-50 text-cyan-700", glow: "group-hover:border-cyan-200" },
};

export default function FeaturesBento() {
  return (
    <section id="features" className="relative overflow-hidden bg-white py-20 sm:py-24" dir="rtl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(79,70,229,0.055),transparent_30%),radial-gradient(circle_at_90%_80%,rgba(11,76,150,0.05),transparent_28%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div data-csp-motion="reveal"
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            منظومة إدارة متكاملة
          </span>
          <h2 className="mb-5 text-3xl font-black leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            كل تفاصيل مركزك… في مكان واحد
          </h2>
          <p className="text-base font-medium leading-8 text-slate-600 sm:text-lg">
            أدوات مترابطة لتنظيم المواعيد والملفات الطبية والحسابات والفريق، مع تحكم واضح في البيانات والتقارير.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const tone = toneClasses[feature.tone];
            return (
              <article data-csp-motion="reveal"
                key={feature.title}
                className={`group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 sm:p-8 ${tone.glow}`}
              >
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${tone.icon}`}>
                  <Icon className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <h3 className="mb-3 text-xl font-extrabold text-slate-900">{feature.title}</h3>
                <p className="mb-6 flex-1 text-sm font-medium leading-8 text-slate-600 sm:text-base">
                  {feature.description}
                </p>
                <ul className="space-y-3 border-t border-slate-100 pt-5">
                  {feature.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2.5 text-sm font-semibold text-slate-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
