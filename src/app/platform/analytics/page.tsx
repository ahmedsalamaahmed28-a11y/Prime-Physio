"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { BarChart3, TrendingUp, Users, Activity } from "lucide-react";

export default function PlatformAnalyticsPage() {
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
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">التحليلات المتقدمة</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-semibold text-sm">معدل الاحتفاظ بالعيادات</h3>
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">92%</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 font-semibold">
            <span>+3.2%</span>
            <span className="text-slate-400 font-normal">مقارنة بالشهر الماضي</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-semibold text-sm">متوسط تفاعل المستخدمين</h3>
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">4.8 س / يوم</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 font-semibold">
            <span>+1.1 س</span>
            <span className="text-slate-400 font-normal">مقارنة بالشهر الماضي</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-semibold text-sm">معدل تحويل الزوار (Conversion)</h3>
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">18.5%</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 font-semibold">
            <span>+2.4%</span>
            <span className="text-slate-400 font-normal">مقارنة بالشهر الماضي</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[300px] flex flex-col items-center justify-center text-slate-400">
          <BarChart3 className="w-16 h-16 text-slate-200 mb-4" />
          <p>رسم بياني للنمو السنوي (قيد التطوير)</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[300px] flex flex-col items-center justify-center text-slate-400">
          <Users className="w-16 h-16 text-slate-200 mb-4" />
          <p>رسم بياني لتوزيع باقات الاشتراك (قيد التطوير)</p>
        </div>
      </div>
    </div>
  );
}
