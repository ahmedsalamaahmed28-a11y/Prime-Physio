"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { usePermissions } from "@/lib/usePermissions";
import { useAuth } from "@/lib/auth";
import CustomMonthCalendar from "@/components/CustomMonthCalendar";
import SelectMenu from "@/components/SelectMenu";
import AlertPopup from "@/components/AlertPopup";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  patientName: string;
  patientId: string;
  doctor: string;
  visitType: VisitType;
  status: "مؤكد" | "انتظار" | "منتهي" | "ملغي";
  notes?: string;
}

type VisitType = "جلسة علاج" | "كشف أول" | "متابعة" | "تقييم";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PATIENTS: any[] = [];
const VISIT_TYPES: VisitType[] = ["جلسة علاج", "كشف أول", "متابعة", "تقييم"];

const VISIT_COLORS: Record<VisitType, string> = {
  "جلسة علاج": "#4F46BA",
  "كشف أول":   "#7c3aed",
  "متابعة":    "#0891b2",
  "تقييم":     "#d97706",
};

const STATUS_STYLES: Record<string, string> = {
  "مؤكد":   "bg-emerald-50 text-emerald-700 border-emerald-300",
  "انتظار": "bg-amber-50 text-amber-700 border-amber-300",
  "منتهي":  "bg-slate-100 text-slate-600 border-slate-300",
  "ملغي":   "bg-red-50 text-red-700 border-red-300",
};

const now = new Date();
const d = (offset: number, h: number, m = 0) => {
  const date = new Date(now);
  date.setDate(date.getDate() + offset);
  date.setHours(h, m, 0, 0);
  return date;
};

const INITIAL_EVENTS: CalendarEvent[] = [];

// ─── New Appointment Form ─────────────────────────────────────────────────────

function NewAppointmentDialog({
  open,
  selectedDate,
  patientsList,
  doctorsList,
  onClose,
  onSave,
}: {
  open: boolean;
  selectedDate: Date | null;
  patientsList: any[];
  doctorsList: {name:string}[];
  onClose: () => void;
  onSave: (ev: CalendarEvent) => void;
}) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [patientId, setPatientId] = useState("");
  const [doctor, setDoctor] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("جلسة علاج");
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && patientsList.length > 0) {
      setPatientId(patientsList[0].id);
    }
  }, [open, patientsList]);

  const tVisitType = (type: VisitType) => {
    if (isRtl) return type;
    const map: Record<VisitType, string> = {
      "جلسة علاج": "Therapy Session",
      "كشف أول": "First Exam",
      "متابعة": "Follow-up",
      "تقييم": "Assessment"
    };
    return map[type] || type;
  };

  const handleSave = () => {
    if (!selectedDate || patientsList.length === 0) return;
    const patient = patientsList.find((p) => p.id === patientId) || patientsList[0];
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + duration * 60000);
    const pName = isRtl ? patient.nameAr : (patient.nameEn || patient.nameAr);
    onSave({
      id: `E-${Date.now()}`,
      title: `${pName} — ${visitType}`,
      start,
      end,
      patientName: pName,
      patientId: patient.id,
      doctor,
      visitType,
      status: "مؤكد",
      notes,
    });
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-md ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 text-lg font-heading ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-base">➕</span>
            <span>{isRtl ? "حجز موعد جديد" : "Book New Appointment"}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {selectedDate && format(selectedDate, "EEEE d MMMM yyyy", { locale: ar })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Patient */}
          <div className="space-y-1.5">
            <Label>{isRtl ? "المريض" : "Patient"}</Label>
            <SelectMenu
              items={patientsList.map((p) => ({ value: p.id, label: `${isRtl ? p.nameAr : (p.nameEn || p.nameAr)} (${p.id})` }))}
              value={patientId}
              onValueChange={setPatientId}
              placeholder={isRtl ? "اختر مريض..." : "Select patient..."}
              searchPlaceholder={isRtl ? "بحث..." : "Search"}
              nothingFound={isRtl ? "لا يوجد نتائج" : "Nothing found."}
            />
          </div>

          {/* Doctor */}
          <div className="space-y-1.5">
            <Label>{isRtl ? "المعالج" : "Therapist"}</Label>
            <SelectMenu
              items={doctorsList.map((d) => ({ value: d.name, label: d.name }))}
              value={doctor}
              onValueChange={setDoctor}
              placeholder={isRtl ? "اختر معالج..." : "Select therapist..."}
              searchPlaceholder={isRtl ? "بحث..." : "Search"}
              nothingFound={isRtl ? "لا يوجد نتائج" : "Nothing found."}
            />
          </div>

          {/* Visit type & Duration */}
          <div className={`grid grid-cols-2 gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
            <div className="space-y-1.5">
              <Label>{isRtl ? "نوع الزيارة" : "Visit Type"}</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as VisitType)}
              >
                {VISIT_TYPES.map((t) => <option key={t} value={t}>{tVisitType(t)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "المدة (دقيقة)" : "Duration (min)"}</Label>
              <Input
                type="number" min={15} max={120} step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={isRtl ? "text-right" : "text-left"}
              />
            </div>
          </div>

          {/* Color preview */}
          <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted/50 ${isRtl ? "" : "flex-row-reverse"}`}>
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: VISIT_COLORS[visitType] }} />
            <p className="text-sm text-muted-foreground">
              {isRtl ? (
                <>سيظهر الموعد بلون <strong>{visitType}</strong> في التقويم</>
              ) : (
                <>Appointment will appear as <strong>{tVisitType(visitType)}</strong> in the calendar</>
              )}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{isRtl ? "ملاحظات (اختياري)" : "Notes (Optional)"}</Label>
            <Input
              placeholder={isRtl ? "أي ملاحظات إضافية..." : "Any extra notes..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              dir={isRtl ? "rtl" : "ltr"}
            />
          </div>
        </div>

        <DialogFooter className={`gap-3 sm:gap-3 flex w-full ${isRtl ? "flex-row" : "flex-row-reverse"}`}>
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold flex-1 transition-all active:scale-95">{isRtl ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={handleSave} className="bg-[#4F46BA] hover:bg-[#4338ca] text-white rounded-xl font-bold flex-1 shadow-md transition-all active:scale-95">
            {isRtl ? "تأكيد الحجز" : "Confirm Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Event Details Dialog ─────────────────────────────────────────────────────

function EventDetailsDialog({
  event,
  doctorsList,
  onClose,
  onUpdate,
  onCancel,
  onComplete,
}: {
  event: CalendarEvent | null;
  doctorsList: {name:string}[];
  onClose: () => void;
  onUpdate: (ev: CalendarEvent) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<CalendarEvent>>({});

  if (!event) return null;
  const e = { ...event, ...form };

  const startEdit = () => {
    setForm({ doctor: event.doctor, visitType: event.visitType, notes: event.notes });
    setEditing(true);
  };

  const saveEdit = () => {
    onUpdate({ ...event, ...form, title: `${event.patientName} — ${form.visitType ?? event.visitType}` });
    setEditing(false);
    setForm({});
  };

  return (
    <Dialog open={!!event} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-heading">
            <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: VISIT_COLORS[event.visitType] }} />
            <Link href={`/patients/${event.patientId}`} className="text-[#4F46BA] hover:underline dark:text-[#818cf8] font-bold">
              {event.patientName}
            </Link>
          </DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground/80">
            {format(event.start, "EEEE d MMMM yyyy", { locale: ar })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Status badge + date row */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">الحالة</span>
            <Badge variant="outline" className={STATUS_STYLES[event.status] + " font-bold shadow-sm"}>{event.status}</Badge>
          </div>
          <Separator />

          {/* Detail cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "رقم الملف", value: event.patientId, icon: "📁" },
              { label: "الوقت", value: `${format(event.start, "HH:mm")} — ${format(event.end, "HH:mm")}`, icon: "🕒" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-muted/40 rounded-lg p-3 space-y-0.5">
                <p className="text-xs text-muted-foreground/70">{label}</p>
                <p className="text-sm font-bold font-mono">{value}</p>
              </div>
            ))}
          </div>

          {/* Editable fields */}
          {editing ? (
            <div className="space-y-3 pt-1">
              <Separator />
              <div className="space-y-1.5">
                <Label>المعالج</Label>
                <SelectMenu
                  items={doctorsList.map((d) => ({ value: d.name, label: d.name }))}
                  value={form.doctor ?? event.doctor}
                  onValueChange={(val) => setForm(f => ({ ...f, doctor: val }))}
                  placeholder="اختر معالج..."
                  searchPlaceholder="بحث..."
                  nothingFound="لا يوجد نتائج"
                />
              </div>
              <div className="space-y-1.5">
                <Label>نوع الزيارة</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.visitType ?? event.visitType}
                  onChange={(e) => setForm(f => ({ ...f, visitType: e.target.value as VisitType }))}>
                  {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Input dir="rtl" value={form.notes ?? ""} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {[
                { label: "المعالج", value: e.doctor, icon: "👨‍⚕️" },
                { label: "نوع الزيارة", value: e.visitType, icon: "📋" },
                { label: "ملاحظات", value: e.notes ?? "—", icon: "📝" },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
                  <span className="text-base">{icon}</span>
                  <span className="text-muted-foreground/70 min-w-[70px]">{label}</span>
                  <span className="font-medium flex-1">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {/* Complete session — prominent green button */}
          {event.status !== "منتهي" && event.status !== "ملغي" && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11 rounded-xl shadow-md transition-all active:scale-[0.98]"
              onClick={() => { onComplete(event.id); onClose(); }}
            >
              ✅ <span className="font-bold">{isRtl ? "اكتملت الجلسة" : "Complete Session"}</span>
              <span className="text-xs opacity-75 font-normal">({isRtl ? "سيُخصم من باقة المريض" : "Deducted from patient package"})</span>
            </Button>
          )}
          <div className="flex gap-2 w-full">
            {editing ? (
              <>
                <Button variant="outline" className="flex-1 rounded-xl transition-all active:scale-95" onClick={() => setEditing(false)}>{isRtl ? "تراجع" : "Back"}</Button>
                <Button className="flex-1 rounded-xl bg-[#4F46BA] hover:bg-[#4338ca] text-white shadow-md transition-all active:scale-95" onClick={saveEdit}>{isRtl ? "حفظ التعديلات" : "Save Changes"}</Button>
              </>
            ) : (
              <>
                {event.status !== "ملغي" && event.status !== "منتهي" && (
                  <>
                    <Button variant="outline" className="flex-1 rounded-xl transition-all active:scale-95" onClick={startEdit}>
                      ✏️ {isRtl ? "تعديل" : "Edit"}
                    </Button>
                    <Button
                      variant="destructive" className="flex-1 rounded-xl transition-all active:scale-95"
                      onClick={() => { onCancel(event.id); onClose(); }}
                    >
                      🗑 {isRtl ? "إلغاء" : "Cancel"}
                    </Button>
                  </>
                )}
                {(event.status === "ملغي" || event.status === "منتهي") && (
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>{isRtl ? "إغلاق" : "Close"}</Button>
                )}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { hasPermission } = usePermissions();
  const { user } = useAuth(); const clinicId = user?.clinicId;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<{name:string}[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [alertMsg, setAlertMsg] = useState("");

  // Load patients and events from Supabase
  useEffect(() => {
    const loadData = async () => {
      const { data: patientsData, error: patientsError } = await supabase.from("patients").select("id, nameAr").eq('clinic_id', clinicId);
      if (patientsError) {
        console.error("Failed to load patients from Supabase", patientsError);
        setPatients([]);
      } else {
        setPatients(patientsData || []);
      }

      const { data: doctorsData, error: doctorsError } = await supabase.from("staff").select("name,email,role").eq('clinic_id', clinicId);
      if (doctorsError) {
        console.error("Failed to load doctors from Supabase", doctorsError);
        setDoctorsList([]);
      } else {
        const isDoctor = (role: string) =>
          ["مدير العياده", "استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي"].includes(role);
        setDoctorsList((doctorsData || []).filter((s: any) => isDoctor(s.role)));
      }

      const { data: dbEvents, error: dbErr } = await supabase.from("appointments").select("*").eq('clinic_id', clinicId);
      if (dbErr) {
        console.error("Failed to load appointments from Supabase", dbErr);
        setEvents([]);
        return;
      }

      const formatted = (dbEvents || []).map((e: any) => {
        const startValue = e.start_time || (e.date && e.time ? `${e.date}T${e.time}` : new Date().toISOString());
        const start = new Date(startValue);
        const end = e.end_time ? new Date(e.end_time) : new Date(start.getTime() + (e.duration || 45) * 60000);
        return {
          id: e.id,
          title: `${e.patient_name || ""} - ${e.appointment_type || e.type || ""}`,
          start,
          end,
          patientName: e.patient_name,
          patientId: e.patient_id,
          doctor: e.doctor_name || e.therapist,
          visitType: e.appointment_type || e.type,
          status: e.status
        };
      });
      setEvents(formatted);
    };
    loadData();
  }, []);

  const syncEventsState = (newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
  };

  // Stats
  const todayEvents = events.filter((e) => {
    const t = new Date(); return e.start.toDateString() === t.toDateString();
  });
  const confirmed = events.filter((e) => e.status === "مؤكد").length;
  const pending = events.filter((e) => e.status === "انتظار").length;
  const done = events.filter((e) => e.status === "منتهي").length;

  const handleSaveNew = async (ev: CalendarEvent) => {
    // Check subscription limit for sessions
    try {
      const limitRes = await fetch(`/api/subscription/check-limit?clinic_id=${clinicId}&resource=sessions`);
      if (limitRes.ok) {
        const limitData = await limitRes.json();
        if (!limitData.allowed) {
          setAlertMsg(isRtl
            ? "لقد تجاوزت الحد المسموح به لعدد الجلسات الشهرية في خطتك الحالية. يرجى ترقية اشتراكك."
            : "You have reached the monthly session limit for your current plan. Please upgrade your subscription.");
          return;
        }
      }
    } catch {}

    const generateUUID = () => {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    const newId = generateUUID();
    
    try {
      const { error } = await supabase.from("appointments").insert({
        id: newId,
        clinic_id: clinicId,
        patient_id: ev.patientId,
        patient_name: ev.patientName,
        doctor_name: ev.doctor,
        appointment_type: ev.visitType,
        status: ev.status,
        start_time: ev.start.toISOString(),
        end_time: ev.end.toISOString()
      });
      if (!error) {
         ev.id = newId;
         
         // Generate Invoice for this session
         const invoiceDesc = isRtl ? `جلسة: ${ev.visitType}` : `Session: ${ev.visitType}`;
         let defaultPrice = "100";
         const { data: settings } = await supabase
           .from("clinic_settings")
           .select("default_session_price")
           .eq("user_id", "default")
           .eq('clinic_id', clinicId)
           .maybeSingle();
         if (settings?.default_session_price) defaultPrice = String(settings.default_session_price);
         
         const invoiceAmt = isRtl ? `${defaultPrice} ج.م` : `${defaultPrice} EGP`;
         
         try {
           await supabase.from("invoices").insert([{
             id: `INV-${newId}`,
             clinic_id: clinicId,
             patient_id: ev.patientId,
            patient_name: ev.patientName,
            description: invoiceDesc,
            amount: invoiceAmt,
            status: isRtl ? "انتظار" : "Pending",
            payment_method: "—",
            date: ev.start.toISOString().split("T")[0]
           }]);
         } catch (invErr) {
           console.warn("Failed to generate invoice", invErr);
         }
      }
    } catch (err) {
      console.warn("DB insert failed", err);
    }
    syncEventsState([...events, ev]);
    setSelectedDate(null);
  };

  const handleUpdate = async (updated: CalendarEvent) => {
    try {
      await supabase.from("appointments").update({
        doctor_name: updated.doctor,
        appointment_type: updated.visitType,
        status: updated.status,
        start_time: updated.start.toISOString(),
        end_time: updated.end.toISOString()
      }).eq("id", updated.id).eq('clinic_id', clinicId);
    } catch (err) {}
    syncEventsState(events.map((e) => e.id === updated.id ? updated : e));
    setSelectedEvent(null);
  };

  const handleCancel = async (id: string) => {
    try {
      await supabase.from("appointments").update({ status: "ملغي" }).eq("id", id).eq('clinic_id', clinicId);
    } catch (err) {}
    syncEventsState(events.map((e) => e.id === id ? { ...e, status: "ملغي" } : e));
  };

  const handleComplete = async (id: string) => {
    const completedEvent = events.find(e => e.id === id);
    try {
      await supabase.from("appointments").update({ status: "منتهي" }).eq("id", id).eq('clinic_id', clinicId);
 
      // Update patient sessionsUsed + set status to active
      if (completedEvent) {
        const { data: patient } = await supabase
          .from("patients")
          .select("sessionsUsed")
          .eq("id", completedEvent.patientId)
          .eq('clinic_id', clinicId)
          .single();
        
        if (patient) {
          await supabase.from("patients").update({
            sessionsUsed: (patient.sessionsUsed || 0) + 1,
            status: "نشط"
          }).eq("id", completedEvent.patientId).eq('clinic_id', clinicId);
        }
      }
    } catch (err) {
      console.warn("Failed to update completion status:", err);
    }
    syncEventsState(events.map((e) => e.id === id ? { ...e, status: "منتهي" } : e));
  };

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap ${isRtl ? "" : "flex-row-reverse"}`}>
          <div className={`flex items-center gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F46BA] to-[#7c3aed] flex items-center justify-center text-lg shadow-sm text-white">📅</div>
            <div className={isRtl ? "text-right" : "text-left"}>
              <h1 className="text-xl font-bold font-heading text-slate-800">{isRtl ? "إدارة الحجوزات" : "Appointments Management"}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{isRtl ? "التقويم التفاعلي للمواعيد" : "Interactive appointments calendar"}</p>
            </div>
          </div>
          {hasPermission("edit_appointments") && (
            <Button
              className="bg-[#4F46BA] hover:bg-[#4338ca] text-white gap-2 rounded-xl font-bold px-6 shadow-md transition-all active:scale-95"
              onClick={() => setSelectedDate(new Date())}
            >
              ＋ {isRtl ? "حجز موعد جديد" : "Book New Appointment"}
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "📋", label: isRtl ? "مواعيد اليوم" : "Today's Appts", value: todayEvents.length, color: "indigo" },
            { icon: "✅", label: isRtl ? "مؤكدة" : "Confirmed", value: confirmed, color: "emerald" },
            { icon: "⏳", label: isRtl ? "في الانتظار" : "Pending", value: pending, color: "amber" },
            { icon: "🏁", label: isRtl ? "مكتملة" : "Completed", value: done, color: "slate" },
          ].map((s) => {
            const bgMap: Record<string,string> = { indigo: "bg-indigo-50 dark:bg-indigo-950/30", emerald: "bg-emerald-50 dark:bg-emerald-950/30", amber: "bg-amber-50 dark:bg-amber-950/30", slate: "bg-slate-50 dark:bg-slate-900/30" };
            const borderMap: Record<string,string> = { indigo: "border-indigo-200 dark:border-indigo-900/50", emerald: "border-emerald-200 dark:border-emerald-900/50", amber: "border-amber-200 dark:border-amber-900/50", slate: "border-slate-200 dark:border-slate-800/50" };
            return (
              <div key={s.label} className={`${bgMap[s.color]} ${borderMap[s.color]} rounded-xl p-4 flex items-center gap-3 border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${isRtl ? "" : "flex-row-reverse text-right"}`}>
                <span className="text-2xl">{s.icon}</span>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <p className="text-xs text-muted-foreground/80 font-medium">{s.label}</p>
                  <p className="text-2xl font-bold font-heading">{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className={`flex flex-wrap gap-2 items-center ${isRtl ? "" : "flex-row-reverse"}`}>
          <span className="text-xs text-muted-foreground font-semibold ml-2">{isRtl ? "أنواع الجلسات:" : "Session Types:"}</span>
          {VISIT_TYPES.map((t) => {
            const tVisitType = (type: VisitType) => {
              if (isRtl) return type;
              const map: Record<VisitType, string> = {
                "جلسة علاج": "Therapy Session",
                "كشف أول": "First Exam",
                "متابعة": "Follow-up",
                "تقييم": "Assessment"
              };
              return map[type] || type;
            };
            return (
              <div key={t} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border/60 shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: VISIT_COLORS[t] }} />
                <span className="text-xs text-muted-foreground font-medium">{tVisitType(t)}</span>
              </div>
            );
          })}
        </div>

        {/* Custom Month Calendar */}
        <CustomMonthCalendar
          events={events}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onSelectSlot={(date) => {
            if (hasPermission("edit_appointments")) setSelectedDate(date);
          }}
          onSelectEvent={setSelectedEvent}
          selectable={hasPermission("edit_appointments")}
        />
      </div>

      {/* Dialogs */}
      <NewAppointmentDialog
        open={!!selectedDate}
        selectedDate={selectedDate}
        patientsList={patients}
        doctorsList={doctorsList}
        onClose={() => setSelectedDate(null)}
        onSave={handleSaveNew}
      />
      <EventDetailsDialog
        event={selectedEvent}
        doctorsList={doctorsList}
        onClose={() => setSelectedEvent(null)}
        onUpdate={handleUpdate}
        onCancel={handleCancel}
        onComplete={handleComplete}
      />
      <AlertPopup message={alertMsg} isOpen={!!alertMsg} onClose={() => setAlertMsg("")} />
    </div>
  );
}
