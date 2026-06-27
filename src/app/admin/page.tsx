"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Building, Users, CreditCard, CheckCircle, XCircle, ShieldAlert, Activity, DollarSign, Calendar, LayoutDashboard, History, List } from "lucide-react";
import { Loader } from "@/components/Loader";

interface Clinic {
  id: string;
  name: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
  patientCount: number;
  subscription: { plan_name: string; status: string; end_date: string } | null;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  details: any;
  created_at: string;
  user_email: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "clinics" | "subscriptions" | "activity">("overview");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState({ 
    totalClinics: 0, 
    totalStaff: 0, 
    totalPatients: 0,
    totalSessions: 0,
    totalAppointments: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.roleKey !== "platform_admin") {
      router.replace("/home");
      return;
    }
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const data = await res.json();
        setClinics(data.clinics || []);
        if (data.stats) setStats(data.stats);
        if (data.logs) setLogs(data.logs);
      }
    } catch { }
    setLoading(false);
  };

  const toggleClinic = async (clinicId: string, currentActive: boolean) => {
    setToggling(clinicId);
    try {
      await fetch("/api/admin/clinics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, is_active: !currentActive }),
      });
      setClinics((prev) =>
        prev.map((c) => (c.id === clinicId ? { ...c, is_active: !currentActive } : c))
      );
    } catch { }
    setToggling(null);
  };

  const getPlanBadge = (plan: string | undefined) => {
    const colors: Record<string, string> = {
      basic: "bg-slate-100 text-slate-600",
      silver: "bg-slate-200 text-slate-700",
      gold: "bg-yellow-50 text-yellow-700",
    };
    return colors[plan || ""] || "bg-slate-100 text-slate-600";
  };

  if (!user) return null;
  if (user.roleKey !== "platform_admin") return null;

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-6 space-y-6 min-h-[500px]">
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">لوحة تحكم المنصة (Command Center)</h1>
            <p className="text-sm text-slate-500">نظرة شاملة على أداء المنصة وجميع العيادات</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 w-fit">
          <button onClick={() => setActiveTab("overview")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
            <LayoutDashboard className="w-4 h-4" /> نظرة عامة
          </button>
          <button onClick={() => setActiveTab("clinics")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "clinics" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
            <Building className="w-4 h-4" /> العيادات
          </button>
          <button onClick={() => setActiveTab("activity")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "activity" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
            <History className="w-4 h-4" /> سجل النشاط
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader size={24} color="#4f46e5" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1">إجمالي الإيرادات (Paymob)</p>
                    <p className="text-2xl font-black text-slate-800">EGP {stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1">إجمالي الجلسات</p>
                    <p className="text-2xl font-black text-slate-800">{stats.totalSessions.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <Activity className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1">إجمالي المرضى المستفيدين</p>
                    <p className="text-2xl font-black text-slate-800">{stats.totalPatients.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1">العيادات المسجلة</p>
                    <p className="text-2xl font-black text-slate-800">{stats.totalClinics.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                    <Building className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1">الأطباء والموظفين</p>
                    <p className="text-2xl font-black text-slate-800">{stats.totalStaff.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500 mb-1">المواعيد المحجوزة</p>
                    <p className="text-2xl font-black text-slate-800">{stats.totalAppointments.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>
              </div>
            )}

            {/* CLINICS TAB */}
            {activeTab === "clinics" && (
              <div className="grid gap-4">
                {clinics.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 text-sm">لا توجد عيادات مسجلة بعد</div>
                ) : (
                  clinics.map((clinic) => (
                    <div
                      key={clinic.id}
                      className={`bg-white rounded-2xl border p-5 transition-all shadow-sm ${clinic.is_active ? "border-slate-200" : "border-red-200 bg-red-50/30"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-slate-400" />
                            <h3 className="font-bold text-slate-800">{clinic.name}</h3>
                            {!clinic.is_active && (
                              <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">موقوفة</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>{clinic.email}</span>
                            <span>{clinic.phone}</span>
                            <span>{new Date(clinic.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {clinic.patientCount} مريض
                            </span>
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-md border ${getPlanBadge(clinic.subscription?.plan_name)}`}>
                              <CreditCard className="w-3 h-3" />
                              {clinic.subscription
                                ? clinic.subscription.plan_name.toUpperCase()
                                : "بدون اشتراك"}
                            </span>
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-md border ${clinic.subscription?.status === "active" ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-slate-500 bg-slate-50 border-slate-100"}`}>
                              {clinic.subscription?.status === "active" ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {clinic.subscription?.status === "active" ? "اشتراك نشط" : "اشتراك غير نشط"}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleClinic(clinic.id, clinic.is_active)}
                          disabled={toggling === clinic.id}
                          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer ${clinic.is_active
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            } disabled:opacity-50`}
                        >
                          {toggling === clinic.id ? <Loader size={14} color="currentColor" /> : clinic.is_active ? "إيقاف العيادة" : "تفعيل العيادة"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ACTIVITY LOGS TAB */}
            {activeTab === "activity" && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-500" /> آخر النشاطات على المنصة
                  </h3>
                  <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                    أحدث 50 حركة
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">لا توجد نشاطات مسجلة</div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-start gap-4">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          log.action.includes("CREATE") ? "bg-emerald-50 text-emerald-600" :
                          log.action.includes("DELETE") ? "bg-red-50 text-red-600" :
                          "bg-blue-50 text-blue-600"
                        }`}>
                          <Activity className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-slate-800">
                              {log.action} <span className="text-slate-400 font-normal ml-1">في</span> {log.entity}
                            </p>
                            <span className="text-xs text-slate-400" dir="ltr">
                              {new Date(log.created_at).toLocaleString("en-GB")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500 truncate max-w-xl">
                              بواسطة: <span className="font-medium text-slate-700">{log.user_email || "مستخدم غير معروف"}</span>
                            </p>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                              {log.id.split("-")[0]}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}