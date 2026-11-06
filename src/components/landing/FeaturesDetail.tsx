"use client";

import { motion } from "framer-motion";
import { CheckCircle2, User, FileText, Activity, CreditCard, DollarSign, ArrowUpRight, Calendar as CalendarIcon, Clock } from "lucide-react";

const EmrMockup = () => (
  <div className="w-full h-full bg-slate-50 flex flex-col font-sans" dir="rtl">
    <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
        <User className="w-4 h-4" />
      </div>
      <div>
        <div className="text-sm font-bold text-slate-800">أحمد محمد عبد الله</div>
        <div className="text-[10px] text-slate-500">رقم الملف: #1042</div>
      </div>
    </div>
    <div className="p-4 flex gap-4 h-full">
      <div className="w-1/3 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
          <div className="text-xs font-bold text-slate-700 mb-2">التشخيص الحالي</div>
          <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
            انزلاق غضروفي قطني (L4-L5) مع ألم عرق النسا.
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex-1 flex flex-col items-center justify-center gap-2">
          <Activity className="w-8 h-8 text-indigo-400" />
          <div className="text-xs text-slate-400">مخطط الجسم (Body Chart)</div>
        </div>
      </div>
      <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-bold text-slate-700">تاريخ الجلسات</div>
          <div className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded">جلسة جديدة +</div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 items-start p-2 border border-slate-100 rounded-lg bg-slate-50">
              <div className="w-6 h-6 rounded bg-white flex items-center justify-center shadow-sm shrink-0">
                <FileText className="w-3 h-3 text-slate-400" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-700">جلسة علاج طبيعي - ليزر وموجات فوق صوتية</div>
                <div className="text-[9px] text-slate-400 mt-0.5">منذ {i} يوم • بواسطة د. أحمد</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const FinanceMockup = () => (
  <div className="w-full h-full bg-slate-50 flex flex-col font-sans" dir="rtl">
    <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
      <div className="text-sm font-bold text-slate-800">التقارير المالية</div>
      <div className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">هذا الشهر</div>
    </div>
    <div className="p-4 flex flex-col gap-4 h-full">
      <div className="flex gap-3 shrink-0">
        <div className="flex-1 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-3 text-white shadow-sm relative overflow-hidden">
          <DollarSign className="w-16 h-16 absolute -left-4 -bottom-4 text-white/10" />
          <div className="text-[10px] text-emerald-100 mb-1">إجمالي الإيرادات</div>
          <div className="text-lg font-bold">24,500 ج.م</div>
          <div className="text-[9px] text-emerald-200 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +15% عن الشهر الماضي
          </div>
        </div>
        <div className="flex-1 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-3 text-white shadow-sm relative overflow-hidden">
          <CreditCard className="w-16 h-16 absolute -left-4 -bottom-4 text-white/10" />
          <div className="text-[10px] text-rose-100 mb-1">إجمالي المصروفات</div>
          <div className="text-lg font-bold">8,200 ج.م</div>
          <div className="text-[9px] text-rose-200 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +5% عن الشهر الماضي
          </div>
        </div>
      </div>
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="text-xs font-bold text-slate-700 p-3 border-b border-slate-100">أحدث الفواتير</div>
        <div className="p-2 space-y-1">
          {[
            { n: "فاتورة كشف - مريض محمد علي", a: "400 ج.م", s: "مدفوع" },
            { n: "باقة 6 جلسات - مريضة سارة", a: "1,800 ج.م", s: "مدفوع" },
            { n: "شراء مستلزمات طبية", a: "-1,200 ج.م", s: "مصروف" },
            { n: "جلسة ليزر - مريض كريم", a: "350 ج.م", s: "متبقي 100" },
          ].map((inv, i) => (
            <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${inv.a.includes('-') ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span className="text-[10px] font-medium text-slate-700">{inv.n}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] ${inv.a.includes('-') ? 'text-rose-600' : 'text-slate-900'} font-bold`}>{inv.a}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 w-12 text-center">{inv.s}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const CalendarMockup = () => (
  <div className="w-full h-full bg-slate-50 flex flex-col font-sans" dir="rtl">
    <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-bold text-slate-800">جدول المواعيد</span>
      </div>
      <div className="flex gap-1 text-[9px]">
        <div className="px-2 py-1 rounded bg-indigo-600 text-white font-medium shadow-sm">اليوم</div>
        <div className="px-2 py-1 rounded bg-white text-slate-600 border border-slate-200">أسبوع</div>
        <div className="px-2 py-1 rounded bg-white text-slate-600 border border-slate-200">شهر</div>
      </div>
    </div>
    <div className="p-3 h-full flex gap-3">
      <div className="w-12 flex flex-col justify-between py-4 text-[9px] text-slate-400 font-medium shrink-0 items-center">
        <span>10:00</span>
        <span>11:00</span>
        <span>12:00</span>
        <span>13:00</span>
        <span>14:00</span>
        <span>15:00</span>
      </div>
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-full h-[20%] border-b border-slate-100" />
        ))}
        {/* Appointments */}
        <div className="absolute top-[10%] left-2 right-2 h-[25%] bg-indigo-50 border border-indigo-200 rounded-lg p-2 flex flex-col shadow-sm">
          <div className="text-[10px] font-bold text-indigo-700">محمود خالد</div>
          <div className="text-[9px] text-indigo-500 flex items-center gap-1 mt-0.5"><Clock className="w-2.5 h-2.5" /> 10:30 - 11:30</div>
          <div className="text-[8px] text-indigo-400 mt-auto bg-indigo-100 px-1 rounded w-fit">غرفة 1 - د. أحمد</div>
        </div>
        <div className="absolute top-[45%] left-2 right-[52%] h-[20%] bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex flex-col shadow-sm">
          <div className="text-[10px] font-bold text-emerald-700">سعاد حسن</div>
          <div className="text-[9px] text-emerald-500 flex items-center gap-1 mt-0.5"><Clock className="w-2.5 h-2.5" /> 12:15 - 13:00</div>
        </div>
        <div className="absolute top-[40%] left-[52%] right-2 h-[30%] bg-amber-50 border border-amber-200 rounded-lg p-2 flex flex-col shadow-sm">
          <div className="text-[10px] font-bold text-amber-700">طارق عبد السلام</div>
          <div className="text-[9px] text-amber-500 flex items-center gap-1 mt-0.5"><Clock className="w-2.5 h-2.5" /> 12:00 - 13:30</div>
          <div className="text-[8px] text-amber-400 mt-auto bg-amber-100 px-1 rounded w-fit">كشف جديد</div>
        </div>
        <div className="absolute top-[75%] left-2 right-2 h-[15%] bg-rose-50 border border-rose-200 rounded-lg p-2 flex flex-col shadow-sm">
          <div className="text-[10px] font-bold text-rose-700">منى سيد</div>
          <div className="text-[9px] text-rose-500 flex items-center gap-1 mt-0.5"><Clock className="w-2.5 h-2.5" /> 14:00 - 14:45</div>
        </div>
        {/* Current time indicator */}
        <div className="absolute top-[60%] left-0 right-0 flex items-center z-10">
          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
          <div className="flex-1 h-px bg-red-500" />
        </div>
      </div>
    </div>
  </div>
);

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
      mockup: <EmrMockup />,
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
      mockup: <FinanceMockup />,
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
      mockup: <CalendarMockup />,
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

              {/* Mockup Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="w-full lg:w-1/2"
              >
                <div className="h-[380px] rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50 border-4 border-slate-800 bg-slate-800 group">
                  <div className="h-6 bg-slate-800 flex items-center px-3 gap-1.5 shrink-0 w-full">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="h-[calc(100%-24px)] w-full bg-slate-50 relative overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-transparent transition-colors z-10 pointer-events-none" />
                    {feature.mockup}
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
