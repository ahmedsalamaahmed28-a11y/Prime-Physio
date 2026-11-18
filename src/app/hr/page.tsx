"use client";

import { useState, useEffect } from "react";
import { Building, Clock, DollarSign, FileText, Activity, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";

export default function HRPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const clinicId = user?.clinicId;

  const [attendances, setAttendances] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      if (!clinicId) {
        setAttendances([]);
        setPayrolls([]);
        setLoadError("");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setLoadError("");
      try {
        const [attendanceResult, payrollResult] = await Promise.all([
          supabase.from("hr_attendance").select("*, staff:staff_id(name, role)").eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(20),
          supabase.from("payroll_drafts").select("*, staff:staff_id(name, role)").eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(20)
        ]);
        if (!active) return;
        if (attendanceResult.error || payrollResult.error) {
          console.error("HR data query errors:", { attendance: attendanceResult.error, payroll: payrollResult.error });
          setLoadError(isRtl
            ? "تعذر تحميل بعض بيانات الموارد البشرية. تحقق من صلاحيات الحساب والاتصال ثم أعد المحاولة."
            : "Some HR data could not be loaded. Check account permissions and connection, then retry.");
        }
        setAttendances(attendanceResult.error ? [] : attendanceResult.data || []);
        setPayrolls(payrollResult.error ? [] : payrollResult.data || []);
      } catch (err) {
        console.error("Failed to load HR data:", err);
        if (active) {
          setAttendances([]);
          setPayrolls([]);
          setLoadError(isRtl ? "حدث خطأ أثناء تحميل بيانات الموارد البشرية." : "An error occurred while loading HR data.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    fetchData();
    return () => { active = false; };
  }, [clinicId, retryKey, isRtl]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <div className="bg-blue-50 p-2 rounded-xl">
            <Building className="w-6 h-6 text-[#4F46BA]" />
          </div>
          {isRtl ? "الموارد البشرية والرواتب (مدعوم بالذكاء الاصطناعي)" : "HR & Payroll (AI-Powered)"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isRtl ? "سجلات الحضور اليومية ومسودات الرواتب المعالجة آلياً عبر وكلاء n8n" : "Daily attendance records and automated payroll drafts processed by n8n agents"}
        </p>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-bold hover:bg-rose-100">
            {isRtl ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Card */}
        <Card className="shadow-sm border-slate-100 rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              <Clock className="w-5 h-5 text-indigo-600" />
              {isRtl ? "سجل الحضور والانصراف" : "Attendance Records"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-0">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-500">{isRtl ? "جاري التحميل..." : "Loading..."}</div>
            ) : attendances.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Activity className="w-8 h-8 text-slate-300" />
                {isRtl ? "لا توجد سجلات حضور بعد. سيقوم AI بتسجيلها قريباً." : "No attendance records yet. AI will log them soon."}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {attendances.map((item, i) => (
                  <div key={i} className="p-4 flex flex-col gap-2 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.staff?.name || "Unknown"}</p>
                        <p className="text-[10px] text-slate-500">{item.staff?.role || "Staff"}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        item.status?.toLowerCase() === 'present' ? 'bg-emerald-100 text-emerald-700' :
                        item.status?.toLowerCase() === 'late' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-600 mt-1">
                      <span>{isRtl ? "التاريخ:" : "Date:"} <span className="font-medium text-slate-800">{item.date}</span></span>
                      <span>{isRtl ? "دخول:" : "In:"} <span className="font-medium text-slate-800">{item.clock_in?.substring(0,5) || "-"}</span></span>
                      <span>{isRtl ? "خروج:" : "Out:"} <span className="font-medium text-slate-800">{item.clock_out?.substring(0,5) || "-"}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payroll Card */}
        <Card className="shadow-sm border-slate-100 rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-emerald-50/30 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              {isRtl ? "مسودات الرواتب (AI Drafts)" : "Payroll Drafts"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-0">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-500">{isRtl ? "جاري التحميل..." : "Loading..."}</div>
            ) : payrolls.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Activity className="w-8 h-8 text-slate-300" />
                {isRtl ? "لم يقم الوكيل المالي بمعالجة الرواتب لهذا الشهر بعد." : "Financial agent hasn't processed payrolls for this month yet."}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {payrolls.map((item, i) => {
                  const baseSalary = Number(item.base_salary ?? 0) || 0;
                  const bonuses = Number(item.bonuses ?? 0) || 0;
                  const commissions = Number(item.commissions ?? 0) || 0;
                  const deductions = Number(item.deductions ?? 0) || 0;
                  const net = baseSalary + bonuses + commissions - deductions;
                  return (
                  <div key={i} className="p-4 flex flex-col gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-100 p-2 rounded-lg">
                          <FileText className="w-4 h-4 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.staff?.name || "Unknown"}</p>
                          <p className="text-[10px] text-slate-500">{item.month_year}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">{net.toLocaleString()} {isRtl ? "ج.م" : "EGP"}</p>
                        <p className="text-[10px] text-slate-500">{isRtl ? "الصافي المستحق" : "Net Payable"}</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs border border-slate-100">
                      <div>
                        <p className="text-slate-500 text-[10px]">{isRtl ? "الأساسي" : "Base"}</p>
                        <p className="font-bold text-slate-700">{baseSalary.toLocaleString()}</p>
                      </div>
                      <div className="border-x border-slate-200">
                        <p className="text-emerald-600 text-[10px]">{isRtl ? "مكافآت" : "Bonuses"}</p>
                        <p className="font-bold text-emerald-700">+{(bonuses + commissions).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-red-500 text-[10px]">{isRtl ? "خصومات" : "Deductions"}</p>
                        <p className="font-bold text-red-600">-{deductions.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
