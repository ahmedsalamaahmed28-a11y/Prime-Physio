"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Database, Server, Key, Activity } from "lucide-react";

export default function Security() {
  const securityFeatures = [
    { title: "تشفير AES 256", icon: <Lock className="w-5 h-5 text-emerald-500" /> },
    { title: "نسخ احتياطي يومي", icon: <Database className="w-5 h-5 text-indigo-500" /> },
    { title: "صلاحيات دقيقة (RBAC)", icon: <Key className="w-5 h-5 text-amber-500" /> },
    { title: "بنية سحابية قوية", icon: <Server className="w-5 h-5 text-blue-500" /> },
    { title: "سجل العمليات (Audit Logs)", icon: <Activity className="w-5 h-5 text-rose-500" /> },
    { title: "حماية الخصوصية (HIPAA)", icon: <ShieldCheck className="w-5 h-5 text-purple-500" /> },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Security Shield Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex justify-center lg:justify-start"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full mix-blend-multiply" />
            <div className="relative w-72 h-80 bg-gradient-to-br from-emerald-50 to-teal-100/50 rounded-[3rem] border border-emerald-100/50 shadow-2xl flex items-center justify-center">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] mix-blend-overlay" />
               <motion.div
                 animate={{ y: [0, -15, 0] }}
                 transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
               >
                 <ShieldCheck className="w-32 h-32 text-emerald-500 drop-shadow-lg" />
               </motion.div>
            </div>
            
            {/* Floating badges */}
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
              className="absolute -right-6 top-16 bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-bold text-slate-700">99.9% Uptime</span>
            </motion.div>
            
            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1 }}
              className="absolute -left-6 bottom-16 bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2"
            >
              <Lock className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">SSL Secure</span>
            </motion.div>
          </motion.div>

          {/* Text & Features */}
          <div className="max-w-xl">
            <h2 className="text-3xl font-black text-slate-900 sm:text-4xl mb-6">
              بياناتك في أمان تام
            </h2>
            <p className="text-lg text-slate-600 font-medium mb-12">
              نطبق أعلى معايير الأمان لحماية بيانات مرضاك وسجلاتك المالية، لتتمكن من إدارة عيادتك براحة بال.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {securityFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                    {feature.icon}
                  </div>
                  <span className="font-bold text-slate-700 text-sm">{feature.title}</span>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
