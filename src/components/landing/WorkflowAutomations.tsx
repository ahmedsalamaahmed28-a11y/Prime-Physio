"use client";

import { ArrowLeft, UserPlus, Bell, FileText, CreditCard, Sparkles } from "lucide-react";

export default function WorkflowAutomations() {
  const steps = [
    { icon: <UserPlus className="w-5 h-5 text-indigo-500" />, label: "حجز مريض جديد", bg: "bg-indigo-50", border: "border-indigo-100" },
    { icon: <Bell className="w-5 h-5 text-amber-500" />, label: "تذكير تلقائي عبر واتساب", bg: "bg-amber-50", border: "border-amber-100" },
    { icon: <FileText className="w-5 h-5 text-emerald-500" />, label: "إصدار فاتورة إلكترونية", bg: "bg-emerald-50", border: "border-emerald-100" },
    { icon: <CreditCard className="w-5 h-5 text-blue-500" />, label: "دفع آمن", bg: "bg-blue-50", border: "border-blue-100" },
    { icon: <Sparkles className="w-5 h-5 text-purple-500" />, label: "متابعة ذكية (AI)", bg: "bg-purple-50", border: "border-purple-100" },
  ];

  return (
    <section className="py-24 bg-[#0F172A] relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05]" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
        <h2 className="text-3xl font-black sm:text-4xl mb-6">
          اجعل مركزك يعمل تلقائيًا
        </h2>
        <p className="mt-4 text-lg text-slate-300 font-medium max-w-2xl mx-auto mb-20">
          دع النظام يقوم بالمهام الروتينية لتركز أنت على صحة مرضاك ونمو عيادتك.
        </p>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8 w-full lg:w-auto">
              <div data-csp-motion="reveal"
                className={`flex flex-col items-center justify-center w-40 h-32 rounded-3xl ${step.bg} ${step.border} border shadow-lg relative`}
              >
                <div className="absolute -inset-0.5 bg-gradient-to-br from-white/50 to-transparent rounded-3xl opacity-50 pointer-events-none" />
                <div className="mb-3 bg-white p-2 rounded-xl shadow-sm">
                  {step.icon}
                </div>
                <span className="text-xs font-bold text-slate-800 text-center px-2">{step.label}</span>
              </div>

              {/* Connector Arrow */}
              {i < steps.length - 1 && (
                <div data-csp-motion="reveal"
                  className="hidden lg:flex"
                >
                  <ArrowLeft className="w-6 h-6 text-slate-600" />
                </div>
              )}
              {/* Vertical connector for mobile */}
              {i < steps.length - 1 && (
                <div className="lg:hidden h-8 w-px bg-slate-700" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
