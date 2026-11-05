"use client";

import { Activity, Star, Zap, Building, Users, BarChart3, CheckCircle2, ShieldCheck, LayoutDashboard } from "lucide-react";

export default function TrustedStrip() {
  const logos = [
    { icon: Activity, name: "Elite Physio" },
    { icon: Star, name: "Motion Clinic" },
    { icon: Zap, name: "Recovery Hub" },
    { icon: Building, name: "Prime Rehab" },
    { icon: Users, name: "FlexCare" },
    { icon: BarChart3, name: "Physio One" },
    { icon: CheckCircle2, name: "Active Motion" },
    { icon: ShieldCheck, name: "Rehab Plus" },
    { icon: LayoutDashboard, name: "HealthCore" }
  ];

  return (
    <div className="w-full bg-slate-50 border-y border-slate-200/60 py-12 overflow-hidden" dir="rtl">
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-wider font-arabic">
          موثوق من قبل أفضل المراكز
        </p>
      </div>

      <div className="relative flex overflow-x-hidden group">
        <div className="animate-infinite-scroll flex items-center gap-16 whitespace-nowrap px-8">
          {[...logos, ...logos, ...logos].map((logo, index) => (
            <div
              key={index}
              className="flex items-center gap-3 text-slate-400 hover:text-indigo-600 transition-colors duration-300 cursor-default select-none grayscale hover:grayscale-0 opacity-70 hover:opacity-100"
            >
              <logo.icon className="w-8 h-8" />
              <span className="text-2xl font-black tracking-tight font-sans" dir="ltr">{logo.name}</span>
            </div>
          ))}
        </div>
        
        {/* Gradients to fade edges */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10" />
      </div>
    </div>
  );
}
