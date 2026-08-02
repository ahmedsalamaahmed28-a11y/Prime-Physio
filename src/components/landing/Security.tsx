"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Database, Server, FileCheck, CheckCircle2, Activity } from "lucide-react";

export default function Security() {
  const securityFeatures = [
    { title: "تشفير تام (E2E Encryption)", description: "بيانات مرضاك مشفرة بالكامل ولا يمكن لأحد الوصول إليها", icon: <Lock className="w-6 h-6 text-emerald-500" /> },
    { title: "نسخ احتياطي آلي (Backups)", description: "نسخ يومية وتلقائية لضمان عدم ضياع أي بيانات طبية", icon: <Database className="w-6 h-6 text-blue-500" /> },
    { title: "بنية تحتية موثوقة", description: "مدعوم بخوادم AWS و Cloudflare العالمية لأقصى استقرار", icon: <Activity className="w-6 h-6 text-indigo-500" /> },
    { title: "متوافق مع HIPAA", description: "نظام متوافق مع معايير أمان وحماية المعلومات الصحية العالمية", icon: <FileCheck className="w-6 h-6 text-purple-500" /> },
  ];

  return (
    <section className="py-32 bg-white relative overflow-hidden">
      {/* Premium background effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-50 rounded-full blur-[100px] opacity-60" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50 rounded-full blur-[80px] opacity-60" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Security Shield Illustration */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative flex justify-center lg:justify-start"
          >
            <div className="relative w-full max-w-md aspect-square">
              {/* Animated rings */}
              <div className="absolute inset-0 rounded-full border-[1px] border-emerald-200/50 animate-[spin_10s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full border-[1px] border-emerald-300/40 animate-[spin_15s_linear_infinite_reverse]" />
              <div className="absolute inset-8 rounded-full border-[1px] border-emerald-400/30 animate-[spin_20s_linear_infinite]" />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[2rem] rotate-3 shadow-2xl flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-white/20 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '12px 12px' }} />
                   <motion.div
                     animate={{ y: [-5, 5, -5] }}
                     transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                   >
                     <ShieldCheck className="w-24 h-24 text-white drop-shadow-md" />
                   </motion.div>
                </div>
              </div>
              
              {/* Premium Floating badges */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
                className="absolute top-10 -right-4 bg-white/80 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Compliance</div>
                  <div className="text-sm font-bold text-slate-800">HIPAA Ready</div>
                </div>
              </motion.div>
              
              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-10 -left-4 bg-white/80 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Server className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Infrastructure</div>
                  <div className="text-sm font-bold text-slate-800">AWS & Cloudflare</div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Text & Features */}
          <div className="max-w-xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold mb-6"
            >
              <Lock className="w-4 h-4" />
              الأمان والخصوصية
            </motion.div>
            
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl mb-6 leading-tight">
              حماية بيانات مرضاك <br/>
              <span className="text-emerald-600">أولويتنا القصوى</span>
            </h2>
            <p className="text-lg text-slate-600 font-medium mb-12 leading-relaxed">
              نطبق أعلى معايير الأمان لحماية السجلات الطبية والمالية، مع بنية تحتية سحابية موثوقة لضمان استمرارية العمل على مدار الساعة.
            </p>

            <div className="space-y-6">
              {securityFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex gap-4 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-colors">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1 text-lg">{feature.title}</h4>
                    <p className="text-slate-500 font-medium">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
