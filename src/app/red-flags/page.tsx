"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, ShieldCheck, ShieldAlert, Activity, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Symptom {
  id: string;
  categoryAr: string;
  categoryEn: string;
  labelAr: string;
  labelEn: string;
  weight: number; // 1 = Yellow Flag, 3 = Red Flag
}

const SYMPTOMS: Symptom[] = [
  // General / Systemic
  { id: "s1", categoryAr: "عام", categoryEn: "General", labelAr: "فقدان وزن غير مبرر مؤخراً", labelEn: "Unexplained recent weight loss", weight: 3 },
  { id: "s2", categoryAr: "عام", categoryEn: "General", labelAr: "تاريخ مرضي للسرطان", labelEn: "History of cancer", weight: 3 },
  { id: "s3", categoryAr: "عام", categoryEn: "General", labelAr: "حمى أو قشعريرة", labelEn: "Fever or chills", weight: 3 },
  { id: "s4", categoryAr: "عام", categoryEn: "General", labelAr: "شعور بتوعك عام وتعب مستمر", labelEn: "General malaise and constant fatigue", weight: 1 },
  // Neurological (Spine)
  { id: "n1", categoryAr: "عصبي (العمود الفقري)", categoryEn: "Neurological", labelAr: "فقدان التحكم في التبول أو التبرز", labelEn: "Loss of bowel or bladder control", weight: 3 },
  { id: "n2", categoryAr: "عصبي (العمود الفقري)", categoryEn: "Neurological", labelAr: "تنميل حول منطقة العجان (Saddle anesthesia)", labelEn: "Saddle anesthesia", weight: 3 },
  { id: "n3", categoryAr: "عصبي (العمود الفقري)", categoryEn: "Neurological", labelAr: "ضعف مفاجئ في عضلات الساقين أو سقوط القدم", labelEn: "Sudden bilateral leg weakness or foot drop", weight: 3 },
  { id: "n4", categoryAr: "عصبي (العمود الفقري)", categoryEn: "Neurological", labelAr: "تنميل أو وخز في طرف واحد يمتد للأصابع", labelEn: "Unilateral tingling/numbness radiating to toes", weight: 1 },
  // Musculoskeletal / Trauma
  { id: "m1", categoryAr: "عضلي هيكلي / إصابات", categoryEn: "Musculoskeletal", labelAr: "صدمة شديدة مؤخراً (حادث، سقوط من ارتفاع)", labelEn: "Recent major trauma (accident, fall from height)", weight: 3 },
  { id: "m2", categoryAr: "عضلي هيكلي / إصابات", categoryEn: "Musculoskeletal", labelAr: "ألم ليلي شديد لا يتحسن بتغيير الوضعية", labelEn: "Severe unremitting night pain", weight: 3 },
  { id: "m3", categoryAr: "عضلي هيكلي / إصابات", categoryEn: "Musculoskeletal", labelAr: "استخدام الكورتيزون لفترات طويلة (هشاشة عظام)", labelEn: "Prolonged corticosteroid use", weight: 1 },
  { id: "m4", categoryAr: "عضلي هيكلي / إصابات", categoryEn: "Musculoskeletal", labelAr: "ألم يزداد تدريجياً مع الراحة", labelEn: "Pain that progressively worsens with rest", weight: 3 },
];

export default function RedFlagsPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());

  const toggleSymptom = (id: string) => {
    const newSet = new Set(selectedSymptoms);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSymptoms(newSet);
  };

  const calculateRisk = () => {
    let totalScore = 0;
    selectedSymptoms.forEach(id => {
      const symptom = SYMPTOMS.find(s => s.id === id);
      if (symptom) totalScore += symptom.weight;
    });

    if (totalScore >= 3) {
      return {
        level: "red",
        titleAr: "خطر عالي (Red Flag) 🔴",
        titleEn: "High Risk (Red Flag) 🔴",
        descAr: "الأعراض تشير إلى احتمالية وجود حالة طبية خطيرة (مثل Cauda Equina، كسر، أو ورم). يجب التوقف عن العلاج الطبيعي فوراً وتحويل المريض للطوارئ أو الطبيب المختص.",
        descEn: "Symptoms indicate a potential serious pathology (e.g., Cauda Equina, fracture, or tumor). Stop physiotherapy immediately and refer to emergency or a specialist."
      };
    } else if (totalScore > 0) {
      return {
        level: "yellow",
        titleAr: "مؤشر تحذيري (Yellow Flag) 🟡",
        titleEn: "Warning (Yellow Flag) 🟡",
        descAr: "الأعراض تتطلب الحذر وتقييماً أعمق. يمكن البدء في العلاج الطبيعي بحذر شديد مع مراقبة تطور الحالة.",
        descEn: "Symptoms require caution and deeper evaluation. You may proceed with physiotherapy cautiously while monitoring the condition."
      };
    } else {
      return {
        level: "green",
        titleAr: "آمن (Green Flag) 🟢",
        titleEn: "Safe (Green Flag) 🟢",
        descAr: "لا توجد مؤشرات خطر واضحة. من الآمن البدء في التقييم الفيزيائي وجلسات العلاج الطبيعي.",
        descEn: "No obvious red flags. It is safe to proceed with physical assessment and physiotherapy sessions."
      };
    }
  };

  const riskResult = calculateRisk();

  // Group symptoms by category
  const groupedSymptoms = SYMPTOMS.reduce((acc, curr) => {
    const cat = isRtl ? curr.categoryAr : curr.categoryEn;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {} as Record<string, Symptom[]>);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-gradient-to-b from-[#4F46BA] to-[#7c3aed] text-white pt-10 pb-20 px-6">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">{isRtl ? "مساعد التشخيص (مؤشرات الخطر)" : "Red Flags Checker (Triage)"}</h1>
            <p className="text-white/80 text-sm mt-1">
              {isRtl ? "أداة للفرز الطبي السريع لتحديد ما إذا كانت الحالة آمنة للعلاج الطبيعي أم تتطلب تحويلاً طبياً." : "Quick clinical triage tool to determine if the condition is safe for physiotherapy or requires medical referral."}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Symptoms Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-white border-b pb-4">
              <CardTitle className="text-lg text-indigo-950 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                {isRtl ? "استبيان الأعراض السريرية" : "Clinical Symptoms Checklist"}
              </CardTitle>
              <CardDescription>
                {isRtl ? "حدد جميع الأعراض التي يشتكي منها المريض حالياً:" : "Select all symptoms the patient is currently experiencing:"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {Object.entries(groupedSymptoms).map(([category, items]) => (
                <div key={category} className="border-b last:border-b-0 border-slate-100">
                  <div className="bg-slate-50 px-4 py-2 font-bold text-slate-700 text-sm">
                    {category}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {items.map(symptom => {
                      const isSelected = selectedSymptoms.has(symptom.id);
                      return (
                        <button
                          key={symptom.id}
                          onClick={() => toggleSymptom(symptom.id)}
                          className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left hover:bg-slate-50 ${isSelected ? "bg-indigo-50/50" : ""}`}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"}`}>
                            {isSelected && <ShieldCheck className="w-3 h-3" />}
                          </div>
                          <span className={`text-sm flex-1 ${isSelected ? "font-semibold text-indigo-950" : "text-slate-600"}`}>
                            {isRtl ? symptom.labelAr : symptom.labelEn}
                          </span>
                          {symptom.weight === 3 && (
                            <span className="shrink-0 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              {isRtl ? "شديد" : "Severe"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Result Area */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-0 shadow-lg sticky top-6">
            <CardHeader className="bg-white border-b pb-4">
              <CardTitle className="text-lg text-indigo-950">{isRtl ? "نتيجة التقييم" : "Triage Result"}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              
              <div className={`rounded-xl p-6 text-center border-2 ${
                riskResult.level === "red" ? "bg-red-50 border-red-200" :
                riskResult.level === "yellow" ? "bg-amber-50 border-amber-200" :
                "bg-emerald-50 border-emerald-200"
              }`}>
                {riskResult.level === "red" ? (
                  <ShieldAlert className="w-16 h-16 text-red-600 mx-auto mb-4" />
                ) : riskResult.level === "yellow" ? (
                  <AlertTriangle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
                ) : (
                  <ShieldCheck className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                )}
                
                <h3 className={`text-xl font-bold mb-2 ${
                  riskResult.level === "red" ? "text-red-700" :
                  riskResult.level === "yellow" ? "text-amber-700" :
                  "text-emerald-700"
                }`}>
                  {isRtl ? riskResult.titleAr : riskResult.titleEn}
                </h3>
                
                <p className={`text-sm leading-relaxed ${
                  riskResult.level === "red" ? "text-red-900/80" :
                  riskResult.level === "yellow" ? "text-amber-900/80" :
                  "text-emerald-900/80"
                }`}>
                  {isRtl ? riskResult.descAr : riskResult.descEn}
                </p>
              </div>

              {selectedSymptoms.size > 0 && (
                <div className="mt-6 flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedSymptoms(new Set())}
                    className="w-full text-slate-500"
                  >
                    {isRtl ? "إعادة ضبط التقييم" : "Reset Assessment"}
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
