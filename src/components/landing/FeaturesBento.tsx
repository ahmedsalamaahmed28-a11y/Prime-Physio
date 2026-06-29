"use client";

import { motion } from "framer-motion";
import { Calendar, ClipboardList, BarChart3, Users, Bell, Building, Sparkles } from "lucide-react";

export default function FeaturesBento() {
  const features = [
    {
      title: "جدولة ذكية (Smart Calendar)",
      description: "إدارة جلسات المرضى وأوقات فراغ الأطباء بكل سهولة مع دعم الحجوزات المتكررة.",
      icon: <Calendar className="w-6 h-6 text-indigo-500" />,
      colSpan: "md:col-span-2 lg:col-span-2",
      bg: "bg-white",
    },
    {
      title: "الملف الطبي (EMR)",
      description: "سجل طبي شامل يشمل Body Chart والمرفقات والبروتوكولات العلاجية.",
      icon: <ClipboardList className="w-6 h-6 text-rose-500" />,
      colSpan: "md:col-span-1 lg:col-span-1",
      bg: "bg-white",
    },
    {
      title: "تحليلات مالية",
      description: "تقارير دقيقة للإيرادات، المصروفات، والفواتير بضغطة زر.",
      icon: <BarChart3 className="w-6 h-6 text-emerald-500" />,
      colSpan: "md:col-span-1 lg:col-span-1",
      bg: "bg-white",
    },
    {
      title: "المساعد الذكي (AI)",
      description: "توليد خطط علاجية، تلخيص تاريخ المريض، واقتراح تمارين رياضية باستخدام الذكاء الاصطناعي.",
      icon: <Sparkles className="w-6 h-6 text-amber-500" />,
      colSpan: "md:col-span-2 lg:col-span-2",
      bg: "bg-gradient-to-br from-indigo-900 to-purple-900 text-white",
      darkText: false,
    },
    {
      title: "صلاحيات الموظفين",
      description: "تخصيص الصلاحيات للمدير، الطبيب، وموظف الاستقبال لضمان خصوصية البيانات.",
      icon: <Users className="w-6 h-6 text-blue-500" />,
      colSpan: "md:col-span-1 lg:col-span-1",
      bg: "bg-white",
    },
    {
      title: "إدارة فروع متعددة",
      description: "أضف عدداً لا محدوداً من العيادات وأدرها جميعاً من حساب واحد مركزي.",
      icon: <Building className="w-6 h-6 text-orange-500" />,
      colSpan: "md:col-span-1 lg:col-span-1",
      bg: "bg-white",
    },
    {
      title: "تذكيرات آلية",
      description: "إرسال رسائل تذكير للمرضى عبر واتساب والبريد الإلكتروني لتقليل نسبة التخلف عن المواعيد.",
      icon: <Bell className="w-6 h-6 text-pink-500" />,
      colSpan: "md:col-span-1 lg:col-span-1",
      bg: "bg-white",
    },
  ];

  return (
    <section id="features" className="py-24 bg-white relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold mb-6">
            <Sparkles className="w-4 h-4" />
            المميزات الرئيسية
          </div>
          <h2 className="text-3xl font-black text-slate-900 sm:text-5xl mb-6">كل ما تحتاجه وأكثر لإدارة عيادتك</h2>
          <p className="mt-4 text-xl text-slate-600 font-medium">
            مجموعة متكاملة من الأدوات والمميزات المصممة خصيصاً لتلبية احتياجات أطباء ومراكز العلاج الطبيعي.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`${feature.colSpan} ${feature.bg} rounded-3xl p-8 border ${feature.darkText === false ? 'border-white/10' : 'border-slate-200'} shadow-sm hover:shadow-xl transition-shadow duration-300 group hover:-translate-y-1 transform`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${feature.darkText === false ? 'bg-white/10' : 'bg-slate-50'}`}>
                {feature.icon}
              </div>
              <h3 className={`text-xl font-bold mb-3 ${feature.darkText === false ? 'text-white' : 'text-slate-900'}`}>
                {feature.title}
              </h3>
              <p className={`font-medium leading-relaxed ${feature.darkText === false ? 'text-slate-300' : 'text-slate-500'}`}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
