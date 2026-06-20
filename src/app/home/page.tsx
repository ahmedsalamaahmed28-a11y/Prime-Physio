"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const clinicId = user?.clinicId;

  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayIncome, setTodayIncome] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);

  useEffect(() => {
    if (clinicId === undefined) return;
    async function fetchData() {
      try {
        setIsLoading(true);
        let totalPatientsCount = 0;
        const qb = supabase.from("patients");
        const q = clinicId ? qb.select("*", { count: "exact", head: true }).eq("clinic_id", clinicId) : qb.select("*", { count: "exact", head: true });
        const { count, error: countErr } = await q;
        if (!countErr && count !== null) totalPatientsCount = count;
        else if (clinicId) {
          const { data: dbPatients } = await supabase.from("patients").select("id").eq("clinic_id", clinicId);
          if (dbPatients) totalPatientsCount = dbPatients.length;
        }
        setTotalPatients(totalPatientsCount);

        let incomeSum = 0;
        const todayStr = new Date().toISOString().split("T")[0];
        if (clinicId) {
          const { data: paidInvoices } = await supabase
            .from("invoices")
            .select("amount").eq("clinic_id", clinicId).eq("date", todayStr).in("status", ["مدفوع", "Paid"]);
          if (paidInvoices) incomeSum = paidInvoices.reduce((sum, inv) => sum + parseInt(inv.amount.replace(/[^0-9]/g, "") || "0"), 0);
        }
        setTodayIncome(incomeSum);

        const paidPatientIds = new Set<string>();
        if (clinicId) {
          const { data: paidInvoiceRows } = await supabase
            .from("invoices").select("patient_id, status").eq("clinic_id", clinicId).eq("status", "مدفوع");
          (paidInvoiceRows || []).map((inv: any) => inv.patient_id).filter(Boolean).forEach((id: string) => paidPatientIds.add(id));
        }

        if (clinicId) {
          const { data: realAppointments } = await supabase
            .from("appointments").select("*").eq("clinic_id", clinicId).order("start_time", { ascending: true });
          const todayDateStr = new Date().toDateString();
          if (realAppointments && realAppointments.length > 0) {
            setAppointments(
              realAppointments.filter((a: any) => new Date(a.start_time).toDateString() === todayDateStr && a.status !== "ملغي" && paidPatientIds.has(a.patient_id))
                .map((a: any) => {
                  const start = new Date(a.start_time);
                  const end = new Date(a.end_time);
                  return {
                    id: a.id, patientId: a.patient_id,
                    time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")} - ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
                    doctor: a.doctor_name, type: a.appointment_type, status: a.status, name: a.patient_name,
                  };
                })
            );
          }
        }
      } catch {
        setTodayIncome(0); setAppointments([]);
      } finally { setIsLoading(false); }
    }
    fetchData();
  }, [clinicId]);

  if (isLoading) return null;

  const totalSessions = appointments.length;
  const completedSessions = appointments.filter((a) => a.status === "منتهي").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {isRtl ? "مرحباً بعودتك!" : "Welcome back!"}
            </h1>
            <p className="text-sm text-zinc-500 font-semibold mt-1">
              {isRtl ? "نظرة عامة على نشاط العيادة اليوم" : "Clinic activity overview"}
            </p>
          </div>
        </div>

        {/* Performance Cards */}
        <h2 className="text-base font-bold text-gray-700 mb-4">{isRtl ? "نشاط اليوم" : "Today's Activity"}</h2>
        <div className="flex justify-between space-y-3 mb-8 flex-col md:flex-row md:space-x-4 md:space-y-0">
          {[
            { label: isRtl ? "المرضى" : "PATIENTS", value: `${totalPatients}`, color: "#4F46BA" },
            { label: isRtl ? "الجلسات" : "SESSIONS", value: `${totalSessions}`, color: "#4F46BA" },
            { label: isRtl ? "المكتملة" : "COMPLETED", value: `${completedSessions}`, color: "#4F46BA" },
            { label: isRtl ? "الدخل" : "INCOME", value: `${todayIncome.toLocaleString()} ${isRtl ? "ج.م" : "EGP"}`, color: "#4F46BA" },
          ].map((s) => (
            <div key={s.label} className="p-5 rounded-xl w-full" style={{ backgroundColor: s.color }}>
              <p className="text-xs font-bold text-white opacity-50">{s.label}</p>
              <p className="text-lg font-semibold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Lower row: Weekly/Monthly target */}
        <h2 className="text-base font-bold text-gray-700 mb-4">{isRtl ? "الإحصائيات" : "Statistics"}</h2>
        <div className="flex flex-col items-center space-y-4 xl:flex-row xl:space-y-0 xl:space-x-4 mb-8">
          <div className="w-full py-4 px-8 bg-white rounded-xl shadow-sm flex items-center justify-between border border-gray-100">
            <div>
              <p className="text-lg text-[#393939] font-bold mb-2">{isRtl ? "المستهدف الأسبوعي" : "Weekly Target"}</p>
              <p className="text-[#4D4A81] font-semibold text-sm">
                {totalSessions > 0 ? `${Math.min(Math.round((completedSessions / Math.max(totalSessions, 1)) * 100), 100)}% ${isRtl ? "منجز" : "achieved"}` : "0%"}
              </p>
            </div>
            <hr className="h-16 w-0.5 bg-[#F6F6FC]" />
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#F6F6FC" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#4F46BA" strokeWidth="3" strokeDasharray={`${totalSessions > 0 ? (completedSessions / Math.max(totalSessions, 1)) * 100 : 0} 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#4D4A81]">{totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%</span>
            </div>
          </div>
          <div className="w-full py-4 px-8 rounded-xl shadow-sm flex items-center justify-between border border-gray-100" style={{ backgroundColor: "#51459E" }}>
            <div>
              <p className="text-lg text-white font-bold mb-2">{isRtl ? "المستهدف الشهري" : "Monthly Target"}</p>
              <p className="text-white/80 font-semibold text-sm">
                {isRtl ? `${totalPatients} مريض مسجل` : `${totalPatients} patients registered`}
              </p>
            </div>
            <hr className="h-16 w-0.5 bg-white/20" />
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#F9896B" strokeWidth="3" strokeDasharray={`${Math.min(totalPatients / 100 * 100, 100)} 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{totalPatients > 50 ? "50%" : "25%"}</span>
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">
              {isRtl ? "مواعيد اليوم" : "Today's Appointments"}
            </h3>
            <span className="text-xs font-semibold text-zinc-400 bg-gray-50 px-3 py-1 rounded-full">
              {appointments.length} {isRtl ? "موعد" : "appts"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-zinc-500">
                  <th className="py-3.5 px-6 text-right">{isRtl ? "المريض" : "Patient"}</th>
                  <th className="py-3.5 px-6 text-right">{isRtl ? "الوقت" : "Time"}</th>
                  <th className="py-3.5 px-6 text-right">{isRtl ? "المعالج" : "Therapist"}</th>
                  <th className="py-3.5 px-6 text-right">{isRtl ? "النوع" : "Type"}</th>
                  <th className="py-3.5 px-6 text-center">{isRtl ? "حالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.length > 0 ? appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-6">
                      <Link href={`/patients/${apt.patientId}`} className="font-semibold text-[#4F46BA] hover:underline text-sm">
                        {apt.name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-6 text-zinc-600">{apt.time}</td>
                    <td className="py-3.5 px-6 text-zinc-600">{apt.doctor}</td>
                    <td className="py-3.5 px-6">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {apt.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        apt.status === "مؤكد" ? "bg-emerald-50 text-emerald-700" :
                        apt.status === "انتظار" ? "bg-amber-50 text-amber-700" :
                        apt.status === "منتهي" ? "bg-slate-100 text-slate-500" :
                        "bg-red-50 text-red-600"
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-12 text-center text-zinc-400 text-sm">{isRtl ? "لا توجد مواعيد لليوم" : "No appointments today"}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

    </div>
  );
}
