"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Play, Calendar, Users, BarChart3, Activity, X } from "lucide-react";

export default function Hero() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <div className="relative overflow-hidden bg-white pt-24 pb-32">
      {/* Animated Aurora Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 50, 0, -50, 0],
            y: [0, -30, 0, 30, 0],
            scale: [1, 1.1, 1, 0.9, 1]
          }}
          transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-purple-400/20 blur-[120px] rounded-full mix-blend-multiply" 
        />
        <motion.div 
          animate={{ 
            x: [0, -40, 0, 40, 0],
            y: [0, 40, 0, -40, 0],
            scale: [1, 0.9, 1, 1.1, 1]
          }}
          transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
          className="absolute top-20 -left-20 w-[600px] h-[600px] bg-indigo-400/20 blur-[120px] rounded-full mix-blend-multiply" 
        />
        <motion.div 
          animate={{ 
            x: [0, 30, -30, 0],
            y: [0, 20, -20, 0]
          }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-400/10 blur-[120px] rounded-full mix-blend-multiply" 
        />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Text & CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold mb-6">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
              أكثر من 100 مركز علاج طبيعي يعتمد على Prime Physio
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15] mb-6">
              نظام إدارة متكامل لمراكز <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F46E5] to-[#7C3AED]">العلاج الطبيعي</span>
            </h1>
            
            <p className="text-lg sm:text-xl leading-relaxed text-slate-600 mb-8 font-medium">
              إدارة المرضى، الجلسات، الأطباء، الملفات الطبية، الفواتير، والتقارير المالية من منصة واحدة مصممة خصيصًا لمراكز العلاج الطبيعي.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="/signup"
                className="inline-flex justify-center items-center gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-8 py-4 text-base font-bold text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all"
              >
                ابدأ مجانًا
              </Link>
              <button
                onClick={() => setIsVideoOpen(true)}
                className="inline-flex justify-center items-center gap-2 rounded-full bg-white border border-slate-200 px-8 py-4 text-base font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Play className="w-5 h-5 fill-slate-700 text-slate-700" />
                مشاهدة العرض التوضيحي
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-slate-500">
              <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> بدون بطاقة ائتمانية</div>
              <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> إعداد خلال دقائق</div>
              <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-500" /> دعم فني عربي</div>
            </div>
          </motion.div>

          {/* Right Column: Dashboard Mockup */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:h-[600px] flex items-center justify-center lg:justify-end mt-10 lg:mt-0"
          >
            {/* The Floating UI Representation */}
            <div className="relative w-full max-w-lg aspect-[4/3] bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden perspective-1000 transform lg:-rotate-y-12 lg:rotate-x-12 hover:rotate-0 transition-transform duration-700 ease-out">
              
              {/* Mockup Header */}
              <div className="h-10 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="mx-auto w-1/2 h-4 bg-white rounded-md border border-slate-200" />
              </div>
              
              {/* Mockup Content (Abstract Dashboard) */}
              <div className="p-6 grid grid-cols-3 gap-4 h-full bg-slate-50/50">
                
                {/* Sidebar */}
                <div className="col-span-1 space-y-3">
                  <div className="h-8 w-24 bg-indigo-100 rounded-lg flex items-center px-2 gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <div className="h-2 w-12 bg-indigo-200 rounded-full" />
                  </div>
                  <div className="space-y-2 mt-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-6 w-full bg-slate-200/60 rounded-md" />
                    ))}
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="col-span-2 space-y-4">
                  {/* Top Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-20 bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex flex-col justify-between">
                      <Users className="w-5 h-5 text-indigo-500" />
                      <div className="h-4 w-16 bg-slate-200 rounded-full" />
                    </div>
                    <div className="h-20 bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex flex-col justify-between">
                      <BarChart3 className="w-5 h-5 text-emerald-500" />
                      <div className="h-4 w-20 bg-slate-200 rounded-full" />
                    </div>
                  </div>

                  {/* Calendar / List */}
                  <div className="h-32 bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                     <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div className="h-3 w-24 bg-slate-200 rounded-full" />
                     </div>
                     {[1, 2].map((i) => (
                       <div key={i} className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-indigo-100" />
                         <div className="space-y-1.5 flex-1">
                           <div className="h-2 w-full bg-slate-200 rounded-full" />
                           <div className="h-2 w-2/3 bg-slate-100 rounded-full" />
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -right-8 top-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800">حجز جديد</div>
                <div className="text-xs text-slate-500">تم التأكيد بنجاح</div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [10, -10, 10] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              className="absolute -left-4 bottom-20 bg-white p-3 rounded-2xl shadow-xl border border-slate-100"
            >
               <div className="w-32 h-24 bg-indigo-50/50 rounded-lg border border-indigo-100/50 flex items-end p-2 gap-1">
                  {[40, 70, 45, 90, 65].map((h, i) => (
                    <div key={i} className="w-full bg-indigo-500 rounded-t-sm" style={{ height: `${h}%` }} />
                  ))}
               </div>
            </motion.div>

          </motion.div>
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <div className="absolute inset-0" onClick={() => setIsVideoOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
            >
              <button
                onClick={() => setIsVideoOpen(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              {/* Placeholder Video UI - In a real app, use an iframe for YouTube/Vimeo or a <video> tag */}
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-900 relative">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                 <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm animate-pulse">
                    <Play className="w-10 h-10 text-white fill-white ml-2" />
                 </div>
                 <h3 className="text-2xl font-bold text-white mb-2">فيديو Demo لمدة 60 ثانية</h3>
                 <p className="text-slate-300">سيتم تشغيل الفيديو هنا...</p>
                 
                 {/* Fake Progress Bar */}
                 <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-800">
                    <div className="h-full bg-indigo-500 w-1/3 rounded-r-full" />
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
