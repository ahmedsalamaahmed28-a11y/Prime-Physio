"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Calendar, dateFnsLocalizer, View, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ar } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

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

// ─── Localizer ────────────────────────────────────────────────────────────────

const locales = { ar };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

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
  "جلسة علاج": "#159C9E",
  "كشف أول":   "#8b5cf6",
  "متابعة":    "#06b6d4",
  "تقييم":     "#f59e0b",
};

const STATUS_STYLES: Record<string, string> = {
  "مؤكد":   "bg-emerald-100 text-emerald-700 border-emerald-200",
  "انتظار": "bg-amber-100 text-amber-700 border-amber-200",
  "منتهي":  "bg-slate-100 text-slate-600 border-slate-200",
  "ملغي":   "bg-red-100 text-red-700 border-red-200",
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
  slot,
  patientsList,
  doctorsList,
  onClose,
  onSave,
}: {
  open: boolean;
  slot: SlotInfo | null;
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
    if (!slot || patientsList.length === 0) return;
    const patient = patientsList.find((p) => p.id === patientId) || patientsList[0];
    const start = slot.start;
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
          <DialogTitle className={`flex items-center gap-2 text-lg ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
            <span>➕</span> {isRtl ? "حجز موعد جديد" : "Book New Appointment"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {slot && format(slot.start, "EEEE d MMMM yyyy — HH:mm", { locale: ar })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Patient */}
          <div className="space-y-1.5">
            <Label>{isRtl ? "المريض" : "Patient"}</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              {patientsList.map((p) => {
                const name = isRtl ? p.nameAr : (p.nameEn || p.nameAr);
                return <option key={p.id} value={p.id}>{name} ({p.id})</option>;
              })}
            </select>
          </div>

          {/* Doctor */}
          <div className="space-y-1.5">
            <Label>{isRtl ? "المعالج" : "Therapist"}</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
            >
                  {doctorsList.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
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
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold flex-1">{isRtl ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={handleSave} className="bg-[#0d8a8a] hover:bg-[#085454] text-white rounded-xl font-bold flex-1 shadow-md transition-all active:scale-95">
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
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VISIT_COLORS[event.visitType] }} />
            <Link href={`/patients/${event.patientId}`} className="text-[#0d8a8a] hover:underline dark:text-[#1ab0b2]">
              {event.patientName}
            </Link>
          </DialogTitle>
          <DialogDescription>
            {format(event.start, "EEEE d MMMM yyyy", { locale: ar })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">الحالة</span>
            <Badge variant="outline" className={STATUS_STYLES[event.status]}>{event.status}</Badge>
          </div>
          <Separator />

          {/* Details */}
          {[
            { label: "رقم الملف", value: event.patientId },
            { label: "الوقت", value: `${format(event.start, "HH:mm")} — ${format(event.end, "HH:mm")}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium font-mono">{value}</span>
            </div>
          ))}

          {/* Editable fields */}
          {editing ? (
            <div className="space-y-3 pt-1">
              <Separator />
              <div className="space-y-1.5">
                <Label>المعالج</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.doctor ?? event.doctor}
                  onChange={(e) => setForm(f => ({ ...f, doctor: e.target.value }))}>
              {doctorsList.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>نوع الزيارة</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            <div className="space-y-0">
              {[
                { label: "المعالج", value: e.doctor },
                { label: "نوع الزيارة", value: e.visitType },
                { label: "ملاحظات", value: e.notes ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {/* Complete session — prominent green button */}
          {event.status !== "منتهي" && event.status !== "ملغي" && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10"
              onClick={() => { onComplete(event.id); onClose(); }}
            >
              ✅ اكتملت الجلسة
              <span className="text-xs opacity-75 font-normal">(سيُخصم من باقة المريض)</span>
            </Button>
          )}
          <div className="flex gap-2 w-full">
            {editing ? (
              <>
                <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>تراجع</Button>
                <Button className="flex-1" onClick={saveEdit}>حفظ التعديلات</Button>
              </>
            ) : (
              <>
                {event.status !== "ملغي" && event.status !== "منتهي" && (
                  <>
                    <Button variant="outline" className="flex-1" onClick={startEdit}>
                      ✏️ تعديل الموعد
                    </Button>
                    <Button
                      variant="destructive" className="flex-1"
                      onClick={() => { onCancel(event.id); onClose(); }}
                    >
                      🗑 إلغاء الموعد
                    </Button>
                  </>
                )}
                {(event.status === "ملغي" || event.status === "منتهي") && (
                  <Button variant="outline" className="flex-1" onClick={onClose}>إغلاق</Button>
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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<{name:string}[]>([]);
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Load patients and events from Supabase
  useEffect(() => {
    const loadData = async () => {
      const { data: patientsData, error: patientsError } = await supabase.from("patients").select("id, nameAr");
      if (patientsError) {
        console.error("Failed to load patients from Supabase", patientsError);
        setPatients([]);
      } else {
        setPatients(patientsData || []);
      }

      const { data: doctorsData, error: doctorsError } = await supabase.from("staff").select("name,email,role");
      if (doctorsError) {
        console.error("Failed to load doctors from Supabase", doctorsError);
        setDoctorsList([]);
      } else {
        const isDoctor = (role: string) =>
          ["مدير العياده", "استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي"].includes(role);
        setDoctorsList((doctorsData || []).filter((s: any) => isDoctor(s.role)));
      }

      const { data: dbEvents, error: dbErr } = await supabase.from("appointments").select("*");
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

  const handleSelectSlot = useCallback((slot: SlotInfo) => {
    setSelectedSlot(slot);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleSaveNew = async (ev: CalendarEvent) => {
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
           .maybeSingle();
         if (settings?.default_session_price) defaultPrice = String(settings.default_session_price);
         
         const invoiceAmt = isRtl ? `${defaultPrice} ج.م` : `${defaultPrice} EGP`;
         
         try {
           await supabase.from("invoices").insert([{
             id: `INV-${newId}`,
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
    setSelectedSlot(null);
  };

  const handleUpdate = async (updated: CalendarEvent) => {
    try {
      await supabase.from("appointments").update({
        doctor_name: updated.doctor,
        appointment_type: updated.visitType,
        status: updated.status,
        start_time: updated.start.toISOString(),
        end_time: updated.end.toISOString()
      }).eq("id", updated.id);
    } catch (err) {}
    syncEventsState(events.map((e) => e.id === updated.id ? updated : e));
    setSelectedEvent(null);
  };

  const handleCancel = async (id: string) => {
    try {
      await supabase.from("appointments").update({ status: "ملغي" }).eq("id", id);
    } catch (err) {}
    syncEventsState(events.map((e) => e.id === id ? { ...e, status: "ملغي" } : e));
  };

  const handleComplete = async (id: string) => {
    const completedEvent = events.find(e => e.id === id);
    try {
      await supabase.from("appointments").update({ status: "منتهي" }).eq("id", id);

      // Update patient sessionsUsed + set status to active
      if (completedEvent) {
        const { data: patient } = await supabase
          .from("patients")
          .select("sessionsUsed")
          .eq("id", completedEvent.patientId)
          .single();
        
        if (patient) {
          await supabase.from("patients").update({
            sessionsUsed: (patient.sessionsUsed || 0) + 1,
            status: "نشط"
          }).eq("id", completedEvent.patientId);
        }
      }
    } catch (err) {
      console.warn("Failed to update completion status:", err);
    }
    syncEventsState(events.map((e) => e.id === id ? { ...e, status: "منتهي" } : e));
  };

  // Custom event styling
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const bg = event.status === "ملغي" ? "#94a3b8" : event.status === "منتهي" ? "#64748b" : VISIT_COLORS[event.visitType];
    return {
      style: {
        backgroundColor: bg,
        borderColor: bg,
        borderRadius: "6px",
        color: "white",
        fontSize: "12px",
        padding: "2px 6px",
        opacity: event.status === "ملغي" ? 0.5 : 1,
      },
    };
  }, []);

  return (
    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap ${isRtl ? "" : "flex-row-reverse"}`}>
          <div className={`flex items-center gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-xl shadow-sm border border-teal-100">📅</div>
            <div className={isRtl ? "text-right" : "text-left"}>
              <h1 className="text-xl font-bold text-slate-800">{isRtl ? "إدارة الحجوزات" : "Appointments Management"}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{isRtl ? "التقويم التفاعلي للمواعيد" : "Interactive appointments calendar"}</p>
            </div>
          </div>
          {hasPermission("edit_appointments") && (
            <Button
              className={`bg-[#0d8a8a] hover:bg-[#085454] text-white gap-2 rounded-xl font-bold px-6 shadow-md transition-all active:scale-95 ${isRtl ? "" : "flex-row-reverse"}`}
              onClick={() => setSelectedSlot({ start: new Date(), end: new Date(), slots: [], action: "click" })}
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
            { icon: "📋", label: isRtl ? "مواعيد اليوم" : "Today's Appts", value: todayEvents.length, color: "bg-teal-50 dark:bg-teal-950/30 text-[#0d8a8a]" },
            { icon: "✅", label: isRtl ? "مؤكدة" : "Confirmed", value: confirmed, color: "bg-emerald-50 dark:bg-emerald-950/30" },
            { icon: "⏳", label: isRtl ? "في الانتظار" : "Pending", value: pending, color: "bg-amber-50 dark:bg-amber-950/30" },
            { icon: "🏁", label: isRtl ? "مكتملة" : "Completed", value: done, color: "bg-slate-50 dark:bg-slate-900/30" },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-4 flex items-center gap-3 border border-border/50 ${isRtl ? "" : "flex-row-reverse text-right"}`}>
              <span className="text-2xl">{s.icon}</span>
              <div className={isRtl ? "text-right" : "text-left"}>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className={`flex flex-wrap gap-3 items-center ${isRtl ? "" : "flex-row-reverse"}`}>
          <span className="text-xs text-muted-foreground font-medium">{isRtl ? "أنواع الجلسات:" : "Session Types:"}</span>
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
              <div key={t} className={`flex items-center gap-1.5 ${isRtl ? "" : "flex-row-reverse"}`}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VISIT_COLORS[t] }} />
                <span className="text-xs text-muted-foreground">{tVisitType(t)}</span>
              </div>
            );
          })}
        </div>

        {/* Calendar */}
        <div className={`bg-card border rounded-2xl overflow-hidden shadow-sm calendar-wrapper ${isRtl ? "rbc-rtl" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
          <Calendar
            localizer={localizer}
            events={events}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            selectable={hasPermission("edit_appointments")}
            onSelectSlot={(slotInfo) => {
              if (hasPermission("edit_appointments")) handleSelectSlot(slotInfo);
            }}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventPropGetter}
            style={{ height: 650 }}
            views={["month", "week", "day"]}
            messages={isRtl ? {
              today: "اليوم",
              previous: "السابق",
              next: "التالي",
              month: "شهر",
              week: "أسبوع",
              day: "يوم",
              agenda: "أجندة",
              date: "التاريخ",
              time: "الوقت",
              event: "الحدث",
              noEventsInRange: "لا توجد مواعيد في هذه الفترة",
              showMore: (total) => `+${total} مزيد`,
            } : {
              today: "Today",
              previous: "Prev",
              next: "Next",
              month: "Month",
              week: "Week",
              day: "Day",
              agenda: "Agenda",
              date: "Date",
              time: "Time",
              event: "Event",
              noEventsInRange: "No appointments in this range",
              showMore: (total) => `+${total} more`,
            }}
            formats={{
              timeGutterFormat: "HH:mm",
              eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`,
              dayHeaderFormat: (date: Date) => format(date, "EEEE d MMM", { locale: ar }),
              monthHeaderFormat: (date: Date) => format(date, "MMMM yyyy", { locale: ar }),
              dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                `${format(start, "d MMM", { locale: ar })} – ${format(end, "d MMM yyyy", { locale: ar })}`,
            }}
            popup
            step={15}
            timeslots={4}
            min={new Date(0, 0, 0, 7, 0, 0)}
            max={new Date(0, 0, 0, 21, 0, 0)}
          />
        </div>
      </div>

      {/* Dialogs */}
      <NewAppointmentDialog
        open={!!selectedSlot}
        slot={selectedSlot}
        patientsList={patients}
        doctorsList={doctorsList}
        onClose={() => setSelectedSlot(null)}
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
    </div>
  );
}
