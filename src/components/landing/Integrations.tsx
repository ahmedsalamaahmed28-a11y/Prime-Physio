"use client";

import { motion } from "framer-motion";

export default function Integrations() {
  const integrations = [
    "Google Calendar",
    "Google Drive",
    "Google Meet",
    "WhatsApp",
    "Paymob",
    "Stripe",
    "Zoom",
    "Supabase",
    "OpenAI",
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden border-t border-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-100/50 via-white to-white" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
        <h2 className="text-3xl font-black text-slate-900 sm:text-4xl mb-6">
          يتكامل مع أدواتك المفضلة
        </h2>
        <p className="mt-4 text-lg text-slate-600 font-medium max-w-2xl mx-auto mb-16">
          اربط مركزك بجميع التطبيقات التي تستخدمها يومياً بضغطة زر واحدة لتجربة عمل سلسة وبدون انقطاع.
        </p>

        <div className="flex flex-wrap justify-center gap-6 lg:gap-8 max-w-4xl mx-auto">
          {integrations.map((app, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl px-6 py-4 flex items-center justify-center min-w-[140px] group hover:-translate-y-1"
            >
              <span className="font-bold text-slate-600 group-hover:text-[#4F46E5] transition-colors">{app}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
