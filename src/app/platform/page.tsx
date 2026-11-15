"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Building, Users, CreditCard, DollarSign, Activity, Calendar, Server, ShieldCheck, Database, AlertCircle, RefreshCw, Zap, Sparkles
} from "lucide-react";
import { Loader } from "@/components/Loader";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";

export default function PlatformDashboardPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/dashboard?lang=${language}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load platform dashboard");
        const dashboard = await res.json();
        if (active) setData(dashboard);
      } catch (error) {
        console.error(error);
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadDashboard();
    return () => { active = false; };
  }, [language]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader size={30} color="#4f46e5" />
      </div>
    );
  }

  const { stats, topClinicsByActivity, topClinicsByRevenue, latestClinics, charts, health, aiInsights, logs } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Row 1: KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: "العيادات", en: "Clinics", value: stats.totalClinics, icon: Building, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "الأطباء", en: "Doctors", value: stats.totalStaff, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "المرضى", en: "Patients", value: stats.totalPatients, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "الجلسات", en: "Sessions", value: stats.totalSessions, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "الإيرادات", en: "Revenue", value: `${Number(stats.totalRevenue || 0).toLocaleString(isRtl ? "ar-EG" : "en-US")} ${isRtl ? "ج.م" : "EGP"}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
          { label: "الاشتراكات", en: "Active Subs", value: stats.activeSubs, icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "المستخدمين", en: "Users", value: stats.registeredUsers, icon: Users, color: "text-rose-600", bg: "bg-rose-50" }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <div className={`p-2 rounded-lg mb-2 ${kpi.bg}`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <p className="text-xl font-bold text-slate-800">{kpi.value}</p>
            <p className="text-xs text-slate-500 font-medium">{isRtl ? kpi.label : kpi.en}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">{isRtl ? "نمو العيادات" : "Clinic Growth"}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.clinicGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">{isRtl ? "نمو المرضى" : "Patient Growth"}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.patientGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">{isRtl ? "المبيعات المدفوعة شهريًا (ج.م)" : "Monthly Paid Sales (EGP)"}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenueGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Top Clinics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            {isRtl ? "أكثر العيادات نشاطاً" : "Most Active Clinics"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                <tr>
                  <th className={`px-4 py-3 ${isRtl ? "text-right" : ""}`}>{isRtl ? "العيادة" : "Clinic"}</th>
                  <th className={`px-4 py-3 ${isRtl ? "text-right" : ""}`}>{isRtl ? "المرضى" : "Patients"}</th>
                  <th className={`px-4 py-3 ${isRtl ? "text-right" : ""}`}>{isRtl ? "الجلسات" : "Sessions"}</th>
                </tr>
              </thead>
              <tbody>
                {topClinicsByActivity.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.name || "Clinic"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.patientCount}</td>
                    <td className="px-4 py-3 text-indigo-600 font-bold">{c.sessionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            {isRtl ? "أعلى المراكز في المبيعات المدفوعة" : "Top Clinics by Paid Sales"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                <tr>
                  <th className={`px-4 py-3 ${isRtl ? "text-right" : ""}`}>{isRtl ? "العيادة" : "Clinic"}</th>
                  <th className={`px-4 py-3 ${isRtl ? "text-right" : ""}`}>{isRtl ? "الباقة" : "Plan"}</th>
                  <th className={`px-4 py-3 ${isRtl ? "text-right" : ""}`}>{isRtl ? "المبيعات المدفوعة" : "Paid sales"}</th>
                </tr>
              </thead>
              <tbody>
                {topClinicsByRevenue.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.name || "Clinic"}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{c.subscription?.plan_name || "Free"}</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">{Number(c.revenue || 0).toLocaleString(isRtl ? "ar-EG" : "en-US")} {isRtl ? "ج.م" : "EGP"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 4: Subscriptions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600" />
          {isRtl ? "مراقبة الاشتراكات" : "Subscription Monitoring"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
            <p className="text-slate-500 text-sm font-medium mb-1">Basic</p>
            <p className="text-2xl font-black text-slate-800">{stats.basicSubs}</p>
          </div>
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
            <p className="text-slate-500 text-sm font-medium mb-1">Silver / Pro</p>
            <p className="text-2xl font-black text-slate-800">{stats.proSubs}</p>
          </div>
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 ring-2 ring-indigo-500/20">
            <p className="text-indigo-600 text-sm font-bold mb-1">Gold / Enterprise</p>
            <p className="text-2xl font-black text-indigo-700">{stats.enterpriseSubs}</p>
          </div>
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
            <p className="text-slate-500 text-sm font-medium mb-1">Trial</p>
            <p className="text-2xl font-black text-slate-800">{stats.trialSubs}</p>
          </div>
          <div className="p-4 border border-rose-200 rounded-xl bg-rose-50">
            <p className="text-rose-600 text-sm font-bold mb-1">Expired</p>
            <p className="text-2xl font-black text-rose-700">{stats.expiredSubs}</p>
          </div>
        </div>
      </div>

      {/* Row 5: Platform Health & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Health */}
        <div className="bg-gradient-to-b from-[#4F46BA] to-[#7c3aed] text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Server className="w-24 h-24" />
          </div>
          <h3 className="font-bold mb-6 flex items-center gap-2 relative z-10">
            <Activity className="w-5 h-5 text-emerald-400" />
            {isRtl ? "صحة المنصة (Health)" : "Platform Health"}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-10">
            <div>
              <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Users className="w-3 h-3"/> Online Now</p>
              <p className="text-xl font-bold">{health.onlineUsers ?? (isRtl ? "غير متاح" : "N/A")}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Zap className="w-3 h-3"/> Avg Speed</p>
              <p className="text-xl font-bold">{health.avgResponseTime == null ? (isRtl ? "غير متاح" : "N/A") : `${health.avgResponseTime}ms`}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Error Rate</p>
              <p className="text-xl font-bold text-emerald-400">{health.errorRate == null ? (isRtl ? "غير متاح" : "N/A") : `${health.errorRate}%`}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Database className="w-3 h-3"/> DB Usage</p>
              <p className="text-xl font-bold">{health.dbUsage == null ? (isRtl ? "غير متاح" : "N/A") : `${health.dbUsage}%`}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Database className="w-3 h-3"/> Storage</p>
              <p className="text-xl font-bold">{health.storageUsage == null ? (isRtl ? "غير متاح" : "N/A") : `${health.storageUsage}%`}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Requests/Min</p>
              <p className="text-xl font-bold text-blue-400">{health.rpm ?? (isRtl ? "غير متاح" : "N/A")}</p>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
          <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            {isRtl ? "مؤشرات المنصة" : "Platform Insights"}
          </h3>
          <div className="space-y-3">
            {aiInsights.map((insight: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3 bg-white/60 p-3 rounded-lg border border-white">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0"></div>
                <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
