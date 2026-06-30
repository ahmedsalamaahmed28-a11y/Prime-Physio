"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/LanguageContext";
import { Activity, Sparkles, BrainCircuit } from "lucide-react";

export default function AIAssistantPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-2xl mx-auto px-4">
        <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
          <Activity className="w-12 h-12 text-[#4F46BA]" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 mb-4">
          {isRtl ? "مساعد الذكاء الاصطناعي (AI)" : "AI Assistant"}
        </h1>
        
        <p className="text-slate-500 text-lg mb-10 leading-relaxed">
          {isRtl 
            ? "نحن نقوم الآن بدمج وكلاء الذكاء الاصطناعي الخاصين بك من n8n مباشرة داخل هذه الشاشة! قريباً ستتمكن من إعطاء الأوامر الصوتية أو النصية للمساعد الذكي ليدير عيادتك بالكامل."
            : "We are integrating your n8n AI agents right into this screen! Soon you will be able to give voice or text commands to the smart assistant to manage your entire clinic."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3">
             <BrainCircuit className="w-8 h-8 text-blue-500" />
             <h3 className="font-semibold text-slate-800">{isRtl ? "تحليل ذكي" : "Smart Analysis"}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3">
             <Sparkles className="w-8 h-8 text-amber-500" />
             <h3 className="font-semibold text-slate-800">{isRtl ? "أتمتة المهام" : "Task Automation"}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3">
             <Activity className="w-8 h-8 text-emerald-500" />
             <h3 className="font-semibold text-slate-800">{isRtl ? "مراقبة العمليات" : "Operations Monitoring"}</h3>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
