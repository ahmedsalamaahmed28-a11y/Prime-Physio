"use client";

import { motion } from "framer-motion";
import { TrendingUp, Clock, Calendar, Users } from "lucide-react";

export default function CaseStudy() {
  return (
    <section className="py-24 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] mix-blend-overlay" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-[100px] rounded-full" />
          
          <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
            
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-sm font-bold mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                قصة نجاح عميل
              </div>
              <h2 className="text-3xl font-black sm:text-4xl mb-6 leading-tight">
                كيف ضاعف مركز Elite Physio أرباحه في 3 أشهر؟
              </h2>
              <p className="text-lg text-indigo-100 font-medium leading-relaxed mb-8">
                &quot;قبل برايم فيزيو، كانت الإدارة الورقية والجدولة اليدوية بتضيع وقتنا كله. دلوقتي النظام الديجيتال وفر علينا مجهود ضخم، وقدرنا نركز أكتر على جودة الجلسات واستيعاب عدد أكبر من المرضى يومياً.&quot;
              </p>
              <div className="flex items-center gap-4 border-t border-white/20 pt-6 mt-8">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-bold text-indigo-700 text-xl shrink-0">
                  أ
                </div>
                <div>
                  <h4 className="font-bold text-white">د. أحمد كمال</h4>
                  <p className="text-sm text-indigo-200">المدير الطبي لمركز Elite Physio</p>
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
                  30% <span className="text-lg text-amber-300">وفر</span>
                </div>
                <p className="font-medium text-indigo-100">وفرنا 30% من وقت الاستقبال</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <Calendar className="w-8 h-8 text-emerald-300 mb-4" />
                <div className="text-4xl font-black mb-2 flex items-baseline gap-1">
                  40% <span className="text-lg text-emerald-300">↑</span>
                </div>
                <p className="font-medium text-indigo-100">زادت الحجوزات 40%</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <Users className="w-8 h-8 text-blue-300 mb-4" />
                <div className="text-4xl font-black mb-2 flex items-baseline gap-1">
                  2x <span className="text-lg text-blue-300">↑</span>
                </div>
                <p className="font-medium text-indigo-100">معدل احتفاظ بالمرضى</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
              >
                <TrendingUp className="w-8 h-8 text-rose-300 mb-4" />
                <div className="text-4xl font-black mb-2 flex items-baseline gap-1">
                  60% <span className="text-lg text-rose-300">↑</span>
                </div>
                <p className="font-medium text-indigo-100">نمو في الإيرادات الشهرية</p>
              </motion.div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
