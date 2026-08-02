"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Headset, MessagesSquare, Clock, HelpCircle } from "lucide-react";

export default function PlatformSupportPage() {
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
          <Headset className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800">تذاكر الدعم الفني</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            النظام يعمل بكفاءة
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">تذاكر مفتوحة</p>
            <p className="text-2xl font-black text-slate-800">0</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <MessagesSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">متوسط سرعة الرد</p>
            <p className="text-2xl font-black text-slate-800">&lt; 5 د</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">تذاكر تم حلها (الشهر)</p>
            <p className="text-2xl font-black text-slate-800">0</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px] flex flex-col items-center justify-center text-center p-6">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <MessagesSquare className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-2">صندوق الوارد فارغ</h3>
        <p className="text-slate-500 max-w-sm mb-6">
          لا توجد أي تذاكر دعم فني مفتوحة حالياً. سيتم عرض رسائل واستفسارات العيادات هنا فور تفعيل نظام التذاكر المدمج.
        </p>
        <button className="bg-slate-100 text-slate-500 font-bold px-6 py-2.5 rounded-xl cursor-not-allowed opacity-80" disabled>
          إنشاء تذكرة جديدة (قريباً)
        </button>
      </div>
    </div>
  );
}
