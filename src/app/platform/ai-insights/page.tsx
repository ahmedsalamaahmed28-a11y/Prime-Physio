"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Activity, TrendingUp, BarChart3 } from "lucide-react";

export default function PlatformAiInsightsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.roleKey !== "platform_admin") {
      router.replace("/");
    }
  }, [user]);

  if (!user || user.roleKey !== "platform_admin") return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800">إحصائيات الذكاء الاصطناعي (AI)</h1>
        </div>
        <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
          <TrendingUp className="w-3.5 h-3.5" />
          Prime AI Engine
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-150 transition-transform">
            <Activity className="w-6 h-6 text-purple-200" />
          </div>
          <p className="text-xs text-slate-500 font-bold mb-1">إجمالي التقارير المولدة</p>
          <p className="text-2xl font-black text-slate-800">0</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-150 transition-transform">
            <Activity className="w-6 h-6 text-indigo-200" />
          </div>
          <p className="text-xs text-slate-500 font-bold mb-1">استهلاك Tokens (الشهر)</p>
          <p className="text-2xl font-black text-slate-800">0</p>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center opacity-50 group-hover:scale-150 transition-transform">
            <BarChart3 className="w-6 h-6 text-emerald-200" />
          </div>
          <p className="text-xs text-slate-500 font-bold mb-1">العيادات النشطة بالذكاء الاصطناعي</p>
          <p className="text-2xl font-black text-slate-800">0</p>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700 shadow-md text-white relative overflow-hidden">
          <p className="text-xs text-slate-400 font-bold mb-1">التكلفة التقديرية (API)</p>
          <p className="text-2xl font-black text-white">$0.00</p>
          <div className="mt-2 text-[10px] text-slate-400">سيتم تفعيل الفوترة قريباً</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
        <Activity className="w-16 h-16 text-slate-200 mb-4" />
        <h3 className="text-lg font-bold text-slate-700 mb-2">قريباً: لوحة تحكم الـ AI المتقدمة</h3>
        <p className="text-slate-500 max-w-md">
          جاري العمل على تطوير لوحة تحكم مفصلة تتيح لك مراقبة استهلاك كل عيادة للذكاء الاصطناعي بدقة، وتحليل نماذج التقارير الأكثر استخداماً.
        </p>
      </div>
    </div>
  );
}
