"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Building, Users, CreditCard, DollarSign, Activity, Calendar, Server, ShieldCheck, Database, AlertCircle, RefreshCw, Zap, Sparkles, Crown
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
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader size={30} color="#818cf8" />
      </div>
    );
  }

  const { stats, topClinicsByActivity, topClinicsByRevenue, latestClinics, charts, health, aiInsights, logs } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Row 1: KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: "العيادات", en: "Clinics", value: stats.totalClinics, icon: Building, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "الأطباء", en: "Doctors", value: stats.totalStaff, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
          { label: "المرضى", en: "Patients", value: stats.totalPatients, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "الجلسات", en: "Sessions", value: stats.totalSessions, icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
          { label: "الإيرادات", en: "Revenue", value: `$${(stats.totalRevenue/1000).toFixed(1)}k`, icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
          { label: "الاشتراكات", en: "Active Subs", value: stats.activeSubs, icon: CreditCard, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
          { label: "المستخدمين", en: "Users", value: stats.registeredUsers, icon: Users, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" }
        ].map((kpi, i) => (
          <div key={i} className={`bg-[#131B2C]/60 backdrop-blur-xl p-4 rounded-2xl border ${kpi.border} shadow-lg shadow-black/20 flex flex-col items-center justify-center text-center transition-transform hover:scale-105`}>
            <div className={`p-2.5 rounded-xl mb-3 ${kpi.bg} shadow-inner`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <p className="text-xl font-black text-white tracking-wide">{kpi.value}</p>
            <p className="text-xs text-slate-400 font-semibold mt-1">{isRtl ? kpi.label : kpi.en}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#131B2C]/60 backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="font-bold text-white mb-6 tracking-wide flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            {isRtl ? "نمو العيادات" : "Clinic Growth"}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.clinicGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <RechartsTooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff'}} />
                <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-[#131B2C]/60 backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="font-bold text-white mb-6 tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            {isRtl ? "نمو المرضى" : "Patient Growth"}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.patientGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff'}} />
                <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={3} dot={{r: 4, fill: '#34d399', strokeWidth: 0}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#131B2C]/60 backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="font-bold text-white mb-6 tracking-wide flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            {isRtl ? "الإيرادات الشهرية" : "Monthly Revenue"}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenueGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <RechartsTooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff'}} />
                <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Top Clinics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#131B2C]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="font-bold text-white mb-6 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            {isRtl ? "أكثر العيادات نشاطاً" : "Most Active Clinics"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 bg-white/5 uppercase border-b border-white/10">
                <tr>
                  <th className={`px-4 py-4 rounded-tl-lg ${isRtl ? "text-right" : ""}`}>{isRtl ? "العيادة" : "Clinic"}</th>
                  <th className={`px-4 py-4 ${isRtl ? "text-right" : ""}`}>{isRtl ? "المرضى" : "Patients"}</th>
                  <th className={`px-4 py-4 rounded-tr-lg ${isRtl ? "text-right" : ""}`}>{isRtl ? "الجلسات" : "Sessions"}</th>
                </tr>
              </thead>
              <tbody>
                {topClinicsByActivity.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 font-semibold text-white">{c.name || "Clinic"}</td>
                    <td className="px-4 py-4 text-slate-300">{c.patientCount}</td>
                    <td className="px-4 py-4 text-indigo-400 font-bold">{c.sessionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#131B2C]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="font-bold text-white mb-6 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            {isRtl ? "أعلى الإيرادات" : "Top Revenue Clinics"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 bg-white/5 uppercase border-b border-white/10">
                <tr>
                  <th className={`px-4 py-4 rounded-tl-lg ${isRtl ? "text-right" : ""}`}>{isRtl ? "العيادة" : "Clinic"}</th>
                  <th className={`px-4 py-4 ${isRtl ? "text-right" : ""}`}>{isRtl ? "الباقة" : "Plan"}</th>
                  <th className={`px-4 py-4 rounded-tr-lg ${isRtl ? "text-right" : ""}`}>{isRtl ? "الإيراد التقديري" : "Est. Revenue"}</th>
                </tr>
              </thead>
              <tbody>
                {topClinicsByRevenue.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 font-semibold text-white">{c.name || "Clinic"}</td>
                    <td className="px-4 py-4 text-slate-300 capitalize">
                      <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs">
                        {c.subscription?.plan_name || "Free"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-emerald-400 font-bold tracking-wide">${c.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 4: Subscriptions */}
      <div className="bg-[#131B2C]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]" />
        <h3 className="font-bold text-white mb-8 flex items-center gap-3 relative z-10">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <CreditCard className="w-5 h-5 text-indigo-400" />
          </div>
          {isRtl ? "مراقبة الاشتراكات" : "Subscription Monitoring"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative z-10">
          <div className="p-5 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
            <p className="text-slate-400 text-sm font-semibold mb-2 tracking-wider uppercase">Basic</p>
            <p className="text-3xl font-black text-white">{stats.basicSubs}</p>
          </div>
          <div className="p-5 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
            <p className="text-slate-400 text-sm font-semibold mb-2 tracking-wider uppercase">Silver / Pro</p>
            <p className="text-3xl font-black text-white">{stats.proSubs}</p>
          </div>
          <div className="p-5 border border-indigo-500/30 rounded-2xl bg-indigo-500/10 backdrop-blur-sm shadow-[0_0_15px_rgba(99,102,241,0.15)] relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-indigo-500/20"><Crown className="w-16 h-16" /></div>
            <p className="text-indigo-300 text-sm font-bold mb-2 tracking-wider uppercase relative z-10">Gold / Enterprise</p>
            <p className="text-3xl font-black text-indigo-400 relative z-10">{stats.enterpriseSubs}</p>
          </div>
          <div className="p-5 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
            <p className="text-slate-400 text-sm font-semibold mb-2 tracking-wider uppercase">Trial</p>
            <p className="text-3xl font-black text-white">{stats.trialSubs}</p>
          </div>
          <div className="p-5 border border-rose-500/20 rounded-2xl bg-rose-500/5 backdrop-blur-sm">
            <p className="text-rose-400 text-sm font-bold mb-2 tracking-wider uppercase">Expired</p>
            <p className="text-3xl font-black text-rose-500">{stats.expiredSubs}</p>
          </div>
        </div>
      </div>

      {/* Row 5: Platform Health & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Health */}
        <div className="bg-[#0f172a]/80 backdrop-blur-2xl text-white p-8 rounded-3xl shadow-xl border border-slate-700/50 relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] p-3 opacity-[0.03]">
            <Server className="w-64 h-64" />
          </div>
          <h3 className="font-bold mb-8 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            {isRtl ? "صحة المنصة (Health)" : "Platform Health"}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 relative z-10">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-slate-400 text-xs mb-2 flex items-center gap-2"><Users className="w-3.5 h-3.5 text-blue-400"/> Online Now</p>
              <p className="text-2xl font-black">{health.onlineUsers}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-slate-400 text-xs mb-2 flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-amber-400"/> Avg Speed</p>
              <p className="text-2xl font-black text-white">{health.avgResponseTime}<span className="text-sm text-slate-500 ml-1">ms</span></p>
            </div>
            <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
              <p className="text-slate-400 text-xs mb-2 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5 text-emerald-400"/> Error Rate</p>
              <p className="text-2xl font-black text-emerald-400">{health.errorRate}%</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-slate-400 text-xs mb-2 flex items-center gap-2"><Database className="w-3.5 h-3.5 text-purple-400"/> DB Usage</p>
              <p className="text-2xl font-black text-white">{health.dbUsage}%</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-slate-400 text-xs mb-2 flex items-center gap-2"><Database className="w-3.5 h-3.5 text-purple-400"/> Storage</p>
              <p className="text-2xl font-black text-white">{health.storageUsage}%</p>
            </div>
            <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
              <p className="text-slate-400 text-xs mb-2 flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 text-blue-400"/> Requests/Min</p>
              <p className="text-2xl font-black text-blue-400">{health.rpm}</p>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-[#1e1b4b]/80 to-[#172554]/80 backdrop-blur-2xl p-8 rounded-3xl border border-indigo-500/20 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none" />
          <h3 className="font-bold text-white mb-6 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            {isRtl ? "تحليلات الذكاء الاصطناعي (Platform AI Insights)" : "Platform AI Insights"}
          </h3>
          <div className="space-y-4 relative z-10">
            {aiInsights.map((insight: string, idx: number) => (
              <div key={idx} className="flex items-start gap-4 bg-[#0f172a]/60 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                <p className="text-sm text-indigo-100/90 leading-relaxed font-medium">{insight}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
