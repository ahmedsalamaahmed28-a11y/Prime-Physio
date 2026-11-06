"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { DollarSign, Loader2, FileText, CheckCircle } from "lucide-react";

interface Payment {
  id: string;
  clinicName: string;
  plan_name: string;
  plan_price: number;
  order_id: string;
  transaction_id: string;
  created_at: string;
}

export default function PlatformPaymentsPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.roleKey !== "platform_admin") {
      router.replace("/");
      return;
    }
    loadPayments();
  }, [user]);

  const loadPayments = async () => {
    try {
      const res = await fetch("/api/admin/subscriptions");
      if (res.ok) {
        const data = await res.json();
        // Filter out free/manual subscriptions that don't have a price or transaction ID
        const validPayments = (data.subscriptions || []).filter((p: any) => p.plan_price > 0 || p.transaction_id);
        setPayments(validPayments);
      }
    } catch {}
    setLoading(false);
  };

  const totalRevenue = payments.reduce((sum, p) => sum + (p.plan_price || 0), 0);

  if (!user || user.roleKey !== "platform_admin") return null;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800">{isRtl ? "سجل المدفوعات" : "Payment Records"}</h1>
        </div>
        
        <div className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-3">
          <span className="text-sm opacity-80">{isRtl ? "إجمالي الإيرادات" : "Total Revenue"}</span>
          <span className="font-bold text-lg">{totalRevenue.toLocaleString()} {isRtl ? "ج.م" : "EGP"}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm border rounded-2xl bg-white">{isRtl ? "لا توجد حركات دفع مسجلة بعد" : "No payment transactions recorded yet"}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right text-slate-600">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">{isRtl ? "تاريخ الدفع" : "Payment Date"}</th>
                  <th className="px-6 py-4 font-semibold">{isRtl ? "العيادة" : "Clinic"}</th>
                  <th className="px-6 py-4 font-semibold">{isRtl ? "المبلغ" : "Amount"}</th>
                  <th className="px-6 py-4 font-semibold">{isRtl ? "تفاصيل العملية (Paymob)" : "Transaction Details (Paymob)"}</th>
                  <th className="px-6 py-4 font-semibold">{isRtl ? "حالة الدفع" : "Payment Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700 text-right" dir="ltr">
                      {new Date(p.created_at).toLocaleString("ar-EG")}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {p.clinicName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold">
                        {p.plan_price} ج.م
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> {isRtl ? "الطلب:" : "Order:"} {p.order_id || "N/A"}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3"/> {isRtl ? "الحركة:" : "Transaction:"} {p.transaction_id || "N/A"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700">
                        <CheckCircle className="w-3.5 h-3.5" /> ناجح
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
