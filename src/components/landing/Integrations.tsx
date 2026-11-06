"use client";

import { motion } from "framer-motion";
import { MessageSquare, CreditCard, Calendar, Smartphone, ExternalLink as LinkIcon, RefreshCw } from "lucide-react";

export default function Integrations() {
  const apps = [
    { name: "WhatsApp", icon: <MessageSquare className="w-8 h-8 text-emerald-500" />, delay: 0, position: "-top-10 left-1/2 -translate-x-1/2" },
    { name: "Google Calendar", icon: <Calendar className="w-8 h-8 text-blue-500" />, delay: 0.2, position: "top-1/2 -right-10 -translate-y-1/2" },
    { name: "Paymob", icon: <CreditCard className="w-8 h-8 text-indigo-500" />, delay: 0.4, position: "-bottom-10 left-1/2 -translate-x-1/2" },
    { name: "Stripe", icon: <Smartphone className="w-8 h-8 text-purple-500" />, delay: 0.6, position: "top-1/2 -left-10 -translate-y-1/2" },
  ];

  return (
    <section className="py-32 bg-slate-900 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] mix-blend-overlay" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-300 font-bold mb-6"
          >
            <LinkIcon className="w-4 h-4" />
            تكامل لا محدود
          </motion.div>
          <h2 className="text-4xl font-black text-white sm:text-5xl mb-6">
            اربط عيادتك بالعالم
          </h2>
          <p className="mt-4 text-xl text-slate-400 font-medium max-w-2xl mx-auto">
            تزامن فوري ومباشر مع أهم التطبيقات لتسهيل الحجوزات والمدفوعات والتواصل مع مرضاك.
          </p>
        </div>

        <div className="relative max-w-3xl mx-auto h-[400px] flex items-center justify-center">
          
          {/* Orbital Rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="w-[300px] h-[300px] rounded-full border border-indigo-500/30 border-dashed relative"
            >
              {apps.map((app, i) => (
                <div key={i} className={`absolute ${app.position} bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-2xl flex items-center justify-center -rotate-0`}>
                   {app.icon}
                </div>
              ))}
            </motion.div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="w-[450px] h-[450px] rounded-full border border-indigo-400/10 relative"
            />
          </div>

          {/* Center Logo/Icon */}
          <motion.div 
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            className="relative z-20 w-32 h-32 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-2xl shadow-indigo-500/50"
          >
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center flex-col gap-2">
              <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin-slow duration-[3000ms]" />
              <span className="text-white font-bold text-sm">Prime Physio</span>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
