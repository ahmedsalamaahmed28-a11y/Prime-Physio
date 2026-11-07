"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Props = { patientId: string; clinicId?: string; isRtl: boolean };

export function ClinicalWorkflowTab({ patientId, clinicId, isRtl }: Props) {
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<{ evaluations: any[]; plans: any[]; programs: any[]; progress: any[] }>({
    evaluations: [], plans: [], programs: [], progress: [],
  });

  const [evaluation, setEvaluation] = useState({
    type: "Initial", vas: "0", symptoms: "", rom: "", strength: "", specialTests: "",
    potentialDiagnoses: "", redFlags: "", summary: "",
  });
  const [plan, setPlan] = useState({
    goals: "", sessionPlan: "", frequency: "2 sessions/week", duration: "4 weeks",
    homeProgram: "", programTitle: "Home Exercise Program", exercises: "",
  });
  const [progress, setProgress] = useState({
    pain: "0", rom: "", strength: "", recovery: "0", notes: "",
  });

  const loadHistory = useCallback(async () => {
    if (!clinicId || !patientId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/clinical`, {
        method: "GET",
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تحميل السجل العلاجي");
      setHistory({
        evaluations: result.evaluations || [],
        plans: result.plans || [],
        programs: result.programs || [],
        progress: result.progress || [],
      });
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [clinicId, patientId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const saveCarePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clinicId || savingPlan) return;
    setSavingPlan(true); setError(""); setNotice("");
    try {
      const vas = Number(evaluation.vas);
      if (!Number.isInteger(vas) || vas < 0 || vas > 10) throw new Error(isRtl ? "درجة الألم يجب أن تكون من 0 إلى 10." : "VAS must be between 0 and 10.");
      const exercises = plan.exercises.split("\n").map((line) => line.trim()).filter(Boolean).map((name) => ({ name }));
      const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/clinical`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "care_plan",
          evaluation,
          plan: { ...plan, exercises },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر حفظ التقييم والخطة العلاجية");
      setNotice(isRtl ? "تم حفظ التقييم والخطة والبرنامج المنزلي معًا." : "Evaluation, treatment plan and home program saved together.");
      await loadHistory();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally { setSavingPlan(false); }
  };

  const saveProgress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clinicId || savingProgress) return;
    setSavingProgress(true); setError(""); setNotice("");
    try {
      const pain = Number(progress.pain);
      const recovery = Number(progress.recovery);
      if (!Number.isInteger(pain) || pain < 0 || pain > 10) throw new Error(isRtl ? "الألم يجب أن يكون من 0 إلى 10." : "Pain must be between 0 and 10.");
      if (!Number.isInteger(recovery) || recovery < 0 || recovery > 100) throw new Error(isRtl ? "التعافي يجب أن يكون من 0 إلى 100." : "Recovery must be between 0 and 100.");
      const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/clinical`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "progress", progress: { ...progress, pain, recovery } }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تسجيل التقدم العلاجي");
      setNotice(isRtl ? "تم تسجيل قياس التقدم." : "Progress measurement recorded.");
      setProgress({ pain: "0", rom: "", strength: "", recovery: "0", notes: "" });
      await loadHistory();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally { setSavingProgress(false); }
  };

  const field = (label: string, value: string, onChange: (value: string) => void, placeholder = "") => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
  const area = (label: string, value: string, onChange: (value: string) => void, placeholder = "") => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} rows={3} />
    </div>
  );

  if (!clinicId) return <p className="text-sm text-muted-foreground p-4">{isRtl ? "تعذر تحديد العيادة الحالية." : "Clinic context is unavailable."}</p>;

  return (
    <div className="space-y-5 pt-4" dir={isRtl ? "rtl" : "ltr"}>
      <Card>
        <CardHeader><CardTitle className="text-base">{isRtl ? "التقييم السريري والخطة العلاجية" : "Clinical Evaluation & Treatment Plan"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveCarePlan} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {field(isRtl ? "نوع التقييم" : "Evaluation type", evaluation.type, (v) => setEvaluation({ ...evaluation, type: v }))}
              {field(isRtl ? "درجة الألم VAS (0–10)" : "Pain VAS (0–10)", evaluation.vas, (v) => setEvaluation({ ...evaluation, vas: v }))}
            </div>
            {area(isRtl ? "الأعراض والشكوى" : "Symptoms / Chief complaint", evaluation.symptoms, (v) => setEvaluation({ ...evaluation, symptoms: v }))}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {area(isRtl ? "مدى الحركة ROM" : "Range of motion (ROM)", evaluation.rom, (v) => setEvaluation({ ...evaluation, rom: v }))}
              {area(isRtl ? "القوة العضلية MMT" : "Muscle strength (MMT)", evaluation.strength, (v) => setEvaluation({ ...evaluation, strength: v }))}
            </div>
            {area(isRtl ? "الاختبارات الخاصة (كل اختبار في سطر)" : "Special tests (one per line)", evaluation.specialTests, (v) => setEvaluation({ ...evaluation, specialTests: v }))}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {area(isRtl ? "التشخيصات المحتملة" : "Potential diagnoses", evaluation.potentialDiagnoses, (v) => setEvaluation({ ...evaluation, potentialDiagnoses: v }))}
              {area(isRtl ? "علامات الخطر والتحذيرات" : "Red flags / precautions", evaluation.redFlags, (v) => setEvaluation({ ...evaluation, redFlags: v }))}
            </div>
            {area(isRtl ? "ملخص التقييم" : "Clinical summary", evaluation.summary, (v) => setEvaluation({ ...evaluation, summary: v }))}
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold text-sm">{isRtl ? "الخطة العلاجية" : "Treatment plan"}</h3>
              {area(isRtl ? "الأهداف العلاجية" : "Treatment goals", plan.goals, (v) => setPlan({ ...plan, goals: v }))}
              {area(isRtl ? "خطة الجلسات والتدخلات" : "Session plan / interventions", plan.sessionPlan, (v) => setPlan({ ...plan, sessionPlan: v }))}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {field(isRtl ? "التكرار" : "Frequency", plan.frequency, (v) => setPlan({ ...plan, frequency: v }))}
                {field(isRtl ? "المدة" : "Duration", plan.duration, (v) => setPlan({ ...plan, duration: v }))}
              </div>
              {area(isRtl ? "البرنامج المنزلي" : "Home program", plan.homeProgram, (v) => setPlan({ ...plan, homeProgram: v }))}
              {field(isRtl ? "اسم برنامج التمارين" : "Exercise program title", plan.programTitle, (v) => setPlan({ ...plan, programTitle: v }))}
              {area(isRtl ? "التمارين (تمرين في كل سطر)" : "Exercises (one per line)", plan.exercises, (v) => setPlan({ ...plan, exercises: v }))}
            </div>
            <Button type="submit" disabled={savingPlan}>{savingPlan ? (isRtl ? "جارٍ الحفظ..." : "Saving...") : (isRtl ? "حفظ التقييم والخطة والبرنامج" : "Save evaluation, plan & program")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{isRtl ? "تسجيل التقدم العلاجي" : "Record Treatment Progress"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProgress} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {field(isRtl ? "الألم (0–10)" : "Pain (0–10)", progress.pain, (v) => setProgress({ ...progress, pain: v }))}
              {field(isRtl ? "مؤشر التعافي (0–100)" : "Recovery score (0–100)", progress.recovery, (v) => setProgress({ ...progress, recovery: v }))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {field(isRtl ? "حالة مدى الحركة" : "ROM status", progress.rom, (v) => setProgress({ ...progress, rom: v }))}
              {field(isRtl ? "حالة القوة العضلية" : "Strength status", progress.strength, (v) => setProgress({ ...progress, strength: v }))}
            </div>
            {area(isRtl ? "ملاحظات التقدم" : "Progress notes", progress.notes, (v) => setProgress({ ...progress, notes: v }))}
            <Button type="submit" variant="outline" disabled={savingProgress}>{savingProgress ? (isRtl ? "جارٍ التسجيل..." : "Saving...") : (isRtl ? "تسجيل التقدم" : "Record progress")}</Button>
          </form>
        </CardContent>
      </Card>

      {(error || notice) && <div role="status" className={error ? "text-sm text-red-600" : "text-sm text-emerald-700"}>{error || notice}</div>}

      <Card>
        <CardHeader><CardTitle className="text-base">{isRtl ? "السجل العلاجي" : "Clinical History"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p className="text-sm text-muted-foreground">{isRtl ? "جارٍ تحميل السجل..." : "Loading history..."}</p> : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{isRtl ? `التقييمات: ${history.evaluations.length}` : `Evaluations: ${history.evaluations.length}`}</Badge>
                <Badge variant="secondary">{isRtl ? `الخطط: ${history.plans.length}` : `Plans: ${history.plans.length}`}</Badge>
                <Badge variant="secondary">{isRtl ? `البرامج: ${history.programs.length}` : `Programs: ${history.programs.length}`}</Badge>
                <Badge variant="secondary">{isRtl ? `قياسات التقدم: ${history.progress.length}` : `Progress entries: ${history.progress.length}`}</Badge>
              </div>
              {history.evaluations.map((item) => <div key={item.id} className="border-b pb-2 text-sm"><b>{item.evaluation_type}</b> · {item.evaluation_date ? new Date(item.evaluation_date).toLocaleDateString() : ""} · VAS {item.vas_score ?? "—"}<p className="text-muted-foreground">{item.notes || ""}</p></div>)}
              {history.plans.map((item) => <div key={item.id} className="border-b pb-2 text-sm"><b>{isRtl ? "الخطة العلاجية" : "Treatment plan"}</b> · {item.status || "active"}<p>{item.goals}</p><p className="text-muted-foreground">{item.session_plan}</p></div>)}
              {history.programs.map((item) => <div key={item.id} className="border-b pb-2 text-sm"><b>{item.title}</b><p className="text-muted-foreground">{Array.isArray(item.exercises) ? item.exercises.map((exercise: any) => exercise.name || exercise.title || "").filter(Boolean).join("، ") : ""}</p></div>)}
              {history.progress.map((item) => <div key={item.id} className="border-b pb-2 text-sm"><b>{isRtl ? "تقدم علاجي" : "Progress"}</b> · {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}{item.appointment_id ? " · " + (isRtl ? "الموعد" : "Appointment") + " " + item.appointment_id : ""}<p className="text-muted-foreground">{isRtl ? "الألم قبل الجلسة: " : "Pain before: "}{item.pain_before ?? "—"} · {isRtl ? "بعد الجلسة: " : "after: "}{item.pain_level ?? "—"}/10 · ROM: {item.rom_status || "—"} · {isRtl ? "القوة" : "Strength"}: {item.strength_status || "—"} · {isRtl ? "التعافي" : "Recovery"} {item.recovery_score ?? "—"}%</p><p className="text-muted-foreground">{isRtl ? "التدخل: " : "Intervention: "}{item.session?.intervention || "—"} · {isRtl ? "الأهداف: " : "Objectives: "}{item.session?.session_objectives || "—"}</p><p className="text-muted-foreground">{isRtl ? "التمارين المستهدفة: " : "Target exercises: "}{Array.isArray(item.session?.target_exercises) ? item.session.target_exercises.map((exercise: any) => typeof exercise === "string" ? exercise : (exercise?.name || exercise?.title || "")).filter(Boolean).join("، ") : "—"}</p><p className="text-muted-foreground">{isRtl ? "التمارين المنفذة: " : "Completed exercises: "}{Array.isArray(item.completed_exercises) ? item.completed_exercises.map((exercise: any) => typeof exercise === "string" ? exercise : (exercise?.name || exercise?.title || "")).filter(Boolean).join("، ") : "—"}</p><p className="text-muted-foreground">{item.notes || ""}</p></div>)}
              {!history.evaluations.length && !history.plans.length && !history.programs.length && !history.progress.length && <p className="text-sm text-muted-foreground">{isRtl ? "لا توجد سجلات علاجية بعد." : "No clinical history yet."}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
