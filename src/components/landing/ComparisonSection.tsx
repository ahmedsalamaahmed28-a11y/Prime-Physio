"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

export default function ComparisonSection() {
  const excel = [
    "بطيء ويستغرق وقتاً طويلاً",
    "إدخال بيانات يدوي ومكرر",
    "معرض للأخطاء البشرية",
    "خطر فقدان البيانات وتلف الملفات",
    "لا توجد تكاملات أو تنبيهات آلية",
  ];

  const primePhysio = [
    "سريع وآلي بالكامل",
    "إدارة سحابية آمنة وموثوقة",
    "دقة متناهية وبدون أخطاء",
    "نسخ احتياطي تلقائي للبيانات",
    "متكامل مع أدوات العيادة الحديثة",
  ];

  return (
    <section id="why-us" className="py-24 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">لماذا Prime Physio أفضل من Excel؟</h2>
          <p className="mt-4 text-lg text-slate-600 font-medium">
            تخلص من قيود جداول Excel وانتقل إلى نظام ذكي مصمم خصيصاً لمراكز العلاج الطبيعي.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Excel Way */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl p-8 lg:p-10 border border-slate-200 shadow-sm"
          >
            <h3 className="text-xl font-bold text-slate-500 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <X className="w-5 h-5 text-slate-400" />
              </span>
              جداول Excel
            </h3>
            <ul className="space-y-4">
              {excel.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-600 font-medium">
                  <X className="w-5 h-5 text-red-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Prime Physio Way */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[#4F46E5]/5 to-[#7C3AED]/5 rounded-3xl p-8 lg:p-10 border border-[#4F46E5]/20 shadow-xl shadow-indigo-500/5 relative overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#4F46E5]/10 blur-3xl rounded-full" />
            
            <h3 className="text-2xl font-black text-[#4F46E5] mb-6 flex items-center gap-3 relative z-10">
              <span className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shadow-inner">
                <Check className="w-6 h-6 text-[#4F46E5]" />
              </span>
              Prime Physio
            </h3>
            <ul className="space-y-4 relative z-10">
              {primePhysio.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-900 font-bold text-lg">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
