"use client";

import { motion } from "framer-motion";

export default function TrustedStrip() {
  const logos = [
    "Elite Physio",
    "Motion Clinic",
    "Recovery Hub",
    "Prime Rehab",
    "FlexCare",
    "Physio One",
    "Active Motion",
    "Rehab Plus",
  ];

  return (
    <div className="w-full bg-slate-50 border-y border-slate-200/60 py-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-wider">
          موثوق من قبل أفضل المراكز
        </p>
      </div>

      <div className="relative flex overflow-x-hidden group">
        <div className="animate-infinite-scroll flex items-center gap-16 whitespace-nowrap px-8">
          {[...logos, ...logos].map((logo, index) => (
            <div
              key={index}
              className="text-2xl font-black tracking-tight text-slate-300 hover:text-[#4F46E5] transition-colors duration-300 cursor-default select-none"
            >
              {logo}
            </div>
          ))}
        </div>
        
        {/* Gradients to fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-50 to-transparent" />
      </div>
    </div>
  );
}
