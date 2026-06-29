"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, BarChart3, FileText, Home, Search, Bell, Settings, CreditCard } from "lucide-react";

export default function DashboardInteractive() {
  const [activeTab, setActiveTab] = useState("home");

  const tabs = [
    { id: "home", label: "الرئيسية", icon: <Home className="w-4 h-4" /> },
    { id: "patients", label: "المرضى", icon: <Users className="w-4 h-4" /> },
    { id: "billing", label: "الحسابات", icon: <CreditCard className="w-4 h-4" /> },
    { id: "analytics", label: "التقارير", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <section className="py-24 bg-[#F8FAFC] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">اكتشف لوحة التحكم التفاعلية</h2>
          <p className="mt-4 text-lg text-slate-600 font-medium">
            شاهد كيف تبدو واجهة Prime Physio من الداخل بنفس التصميم الحقيقي للمنصة.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Tabs Control */}
          <div className="flex justify-center mb-8">
            <div className="bg-white p-1.5 rounded-full border border-slate-200 flex flex-wrap justify-center gap-1 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-sm font-bold transition-all ${
                    activeTab === tab.id
                      ? "bg-[#4F46E5] text-white shadow-md"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* MacBook Frame */}
          <div className="relative mx-auto w-full max-w-5xl">
            <div className="relative pt-[56.25%]"> {/* 16:9 Aspect Ratio */}
              <div className="absolute inset-0 bg-white rounded-t-3xl border-x-4 border-t-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                {/* Browser Top Bar */}
                <div className="h-10 bg-slate-100 flex items-center px-4 gap-2 border-b border-slate-200 shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="mx-auto flex-1 max-w-lg h-6 bg-white rounded-md border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-sans">
                    primephysio.app/dashboard
                  </div>
                </div>

                {/* Dashboard App Container */}
                <div className="flex-1 flex overflow-hidden bg-slate-50/50" dir="rtl">
                  
                  {/* Real Dashboard Sidebar Mockup */}
                  <div className="w-40 sm:w-48 bg-gradient-to-b from-[#4F46BA] to-[#7c3aed] text-white flex flex-col shrink-0 shadow-lg z-10">
                    <div className="h-14 flex items-center justify-center border-b border-white/10 shrink-0">
                      <span className="font-bold text-lg tracking-tight">PrimePhysio</span>
                    </div>
                    <div className="p-3 flex-1 flex flex-col gap-1 overflow-hidden">
                      {tabs.map((tab) => (
                        <div 
                          key={tab.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-xs sm:text-sm ${
                            activeTab === tab.id ? "bg-white/10 font-bold border border-white/20" : "text-white/80 font-medium"
                          }`}
                        >
                          {tab.icon}
                          <span>{tab.label}</span>
                        </div>
                      ))}
                      <div className="mt-auto flex items-center gap-3 px-3 py-2 rounded-xl text-white/80 font-medium text-xs sm:text-sm">
                        <Settings className="w-4 h-4" />
                        <span>الإعدادات</span>
                      </div>
                    </div>
                    <div className="p-3 border-t border-white/10 bg-white/5 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500 border border-white/20 flex items-center justify-center text-xs font-bold shadow-sm">
                        أ
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold truncate">د. أحمد سلامة</div>
                        <div className="text-[9px] text-white/70 truncate">أخصائي</div>
                      </div>
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Header Mockup */}
                    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
                      <div className="w-48 sm:w-64 h-8 bg-slate-100 rounded-lg border border-slate-200/80 flex items-center px-3 text-slate-400">
                        <Search className="w-3.5 h-3.5 ml-2" />
                        <span className="text-xs">بحث عن مريض...</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-[10px] font-bold">
                          متصل
                        </div>
                        <div className="relative">
                          <Bell className="w-4.5 h-4.5 text-slate-400" />
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                        </div>
                      </div>
                    </header>

                    {/* Content Area Viewport */}
                    <div className="flex-1 p-6 overflow-hidden relative">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeTab}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="h-full w-full absolute inset-0 p-6"
                        >
                          {/* 1. Home Tab Mockup */}
                          {activeTab === "home" && (
                            <div className="flex flex-col h-full gap-4">
                              <div className="flex justify-between items-center shrink-0">
                                <div className="h-5 w-40 bg-slate-200 rounded-md" />
                                <div className="h-8 w-28 bg-[#4F46BA] rounded-lg" />
                              </div>
                              <div className="grid grid-cols-3 gap-4 shrink-0">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-100" />
                                      <div className="h-3 w-16 bg-slate-200 rounded-full" />
                                    </div>
                                    <div className="h-6 w-24 bg-slate-800 rounded-md" />
                                  </div>
                                ))}
                              </div>
                              <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                                <div className="h-4 w-32 bg-slate-200 rounded-md mb-2" />
                                {[1, 2, 3, 4].map(i => (
                                  <div key={i} className="h-10 w-full bg-slate-50 border border-slate-100 rounded-lg flex items-center px-3 gap-3">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100" />
                                    <div className="h-2.5 w-32 bg-slate-200 rounded-full" />
                                    <div className="h-2.5 w-16 bg-slate-200 rounded-full mr-auto" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Patients Tab Mockup */}
                          {activeTab === "patients" && (
                            <div className="flex flex-col h-full gap-4">
                              <div className="flex justify-between items-center shrink-0">
                                <div className="h-5 w-32 bg-slate-200 rounded-md" />
                                <div className="h-8 w-32 bg-[#4F46BA] rounded-lg" />
                              </div>
                              <div className="h-12 w-full bg-white border border-slate-200 rounded-xl flex items-center px-4 shrink-0 shadow-sm">
                                <div className="h-4 w-4 bg-slate-200 rounded-full ml-3" />
                                <div className="h-3 w-48 bg-slate-100 rounded-full" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white shadow-sm" />
                                    <div className="space-y-2 flex-1">
                                      <div className="h-3 w-28 bg-slate-800 rounded-full" />
                                      <div className="h-2 w-20 bg-slate-400 rounded-full" />
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. Billing Tab Mockup */}
                          {activeTab === "billing" && (
                            <div className="flex flex-col h-full gap-4">
                              <div className="flex justify-between items-center shrink-0">
                                <div className="h-5 w-48 bg-slate-200 rounded-md" />
                                <div className="flex gap-2">
                                  <div className="h-8 w-24 bg-white border border-slate-200 rounded-lg" />
                                  <div className="h-8 w-24 bg-[#4F46BA] rounded-lg" />
                                </div>
                              </div>
                              <div className="flex gap-4 shrink-0">
                                <div className="flex-1 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-md">
                                  <div className="h-3 w-24 bg-white/30 rounded-full mb-3" />
                                  <div className="h-8 w-32 bg-white rounded-md" />
                                </div>
                                <div className="flex-1 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-4 text-white shadow-md">
                                  <div className="h-3 w-24 bg-white/30 rounded-full mb-3" />
                                  <div className="h-8 w-32 bg-white rounded-md" />
                                </div>
                              </div>
                              <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
                                <div className="h-10 border-b border-slate-100 flex items-center px-4 bg-slate-50/50 rounded-t-xl gap-4">
                                  <div className="h-2 w-20 bg-slate-300 rounded-full" />
                                  <div className="h-2 w-32 bg-slate-300 rounded-full mr-auto" />
                                </div>
                                <div className="p-4 flex flex-col gap-3">
                                  {[1, 2, 3].map(i => (
                                    <div key={i} className="h-12 w-full border border-slate-100 rounded-lg flex items-center px-4 gap-4">
                                      <div className="w-8 h-8 rounded-full bg-emerald-50" />
                                      <div className="h-2 w-24 bg-slate-800 rounded-full" />
                                      <div className="h-2 w-16 bg-emerald-500 rounded-full mr-auto" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 4. Analytics Tab Mockup */}
                          {activeTab === "analytics" && (
                            <div className="flex flex-col h-full gap-4">
                              <div className="flex justify-between items-center shrink-0">
                                <div className="h-5 w-32 bg-slate-200 rounded-md" />
                                <div className="h-8 w-32 bg-white border border-slate-200 rounded-lg" />
                              </div>
                              <div className="flex-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
                                <div className="h-4 w-48 bg-slate-800 rounded-md mb-8" />
                                <div className="flex-1 flex items-end justify-between gap-4 px-4">
                                  {[30, 50, 40, 80, 60, 90, 70].map((h, i) => (
                                    <div key={i} className="flex-1 relative group h-full flex items-end">
                                      <div 
                                        className="w-full bg-[#4F46BA] rounded-t-md transition-all duration-1000 ease-out" 
                                        style={{ height: `${h}%` }} 
                                      />
                                    </div>
                                  ))}
                                </div>
                                <div className="h-px bg-slate-200 w-full mt-2 mb-2" />
                                <div className="flex justify-between px-4">
                                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                    <div key={i} className="h-2 w-6 bg-slate-300 rounded-full" />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* MacBook Base */}
              <div className="absolute -bottom-4 left-[-2%] right-[-2%] h-4 bg-slate-300 rounded-b-xl shadow-md z-20 flex justify-center">
                <div className="w-32 h-1 bg-slate-400 rounded-b-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
