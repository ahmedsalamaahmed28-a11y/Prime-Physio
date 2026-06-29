"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/LanguageContext";
import { MessageSquare, Clock, Phone, VideoIcon } from "lucide-react";

export default function ChatPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-2xl mx-auto px-4">
        <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
          <MessageSquare className="w-12 h-12 text-[#4F46BA]" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 mb-4">
          {isRtl ? "مركز الرسائل والمحادثات" : "Messages & Chat Center"}
        </h1>
        
        <p className="text-slate-500 text-lg mb-10 leading-relaxed">
          {isRtl 
            ? "هذه الميزة قيد التطوير حالياً. قريباً ستتمكن من التواصل مع مرضاك وفريق العمل بسهولة، إرسال التنبيهات، وعمل استشارات مرئية وصوتية من مكان واحد."
            : "This feature is currently under development. Soon you will be able to communicate with your patients and team, send alerts, and conduct video/audio consultations all in one place."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3">
             <MessageSquare className="w-8 h-8 text-blue-500" />
             <h3 className="font-semibold text-slate-800">{isRtl ? "محادثات فورية" : "Instant Chat"}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3">
             <VideoIcon className="w-8 h-8 text-rose-500" />
             <h3 className="font-semibold text-slate-800">{isRtl ? "استشارات مرئية" : "Video Consultations"}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3">
             <Phone className="w-8 h-8 text-emerald-500" />
             <h3 className="font-semibold text-slate-800">{isRtl ? "مكالمات صوتية" : "Voice Calls"}</h3>
          </div>
        </div>
        
        <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-full font-medium text-sm">
          <Clock className="w-4 h-4" />
          <span>{isRtl ? "قريباً في التحديث القادم" : "Coming in the next update"}</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
