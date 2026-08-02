"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { CreditCard, Loader2, Calendar, ShieldAlert, CheckCircle, XCircle } from "lucide-react";

interface Subscription {
  id: string;
  clinicName: string;
  clinicEmail: string;
  plan_name: string;
  plan_price: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export default function PlatformSubscriptionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.roleKey !== "platform_admin") {
      router.replace("/");
      return;
    }
    loadSubs();
  }, [user]);

  const loadSubs = async () => {
    try {
      const res = await fetch("/api/admin/subscriptions");
      if (res.ok) {
        const data = await res.json();
        setSubs(data.subscriptions || []);
      }
    } catch {}
    setLoading(false);
  };

  const getPlanBadge = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case "gold": return "bg-amber-100 text-amber-700 border-amber-200";
      case "silver": return "bg-slate-200 text-slate-700 border-slate-300";
      default: return "bg-indigo-50 text-indigo-700 border-indigo-100";
    }
  };

  if (!user || user.roleKey !== "platform_admin") return null;

  // Group by latest per clinic (optional, but good for subscriptions page to just show all history for now)
  
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800">إدارة الاشتراكات</h1>
          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">إجمالي العمليات: {subs.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm border rounded-2xl bg-white">لا توجد اشتراكات مسجلة بعد</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right text-slate-600">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">العيادة</th>
                  <th className="px-6 py-4 font-semibold">الباقة</th>
                  <th className="px-6 py-4 font-semibold">تاريخ التفعيل</th>
                  <th className="px-6 py-4 font-semibold">تاريخ الانتهاء</th>
                  <th className="px-6 py-4 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subs.map((s) => {
                  const isActive = s.status === 'active' && new Date(s.end_date) > new Date();
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{s.clinicName}</div>
                        <div className="text-xs text-slate-500 font-sans" dir="ltr">{s.clinicEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPlanBadge(s.plan_name)}`}>
                          {s.plan_name?.toUpperCase() || 'BASIC'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {s.start_date ? new Date(s.start_date).toLocaleDateString("ar-EG") : '-'}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {s.end_date ? new Date(s.end_date).toLocaleDateString("ar-EG") : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                          isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {isActive ? 'نشط' : 'منتهي'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
