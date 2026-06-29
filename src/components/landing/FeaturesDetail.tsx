"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default function FeaturesDetail() {
  const features = [
    {
      id: "emr",
      title: "سجل طبي إلكتروني (EMR) متطور",
      description:
        "صممنا السجل الطبي خصيصاً ليناسب عيادات العلاج الطبيعي. يمكنك إضافة تشخيصات دقيقة، صور الأشعة، قياسات المفاصل (ROM)، وتتبع تطور حالة المريض بكل سهولة. لم تعد بحاجة للورق بعد اليوم.",
      bullets: [
        "مخطط الجسم (Body Chart) لتحديد أماكن الألم بدقة.",
        "قوالب جاهزة للتقييم والتشخيص.",
        "إرفاق صور الأشعة والتحاليل في ملف المريض.",
        "متابعة تاريخ الجلسات والملاحظات السريرية.",
      ],
      image: "/images/medical_emr_dashboard.png", // Medical/Dashboard image
      reversed: false,
    },
    {
      id: "billing",
      title: "نظام مالي وإدارة فواتير متكامل",
      description:
        "تتبع كل جنيه يدخل أو يخرج من العيادة. نظام مالي ذكي يقوم بإنشاء الفواتير، تتبع المدفوعات، وإدارة المصروفات بدقة متناهية مع تقارير شاملة لأرباح العيادة.",
      bullets: [
        "إصدار فواتير إلكترونية للمرضى بنقرة واحدة.",
        "تتبع الدفعات الجزئية والمبالغ المتبقية.",
        "تسجيل المصروفات اليومية للعيادة.",
        "تقارير أرباح وخسائر شهرية وسنوية.",
      ],
      image: "/images/finance_dashboard.png", // Finance image
      reversed: true,
    },
    {
      id: "calendar",
      title: "جدولة ذكية وإدارة المواعيد",
      description:
        "نظم وقتك ووقت مرضاك باستخدام تقويم ذكي ومرن. يمكنك رؤية مواعيد جميع الأطباء في العيادة، وإضافة الجلسات، أو إعادة جدولتها بكل سهولة.",
      bullets: [
        "عرض التقويم يومياً، أسبوعياً، وشهرياً.",
        "ترميز الألوان لمعرفة حالة كل موعد.",
        "إدارة غرف الكشف وأجهزة العلاج الطبيعي.",
        "تجنب تضارب المواعيد بين الأخصائيين.",
      ],
      image: "/images/calendar_dashboard.png", // Calendar/Schedule image
      reversed: false,
    },
  ];

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl mb-6">تفاصيل تصنع الفارق</h2>
          <p className="text-xl text-slate-600 font-medium">
            تعرف عن قرب على الأدوات التي ستغير طريقة إدارتك لعيادتك بالكامل.
          </p>
        </div>

        <div className="space-y-32">
          {features.map((feature, idx) => (
            <div
              key={feature.id}
              className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${
                feature.reversed ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Text Content */}
              <motion.div
                initial={{ opacity: 0, x: feature.reversed ? 50 : -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full lg:w-1/2"
              >
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-4">
                  {feature.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle2 className="w-6 h-6 text-[#4F46E5]" />
                      </div>
                      <span className="text-slate-700 font-medium text-lg">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Image/Mockup Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="w-full lg:w-1/2"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50 border border-slate-200 bg-white aspect-[4/3] group">
                  <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-transparent transition-colors z-10" />
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
