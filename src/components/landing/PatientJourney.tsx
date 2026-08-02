"use client";

import { motion } from "framer-motion";
import { Calendar, MessageSquare, UserCheck, Stethoscope, CreditCard, Activity } from "lucide-react";

const journeySteps = [
  {
    id: 1,
    title: "حجز الموعد",
    desc: "يقوم المريض بحجز موعد عبر الإنترنت أو من خلال الاستقبال ويتم تسجيله في جدول المواعيد الذكي.",
    icon: Calendar,
    color: "from-blue-500 to-cyan-500",
    bgLight: "bg-blue-50",
    textLight: "text-blue-600",
  },
  {
    id: 2,
    title: "تذكير تلقائي",
    desc: "يتلقى المريض رسالة تذكير تلقائية عبر الواتساب قبل موعد الجلسة لتقليل نسبة التخلف عن المواعيد.",
    icon: MessageSquare,
    color: "from-green-500 to-emerald-500",
    bgLight: "bg-green-50",
    textLight: "text-green-600",
  },
  {
    id: 3,
    title: "تسجيل الدخول",
    desc: "عند وصول المريض، يقوم موظف الاستقبال بتسجيل حضوره بضغطة زر وتحديث حالته للطبيب.",
    icon: UserCheck,
    color: "from-amber-500 to-orange-500",
    bgLight: "bg-amber-50",
    textLight: "text-amber-600",
  },
  {
    id: 4,
    title: "الجلسة و EMR",
    desc: "يقوم الطبيب بمعاينة الملف الطبي (EMR)، تسجيل الملاحظات، كتابة الوصفة، وتحديث خطة العلاج.",
    icon: Stethoscope,
    color: "from-indigo-500 to-purple-500",
    bgLight: "bg-indigo-50",
    textLight: "text-indigo-600",
  },
  {
    id: 5,
    title: "الدفع والفوترة",
    desc: "دفع سلس عبر طرق متعددة (نقدي، بطاقة) مع إصدار فاتورة إلكترونية وتسجيلها في تقارير العيادة.",
    icon: CreditCard,
    color: "from-rose-500 to-pink-500",
    bgLight: "bg-rose-50",
    textLight: "text-rose-600",
  },
  {
    id: 6,
    title: "المتابعة والتقييم",
    desc: "متابعة تقدم حالة المريض عبر رسائل تلقائية وقياس مدى رضاه عن الخدمة المقدمة.",
    icon: Activity,
    color: "from-teal-500 to-emerald-500",
    bgLight: "bg-teal-50",
    textLight: "text-teal-600",
  }
];

export default function PatientJourney() {
  return (
    <section className="py-24 bg-slate-50 overflow-hidden relative" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-6 font-arabic">
            رحلة مريض <span className="text-indigo-600">استثنائية</span>
          </h2>
          <p className="text-lg text-slate-600 font-arabic">
            صممنا PrimePhysio ليتتبع كل خطوة يخطوها المريض في عيادتك، مما يضمن تجربة سلسة واحترافية.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Vertical Line */}
          <div className="absolute top-0 bottom-0 right-1/2 translate-x-1/2 md:translate-x-0 md:right-8 w-1 bg-gradient-to-b from-indigo-100 via-purple-100 to-rose-100 rounded-full" />

          <div className="space-y-12 relative z-10">
            {journeySteps.map((step, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                key={step.id} 
                className={`relative flex items-center justify-between md:justify-start w-full group ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Spacer for alternating layout */}
                <div className="hidden md:block w-5/12" />

                {/* Center Icon Node */}
                <div className="absolute right-1/2 translate-x-1/2 md:translate-x-0 md:right-8 md:relative md:w-16 flex justify-center z-20">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center bg-slate-50 shadow-xl shadow-slate-200/50 border-4 border-slate-50 transition-transform duration-300 group-hover:scale-110 group-hover:border-indigo-50">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${step.color} text-white`}>
                      <step.icon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                  </div>
                </div>

                {/* Content Card */}
                <div className={`w-full md:w-5/12 pt-16 md:pt-0 pb-4 ${index % 2 === 0 ? "md:pr-12" : "md:pl-12"}`}>
                  <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg shadow-slate-200/40 border border-slate-100 hover:shadow-xl transition-shadow duration-300 relative group-hover:-translate-y-1 group-hover:border-indigo-100 text-center md:text-right">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${step.bgLight} ${step.textLight} mb-4`}>
                      <span className="font-bold text-lg font-sans">{step.id}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 font-arabic">{step.title}</h3>
                    <p className="text-slate-500 font-arabic leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
