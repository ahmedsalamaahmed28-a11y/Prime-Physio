"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, CheckCircle2, Stethoscope, Search, X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  therapist: string;
  time: string;
  duration: number;
  type: "استشارة" | "متابعة" | "جلسة" | "علاج";
  status: "مؤكد" | "قيد الانتظار" | "مكتمل" | "ملغي";
  notes?: string;
  day: number;
}

const THERAPISTS = ["د. أحمد السيد", "د. محمد عمر", "د. سارة خالد"];

const TYPE_COLORS: Record<string, string> = {
  "استشارة": "bg-blue-100 text-blue-800 border-blue-200",
  "متابعة": "bg-purple-100 text-purple-800 border-purple-200",
  "جلسة": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "علاج": "bg-orange-100 text-orange-800 border-orange-200",
};

const STATUS_COLORS: Record<string, string> = {
  "مؤكد": "bg-emerald-100 text-emerald-700",
  "قيد الانتظار": "bg-amber-100 text-amber-700",
  "مكتمل": "bg-muted text-muted-foreground",
  "ملغي": "bg-red-100 text-red-700",
};

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: "A-001", patientName: "سارة أحمد علي", patientId: "PT-20241012", therapist: "د. أحمد السيد", time: "09:00", duration: 45, type: "استشارة", status: "مؤكد", day: 0 },
  { id: "A-002", patientName: "أحمد محمد", patientId: "PT-20241023", therapist: "د. محمد عمر", time: "09:30", duration: 30, type: "متابعة", status: "مؤكد", day: 0 },
  { id: "A-003", patientName: "علي حسن محمد", patientId: "PT-20241031", therapist: "د. أحمد السيد", time: "10:30", duration: 45, type: "جلسة", status: "قيد الانتظار", day: 0 },
  { id: "A-004", patientName: "خالد سامي", patientId: "PT-20241105", therapist: "د. سارة خالد", time: "11:00", duration: 60, type: "علاج", status: "مؤكد", day: 1 },
  { id: "A-005", patientName: "نورا محمد", patientId: "PT-20241108", therapist: "د. محمد عمر", time: "12:00", duration: 45, type: "استشارة", status: "مؤكد", day: 1 },
  { id: "A-006", patientName: "سارة أحمد علي", patientId: "PT-20241012", therapist: "د. أحمد السيد", time: "09:00", duration: 45, type: "استشارة", status: "مكتمل", day: 2 },
  { id: "A-007", patientName: "مها أحمد", patientId: "PT-20241115", therapist: "د. سارة خالد", time: "10:00", duration: 30, type: "جلسة", status: "ملغي", day: 2 },
  { id: "A-008", patientName: "لمى محمود", patientId: "PT-20241120", therapist: "د. أحمد السيد", time: "11:30", duration: 45, type: "استشارة", status: "مؤكد", day: 3 },
  { id: "A-009", patientName: "فاطمة يوسف", patientId: "PT-20241122", therapist: "د. محمد عمر", time: "02:00", duration: 45, type: "متابعة", status: "قيد الانتظار", day: 4 },
  { id: "A-010", patientName: "إسراء هاني", patientId: "PT-20241125", therapist: "د. سارة خالد", time: "03:30", duration: 60, type: "علاج", status: "مؤكد", day: 4 },
];

const WEEK_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

function AppointmentCard({ appt, onClick, isRtl }: { appt: Appointment; onClick: () => void; isRtl: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-right p-2 rounded-lg border text-xs transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${TYPE_COLORS[appt.type]}`}
    >
      <div className="font-semibold truncate">{appt.patientName}</div>
      <div className="opacity-75 mt-0.5">{appt.time} - {appt.duration} {isRtl ? "دقيقة" : "min"}</div>
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="opacity-70 truncate">{appt.therapist.replace("د. ", "")}</span>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[appt.status]}`}>{appt.status}</span>
      </div>
    </button>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="p-5 rounded-xl w-full" style={{ backgroundColor: "#4F46BA" }}>
      <p className="text-xs font-bold text-white opacity-50">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-white opacity-80 text-xl">{icon}</span>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
      {sub && <p className="text-[10px] text-white opacity-40 mt-1">{sub}</p>}
    </div>
  );
}

function AppointmentModal({ appt, onClose, onSave }: {
  appt: Appointment | null;
  onClose: () => void;
  onSave: (a: Appointment) => void;
}) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const isNew = !appt?.id || appt.id === "new";
  const [form, setForm] = useState<Partial<Appointment>>(
    appt ?? { type: "استشارة", status: "مؤكد", therapist: THERAPISTS[0], duration: 45, day: 0, time: "09:00" }
  );

  if (!appt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" dir={isRtl ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{isNew ? (isRtl ? "إضافة موعد جديد" : "New Appointment") : (isRtl ? "تعديل الموعد" : "Edit Appointment")}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{isRtl ? "اسم المريض" : "Patient Name"}</Label>
            <Input
              placeholder={isRtl ? "أدخل اسم المريض..." : "Enter patient name..."}
              value={form.patientName ?? ""}
              onChange={(e) => setForm(f => ({ ...f, patientName: e.target.value }))}
              dir={isRtl ? "rtl" : "ltr"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isRtl ? "الوقت" : "Time"}</Label>
              <Input type="time" value={form.time ?? "09:00"} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "المدة (بالدقائق)" : "Duration (min)"}</Label>
              <Input type="number" min={15} max={120} step={15} value={form.duration ?? 45} onChange={(e) => setForm(f => ({ ...f, duration: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{isRtl ? "المعالج" : "Therapist"}</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.therapist}
              onChange={(e) => setForm(f => ({ ...f, therapist: e.target.value }))}
            >
              {THERAPISTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isRtl ? "نوع الموعد" : "Type"}</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value as Appointment["type"] }))}
              >
                {["استشارة", "متابعة", "جلسة", "علاج"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "الحالة" : "Status"}</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value as Appointment["status"] }))}
              >
                {["مؤكد", "قيد الانتظار", "مكتمل", "ملغي"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{isRtl ? "اليوم" : "Day"}</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.day}
              onChange={(e) => setForm(f => ({ ...f, day: Number(e.target.value) }))}
            >
              {WEEK_DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>

          {!isNew && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">{isRtl ? "رقم الموعد" : "Appointment ID"}</p>
              <p className="font-mono font-medium">{appt.id}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>{isRtl ? "إلغاء" : "Cancel"}</Button>
          <Button className="flex-1" onClick={() => {
            if (!form.patientName) return;
            onSave({
              id: isNew ? `A-${Date.now()}` : appt.id,
              patientName: form.patientName ?? "",
              patientId: form.patientId ?? "PT-NEW",
              therapist: form.therapist ?? THERAPISTS[0],
              time: form.time ?? "09:00",
              duration: form.duration ?? 45,
              type: form.type as Appointment["type"] ?? "استشارة",
              status: form.status as Appointment["status"] ?? "مؤكد",
              day: form.day ?? 0,
              notes: form.notes,
            });
          }}>
            {isNew ? (isRtl ? "حفظ الموعد" : "Save Appointment") : (isRtl ? "تحديث البيانات" : "Update")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const clinicId = user?.clinicId;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterTherapist, setFilterTherapist] = useState("الكل");
  const [searchQuery, setSearchQuery] = useState("");

  const loadAppointments = async () => {
    let query = supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (clinicId) {
      query = query.eq("clinic_id", clinicId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load appointments from Supabase", error);
      setAppointments([]);
      return;
    }

    setAppointments((data || []).map((row: any) => ({
      id: row.id,
      patientName: row.patient_name || "",
      patientId: row.patient_id || "",
      therapist: row.therapist || THERAPISTS[0],
      time: row.time || "09:00",
      duration: row.duration || 45,
      type: row.type || "استشارة",
      status: row.status || "مؤكد",
      notes: row.notes || "",
      day: typeof row.day === "number" ? row.day : 0,
    })));
  };

  useEffect(() => {
    loadAppointments();
  }, [clinicId]);

  const filtered = appointments.filter(a => {
    const matchTherapist = filterTherapist === "الكل" || a.therapist === filterTherapist;
    const matchSearch = !searchQuery || a.patientName.includes(searchQuery) || a.patientId.includes(searchQuery);
    return matchTherapist && matchSearch;
  });

  const today = filtered.filter(a => a.day === 0);
  const confirmed = appointments.filter(a => a.status === "مؤكد").length;
  const waiting = appointments.filter(a => a.status === "قيد الانتظار").length;
  const total = appointments.length;

  const handleSave = async (appt: Appointment) => {
    const { error } = await supabase.from("appointments").upsert({
      id: appt.id,
      patient_id: appt.patientId,
      patient_name: appt.patientName,
      therapist: appt.therapist,
      time: appt.time,
      duration: appt.duration,
      type: appt.type,
      status: appt.status,
      notes: appt.notes,
      day: appt.day,
      ...(clinicId ? { clinic_id: clinicId } : {}),
    });
    if (error) {
      console.error("Failed to save appointment to Supabase", error);
      alert(isRtl ? "حدث خطأ أثناء حفظ الموعد" : "An error occurred while saving the appointment");
      return;
    }
    await loadAppointments();
    setShowModal(false);
    setSelectedAppt(null);
  };

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{isRtl ? "جدول المواعيد" : "Appointment Schedule"}</h1>
              <p className="text-xs text-muted-foreground">
                {isRtl ? "الأحد 22 - 26 أكتوبر 2024" : "Sun 22 - 26 Oct 2024"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <ChevronRight className={`w-4 h-4 ${isRtl ? "" : "rotate-180"}`} />
              {isRtl ? "عرض التقويم" : "Calendar View"}
            </Button>
            <Button variant="outline" size="sm">
              {isRtl ? "أسبوع" : "Week"}
            </Button>
            <Button variant="outline" size="sm">
              {isRtl ? "عرض القائمة" : "List View"}
              <ChevronLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => { setSelectedAppt({ id: "new" } as Appointment); setShowModal(true); }}>
              <Plus className="w-4 h-4 ml-1" />
              {isRtl ? "إضافة جديد" : "Add New"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Calendar className="w-6 h-6 text-indigo-600" />}
            label={isRtl ? "إجمالي المواعيد" : "Total Appointments"}
            value={total}
            sub={isRtl ? "جميع المواعيد" : "All appointments"}
            color="bg-indigo-50 dark:bg-indigo-950/30"
          />
          <StatCard
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
            label={isRtl ? "المواعيد المؤكدة" : "Confirmed"}
            value={confirmed}
            sub={`${Math.round(confirmed/total*100)}% ${isRtl ? "نسبة التأكيد" : "confirmation rate"}`}
            color="bg-emerald-50 dark:bg-emerald-950/30"
          />
          <StatCard
            icon={<Clock className="w-6 h-6 text-amber-600" />}
            label={isRtl ? "قيد الانتظار" : "Pending"}
            value={waiting}
            sub={isRtl ? "إجراء سريع" : "Quick action"}
            color="bg-amber-50 dark:bg-amber-950/30"
          />
          <StatCard
            icon={<Stethoscope className="w-6 h-6 text-purple-600" />}
            label={isRtl ? "المعالجون النشطون" : "Active Therapists"}
            value={THERAPISTS.length}
            sub={isRtl ? "متاحون اليوم" : "Available today"}
            color="bg-purple-50 dark:bg-purple-950/30"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-2 flex-1 min-w-[200px] ${isRtl ? "flex-row" : ""}`}>
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                placeholder={isRtl ? "ابحث عن اسم المريض أو رقم الملف..." : "Search by patient name or file number..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm"
                dir={isRtl ? "rtl" : "ltr"}
              />
            </div>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <div className={`flex items-center gap-2 flex-wrap ${isRtl ? "" : "flex-row-reverse"}`}>
              <span className="text-sm text-muted-foreground">{isRtl ? "المعالج:" : "Therapist:"}</span>
              {["الكل", ...THERAPISTS].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterTherapist(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${filterTherapist === t ? "bg-indigo-600 text-white border-indigo-600" : "border-border hover:border-indigo-400 text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {isRtl ? "مخطط أسبوعي" : "Weekly Schedule"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Day headers */}
              <div className="grid grid-cols-5 border-b">
                {WEEK_DAYS.map((day, i) => {
                  const count = filtered.filter(a => a.day === i).length;
                  const isToday = i === 0;
                  return (
                    <div key={day} className={`p-3 text-center border-l last:border-l-0 ${isToday ? "bg-indigo-50 dark:bg-indigo-950/30" : ""}`}>
                      <p className={`text-sm font-semibold ${isToday ? "text-indigo-600" : "text-foreground"}`}>{day}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{22 + i} {isRtl ? "أكتوبر" : "Oct"}</p>
                      {count > 0 && (
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isToday ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"}`}>
                          {count} {isRtl ? "موعد" : "appt"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Appointment slots */}
              <div className="grid grid-cols-5 min-h-[400px]">
                {WEEK_DAYS.map((_, dayIdx) => {
                  const dayAppts = filtered.filter(a => a.day === dayIdx);
                  const isToday = dayIdx === 0;
                  return (
                    <div key={dayIdx} className={`p-2 border-l last:border-l-0 space-y-2 min-h-[300px] ${isToday ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""}`}>
                      {dayAppts.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-xs text-muted-foreground/50">
                            {isRtl ? "لا يوجد مواعيد" : "No appointments"}
                          </p>
                        </div>
                      ) : (
                        dayAppts
                          .sort((a, b) => a.time.localeCompare(b.time))
                          .map(appt => (
                            <AppointmentCard
                              key={appt.id}
                              appt={appt}
                              isRtl={isRtl}
                              onClick={() => { setSelectedAppt(appt); setShowModal(true); }}
                            />
                          ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  {isRtl ? "مواعيد اليوم" : "Today's Appointments"}
                </span>
                <Badge>{today.length} {isRtl ? "موعد" : "appt"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {today.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {isRtl ? "لا توجد مواعيد اليوم" : "No appointments today"}
                </p>
              ) : (
                today.sort((a, b) => a.time.localeCompare(b.time)).map(appt => (
                  <button
                    key={appt.id}
                    onClick={() => { setSelectedAppt(appt); setShowModal(true); }}
                    className="w-full text-right flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="text-center min-w-[48px]">
                      <p className="text-sm font-bold text-indigo-600">{appt.time}</p>
                      <p className="text-[10px] text-muted-foreground">{appt.duration}{isRtl ? "د" : "m"}</p>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{appt.patientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{appt.therapist} - {appt.type}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[appt.status]}`}>{appt.status}</span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Therapist Load */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-indigo-600" />
                {isRtl ? "عبء المعالجين (جميع المواعيد)" : "Therapist Load (All Appointments)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {THERAPISTS.map(therapist => {
                const count = appointments.filter(a => a.therapist === therapist).length;
                const pct = appointments.length > 0 ? Math.round((count / appointments.length) * 100) : 0;
                const confirmedCount = appointments.filter(a => a.therapist === therapist && a.status === "مؤكد").length;
                return (
                  <div key={therapist} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          {therapist.replace("د. ", "").charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{therapist}</span>
                      </div>
                      <div className={isRtl ? "text-left" : "text-right"}>
                        <span className="text-sm font-semibold">{count}</span>
                        <span className="text-xs text-muted-foreground"> {isRtl ? "موعد" : "appt"}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{pct}% {isRtl ? "من الإجمالي" : "of total"}</span>
                      <span className="text-emerald-600 font-medium">{confirmedCount} {isRtl ? "مؤكد" : "confirmed"}</span>
                    </div>
                    <Separator />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <AppointmentModal
          appt={selectedAppt}
          onClose={() => { setShowModal(false); setSelectedAppt(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
