"use client";

import { motion } from "framer-motion";
import { Building, UserPlus, Zap } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      title: "1. إنشاء حساب المركز",
      description: "سجل بيانات عيادتك في ثوانٍ معدودة وابدأ فوراً بدون أي تعقيدات.",
      icon: <Building className="w-6 h-6 text-[#4F46E5]" />,
    },
    {
      title: "2. دعوة فريق العمل",
      description: "أضف الأطباء وموظفي الاستقبال وحدد صلاحياتهم بدقة لضمان سير العمل.",
      icon: <UserPlus className="w-6 h-6 text-[#4F46E5]" />,
    },
    {
      title: "3. ابدأ الإدارة بذكاء",
      description: "استمتع بجدولة المواعيد، إدارة الملفات الطبية، ومتابعة التقارير من لوحة تحكم واحدة.",
      icon: <Zap className="w-6 h-6 text-[#4F46E5]" />,
    },
  ];

  return (
    <section id="how" className="py-24 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">كيف يعمل Prime Physio؟</h2>
          <p className="mt-4 text-lg text-slate-600 font-medium">
            3 خطوات بسيطة تفصلك عن الإدارة الاحترافية لعيادتك.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-[#4F46E5]/20 to-transparent" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.2 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
