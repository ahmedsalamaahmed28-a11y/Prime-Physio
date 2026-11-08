"use client";

import { useState } from "react";
import { Calendar, Users, BarChart3, FileText, Home, Search, Bell, Settings, CreditCard } from "lucide-react";

export default function DashboardInteractive() {
  const [activeTab, setActiveTab] = useState("home");

  const chartBarHeights = ["h-[30%]", "h-[50%]", "h-[40%]", "h-[80%]", "h-[60%]", "h-[90%]", "h-[70%]"];

  const tabs = [
    { id: "home", label: "الرئيسية", icon: <Home className="w-4 h-4" /> },
    { id: "patients", label: "المرضى", icon: <Users className="w-4 h-4" /> },
    { id: "billing", label: "الحسابات", icon: <CreditCard className="w-4 h-4" /> },
    { id: "analytics", label: "التقارير", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <section className="py-14 sm:py-24 bg-[#F8FAFC] overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 sm:text-4xl">اكتشف لوحة التحكم التفاعلية</h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-slate-600 font-medium">
            شاهد كيف تبدو واجهة Prime Physio من الداخل بنفس التصميم الحقيقي للمنصة.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Tabs Control */}
          <div className="flex justify-center mb-5 sm:mb-8">
            <div className="bg-white p-1 rounded-2xl sm:rounded-full border border-slate-200 flex flex-wrap justify-center gap-1 shadow-sm max-w-full">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 sm:gap-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
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
            <div className="relative pt-[112%] min-[390px]:pt-[100%] min-[480px]:pt-[88%] sm:pt-[56.25%]"> {/* Give the mobile dashboard enough vertical room; keep desktop widescreen */}
              <div className="absolute inset-0 bg-white rounded-t-2xl sm:rounded-t-3xl border-x-2 sm:border-x-4 border-t-2 sm:border-t-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                {/* Browser Top Bar */}
                <div className="h-8 sm:h-10 bg-slate-100 flex items-center px-2 sm:px-4 gap-2 border-b border-slate-200 shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="mx-auto flex-1 max-w-lg h-5 sm:h-6 bg-white rounded-md border border-slate-200 flex items-center justify-center text-[9px] sm:text-[10px] text-slate-400 font-sans">
                    primephysio.app/dashboard
                  </div>
                </div>

                {/* Dashboard App Container */}
                <div className="flex-1 flex overflow-hidden bg-slate-50/50" dir="rtl">
                  
                  {/* Real Dashboard Sidebar Mockup */}
                  <div className="w-11 min-[480px]:w-14 sm:w-40 lg:w-48 bg-gradient-to-b from-[#4F46BA] to-[#7c3aed] text-white flex flex-col shrink-0 shadow-lg z-10">
                    <div className="h-10 sm:h-14 flex items-center justify-center border-b border-white/10 shrink-0">
                      <span className="font-bold text-sm sm:text-lg tracking-tight"><span className="sm:hidden">P</span><span className="hidden sm:inline">PrimePhysio</span></span>
                    </div>
                    <div className="p-1 sm:p-3 flex-1 flex flex-col gap-1 overflow-hidden">
                      {tabs.map((tab) => (
                        <div 
                          key={tab.id}
                          className={`flex items-center justify-center sm:justify-start gap-0 sm:gap-3 px-1 sm:px-3 py-2 rounded-xl transition-all text-xs sm:text-sm ${
                            activeTab === tab.id ? "bg-white/10 font-bold border border-white/20" : "text-white/80 font-medium"
                          }`}
                        >
                          {tab.icon}
                          <span className="hidden sm:inline">{tab.label}</span>
                        </div>
                      ))}
                      <div className="mt-auto flex items-center justify-center sm:justify-start gap-0 sm:gap-3 px-1 sm:px-3 py-2 rounded-xl text-white/80 font-medium text-xs sm:text-sm">
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">الإعدادات</span>
                      </div>
                    </div>
                    <div className="p-1.5 sm:p-3 border-t border-white/10 bg-white/5 flex items-center justify-center sm:justify-start gap-2">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-500 border border-white/20 flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                        أ
                      </div>
                      <div className="hidden sm:block flex-1 min-w-0">
                        <div className="text-[10px] font-bold truncate">د. أحمد سلامة</div>
                        <div className="text-[9px] text-white/70 truncate">أخصائي</div>
                      </div>
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Header Mockup */}
                    <header className="h-11 sm:h-14 bg-white border-b border-slate-200 flex items-center justify-between px-2 sm:px-6 gap-2 shrink-0 z-10">
                      <div className="w-28 min-[480px]:w-36 sm:w-48 lg:w-64 h-7 sm:h-8 bg-slate-100 rounded-lg border border-slate-200/80 flex items-center px-2 sm:px-3 text-slate-400 min-w-0">
                        <Search className="w-3.5 h-3.5 ml-2" />
                        <span className="text-[10px] sm:text-xs truncate">بحث عن مريض...</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-[9px] sm:text-[10px] font-bold">
                          متصل
                        </div>
                        <div className="relative">
                          <Bell className="w-4.5 h-4.5 text-slate-400" />
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                        </div>
                      </div>
                    </header>

                    {/* Content Area Viewport */}
                    <div className="flex-1 min-h-0 p-2 sm:p-6 overflow-hidden relative min-w-0">
                        <div data-csp-motion="reveal"
                          key={activeTab}
                          className="relative h-full min-h-0 w-full p-1 sm:p-6 sm:absolute sm:inset-0"
                        >
                          {/* 1. Home Tab Mockup */}
                          {activeTab === "home" && (
                            <div className="flex flex-col h-full min-h-0 gap-2 sm:gap-4">
                              <div className="flex justify-between items-center shrink-0">
                                <div className="h-5 w-40 bg-slate-200 rounded-md" />
                                <div className="h-8 w-28 bg-[#4F46BA] rounded-lg" />
                              </div>
                              <div className="grid grid-cols-3 gap-2 sm:gap-4 shrink-0">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className="bg-white border border-slate-200 rounded-lg sm:rounded-xl p-2 sm:p-4 shadow-sm min-w-0">
                                    <div className="flex items-center gap-1.5 sm:gap-3 mb-2 sm:mb-3">
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 shrink-0" />
                                      <div className="h-3 w-16 bg-slate-200 rounded-full" />
                                    </div>
                                    <div className="h-5 sm:h-6 w-16 sm:w-24 bg-slate-800 rounded-md" />
                                  </div>
                                ))}
                              </div>
                              <div className="flex-1 bg-white border border-slate-200 rounded-xl p-2 sm:p-4 shadow-sm flex flex-col gap-2 sm:gap-3 min-h-0">
                                <div className="h-4 w-32 bg-slate-200 rounded-md mb-2" />
                                {[1, 2, 3, 4].map(i => (
                                  <div key={i} className="h-8 sm:h-10 w-full bg-slate-50 border border-slate-100 rounded-lg flex items-center px-2 sm:px-3 gap-2 sm:gap-3 min-w-0">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-100 shrink-0" />
                                    <div className="h-2.5 w-20 sm:w-32 bg-slate-200 rounded-full" />
                                    <div className="h-2.5 w-10 sm:w-16 bg-slate-200 rounded-full mr-auto" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Patients Tab Mockup */}
                          {activeTab === "patients" && (
                            <div className="flex flex-col h-full min-h-0 gap-2 sm:gap-4">
                              <div className="flex justify-between items-center shrink-0">
                                <div className="h-5 w-32 bg-slate-200 rounded-md" />
                                <div className="h-8 w-32 bg-[#4F46BA] rounded-lg" />
                              </div>
                              <div className="h-12 w-full bg-white border border-slate-200 rounded-xl flex items-center px-4 shrink-0 shadow-sm">
                                <div className="h-4 w-4 bg-slate-200 rounded-full ml-3" />
                                <div className="h-3 w-48 bg-slate-100 rounded-full" />
                              </div>
                              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                  <div key={i} className="bg-white border border-slate-200 rounded-lg sm:rounded-xl p-2 sm:p-4 flex items-center gap-2 sm:gap-4 shadow-sm min-w-0">
                                    <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-slate-100 border-2 border-white shadow-sm shrink-0" />
                                    <div className="space-y-2 flex-1">
                                      <div className="h-3 w-16 sm:w-28 bg-slate-800 rounded-full" />
                                      <div className="h-2 w-12 sm:w-20 bg-slate-400 rounded-full" />
                                    </div>
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 border border-indigo-100 shrink-0" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. Billing Tab Mockup */}
                          {activeTab === "billing" && (
                            <div className="flex flex-col h-full min-h-0 gap-2 sm:gap-4">
                              <div className="flex justify-between items-center shrink-0">
                                <div className="h-5 w-48 bg-slate-200 rounded-md" />
                                <div className="flex gap-2">
                                  <div className="h-8 w-24 bg-white border border-slate-200 rounded-lg" />
                                  <div className="h-8 w-24 bg-[#4F46BA] rounded-lg" />
                                </div>
                              </div>
                              <div className="flex gap-2 sm:gap-4 shrink-0">
                                <div className="flex-1 min-w-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-2 sm:p-4 text-white shadow-md">
                                  <div className="h-3 w-24 bg-white/30 rounded-full mb-3" />
                                  <div className="h-7 sm:h-8 w-20 sm:w-32 bg-white rounded-md" />
                                </div>
                                <div className="flex-1 min-w-0 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-2 sm:p-4 text-white shadow-md">
                                  <div className="h-3 w-24 bg-white/30 rounded-full mb-3" />
                                  <div className="h-7 sm:h-8 w-20 sm:w-32 bg-white rounded-md" />
                                </div>
                              </div>
                              <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-0">
                                <div className="h-8 sm:h-10 border-b border-slate-100 flex items-center px-2 sm:px-4 bg-slate-50/50 rounded-t-xl gap-2 sm:gap-4">
                                  <div className="h-2 w-20 bg-slate-300 rounded-full" />
                                  <div className="h-2 w-32 bg-slate-300 rounded-full mr-auto" />
                                </div>
                                <div className="p-2 sm:p-4 flex flex-col gap-2 sm:gap-3">
                                  {[1, 2, 3].map(i => (
                                    <div key={i} className="h-10 sm:h-12 w-full border border-slate-100 rounded-lg flex items-center px-2 sm:px-4 gap-2 sm:gap-4">
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-50 shrink-0" />
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
                            <div className="flex flex-col h-full min-h-0 gap-2 sm:gap-4">
                              <div className="flex justify-between items-center shrink-0">
                                <div className="h-5 w-32 bg-slate-200 rounded-md" />
                                <div className="h-8 w-32 bg-white border border-slate-200 rounded-lg" />
                              </div>
                              <div className="flex-1 bg-white border border-slate-200 rounded-xl p-2 sm:p-6 shadow-sm flex flex-col min-h-0">
                                <div className="h-4 w-32 sm:w-48 bg-slate-800 rounded-md mb-3 sm:mb-8" />
                                <div className="flex-1 flex items-end justify-between gap-2 sm:gap-4 px-2 sm:px-4 min-h-0">
                                  {chartBarHeights.map((heightClass, i) => (
                                    <div key={i} className="flex-1 relative group h-full flex items-end">
                                      <div className={`w-full bg-[#4F46BA] rounded-t-md transition-all duration-1000 ease-out ${heightClass}`} />
                                    </div>
                                  ))}
                                </div>
                                <div className="h-px bg-slate-200 w-full mt-2 mb-2" />
                                <div className="flex justify-between px-2 sm:px-4">
                                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                    <div key={i} className="h-2 w-6 bg-slate-300 rounded-full" />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
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
