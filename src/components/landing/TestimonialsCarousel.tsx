"use client";

import React, { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Star } from "lucide-react";

export default function TestimonialsCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: "rtl" }, [
    Autoplay({ delay: 5000, stopOnInteraction: true }),
  ]);

  const testimonials = [
    {
      name: "د. أحمد كمال",
      role: "مالك مركز Elite Physio",
      content: "منذ انتقالنا إلى Prime Physio، انخفضت الأخطاء الإدارية بنسبة 80%، وأصبح تنظيم مواعيد المرضى أسهل بكثير بفضل الجدولة الذكية.",
    },
    {
      name: "سارة محمد",
      role: "مديرة استقبال",
      content: "واجهة النظام سهلة جداً والتدريب عليها لم يستغرق وقتاً. التذكيرات التلقائية عبر الواتساب خفضت نسبة تخلف المرضى عن مواعيدهم بشكل ملحوظ.",
    },
    {
      name: "د. عمر حسين",
      role: "استشاري علاج طبيعي",
      content: "الملف الطبي الإلكتروني (EMR) منظم جداً. قدرتي على الوصول لتاريخ المريض والـ Body Chart في ثوانٍ حسن من جودة الخدمة التي أقدمها.",
    },
    {
      name: "م. خالد يوسف",
      role: "مدير فروع متعددة",
      content: "أفضل ميزة بالنسبة لي هي إدارة الفروع المتعددة. أستطيع الآن رؤية تقارير مالية مجمعة أو منفصلة لكل فرع وأنا في مكاني.",
    },
  ];

  return (
    <section className="py-24 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center mb-16">
        <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">ماذا يقول عملاؤنا؟</h2>
        <p className="mt-4 text-lg text-slate-600 font-medium">
          انضم إلى قائمة طويلة من المراكز التي حققت نمواً ملحوظاً باستخدام المنصة.
        </p>
      </div>

      <div className="max-w-5xl mx-auto overflow-hidden px-4 cursor-grab active:cursor-grabbing" ref={emblaRef} dir="rtl">
        <div className="flex touch-pan-y">
          {testimonials.map((test, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0 md:flex-[0_0_50%] lg:flex-[0_0_40%] pl-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm h-full flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed mb-8 text-lg">
                    "{test.content}"
                  </p>
                </div>
                <div className="flex items-center gap-4 border-t border-slate-100 pt-6">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xl">
                    {test.name.charAt(3)}
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
