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
      role: "صاحب مركز Elite Physio",
      content: "بصراحة من يوم ما اشتغلنا ببرايم فيزيو واللخبطة في المواعيد اختفت خالص، والعيادة بقت ماشية زي الساعة. أريح سيستم اتعاملت معاه!",
    },
    {
      name: "سارة محمد",
      role: "ريسبشن",
      content: "البرنامج خفيف ومخدش مني يومين عشان أتعود عليه. ورسايل الواتس آب اللي بتتبعت للمرضى ريحتني من وجع الدماغ بتاع تأكيد المواعيد كل يوم.",
    },
    {
      name: "د. عمر حسين",
      role: "دكتور علاج طبيعي",
      content: "أكتر حاجة عجباني هي الـ Body Chart، بطلع ملف العيان وأسجل كل حاجة في الجلسة في ثواني. وفر عليا وقت ومجهود كبير جداً بصراحة.",
    },
    {
      name: "م. خالد يوسف",
      role: "مدير فروع",
      content: "عشان ماسك كذا فرع، كان موضوع التقارير ده كابوس. دلوقتي بفتح الموبايل وأنا في البيت أجيب كل الحسابات وجرد الفروع في تكّة واحدة.",
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
                    &quot;{test.content}&quot;
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
