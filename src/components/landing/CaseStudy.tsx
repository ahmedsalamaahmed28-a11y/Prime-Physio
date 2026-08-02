"use client";

import { motion } from "framer-motion";
import { TrendingUp, Clock, AlertTriangle } from "lucide-react";

export default function CaseStudy() {
  return (
    <section className="py-24 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] mix-blend-overlay" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-[100px] rounded-full" />
          
          <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
            
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-black sm:text-4xl mb-6 leading-tight">
                كيف ساعد Prime Physio أحد المراكز على زيادة كفاءة العمل؟
              </h2>
              <p className="text-lg text-indigo-100 font-medium leading-relaxed mb-8">
                &quot;كانت الإدارة الورقية والجدولة اليدوية تستنزف وقتنا وتؤدي إلى أخطاء مكلفة. بعد الانتقال إلى Prime Physio، تحولت عيادتنا بالكامل لبيئة رقمية فعالة وسريعة.&quot;
              </p>
              <div className="flex items-center gap-4 border-t border-white/20 pt-6 mt-8">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-bold text-indigo-700 text-xl shrink-0">
                  س
                </div>
                <div>
                  <h4 className="font-bold text-white">د. سمير عبدالله</h4>
                  <p className="text-sm text-indigo-200">المدير الطبي لمركز Motion Clinic</p>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 grid sm:grid-cols-2 gap-4 w-full">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <Clock className="w-8 h-8 text-amber-300 mb-4" />
                <div className="text-4xl font-black mb-2 flex items-baseline gap-1">
                  70% <span className="text-lg text-amber-300">↓</span>
                </div>
                <p className="font-medium text-indigo-100">انخفاض في وقت إدارة الحجوزات</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <TrendingUp className="w-8 h-8 text-emerald-300 mb-4" />
                <div className="text-4xl font-black mb-2 flex items-baseline gap-1">
                  35% <span className="text-lg text-emerald-300">↑</span>
                </div>
                <p className="font-medium text-indigo-100">زيادة في إجمالي الإيرادات</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 sm:col-span-2"
              >
                <AlertTriangle className="w-8 h-8 text-rose-300 mb-4" />
                <div className="text-4xl font-black mb-2 flex items-baseline gap-1">
                  80% <span className="text-lg text-rose-300">↓</span>
                </div>
                <p className="font-medium text-indigo-100">تقليص في الأخطاء الإدارية والمالية</p>
              </motion.div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
