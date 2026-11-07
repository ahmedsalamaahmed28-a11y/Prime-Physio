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
import { useLanguage } from "@/lib/LanguageContext";

const toneClasses: Record<string, { icon: string; glow: string }> = {
  blue: { icon: "bg-blue-50 text-blue-600", glow: "group-hover:border-blue-200" },
  rose: { icon: "bg-rose-50 text-rose-600", glow: "group-hover:border-rose-200" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", glow: "group-hover:border-emerald-200" },
  amber: { icon: "bg-amber-50 text-amber-600", glow: "group-hover:border-amber-200" },
  violet: { icon: "bg-violet-50 text-violet-600", glow: "group-hover:border-violet-200" },
  cyan: { icon: "bg-cyan-50 text-cyan-700", glow: "group-hover:border-cyan-200" },
};

const features = [
  {
    title: "الحجوزات والجداول",
    titleEn: "Appointments & Scheduling",
    description: "جدول مرن بالسحب والإفلات لكل أخصائي وغرفة، مع الحجوزات المتكررة والجلسات الجماعية وإعادة الجدولة.",
    descriptionEn: "A flexible drag-and-drop schedule for every therapist and room, with recurring bookings, group sessions, and easy rescheduling.",
    details: ["عرض يومي وأسبوعي واضح", "سجل كامل لتغييرات المواعيد"],
    detailsEn: ["Clear daily and weekly views", "Complete appointment change history"],
    icon: CalendarDays, tone: "blue",
  },
  {
    title: "ملفات الحالات والتقييمات",
    titleEn: "Patient Records & Assessments",
    description: "ملف متكامل لكل حالة يشمل التشخيص والتاريخ المرضي والتقييمات والبرامج العلاجية وتوثيق مهام كل جلسة.",
    descriptionEn: "A complete patient record covering diagnoses, medical history, assessments, treatment programs, and session documentation.",
    details: ["متابعة تطور الحالة", "توثيق التقييمات والجلسات"],
    detailsEn: ["Track patient progress", "Document assessments and sessions"],
    icon: ClipboardCheck, tone: "rose",
  },
  {
    title: "المدفوعات والمستحقات",
    titleEn: "Payments & Outstanding Balances",
    description: "إدارة الإيصالات والفواتير وقوائم الأسعار وأسعار التأمين والتعاقدات، مع متابعة واضحة للمستحقات المتأخرة.",
    descriptionEn: "Manage receipts, invoices, price lists, insurance rates, and contracts while keeping track of outstanding balances.",
    details: ["متابعة الدفعات والفواتير", "كشف بالمبالغ المستحقة"],
    detailsEn: ["Track payments and invoices", "View outstanding balances"],
    icon: CreditCard, tone: "emerald",
  },
  {
    title: "المرتبات والحضور بالـ QR",
    titleEn: "Payroll & QR Attendance",
    description: "تسجيل حضور الفريق بمسح QR، وربط التأخيرات والأذونات والإجازات بسجلات المرتبات والحوافز وكشوف الرواتب.",
    descriptionEn: "Record staff attendance with QR scans and connect lateness, permissions, and leave to payroll, incentives, and payslips.",
    details: ["تسجيل حضور سريع", "احتساب التأخيرات والإجازات"],
    detailsEn: ["Fast attendance check-in", "Track lateness and leave"],
    icon: ClipboardCheck, tone: "amber",
  },
  {
    title: "التقارير ولوحة المتابعة",
    titleEn: "Reports & Dashboard",
    description: "لوحة متابعة مباشرة وتقارير مالية وتقارير للجلسات والأخصائيين وتطور الحالات، جاهزة للطباعة والمشاركة.",
    descriptionEn: "A live dashboard with financial, session, therapist, and patient progress reports, ready to print and share.",
    details: ["مؤشرات أداء واضحة", "تقارير قابلة للطباعة والمشاركة"],
    detailsEn: ["Clear performance indicators", "Reports ready to print and share"],
    icon: BarChart3, tone: "violet",
  },
  {
    title: "الأدوار والصلاحيات",
    titleEn: "Roles & Permissions",
    description: "صلاحيات مرنة للمدير والمشرف والسكرتارية والأخصائي والحالة، بحيث يرى كل مستخدم المعلومات المسموح بها فقط.",
    descriptionEn: "Flexible permissions for owners, supervisors, receptionists, therapists, and patients, so each user sees only the information they are authorized to access.",
    details: ["تحديد الصلاحيات حسب الدور", "تحكم الإدارة في الوصول"],
    detailsEn: ["Role-based permissions", "Administrative access control"],
    icon: ShieldCheck, tone: "cyan",
  },
];

export default function FeaturesBento() {
  const { language } = useLanguage();
  const isEnglish = language === "en";

  return (
    <section id="features" className="relative overflow-hidden bg-white py-20 sm:py-24" dir={isEnglish ? "ltr" : "rtl"}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(79,70,229,0.055),transparent_30%),radial-gradient(circle_at_90%_80%,rgba(11,76,150,0.05),transparent_28%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div data-csp-motion="reveal" className="mx-auto mb-14 max-w-3xl text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {isEnglish ? "An Integrated Management System" : "منظومة إدارة متكاملة"}
          </span>
          <h2 className="mb-5 text-3xl font-black leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            {isEnglish ? "Everything Your Clinic Needs, All in One Place" : "كل تفاصيل مركزك… في مكان واحد"}
          </h2>
          <p className="text-base font-medium leading-8 text-slate-600 sm:text-lg">
            {isEnglish
              ? "Connected tools for appointments, medical records, finances, and staff—with clear control over your data and reports."
              : "أدوات مترابطة لتنظيم المواعيد والملفات الطبية والحسابات والفريق، مع تحكم واضح في البيانات والتقارير."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            const tone = toneClasses[feature.tone];
            return (
              <article data-csp-motion="reveal" key={feature.title}
                className={`group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 sm:p-8 ${tone.glow}`}>
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${tone.icon}`}>
                  <Icon className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <h3 className="mb-3 text-xl font-extrabold text-slate-900">{isEnglish ? feature.titleEn : feature.title}</h3>
                <p className="mb-6 flex-1 text-sm font-medium leading-8 text-slate-600 sm:text-base">
                  {isEnglish ? feature.descriptionEn : feature.description}
                </p>
                <ul className="space-y-3 border-t border-slate-100 pt-5">
                  {(isEnglish ? feature.detailsEn : feature.details).map((detail) => (
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
