"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, BarChart3, FileText } from "lucide-react";

export default function DashboardInteractive() {
  const [activeTab, setActiveTab] = useState("appointments");

  const tabs = [
    { id: "appointments", label: "المواعيد", icon: <Calendar className="w-4 h-4" /> },
    { id: "patients", label: "المرضى", icon: <Users className="w-4 h-4" /> },
    { id: "analytics", label: "التقارير", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "emr", label: "الملف الطبي", icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <section className="py-24 bg-[#F8FAFC] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">اكتشف لوحة التحكم التفاعلية</h2>
          <p className="mt-4 text-lg text-slate-600 font-medium">
            شاهد كيف تبدو واجهة Prime Physio من الداخل.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-white p-1.5 rounded-full border border-slate-200 flex shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
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
          <div className="relative mx-auto w-full max-w-4xl">
            <div className="relative pt-[60%]">
              <div className="absolute inset-0 bg-white rounded-t-3xl border-x-4 border-t-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                {/* Browser Top Bar */}
                <div className="h-12 bg-slate-100 flex items-center px-4 gap-2 border-b border-slate-200 shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="mx-auto flex-1 max-w-lg h-6 bg-white rounded-md border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                    primephysio.app/dashboard
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-slate-50 relative overflow-hidden p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="h-full w-full"
                    >
                      {activeTab === "appointments" && (
                        <div className="flex flex-col gap-4 h-full">
                          <div className="flex justify-between items-center mb-2">
                            <div className="h-6 w-32 bg-slate-200 rounded-md" />
                            <div className="h-8 w-24 bg-indigo-100 rounded-md" />
                          </div>
                          <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 flex gap-4">
                            <div className="w-16 flex flex-col gap-8 pt-4">
                              {[9, 10, 11, 12].map(t => (
                                <div key={t} className="h-4 w-full bg-slate-100 rounded-sm" />
                              ))}
                            </div>
                            <div className="flex-1 flex flex-col gap-2 relative">
                              <div className="absolute top-10 left-10 right-20 h-24 bg-indigo-50 border-l-4 border-indigo-500 rounded-md p-3">
                                <div className="h-3 w-20 bg-indigo-200 rounded-full mb-2" />
                                <div className="h-2 w-32 bg-indigo-100 rounded-full" />
                              </div>
                              <div className="absolute top-40 left-40 right-10 h-20 bg-emerald-50 border-l-4 border-emerald-500 rounded-md p-3">
                                <div className="h-3 w-24 bg-emerald-200 rounded-full mb-2" />
                                <div className="h-2 w-28 bg-emerald-100 rounded-full" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "patients" && (
                        <div className="flex flex-col gap-4 h-full">
                          <div className="h-10 w-full bg-white border border-slate-200 rounded-lg flex items-center px-4 mb-2">
                            <div className="h-4 w-4 bg-slate-200 rounded-full mr-2" />
                            <div className="h-3 w-32 bg-slate-100 rounded-full" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-100" />
                                <div className="space-y-2 flex-1">
                                  <div className="h-3 w-24 bg-slate-200 rounded-full" />
                                  <div className="h-2 w-32 bg-slate-100 rounded-full" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTab === "analytics" && (
                        <div className="flex flex-col gap-4 h-full">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                                <div className="h-3 w-16 bg-slate-200 rounded-full mb-4" />
                                <div className="h-6 w-24 bg-indigo-100 rounded-full" />
                              </div>
                            ))}
                          </div>
                          <div className="flex-1 bg-white border border-slate-200 rounded-xl p-6 flex items-end gap-2">
                            {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                              <div key={i} className="flex-1 bg-indigo-500 rounded-t-sm transition-all duration-1000" style={{ height: `${h}%` }} />
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTab === "emr" && (
                        <div className="flex gap-4 h-full">
                          <div className="w-1/3 bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-center">
                            <div className="w-full aspect-[1/2] bg-slate-50 border border-slate-100 rounded-lg" /> {/* Body chart placeholder */}
                          </div>
                          <div className="flex-1 flex flex-col gap-4">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 flex-1">
                              <div className="h-4 w-32 bg-slate-200 rounded-full mb-6" />
                              <div className="space-y-3">
                                {[1, 2, 3, 4].map(i => (
                                  <div key={i} className="h-2 w-full bg-slate-100 rounded-full" />
                                ))}
                              </div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 flex-1">
                              <div className="h-4 w-24 bg-slate-200 rounded-full mb-6" />
                              <div className="space-y-3">
                                {[1, 2].map(i => (
                                  <div key={i} className="h-2 w-3/4 bg-slate-100 rounded-full" />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
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
