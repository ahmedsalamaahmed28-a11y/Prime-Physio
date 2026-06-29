"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "هل أحتاج إلى خبرة تقنية سابقة لاستخدام المنصة؟",
      answer: "لا أبداً. قمنا بتصميم Prime Physio ليكون بديهياً وسهل الاستخدام للجميع، بغض النظر عن خلفيتهم التقنية. واجهة المستخدم بسيطة ومباشرة، ونوفر مقاطع فيديو تعليمية قصيرة ودعم فني دائم.",
    },
    {
      question: "هل بيانات المرضى آمنة على النظام؟",
      answer: "بالتأكيد. أمان البيانات هو أولويتنا القصوى. نستخدم معايير تشفير متقدمة (AES 256) لحماية جميع البيانات، ونقوم بنسخ احتياطي يومي على خوادم سحابية آمنة، مع تطبيق معايير الخصوصية الصارمة.",
    },
    {
      question: "هل يمكنني ربط فروع عيادتي المختلفة في حساب واحد؟",
      answer: "نعم! إذا كنت تمتلك أكثر من فرع (باقة Enterprise)، يمكنك إدارتها جميعاً من نفس الحساب. ستتمكن من استخراج تقارير منفصلة لكل فرع، وتخصيص صلاحيات للموظفين بناءً على الفرع الذي يعملون به.",
    },
    {
      question: "ما هي طرق الدفع المدعومة؟",
      answer: "نحن ندعم الدفع الإلكتروني عبر بطاقات الفيزا والماستركارد المحلية والدولية، بالإضافة إلى طرق الدفع المحلية الأخرى مثل المحافظ الإلكترونية.",
    },
    {
      question: "هل أستطيع نقل بياناتي القديمة إلى Prime Physio؟",
      answer: "نعم، يوفر فريق الدعم الفني لدينا خدمة مجانية لنقل بياناتك القديمة (مثل قوائم المرضى من ملفات Excel) إلى نظامنا بسرعة وبدون أخطاء.",
    },
  ];

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">الأسئلة الشائعة</h2>
          <p className="mt-4 text-lg text-slate-600 font-medium">
            كل ما تحتاج معرفته عن Prime Physio
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="border border-slate-200 rounded-2xl overflow-hidden bg-white"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex items-center justify-between w-full p-6 text-right focus:outline-none"
              >
                <span className="font-bold text-slate-900 pr-4">{faq.question}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${openIndex === index ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-400'}`}>
                   <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} />
                </div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 pt-0 text-slate-600 font-medium leading-relaxed border-t border-slate-100 mt-2 pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
