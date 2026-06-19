"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Building, Users, CreditCard, CheckCircle, XCircle, ShieldAlert, Loader2 } from "lucide-react";

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

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.roleKey !== "platform_admin") {
      router.replace("/");
      return;
    }
    loadClinics();
  }, [user]);

  const loadClinics = async () => {
    try {
      const res = await fetch("/api/admin/clinics");
      if (res.ok) {
        const data = await res.json();
        setClinics(data.clinics || []);
      }
    } catch {}
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
    } catch {}
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
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-[#0d8a8a]" />
          <h1 className="text-xl font-bold text-slate-800">لوحة تحكم المنصة</h1>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">مدير المنصة</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : clinics.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">لا توجد عيادات مسجلة بعد</div>
        ) : (
          <div className="grid gap-4">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                className={`bg-white rounded-2xl border p-5 transition-all ${
                  clinic.is_active ? "border-slate-200" : "border-red-200 bg-red-50/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-400" />
                      <h3 className="font-bold text-slate-800">{clinic.name}</h3>
                      {!clinic.is_active && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                          موقوفة
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{clinic.email}</span>
                      <span>{clinic.phone}</span>
                      <span>{new Date(clinic.created_at).toLocaleDateString("ar-EG")}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {clinic.patientCount} مريض
                      </span>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${getPlanBadge(clinic.subscription?.plan_name)}`}>
                        <CreditCard className="w-3 h-3" />
                        {clinic.subscription
                          ? clinic.subscription.plan_name === "basic"
                            ? "Basic"
                            : clinic.subscription.plan_name === "silver"
                            ? "Silver"
                            : "Gold"
                          : "بدون اشتراك"}
                      </span>
                      <span className={`flex items-center gap-1 ${clinic.subscription?.status === "active" ? "text-emerald-600" : "text-slate-400"}`}>
                        {clinic.subscription?.status === "active" ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {clinic.subscription?.status === "active" ? "نشط" : "غير نشط"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleClinic(clinic.id, clinic.is_active)}
                    disabled={toggling === clinic.id}
                    className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                      clinic.is_active
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    } disabled:opacity-50`}
                  >
                    {toggling === clinic.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : clinic.is_active ? (
                      "إيقاف"
                    ) : (
                      "تفعيل"
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
