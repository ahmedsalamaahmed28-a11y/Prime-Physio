"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  CheckCircle2, 
  DollarSign, 
  Play, 
  Calendar, 
  Clock,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const VISIT_COLORS: Record<string, string> = {
  "╪¼┘ä╪│╪⌐ ╪╣┘ä╪º╪¼": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Therapy Session": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "┘â╪┤┘ü ╪ú┘ê┘ä":   "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Initial Exam":   "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "┘à╪¬╪º╪¿╪╣╪⌐":    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "Follow-up":    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "╪¬┘é┘è┘è┘à":     "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Assessment":     "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

const STATUS_COLORS: Record<string, string> = {
  "┘å╪┤╪╖":   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400",
  "Active":   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400",
  "╪║┘è╪▒ ┘å╪┤╪╖": "bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-450",
  "Inactive": "bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-450",
};

export default function HomePage() {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const clinicId = user?.clinicId;

  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayIncome, setTodayIncome] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);

  useEffect(() => {
    async function fetchAppointmentsAndPatients() {
      try {
        setIsLoading(true);

        // 1. Fetch total patients
        let totalPatientsCount = 0;
        const { count, error: countErr } = await supabase
          .from("patients")
          .select("*", { count: 'exact', head: true })
          .eq('clinic_id', clinicId);
        if (!countErr && count !== null) {
          totalPatientsCount = count;
        } else {
          const { data: dbPatients } = await supabase.from("patients").select("id").eq('clinic_id', clinicId);
          if (dbPatients) totalPatientsCount = dbPatients.length;
        }
        
        setTotalPatients(totalPatientsCount);

        // 2. Fetch today's income strictly from Invoices where status is Paid
        let incomeSum = 0;
        const todayStr = new Date().toISOString().split("T")[0];
        const { data: paidInvoices, error: invErr } = await supabase
          .from("invoices")
          .select("amount")
          .eq('clinic_id', clinicId)
          .eq("date", todayStr)
          .in("status", ["┘à╪»┘ü┘ê╪╣", "Paid"]);
          
        if (!invErr && paidInvoices) {
          incomeSum = paidInvoices.reduce((sum, inv) => sum + parseInt(inv.amount.replace(/[^0-9]/g, "") || "0"), 0);
        }
        setTodayIncome(incomeSum);

        // 3. Fetch real upcoming appointments from Supabase, but only for paid invoices
        const { data: paidInvoiceRows, error: paidInvErr } = await supabase
          .from("invoices")
          .select("patient_id, status")
          .eq('clinic_id', clinicId)
          .eq("status", "┘à╪»┘ü┘ê╪╣");

        if (paidInvErr) {
          console.warn("Failed to load paid invoices for homepage", paidInvErr);
        }

        const paidPatientIds = new Set(
          (paidInvoiceRows || [])
            .map((inv: any) => inv.patient_id)
            .filter(Boolean)
        );

        // 4. Fetch real upcoming appointments from Supabase for today
        let finalAppointments: any[] = [];
        const { data: realAppointments, error: aptError } = await supabase
          .from("appointments")
          .select("*")
          .eq('clinic_id', clinicId)
          .order("start_time", { ascending: true });

        const todayDateStr = new Date().toDateString();

        if (!aptError && realAppointments && realAppointments.length > 0) {
          finalAppointments = realAppointments
            .filter(a =>
              new Date(a.start_time).toDateString() === todayDateStr &&
              a.status !== "┘à┘ä╪║┘è" &&
              paidPatientIds.has(a.patient_id)
            )
            .map(a => {
              const start = new Date(a.start_time);
              const end = new Date(a.end_time);
              return {
                id: a.id,
                patientId: a.patient_id,
                time: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
                doctor: a.doctor_name,
                type: a.appointment_type,
                status: a.status,
                name: a.patient_name,
                nameAr: a.patient_name
              };
            });
        }


        setAppointments(finalAppointments);
      } catch (err) {
        console.warn("Database fetch failed or empty on homepage:", err);
        setTodayIncome(0);
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAppointmentsAndPatients();
  }, []);

  const totalSessions = appointments.length;
  const completedSessions = appointments.filter(apt => apt.status === "┘å╪┤╪╖" || apt.status === "Active").length;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  const localizedStats = [
    {
      title: isRtl ? "╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘à╪▒╪╢┘ë" : "Total Patients",
      value: isRtl ? `${totalPatients} ┘à╪▒┘è╪╢` : `${totalPatients} Patients`,
      description: isRtl ? "╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘à╪│╪¼┘ä┘è┘å ┘ü┘è ╪º┘ä╪╣┘è╪º╪»╪⌐" : "Total registered in clinic",
      icon: Users,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: isRtl ? "╪¼┘ä╪│╪º╪¬ ╪º┘ä┘è┘ê┘à" : "Today's Sessions",
      value: isRtl ? `${totalSessions} ╪¼┘ä╪│╪º╪¬` : `${totalSessions} Sessions`,
      description: isRtl ? "┘à┘ê╪▓╪╣╪⌐ ╪«┘ä╪º┘ä ╪│╪º╪╣╪º╪¬ ╪º┘ä╪╣┘à┘ä" : "Distributed during work hours",
      icon: Calendar,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20",
    },
    {
      title: isRtl ? "╪º┘ä┘à┘â╪¬┘à┘ä╪⌐ ╪º┘ä┘è┘ê┘à" : "Completed Today",
      value: isRtl ? `${completedSessions} ╪¼┘ä╪│╪º╪¬` : `${completedSessions} Sessions`,
      description: isRtl ? `┘à╪╣╪»┘ä ╪Ñ┘å╪¼╪º╪▓ ╪º┘ä┘è┘ê┘à ${completionRate}%` : `Completion rate ${completionRate}%`,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      title: isRtl ? "╪»╪«┘ä ╪º┘ä┘è┘ê┘à" : "Today's Income",
      value: isRtl ? `${todayIncome.toLocaleString()} ╪¼.┘à` : `${todayIncome.toLocaleString()} EGP`,
      description: isRtl ? "+15% ╪▓┘è╪º╪»╪⌐ ╪╣┘å ╪º┘ä╪ú╪│╪¿┘ê╪╣ ╪º┘ä┘à╪º╪╢┘è" : "+15% from last week",
      icon: DollarSign,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20",
    },
  ];

  const localizedAppointments = appointments.map(apt => {
    const defaultName = apt.name || apt.nameAr;
    return {
      ...apt,
      name: defaultName,
      doctor: isRtl ? apt.doctor : (apt.doctor === "╪». ╪ú╪¡┘à╪» ╪│┘ä╪º┘à╪⌐" ? "Dr. Ahmed Salama" : 
                                   apt.doctor === "╪». ╪«╪º┘ä╪» ╪╣┘à╪▒" ? "Dr. Khaled Omar" : 
                                   apt.doctor === "╪». ╪│╪º╪▒╪⌐ ╪ú╪¡┘à╪»" ? "Dr. Sara Ahmed" : apt.doctor),
      type: isRtl ? apt.type : (apt.type === "╪¼┘ä╪│╪⌐ ╪╣┘ä╪º╪¼" ? "Therapy Session" : 
                               apt.type === "┘â╪┤┘ü ╪ú┘ê┘ä" ? "Initial Exam" :
                               apt.type === "┘à╪¬╪º╪¿╪╣╪⌐" ? "Follow-up" : 
                               apt.type === "╪¬┘é┘è┘è┘à" ? "Assessment" : apt.type),
      status: isRtl ? apt.status : (apt.status === "┘å╪┤╪╖" ? "Active" : 
                                   apt.status === "╪║┘è╪▒ ┘å╪┤╪╖" ? "Inactive" : apt.status)
    };
  });

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* ΓöÇΓöÇΓöÇ Header ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? "" : "flex-row-reverse"}`}>
        <div>
          <h1 className={`text-2xl font-bold text-[#0d8a8a] dark:text-[#1ab0b2] flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
            <span>≡ƒæï</span> {isRtl ? "┘à╪▒╪¡╪¿╪º ╪¿╪╣┘ê╪»╪¬┘â╪î Prime Physio" : "Welcome back, Prime Physio"}
          </h1>
          <p className="text-xs font-semibold text-[#0d8a8a] dark:text-[#1ab0b2] mt-1 tracking-wide">{t("dashboard")}</p>
          <p className="text-sm text-slate-500 mt-0.5">{t("dashboard_desc")}</p>
        </div>
        <div className={`flex gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
          <Link href="/calendar">
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              {t("daily_calendar")}
            </Button>
          </Link>
          <Link href="/patients">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Users className="w-4 h-4" />
              {t("patients_record")}
            </Button>
          </Link>
        </div>
      </div>

      {/* ΓöÇΓöÇΓöÇ Stats Cards ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <div className="grid grid-cols-2 gap-4">
        {localizedStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-xs hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className={`flex items-center justify-between ${isRtl ? "" : "flex-row-reverse"}`}>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{stat.title}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{stat.title}</p>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className={`flex items-center gap-1 mt-2 text-[11px] text-muted-foreground ${isRtl ? "" : "flex-row-reverse"}`}>
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span>{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ΓöÇΓöÇΓöÇ Today's Appointments Table ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
      <Card className="shadow-xs">
        <CardHeader className={`flex flex-row items-center justify-between border-b pb-4 px-6 ${isRtl ? "" : "flex-row-reverse"}`}>
          <div className="space-y-1">
            <CardTitle className={`text-lg font-bold flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
              <Clock className="w-5 h-5 text-blue-600" />
              {t("todays_appointments")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {isRtl 
                ? `┘é╪º╪ª┘à╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘à╪│╪¼┘ä╪⌐ ┘ä┘è┘ê┘à ${new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}`
                : `Scheduled list for ${new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}`
              }
            </p>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {localizedAppointments.length} {isRtl ? "┘à┘ê╪º╪╣┘è╪»" : "Appointments"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className={`w-full ${isRtl ? "text-right" : "text-left"} border-collapse`}>
              <thead>
                <tr className="bg-muted/40 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">{isRtl ? "╪º┘ä┘à╪▒┘è╪╢" : "Patient"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "╪º┘ä┘ê┘é╪¬" : "Time"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "╪º┘ä┘à╪╣╪º┘ä╪¼" : "Therapist"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "┘å┘ê╪╣ ╪º┘ä╪▓┘è╪º╪▒╪⌐" : "Visit Type"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "╪º┘ä╪¡╪º┘ä╪⌐" : "Status"}</th>
                  <th className="py-3.5 px-6 text-center">{isRtl ? "╪º┘ä╪Ñ╪¼╪▒╪º╪í╪º╪¬" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm text-slate-700">
                {localizedAppointments.length > 0 ? (
                  localizedAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Patient Name & ID */}
                      <td className="py-4 px-6">
                        <Link href={`/patients/${apt.patientId}`} className="font-semibold text-[#0d8a8a] hover:underline dark:text-[#1ab0b2]">
                          {apt.name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{apt.patientId}</div>
                      </td>
                      {/* Time */}
                      <td className="py-4 px-6 text-slate-600">
                        <div className={`flex items-center gap-1.5 font-medium ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{apt.time}</span>
                        </div>
                      </td>
                      {/* Doctor */}
                      <td className="py-4 px-6 text-slate-600">{apt.doctor}</td>
                      {/* Visit Type */}
                      <td className="py-4 px-6">
                        <Badge className={`${VISIT_COLORS[apt.type] || "bg-slate-100 text-slate-800"} font-normal border-0`}>
                          {apt.type}
                        </Badge>
                      </td>
                      {/* Status */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[apt.status] || "bg-slate-100"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            apt.status === "┘å╪┤╪╖" || apt.status === "Active" ? "bg-emerald-500" : "bg-red-500"
                          }`} />
                          {apt.status}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <Link href={`/patients/${apt.id}`}>
                          <Button 
                            size="sm" 
                            className={`bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs gap-1.5 rounded-lg py-1 px-3.5 h-8 hover:-translate-y-0.5 transition-transform ${isRtl ? "" : "flex-row-reverse"}`}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            {t("start_session")}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      {isRtl ? "┘ä╪º ╪¬┘ê╪¼╪» ┘à┘ê╪º╪╣┘è╪» ┘à╪│╪¼┘ä╪⌐ ┘ä┘ä┘è┘ê┘à." : "No appointments scheduled for today."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
