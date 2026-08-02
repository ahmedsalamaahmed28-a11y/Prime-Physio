"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Calendar, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";

export default function BeforeAfter() {
  const [isAfter, setIsAfter] = useState(false);

  return (
    <section className="py-24 bg-slate-50 overflow-hidden relative">
      {/* Simple Aurora/Gradient Background for Before/After */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 30, 0, -30, 0], y: [0, -20, 0, 20, 0] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="absolute -top-40 right-0 w-[400px] h-[400px] bg-red-400/10 blur-[100px] rounded-full mix-blend-multiply" 
        />
        <motion.div 
          animate={{ x: [0, -30, 0, 30, 0], y: [0, 20, 0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 blur-[120px] rounded-full mix-blend-multiply" 
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-6 font-arabic">
            الفرق بين الماضي والمستقبل
          </h2>
          <p className="text-lg text-slate-600 font-arabic">
            تحول من الفوضى الورقية وإهدار الوقت إلى نظام إلكتروني متكامل يدير عيادتك بكفاءة وسهولة.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-10"
        >
          <div className="bg-slate-100 p-1.5 rounded-full inline-flex relative overflow-hidden shadow-inner flex-row-reverse" dir="rtl">
            <div
              className={`absolute top-1.5 bottom-1.5 rounded-full bg-white shadow-sm transition-all duration-500 ease-in-out ${
                isAfter ? "right-1.5 w-[calc(50%-6px)]" : "left-1.5 w-[calc(50%-6px)]"
              }`}
            />
            <button
              onClick={() => setIsAfter(false)}
              className={`relative z-10 px-8 py-3 rounded-full font-bold font-arabic text-sm sm:text-base transition-colors duration-300 w-40 text-center ${
                !isAfter ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              العيادة قديماً
            </button>
            <button
              onClick={() => setIsAfter(true)}
              className={`relative z-10 px-8 py-3 rounded-full font-bold font-arabic text-sm sm:text-base transition-colors duration-300 w-40 text-center ${
                isAfter ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              مع PrimePhysio
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white aspect-auto md:aspect-video flex flex-col md:flex-row" 
          dir="rtl"
        >
          
          {/* Before State */}
          <div className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center transition-opacity duration-500 ${!isAfter ? "opacity-100 relative z-10" : "opacity-0 absolute inset-0 md:relative pointer-events-none"}`}>
             <div className="space-y-8 relative">
               <div className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-100 rounded-full blur-3xl opacity-50 -z-10"></div>
               
               <div className="flex items-center gap-5 group">
                 <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <AlertCircle className="w-5 h-5 text-rose-500" />
                 </div>
                 <div>
                   <h4 className="font-bold text-slate-900 text-lg font-arabic mb-1">ملفات ورقية مبعثرة</h4>
                   <p className="text-slate-500 text-sm font-arabic leading-relaxed">صعوبة في الوصول لتاريخ المريض وتفاصيل الجلسات.</p>
                 </div>
               </div>
               
               <div className="flex items-center gap-5 group">
                 <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                   <Calendar className="w-6 h-6" />
                 </div>
                 <div>
                   <h4 className="font-bold text-slate-900 text-lg font-arabic mb-1">حجوزات مزدوجة</h4>
                   <p className="text-slate-500 text-sm font-arabic leading-relaxed">أخطاء في المواعيد ونسيان إرسال تذكيرات للمرضى.</p>
                 </div>
               </div>

               <div className="flex items-center gap-5 group">
                 <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                   <XCircle className="w-6 h-6" />
                 </div>
                 <div>
                   <h4 className="font-bold text-slate-900 text-lg font-arabic mb-1">صعوبة متابعة الحسابات</h4>
                   <p className="text-slate-500 text-sm font-arabic leading-relaxed">تشتت في حسابات الدخل اليومي وجلسات المرضى.</p>
                 </div>
               </div>
             </div>
          </div>

          {/* After State */}
          <div className={`w-full md:w-1/2 bg-gradient-to-br from-indigo-50 to-white p-8 md:p-12 flex flex-col justify-center md:border-r border-indigo-100 transition-opacity duration-500 ${isAfter ? "opacity-100 relative z-10" : "opacity-0 absolute inset-0 md:relative pointer-events-none"}`}>
            <div className="space-y-8 relative">
               <div className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-50 -z-10"></div>
               
               <div className="flex items-center gap-5 group">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                   <LayoutDashboard className="w-6 h-6" />
                 </div>
                 <div>
                   <h4 className="font-bold text-slate-900 text-lg font-arabic mb-1">ملف إلكتروني متكامل (EMR)</h4>
                   <p className="text-slate-500 text-sm font-arabic leading-relaxed">وصول فوري لبيانات المريض، خطة العلاج، والملاحظات بضغطة زر.</p>
                 </div>
               </div>
               
               <div className="flex items-center gap-5 group">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                   <CheckCircle2 className="w-6 h-6" />
                 </div>
                 <div>
                   <h4 className="font-bold text-slate-900 text-lg font-arabic mb-1">تنظيم ذكي للمواعيد</h4>
                   <p className="text-slate-500 text-sm font-arabic leading-relaxed">جدول مواعيد دقيق مع رسائل تذكير تلقائية عبر الواتساب.</p>
                 </div>
               </div>

               <div className="flex items-center gap-5 group">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                   <CheckCircle2 className="w-6 h-6" />
                 </div>
                 <div>
                   <h4 className="font-bold text-slate-900 text-lg font-arabic mb-1">تقارير وحسابات دقيقة</h4>
                   <p className="text-slate-500 text-sm font-arabic leading-relaxed">لوحة تحكم توضح أرباح العيادة، عدد الجلسات، ومدفوعات المرضى.</p>
                 </div>
               </div>
             </div>
          </div>
          
        </motion.div>
      </div>
    </section>
  );
}
