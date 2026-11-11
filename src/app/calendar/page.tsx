"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

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
import { Textarea } from "@/components/ui/textarea";
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
  treatmentPlanId?: string;
  treatmentPlanTitle?: string;
  sessionIntervention?: string;
  sessionObjectives?: string;
  targetExercises?: string[];
  roomId?: string;
  roomName?: string;
  isGroupSession?: boolean;
  groupParticipantIds?: string[];
  groupParticipantNames?: string[];
  recurrenceId?: string | null;
  recurrenceIndex?: number | null;
  recurrenceTotal?: number | null;
  recurrenceMode?: "none" | "weekly" | "biweekly";
  recurrenceCount?: number;
}

interface SessionOutcome {
  painBefore: number;
  painAfter: number;
  romStatus: string;
  strengthStatus: string;
  recoveryScore: number;
  completedExercises: string[];
  notes: string;
}

type VisitType = "جلسة علاج" | "كشف أول" | "متابعة" | "تقييم" | "جلسة جماعية";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PATIENTS: any[] = [];
const VISIT_TYPES: VisitType[] = ["جلسة علاج", "كشف أول", "متابعة", "تقييم", "جلسة جماعية"];

const VISIT_COLOR_CLASSES: Record<VisitType, string> = {
  "جلسة علاج": "bg-[#4F46BA]",
  "كشف أول": "bg-violet-600",
  "متابعة": "bg-cyan-600",
  "تقييم": "bg-amber-600",
  "جلسة جماعية": "bg-fuchsia-600",
};

const STATUS_STYLES: Record<string, string> = {
  "مؤكد": "bg-emerald-50 text-emerald-700 border-emerald-300",
  "انتظار": "bg-amber-50 text-amber-700 border-amber-300",
  "منتهي": "bg-slate-100 text-slate-600 border-slate-300",
  "ملغي": "bg-red-50 text-red-700 border-red-300",
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
  roomsList,
  clinicId,
  branchId,
  canManageRooms,
  onCreateRoom,
  onClose,
  onSave,
}: {
  open: boolean;
  selectedDate: Date | null;
  patientsList: any[];
  doctorsList: { name: string }[];
  roomsList: { id: string; name: string; branch_id: string | null }[];
  clinicId?: string;
  branchId?: string | null;
  canManageRooms: boolean;
  onCreateRoom: (name: string) => Promise<{ id: string; name: string; branch_id: string | null } | null>;
  onClose: () => void;
  onSave: (ev: CalendarEvent) => void;
}) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [patientId, setPatientId] = useState("");
  const [doctor, setDoctor] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("جلسة علاج");
  const [isGroupSession, setIsGroupSession] = useState(false);
  const [groupPatientIds, setGroupPatientIds] = useState<string[]>([]);
  const [recurrenceMode, setRecurrenceMode] = useState<"none" | "weekly" | "biweekly">("none");
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [duration, setDuration] = useState(45);
  const [startTime, setStartTime] = useState("09:00");
  const [roomId, setRoomId] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && selectedDate) {
      const hours = String(selectedDate.getHours()).padStart(2, "0");
      const minutes = String(selectedDate.getMinutes()).padStart(2, "0");
      setStartTime(hours === "00" && minutes === "00" ? "09:00" : hours + ":" + minutes);
    }
    if (!open) setRoomId("");
  }, [open, selectedDate]);
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [treatmentPlanId, setTreatmentPlanId] = useState("");
  const [sessionIntervention, setSessionIntervention] = useState("");
  const [sessionObjectives, setSessionObjectives] = useState("");
  const [targetExercisesText, setTargetExercisesText] = useState("");
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    if (open && patientsList.length > 0) {
      setPatientId(patientsList[0].id);
      setGroupPatientIds([patientsList[0].id]);
      setIsGroupSession(false);
      setVisitType("جلسة علاج");
      setRecurrenceMode("none");
    }
  }, [open, patientsList]);

  useEffect(() => {
    if (!open || !clinicId || !patientId) {
      setTreatmentPlans([]);
      setTreatmentPlanId("");
      setSessionIntervention("");
      setSessionObjectives("");
      setTargetExercisesText("");
      return;
    }

    let cancelled = false;
    const loadPatientPlan = async () => {
      setPlansLoading(true);
      const plansResult = await supabase.from("treatment_plans")
        .select("id,goals,session_plan,target_exercises,status,created_at")
        .eq("clinic_id", clinicId)
        .eq("patient_id", patientId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (plansResult.error) {
        console.error("Could not load active treatment plans:", plansResult.error);
        setTreatmentPlans([]);
        setTargetExercisesText("");
      } else {
        const plans = plansResult.data || [];
        setTreatmentPlans(plans);
        const latest = plans[0];
        setTreatmentPlanId(latest?.id || "");
        setSessionIntervention(latest?.session_plan || "");
        setSessionObjectives(latest?.goals || "");
        const exercises = Array.isArray(latest?.target_exercises) ? latest.target_exercises : [];
        setTargetExercisesText(exercises
          .map((item: any) => typeof item === "string" ? item : (item?.name || item?.title || ""))
          .filter(Boolean)
          .join("\n"));
      }
      setPlansLoading(false);
    };

    loadPatientPlan();
    return () => { cancelled = true; };
  }, [open, clinicId, patientId]);

  const tStatus = (status: string) => {
    if (isRtl) return status;
    const map: Record<string, string> = { "مؤكد": "Confirmed", "انتظار": "Pending", "منتهي": "Completed", "ملغي": "Cancelled" };
    return map[status] || status;
  };

  const tVisitType = (type: VisitType) => {
    if (isRtl) return type;
    const map: Record<VisitType, string> = {
      "جلسة علاج": "Therapy Session",
      "كشف أول": "First Exam",
      "متابعة": "Follow-up",
      "تقييم": "Assessment",
      "جلسة جماعية": "Group Session"
    };
    return map[type] || type;
  };

  const handleSave = () => {
    if (!selectedDate || patientsList.length === 0 || !patientId || !doctor) return;
    const selectedPatientIds = isGroupSession ? groupPatientIds : [patientId];
    if (isGroupSession && selectedPatientIds.length < 2) {
      alert(isRtl ? "اختر مريضين على الأقل للجلسة الجماعية." : "Select at least two patients for a group session.");
      return;
    }
    if (recurrenceMode !== "none" && (!Number.isInteger(recurrenceCount) || recurrenceCount < 2 || recurrenceCount > 12)) {
      alert(isRtl ? "عدد التكرارات يجب أن يكون بين 2 و12." : "Choose between 2 and 12 occurrences.");
      return;
    }
    const [hours, minutes] = startTime.split(":").map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || !Number.isFinite(duration) || duration < 15 || duration > 240) {
      alert(isRtl ? "يرجى إدخال وقت ومدة صالحين." : "Enter a valid start time and duration.");
      return;
    }
    const patient = patientsList.find((p) => p.id === patientId) || patientsList[0];
    const start = new Date(selectedDate);
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + duration * 60000);
    const pName = isRtl ? patient.nameAr : (patient.nameEn || patient.nameAr);
    onSave({
      id: "E-" + Date.now(),
      title: (isGroupSession ? (isRtl ? "جلسة جماعية (" + selectedPatientIds.length + ")" : "Group session (" + selectedPatientIds.length + ")") : pName) + " — " + visitType,
      start,
      end,
      patientName: isGroupSession ? (isRtl ? "جلسة جماعية (" + selectedPatientIds.length + ")" : "Group session (" + selectedPatientIds.length + ")") : pName,
      patientId: patient.id,
      doctor,
      visitType,
      status: "مؤكد",
      roomId: roomId || undefined,
      roomName: roomsList.find((room) => room.id === roomId)?.name,
      isGroupSession,
      groupParticipantIds: selectedPatientIds,
      groupParticipantNames: selectedPatientIds.map((id) => {
        const member = patientsList.find((item) => item.id === id);
        return member ? (isRtl ? member.nameAr : (member.nameEn || member.nameAr)) : id;
      }),
      recurrenceMode,
      recurrenceCount: recurrenceMode === "none" ? 1 : recurrenceCount,
      notes,
      treatmentPlanId: treatmentPlanId || undefined,
      treatmentPlanTitle: treatmentPlans.find((plan) => plan.id === treatmentPlanId)?.goals || undefined,
      sessionIntervention,
      sessionObjectives,
      targetExercises: targetExercisesText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    });
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={"sm:max-w-lg " + (isRtl ? "text-right" : "text-left")} dir={isRtl ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className={"flex items-center gap-2 text-lg font-heading " + (isRtl ? "" : "flex-row-reverse justify-end")}>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-base">➕</span>
            <span>{isRtl ? "حجز موعد جديد" : "Book New Appointment"}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {selectedDate && format(selectedDate, "EEEE d MMMM yyyy", { locale: isRtl ? ar : enUS })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <Label>{isRtl ? "المريض" : "Patient"}</Label>
            <SelectMenu
              items={patientsList.map((p) => ({ value: p.id, label: (isRtl ? p.nameAr : (p.nameEn || p.nameAr)) + " (" + p.id + ")" }))}
              value={patientId}
              onValueChange={(value) => {
                setPatientId(value);
                if (isGroupSession) setGroupPatientIds((current) => current.includes(value) ? current : [value, ...current]);
              }}
              placeholder={isRtl ? "اختر مريض..." : "Select patient..."}
              searchPlaceholder={isRtl ? "بحث..." : "Search"}
              nothingFound={isRtl ? "لا يوجد نتائج" : "Nothing found."}
            />
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input type="checkbox" checked={isGroupSession} onChange={(e) => {
                const enabled = e.target.checked;
                setIsGroupSession(enabled);
                setVisitType(enabled ? "جلسة جماعية" : "جلسة علاج");
                setGroupPatientIds(enabled ? [patientId].filter(Boolean) : [patientId].filter(Boolean));
                if (enabled) {
                  setTreatmentPlanId("");
                  setSessionIntervention("");
                  setSessionObjectives("");
                  setTargetExercisesText("");
                }
              }} />
              {isRtl ? "حجز جلسة جماعية لعدة مرضى" : "Book a group session for multiple patients"}
            </label>
            {isGroupSession && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {patientsList.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm">
                    <input type="checkbox" checked={groupPatientIds.includes(member.id)} onChange={(e) => {
                      const next = e.target.checked ? [...groupPatientIds, member.id] : groupPatientIds.filter((id) => id !== member.id);
                      if (next.length === 0) return;
                      setGroupPatientIds(next);
                      if (!next.includes(patientId)) setPatientId(next[0]);
                    }} />
                    <span>{isRtl ? member.nameAr : (member.nameEn || member.nameAr)}</span>
                  </label>
                ))}
              </div>
            )}
            {isGroupSession && <p className="text-xs text-muted-foreground">{isRtl ? "سيتم إنشاء فاتورة مستقلة لكل مريض. لا تُشارك الخطط أو التفاصيل الطبية بين المرضى." : "Each patient receives a separate invoice. Individual treatment plans and clinical notes are not shared."}</p>}
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isRtl ? "وقت البداية" : "Start time"}</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "المدة (دقيقة)" : "Duration (min)"}</Label>
              <Input type="number" min={15} max={240} step={15} value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={isRtl ? "text-right" : "text-left"} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{isRtl ? "الغرفة (اختياري)" : "Room (optional)"}</Label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">{isRtl ? "بدون تحديد غرفة" : "No room selected"}</option>
              {roomsList.filter((room) => !room.branch_id || !branchId || room.branch_id === branchId).map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
            {roomsList.length === 0 && <p className="text-xs text-muted-foreground">{isRtl ? "لم تتم إضافة غرف علاج بعد." : "No treatment rooms have been added yet."}</p>}
            {canManageRooms && (
              <div className="flex gap-2">
                <Input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} maxLength={60} placeholder={isRtl ? "اسم غرفة جديدة" : "New room name"} />
                <Button type="button" variant="outline" disabled={isCreatingRoom || !newRoomName.trim()} onClick={async () => {
                  setIsCreatingRoom(true);
                  try {
                    const created = await onCreateRoom(newRoomName.trim());
                    if (created) { setRoomId(created.id); setNewRoomName(""); }
                  } finally { setIsCreatingRoom(false); }
                }}>{isCreatingRoom ? (isRtl ? "جارٍ الإضافة..." : "Adding...") : (isRtl ? "إضافة" : "Add")}</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isRtl ? "نوع الزيارة" : "Visit Type"}</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={visitType}
                disabled={isGroupSession}
                onChange={(e) => setVisitType(e.target.value as VisitType)}
              >
                {VISIT_TYPES.filter((type) => type !== "جلسة جماعية").map((t) => <option key={t} value={t}>{tVisitType(t)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "المدة (دقيقة)" : "Duration (min)"}</Label>
              <Input type="number" min={15} max={120} step={15} value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={isRtl ? "text-right" : "text-left"} />
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <Label className="font-bold">{isRtl ? "تكرار الموعد" : "Appointment recurrence"}</Label>
            <div className="grid grid-cols-2 gap-2">
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={recurrenceMode} onChange={(e) => setRecurrenceMode(e.target.value as "none" | "weekly" | "biweekly")}>
                <option value="none">{isRtl ? "بدون تكرار" : "Does not repeat"}</option>
                <option value="weekly">{isRtl ? "أسبوعيًا" : "Weekly"}</option>
                <option value="biweekly">{isRtl ? "كل أسبوعين" : "Every 2 weeks"}</option>
              </select>
              {recurrenceMode !== "none" && <Input type="number" min={2} max={12} value={recurrenceCount} onChange={(e) => setRecurrenceCount(Number(e.target.value))} />}
            </div>
            {recurrenceMode !== "none" && <p className="text-xs text-muted-foreground">{isRtl ? "عدد المواعيد الإجمالي، من 2 إلى 12، شاملًا الموعد الأول." : "Total occurrences, 2–12, including the first appointment."}</p>}
          </div>

          {!isGroupSession && <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="font-bold">{isRtl ? "ربط الخطة العلاجية بالجلسة" : "Link treatment plan to this session"}</Label>
              {plansLoading && <span className="text-xs text-muted-foreground">{isRtl ? "جارٍ التحميل..." : "Loading..."}</span>}
            </div>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={treatmentPlanId}
              onChange={(e) => {
                const selected = treatmentPlans.find((plan) => plan.id === e.target.value);
                setTreatmentPlanId(e.target.value);
                setSessionIntervention(selected?.session_plan || "");
                setSessionObjectives(selected?.goals || "");
                const exercises = Array.isArray(selected?.target_exercises) ? selected.target_exercises : [];
                setTargetExercisesText(exercises
                  .map((item: any) => typeof item === "string" ? item : (item?.name || item?.title || ""))
                  .filter(Boolean)
                  .join("\n"));
              }}
              disabled={plansLoading}
            >
              <option value="">{isRtl ? "بدون خطة مرتبطة (اختياري)" : "No linked plan (optional)"}</option>
              {treatmentPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {(plan.goals || (isRtl ? "خطة علاجية" : "Treatment plan")).slice(0, 90)}
                </option>
              ))}
            </select>
            {!plansLoading && treatmentPlans.length === 0 && (
              <p className="text-xs text-amber-700">{isRtl ? "لا توجد خطة نشطة لهذا المريض. يمكنك كتابة تدخل الجلسة يدويًا." : "No active plan for this patient. You can enter the session intervention manually."}</p>
            )}
            <div className="space-y-1.5">
              <Label>{isRtl ? "التدخل العلاجي المطلوب في هذه الجلسة" : "Intervention for this session"}</Label>
              <Textarea rows={3} value={sessionIntervention} onChange={(e) => setSessionIntervention(e.target.value)}
                placeholder={isRtl ? "مثال: تمارين تحكم حركي، تقوية، علاج يدوي..." : "e.g. motor control, strengthening, manual therapy..."} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "الأهداف المستهدفة" : "Session objectives"}</Label>
              <Textarea rows={2} value={sessionObjectives} onChange={(e) => setSessionObjectives(e.target.value)}
                placeholder={isRtl ? "الأهداف المطلوب تحقيقها في الجلسة" : "Goals to address in this session"} />
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? "التمارين المستهدفة (تمرين في كل سطر)" : "Target exercises (one per line)"}</Label>
              <Textarea rows={3} value={targetExercisesText} onChange={(e) => setTargetExercisesText(e.target.value)}
                placeholder={isRtl ? "اكتب التمارين التي سيؤديها المريض" : "List the exercises prescribed for this session"} />
            </div>
          </div>}

          <div className={"flex items-center gap-2 p-3 rounded-lg bg-muted/50 " + (isRtl ? "" : "flex-row-reverse")}>
            <div className={`w-4 h-4 rounded-full flex-shrink-0 ${VISIT_COLOR_CLASSES[visitType]}`} />
            <p className="text-sm text-muted-foreground">
              {isRtl ? <>سيظهر الموعد بلون <strong>{visitType}</strong> في التقويم</> : <>Appointment will appear as <strong>{tVisitType(visitType)}</strong> in the calendar</>}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>{isRtl ? "ملاحظات (اختياري)" : "Notes (Optional)"}</Label>
            <Input placeholder={isRtl ? "أي ملاحظات إضافية..." : "Any extra notes..."} value={notes}
              onChange={(e) => setNotes(e.target.value)} dir={isRtl ? "rtl" : "ltr"} />
          </div>
        </div>

        <DialogFooter className={"gap-3 sm:gap-3 flex w-full " + (isRtl ? "flex-row" : "flex-row-reverse")}>
          <Button variant="outline" onClick={onClose} className="rounded-xl font-bold flex-1 transition-all active:scale-95">{isRtl ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={handleSave} className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white rounded-xl font-bold flex-1 shadow-md transition-all active:scale-95">
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
  doctorsList: { name: string }[];
  onClose: () => void;
  onUpdate: (ev: CalendarEvent) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string, outcome: SessionOutcome) => Promise<boolean>;
}) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [form, setForm] = useState<Partial<CalendarEvent>>({});
  const [painBefore, setPainBefore] = useState("");
  const [painAfter, setPainAfter] = useState("");
  const [romStatus, setRomStatus] = useState("");
  const [strengthStatus, setStrengthStatus] = useState("");
  const [recoveryScore, setRecoveryScore] = useState("");
  const [completedExercisesText, setCompletedExercisesText] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");

  if (!event) return null;
  const e = { ...event, ...form };
  const tStatus = (status: string) => {
    if (isRtl) return status;
    const map: Record<string, string> = { "مؤكد": "Confirmed", "انتظار": "Pending", "منتهي": "Completed", "ملغي": "Cancelled" };
    return map[status] || status;
  };
  const tVisitType = (type: VisitType) => {
    if (isRtl) return type;
    const map: Record<VisitType, string> = {
      "جلسة علاج": "Therapy Session",
      "كشف أول": "First Exam",
      "متابعة": "Follow-up",
      "تقييم": "Assessment",
      "جلسة جماعية": "Group Session",
    };
    return map[type] || type;
  };

  const startEdit = () => {
    setForm({ doctor: event.doctor, visitType: event.visitType, notes: event.notes });
    setEditing(true);
  };

  const saveEdit = () => {
    onUpdate({ ...event, ...form, title: event.patientName + " — " + (form.visitType ?? event.visitType) });
    setEditing(false);
    setForm({});
  };

  const submitCompletion = async () => {
    const before = Number(painBefore);
    const after = Number(painAfter);
    const recovery = Number(recoveryScore);
    if (!Number.isInteger(before) || before < 0 || before > 10 || !Number.isInteger(after) || after < 0 || after > 10) {
      alert(isRtl ? "أدخل درجة الألم قبل الجلسة وبعدها من 0 إلى 10." : "Enter pre- and post-session pain scores from 0 to 10.");
      return;
    }
    if (!Number.isInteger(recovery) || recovery < 0 || recovery > 100) {
      alert(isRtl ? "أدخل مؤشر التعافي من 0 إلى 100." : "Enter a recovery score from 0 to 100.");
      return;
    }
    setSavingCompletion(true);
    const completedExercises = completedExercisesText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const success = await onComplete(event.id, {
      painBefore: before,
      painAfter: after,
      romStatus,
      strengthStatus,
      recoveryScore: recovery,
      completedExercises,
      notes: sessionNotes || event.notes || "",
    });
    setSavingCompletion(false);
    if (success) onClose();
  };

  return (
    <Dialog open={!!event} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir={isRtl ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-heading">
            <div className={`w-4 h-4 rounded-full shadow-sm ${VISIT_COLOR_CLASSES[event.visitType]}`} />
            <Link href={"/patients/" + event.patientId} className="text-[#4F46BA] hover:underline dark:text-[#818cf8] font-bold">
              {event.patientName}
            </Link>
          </DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground/80">
            {format(event.start, "EEEE d MMMM yyyy", { locale: ar })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{isRtl ? "الحالة" : "Status"}</span>
            <Badge variant="outline" className={STATUS_STYLES[event.status] + " font-bold shadow-sm"}>{tStatus(event.status)}</Badge>
          </div>
          <Separator />

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: isRtl ? "رقم الملف" : "File Number", value: event.patientId, icon: "📁" },
              { label: isRtl ? "الوقت" : "Time", value: format(event.start, "HH:mm") + " — " + format(event.end, "HH:mm"), icon: "🕒" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-muted/40 rounded-lg p-3 space-y-0.5">
                <p className="text-xs text-muted-foreground/70">{label}</p>
                <p className="text-sm font-bold font-mono">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="font-semibold text-sm">{isRtl ? "الخطة والتدخل العلاجي" : "Treatment plan & intervention"}</p>
            <p className="text-sm"><span className="text-muted-foreground">{isRtl ? "الخطة المرتبطة: " : "Linked plan: "}</span>{event.treatmentPlanTitle || (event.treatmentPlanId ? (isRtl ? "خطة علاجية مرتبطة" : "Linked treatment plan") : (isRtl ? "لا توجد خطة مرتبطة" : "No linked plan"))}</p>
            <p className="text-sm"><span className="text-muted-foreground">{isRtl ? "التدخل: " : "Intervention: "}</span>{event.sessionIntervention || "—"}</p>
            <p className="text-sm"><span className="text-muted-foreground">{isRtl ? "الأهداف: " : "Objectives: "}</span>{event.sessionObjectives || "—"}</p>
            <div className="text-sm">
              <span className="text-muted-foreground">{isRtl ? "التمارين المستهدفة: " : "Target exercises: "}</span>
              {event.targetExercises?.length ? event.targetExercises.join("، ") : "—"}
            </div>
          </div>

          {editing ? (
            <div className="space-y-3 pt-1">
              <Separator />
              <div className="space-y-1.5">
                <Label>{isRtl ? "المعالج" : "Therapist"}</Label>
                <SelectMenu items={doctorsList.map((d) => ({ value: d.name, label: d.name }))}
                  value={form.doctor ?? event.doctor}
                  onValueChange={(val) => setForm(f => ({ ...f, doctor: val }))}
                  placeholder={isRtl ? "اختر معالج..." : "Select therapist..."} searchPlaceholder={isRtl ? "بحث..." : "Search..."} nothingFound={isRtl ? "لا يوجد نتائج" : "No results"} />
              </div>
              <div className="space-y-1.5">
                <Label>{isRtl ? "نوع الزيارة" : "Visit Type"}</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.visitType ?? event.visitType}
                  onChange={(e) => setForm(f => ({ ...f, visitType: e.target.value as VisitType }))}>
                  {VISIT_TYPES.map((t) => <option key={t}>{tVisitType(t)}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{isRtl ? "ملاحظات" : "Notes"}</Label>
                <Input dir={isRtl ? "rtl" : "ltr"} value={form.notes ?? ""} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          ) : completing ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-3">
              <div>
                <p className="font-bold text-sm">{isRtl ? "تسجيل نتائج الجلسة" : "Record session outcomes"}</p>
                <p className="text-xs text-muted-foreground mt-1">{isRtl ? "هذه القياسات يسجلها المعالج، ثم تُضاف تلقائيًا إلى سجل تقدم المريض." : "These therapist-entered measurements are automatically added to the patient's progress history."}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{isRtl ? "الألم قبل الجلسة (0–10)" : "Pain before (0–10)"}</Label>
                  <Input type="number" min={0} max={10} value={painBefore} onChange={(e) => setPainBefore(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{isRtl ? "الألم بعد الجلسة (0–10)" : "Pain after (0–10)"}</Label>
                  <Input type="number" min={0} max={10} value={painAfter} onChange={(e) => setPainAfter(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{isRtl ? "مؤشر التعافي (0–100)" : "Recovery score (0–100)"}</Label>
                  <Input type="number" min={0} max={100} value={recoveryScore} onChange={(e) => setRecoveryScore(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{isRtl ? "حالة ROM" : "ROM status"}</Label>
                  <Input value={romStatus} onChange={(e) => setRomStatus(e.target.value)} placeholder={isRtl ? "مثال: تحسن 10 درجات" : "e.g. improved by 10°"} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{isRtl ? "حالة القوة العضلية" : "Strength status"}</Label>
                <Input value={strengthStatus} onChange={(e) => setStrengthStatus(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{isRtl ? "التمارين التي تم تنفيذها (تمرين في كل سطر)" : "Exercises completed (one per line)"}</Label>
                <Textarea rows={3} value={completedExercisesText} onChange={(e) => setCompletedExercisesText(e.target.value)}
                  placeholder={(event.targetExercises || []).join("\n") || (isRtl ? "اكتب التمارين التي نُفذت فعليًا" : "List exercises actually completed")} />
              </div>
              <div className="space-y-1">
                <Label>{isRtl ? "ملاحظات المعالج" : "Therapist notes"}</Label>
                <Textarea rows={2} value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCompleting(false)} disabled={savingCompletion}>{isRtl ? "رجوع" : "Back"}</Button>
                <Button className="flex-1 bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white" onClick={submitCompletion} disabled={savingCompletion}>
                  {savingCompletion ? (isRtl ? "جارٍ الحفظ..." : "Saving...") : (isRtl ? "حفظ النتائج وإنهاء الجلسة" : "Save outcomes & complete")}
                </Button>
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
          {event.status !== "منتهي" && event.status !== "ملغي" && !completing && (
            <Button className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] gap-2 h-11 rounded-xl shadow-md transition-all active:scale-[0.98]"
              onClick={() => { setSessionNotes(event.notes || ""); setCompleting(true); }}>
              ✅ <span className="font-bold">{isRtl ? "إنهاء الجلسة وتسجيل التقدم" : "Complete session & record progress"}</span>
            </Button>
          )}
          <div className="flex gap-2 w-full">
            {editing ? (
              <>
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditing(false)}>{isRtl ? "تراجع" : "Undo"}</Button>
                <Button className="flex-1 rounded-xl bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white" onClick={saveEdit}>{isRtl ? "حفظ التعديلات" : "Save Changes"}</Button>
              </>
            ) : !completing ? (
              <>
                {event.status !== "ملغي" && event.status !== "منتهي" && (
                  <>
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={startEdit}>✏️ {isRtl ? "تعديل" : "Edit"}</Button>
                    <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => { onCancel(event.id); onClose(); }}>🗑 {isRtl ? "إلغاء" : "Cancel"}</Button>
                  </>
                )}
                {(event.status === "ملغي" || event.status === "منتهي") && (
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>{isRtl ? "إغلاق" : "Close"}</Button>
                )}
              </>
            ) : null}
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
  const { user, activeBranchId } = useAuth(); const clinicId = user?.clinicId;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<{ name: string }[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string; branch_id: string | null }[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [alertMsg, setAlertMsg] = useState("");

  // Load patients and events from Supabase
  useEffect(() => {
    if (!clinicId) return;
    const loadData = async () => {
      let dbEvents: any[] = [];
      let roomData: { id: string; name: string; branch_id: string | null }[] = [];
      let participantData: { appointment_id: string; patient_id: string }[] = [];
      let patientData: any[] = [];
      try {
        const response = await fetch("/api/calendar", { method: "GET", cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "تعذر تحميل بيانات التقويم");
        patientData = result.patients || [];
        setPatients(patientData);
        participantData = result.groupParticipants || [];
        const isDoctor = (role: string) =>
          ["admin", "clinic_admin", "doctor", "مدير العياده", "استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي"].includes(role);
        setDoctorsList((result.doctors || []).filter((staff: any) => isDoctor(staff.role)));
        roomData = result.rooms || [];
        setRooms(roomData);
        dbEvents = result.appointments || [];
      } catch (error: any) {
        console.error("Calendar data could not be loaded:", error);
        setPatients([]);
        setEvents([]);
        setAlertMsg(isRtl
          ? "تعذر تحميل بيانات المرضى والمواعيد من الخادم. لم يتم حذف أي بيانات. أعد المحاولة: " + (error.message || error)
          : "Could not load patients and appointments. No records were deleted. Please retry: " + (error.message || error));
        return;
      }

      const roomNames = new Map<string, string>(roomData.map((room) => [room.id, room.name]));
      const patientNames = new Map<string, string>(patientData.map((patient: any) => [patient.id, isRtl ? patient.nameAr : (patient.nameEn || patient.nameAr)]));
      const participantsByAppointment = new Map<string, string[]>();
      participantData.forEach((participant) => {
        const current = participantsByAppointment.get(participant.appointment_id) || [];
        current.push(participant.patient_id);
        participantsByAppointment.set(participant.appointment_id, current);
      });
      const formatted = (dbEvents || []).map((e: any) => {
        const startValue = e.start_time || (e.date && e.time ? `${e.date}T${e.time}` : new Date().toISOString());
        const start = new Date(startValue);
        const end = e.end_time ? new Date(e.end_time) : new Date(start.getTime() + (e.duration || 45) * 60000);
        const participantIds = participantsByAppointment.get(e.id) || [];
        const participantNames = participantIds.map((id) => patientNames.get(id) || id);
        const isGroupSession = Boolean(e.is_group_session || participantIds.length > 1);
        const displayPatientName = isGroupSession
          ? (isRtl ? `جلسة جماعية (${participantIds.length})` : `Group session (${participantIds.length})`)
          : (patientNames.get(e.patient_id) || e.patient_name || "");
        return {
          id: e.id,
          title: `${displayPatientName} - ${e.appointment_type || e.type || ""}`,
          start,
          end,
          patientName: displayPatientName,
          patientId: e.patient_id,
          isGroupSession,
          groupParticipantIds: participantIds,
          groupParticipantNames: participantNames,
          recurrenceId: e.recurrence_id || null,
          recurrenceIndex: e.recurrence_index || null,
          recurrenceTotal: e.recurrence_total || null,
          doctor: e.doctor_name || e.therapist,
          visitType: e.appointment_type || e.type,
          status: e.status,
          treatmentPlanId: e.treatment_plan_id || undefined,
          treatmentPlanTitle: e.treatment_plan?.goals || undefined,
          sessionIntervention: e.session_intervention || "",
          sessionObjectives: e.session_objectives || "",
          targetExercises: Array.isArray(e.target_exercises)
            ? e.target_exercises.map((item: any) => typeof item === "string" ? item : (item?.name || item?.title || "")).filter(Boolean)
            : [],
          roomId: e.room_id || undefined,
          roomName: roomNames.get(e.room_id) || undefined,
        };
      });
      setEvents(formatted);
    };
    loadData();
  }, [clinicId]);

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

  const handleCreateRoom = async (name: string) => {
    if (!clinicId) return null;
    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_room", name, branchId: activeBranchId || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر إضافة الغرفة");
      const room = result.room as { id: string; name: string; branch_id: string | null };
      setRooms((current) => [...current.filter((item) => item.id !== room.id), room].sort((a, b) => a.name.localeCompare(b.name)));
      return room;
    } catch (error: any) {
      alert(isRtl ? "فشل إضافة الغرفة: " + (error.message || error) : "Could not add room: " + (error.message || error));
      return null;
    }
  };

  const handleSaveNew = async (ev: CalendarEvent) => {
    if (!clinicId) {
      alert(isRtl ? "تعذر تحديد العيادة الحالية." : "The active clinic could not be identified.");
      return;
    }

    try {
      const limitRes = await fetch(`/api/subscription/check-limit?clinic_id=${clinicId}&resource=sessions`);
      if (limitRes.ok) {
        const limitData = await limitRes.json();
        if (!limitData.allowed) {
          setAlertMsg(isRtl
            ? "لقد تجاوزت الحد الأقصى للجلسات الشهرية في خطتك الحالية. يرجى ترقية اشتراكك."
            : "You have reached the monthly session limit for your current plan. Please upgrade your subscription.");
          return;
        }
      }

      const newId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
            const r = Math.random() * 16 | 0;
            return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
          });

      let defaultPrice = "100";
      const { data: settings, error: settingsError } = await supabase
        .from("clinic_settings")
        .select("default_session_price")
        .eq("user_id", "default")
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (!settingsError && settings?.default_session_price) {
        defaultPrice = String(settings.default_session_price);
      }

      const invoiceDesc = isRtl ? `جلسة: ${ev.visitType}` : `Session: ${ev.visitType}`;
      const invoiceAmt = isRtl ? `${defaultPrice} ج.م` : `${defaultPrice} EGP`;
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: newId,
          patientId: ev.patientId,
          doctor: ev.doctor,
          visitType: ev.visitType,
          status: ev.status,
          startTime: ev.start.toISOString(),
          endTime: ev.end.toISOString(),
          invoiceId: `INV-${newId}`,
          invoiceDescription: invoiceDesc,
          invoiceAmount: invoiceAmt,
          invoiceStatus: isRtl ? "انتظار" : "Pending",
          invoiceDate: ev.start.toISOString().split("T")[0],
          roomId: ev.roomId || null,
          branchId: activeBranchId || null,
          treatmentPlanId: ev.treatmentPlanId || null,
          sessionIntervention: ev.sessionIntervention || null,
          sessionObjectives: ev.sessionObjectives || null,
          targetExercises: (ev.targetExercises || []).map((name) => ({ name })),
          patientIds: ev.groupParticipantIds || [ev.patientId],
          isGroupSession: Boolean(ev.isGroupSession),
          recurrenceMode: ev.recurrenceMode || "none",
          recurrenceCount: ev.recurrenceCount || 1,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر حفظ الموعد والفاتورة");
      ev.id = newId;
      if (result.recurrenceId && result.createdCount > 1) {
        const occurrences = Array.from({ length: result.createdCount }, (_, index) => {
          const offset = ev.recurrenceMode === "weekly" ? index * 7 : ev.recurrenceMode === "biweekly" ? index * 14 : 0;
          const start = new Date(ev.start.getTime() + offset * 86400000);
          const end = new Date(ev.end.getTime() + offset * 86400000);
          return {
            ...ev,
            id: index === 0 ? newId : `series-${result.recurrenceId}-${index + 1}`,
            start,
            end,
            title: ev.title + (isRtl ? ` · ${index + 1}/${result.createdCount}` : ` · ${index + 1}/${result.createdCount}`),
            recurrenceId: result.recurrenceId,
            recurrenceIndex: index + 1,
            recurrenceTotal: result.createdCount,
          };
        });
        syncEventsState([...events, ...occurrences]);
      } else {
        syncEventsState([...events, ev]);
      }
      setSelectedDate(null);
    } catch (err: any) {
      console.error("Failed to atomically save appointment and invoice:", err);
      alert(isRtl
        ? "لم يتم حفظ الموعد والفاتورة. لم تتم إضافة الموعد إلى التقويم: " + (err.message || err)
        : "The appointment and invoice were not saved. The calendar was not updated: " + (err.message || err));
    }
  };

  const handleUpdate = async (updated: CalendarEvent) => {
    if (!clinicId) return;
    try {
      const response = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          appointmentId: updated.id,
          doctor: updated.doctor,
          visitType: updated.visitType,
          status: updated.status,
          startTime: updated.start.toISOString(),
          endTime: updated.end.toISOString(),
          roomId: updated.roomId ?? null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تحديث الموعد");

      syncEventsState(events.map((e) => e.id === updated.id ? updated : e));
      setSelectedEvent(null);
    } catch (err: any) {
      console.error("Failed to update appointment:", err);
      alert(isRtl ? "فشل تحديث الموعد: " + (err.message || err) : "Appointment update failed: " + (err.message || err));
    }
  };

  const handleCancel = async (id: string) => {
    if (!clinicId) return;
    try {
      const response = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", appointmentId: id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر إلغاء الموعد");

      syncEventsState(events.map((e) => e.id === id ? { ...e, status: "ملغي" } : e));
    } catch (err: any) {
      console.error("Failed to cancel appointment:", err);
      alert(isRtl ? "فشل إلغاء الموعد: " + (err.message || err) : "Appointment cancellation failed: " + (err.message || err));
    }
  };

  const handleComplete = async (id: string, outcome: SessionOutcome): Promise<boolean> => {
    if (!clinicId) return false;
    const completedEvent = events.find((event) => event.id === id);
    if (!completedEvent || completedEvent.status === "منتهي") return false;

    try {
      const { data, error } = await supabase.rpc("complete_appointment_and_record_progress", {
        p_appointment_id: id,
        p_pain_before: outcome.painBefore,
        p_pain_after: outcome.painAfter,
        p_rom_status: outcome.romStatus || null,
        p_strength_status: outcome.strengthStatus || null,
        p_recovery_score: outcome.recoveryScore,
        p_completed_exercises: outcome.completedExercises.map((name) => ({ name })),
        p_notes: outcome.notes || null,
      });
      if (error) throw error;

      syncEventsState(events.map((event) => event.id === id ? { ...event, status: "منتهي" } : event));
      if (data?.already_completed) {
        console.info("Existing session progress was already recorded; no extra session credit was consumed.");
      }
      return true;
    } catch (err: any) {
      console.error("Atomic session completion and progress recording failed:", err);
      alert(isRtl
        ? "لم يتم إنهاء الجلسة أو تحديث التقدم: " + (err.message || err)
        : "The session was not completed and progress was not updated: " + (err.message || err));
      return false;
    }
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
              className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white gap-2 rounded-xl font-bold px-6 shadow-md transition-all active:scale-95"
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
            const bgMap: Record<string, string> = { indigo: "bg-indigo-50 dark:bg-indigo-950/30", emerald: "bg-emerald-50 dark:bg-emerald-950/30", amber: "bg-amber-50 dark:bg-amber-950/30", slate: "bg-slate-50 dark:bg-slate-900/30" };
            const borderMap: Record<string, string> = { indigo: "border-indigo-200 dark:border-indigo-900/50", emerald: "border-emerald-200 dark:border-emerald-900/50", amber: "border-amber-200 dark:border-amber-900/50", slate: "border-slate-200 dark:border-slate-800/50" };
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
                <div className={`w-2.5 h-2.5 rounded-full ${VISIT_COLOR_CLASSES[t]}`} />
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
        roomsList={rooms}
        clinicId={clinicId || undefined}
        branchId={activeBranchId || null}
        canManageRooms={hasPermission("manage_settings")}
        onCreateRoom={handleCreateRoom}
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