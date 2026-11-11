"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function HomePage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user, isEnriching } = useAuth();
  const clinicId = user?.clinicId;

  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [todayIncome, setTodayIncome] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);
  const [trialInfo, setTrialInfo] = useState<{ isTrial: boolean; endDate: string | null }>({ isTrial: false, endDate: null });

  useEffect(() => {
    if (clinicId === undefined) {
      if (isEnriching) {
        setIsLoading(true);
        return;
      }
      setLoadError("تعذر التحقق من ارتباط حسابك بالعيادة. أعد تحميل الصفحة، وإذا استمرت المشكلة تواصل مع مسؤول المنصة.");
      setIsLoading(false);
      return;
    }

    if (clinicId === null) {
      // The membership lookup may still be completing after the auth session resolves.
      // Keep the full-page skeleton visible until enrichment has definitively finished.
      if (isEnriching) {
        setLoadError(null);
        setIsLoading(true);
        return;
      }
      setLoadError("هذا الحساب غير مرتبط بعيادة حتى الآن. أكمل إعداد العيادة أولاً.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    async function fetchData() {
      try {
        setIsLoading(true);
        setLoadError(null);
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
            .from("appointments").select("id,patient_id,patient_name,doctor_name,appointment_type,status,start_time,end_time").eq("clinic_id", clinicId).order("start_time", { ascending: true });
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
        if (!cancelled) setLoadError("تعذر تحميل بعض بيانات الصفحة. تحقق من اتصال الإنترنت ثم أعد المحاولة.");
      }

      try {
        if (clinicId) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('is_trial, end_date')
            .eq('user_email', user?.email?.toLowerCase().trim())
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1);
          if (subData && subData.length > 0 && subData[0].is_trial) {
            setTrialInfo({ isTrial: true, endDate: subData[0].end_date });
          }
        }
      } catch {
        if (!cancelled) setLoadError("تعذر تحميل بيانات الاشتراك حالياً.");
      }

      if (!cancelled) setIsLoading(false);
    }
    fetchData();
    return () => { cancelled = true; };
  }, [clinicId, isEnriching, user?.email]);

  if (isLoading) {
    // Use the shared full-page skeleton so the sidebar, header and page body
    // transition together instead of showing mixed loaded/loading regions.
    return <LoadingSpinner />;
  }

  if (loadError) {
    return (
      <div className="min-h-[320px] flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm" dir={isRtl ? "rtl" : "ltr"}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 text-xl">!</div>
          <h1 className="text-lg font-bold text-slate-800">{isRtl ? "تعذر تحميل الصفحة" : "Unable to load Home"}</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">{isRtl ? loadError : "We could not resolve your clinic or load the dashboard data. Please reload and try again."}</p>
          <button onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-[#4F46BA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#433aa3]">{isRtl ? "إعادة المحاولة" : "Try again"}</button>
        </div>
      </div>
    );
  }

  const greetingName = (isRtl ? user?.name : (user?.nameEn || user?.name)) || "";
  const cleanGreetingName = greetingName.replace(/^(د\.?\s*|د\/\s*|Dr\.\s*)/i, "").trim();
  const greetingParts = cleanGreetingName.split(/\s+/).filter(Boolean);
  const firstAndLastName = greetingParts.length > 1
    ? `${greetingParts[0]} ${greetingParts[greetingParts.length - 1]}`
    : (greetingParts[0] || "");
  const greeting = firstAndLastName
    ? (isRtl ? `مرحباً د. ${firstAndLastName}` : `Welcome Dr. ${firstAndLastName}`)
    : (isRtl ? "مرحباً بعودتك!" : "Welcome back!");

  const totalSessions = appointments.length;
  const completedSessions = appointments.filter((a) => a.status === "منتهي").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-8 flex-col sm:flex-row gap-4 sm:gap-0">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {greeting}
            </h1>
            <p className="text-sm text-zinc-500 font-semibold mt-1">
              {isRtl ? "نظرة عامة على نشاط العيادة اليوم" : "Clinic activity overview"}
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Link href="/calendar" className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              {isRtl ? "التقويم" : "Calendar"}
            </Link>
            <Link href="/patients" className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-[#4F46BA] text-white rounded-lg text-sm font-semibold hover:bg-[#433aa3] transition-colors shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              {isRtl ? "سجل المرضى" : "Patients"}
            </Link>
          </div>
        </div>

        {trialInfo.isTrial && (() => {
          const daysLeft = trialInfo.endDate ? Math.max(0, Math.ceil((new Date(trialInfo.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 7;
          return (
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-xl px-5 py-3 text-center shadow-lg mb-6">
            <p className="text-sm font-bold">
              {isRtl
                ? `🎉 أنت تستخدم الخطة الذهبية مجاناً — متبقي ${daysLeft} أيام`
                : `🎉 You're on a free Gold trial — ${daysLeft} days left`}
            </p>
            <Link href="/subscription" className="text-xs underline font-medium mt-1 inline-block">
              {isRtl ? "عرض تفاصيل الخطط" : "View plan details"}
            </Link>
          </div>
          );
        })()}

        {/* Performance Cards */}
        <h2 className="text-base font-bold text-gray-700 mb-4">{isRtl ? "نشاط اليوم" : "Today's Activity"}</h2>
        <div className="flex justify-between space-y-3 mb-8 flex-col md:flex-row md:space-x-4 md:space-y-0">
          {[
            { label: isRtl ? "المرضى" : "PATIENTS", value: `${totalPatients}`, color: "#4F46BA" },
            { label: isRtl ? "الجلسات" : "SESSIONS", value: `${totalSessions}`, color: "#4F46BA" },
            { label: isRtl ? "المكتملة" : "COMPLETED", value: `${completedSessions}`, color: "#4F46BA" },
            { label: isRtl ? "الدخل" : "INCOME", value: `${todayIncome.toLocaleString()} ${isRtl ? "ج.م" : "EGP"}`, color: "#4F46BA" },
          ].map((s) => (
            <div key={s.label} className="p-5 rounded-xl w-full bg-[#4F46BA]">
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
          <div className="w-full py-4 px-8 rounded-xl shadow-sm flex items-center justify-between border border-gray-100 bg-[#51459E]">
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
