"use client";

import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Star, TrendingUp, Clock } from "lucide-react";

export default function TestimonialsCarousel() {
  const [emblaRef] = useEmblaCarousel({ loop: true, direction: "rtl" }, [
    Autoplay({ delay: 5000, stopOnInteraction: true }),
  ]);

  const testimonials = [
    {
      name: "د. أحمد كمال",
      role: "صاحب مركز Elite Physio",
      content: "بصراحة من يوم ما اشتغلنا ببرايم فيزيو واللخبطة في المواعيد اختفت خالص، والعيادة بقت ماشية زي الساعة. أريح سيستم اتعاملت معاه!",
      metric: "وفرنا 30% من وقت الاستقبال",
      metricIcon: <Clock className="w-4 h-4 text-emerald-500" />
    },
    {
      name: "سارة محمد",
      role: "مديرة عيادة",
      content: "البرنامج خفيف ومخدش مني يومين عشان أتعود عليه. ورسايل الواتس آب اللي بتتبعت للمرضى ريحتني من وجع الدماغ بتاع تأكيد المواعيد كل يوم.",
      metric: "زادت الحجوزات 40%",
      metricIcon: <TrendingUp className="w-4 h-4 text-emerald-500" />
    },
    {
      name: "د. عمر حسين",
      role: "دكتور علاج طبيعي",
      content: "أكتر حاجة عجباني هي الـ Body Chart، بطلع ملف العيان وأسجل كل حاجة في الجلسة في ثواني. وفر عليا وقت ومجهود كبير جداً بصراحة.",
      metric: "تسجيل الجلسة في 30 ثانية",
      metricIcon: <Clock className="w-4 h-4 text-emerald-500" />
    },
    {
      name: "م. خالد يوسف",
      role: "مدير فروع",
      content: "عشان ماسك كذا فرع، كان موضوع التقارير ده كابوس. دلوقتي بفتح الموبايل وأنا في البيت أجيب كل الحسابات وجرد الفروع في تكّة واحدة.",
      metric: "تحكم كامل في 5 فروع",
      metricIcon: <TrendingUp className="w-4 h-4 text-emerald-500" />
    },
  ];

  return (
    <section className="py-24 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center mb-16">
        <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">قصص نجاح عملائنا</h2>
        <p className="mt-4 text-lg text-slate-600 font-medium">
          انضم إلى مئات المراكز التي ضاعفت كفاءتها وأرباحها باستخدام منصتنا
        </p>
      </div>

      <div className="max-w-6xl mx-auto overflow-hidden px-4 cursor-grab active:cursor-grabbing" ref={emblaRef} dir="rtl">
        <div className="flex touch-pan-y">
          {testimonials.map((test, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0 md:flex-[0_0_50%] lg:flex-[0_0_33.333%] pl-6">
              <div className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-100 hover:shadow-xl transition-all duration-300 rounded-3xl p-8 h-full flex flex-col justify-between group">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold mb-6">
                    {test.metricIcon}
                    {test.metric}
                  </div>
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed mb-8">
                    &quot;{test.content}&quot;
                  </p>
                </div>
                <div className="flex items-center gap-4 border-t border-slate-200 pt-6 group-hover:border-indigo-100 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xl shadow-md">
                    {test.name.charAt(3) === " " ? test.name.charAt(4) : test.name.charAt(3)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{test.name}</h4>
                    <p className="text-sm text-slate-500 font-medium">{test.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
