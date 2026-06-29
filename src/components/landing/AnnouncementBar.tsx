"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AnnouncementBar() {
  return (
    <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#4F46E5] px-6 py-2.5 sm:px-3.5 sm:before:flex-1 border-b border-white/10">
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(110deg,transparent,20%,rgba(255,255,255,0.2),40%,transparent)] bg-[length:200%_100%] animate-shimmer pointer-events-none" />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 relative z-10 w-full justify-center">
        <p className="text-sm/6 font-medium text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300" />
          ابدأ الآن مجانًا لمدة 14 يومًا بدون بطاقة ائتمانية
        </p>
        <Link
          href="/setup/center"
          className="flex-none rounded-full bg-white px-4 py-1 text-sm font-bold text-[#4F46E5] shadow-sm hover:bg-slate-100 transition-all hover:scale-105 flex items-center gap-1"
        >
          ابدأ الآن
        </Link>
      </div>
    </div>
  );
}
