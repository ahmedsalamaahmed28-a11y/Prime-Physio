"use client";

import { useState, use, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import BodyPainMapper, { BODY_PAIN_REGIONS } from "@/components/BodyPainMapper";
import ProgressCharts from "@/components/ProgressCharts";
import { AiPlannerTab } from "@/components/patients/AiPlannerTab";
import { SmartReportsTab } from "@/components/patients/SmartReportsTab";
import { ClinicalBrainstormTab } from "@/components/patients/ClinicalBrainstormTab";
import { PhaseBasedProtocolsTab } from "@/components/patients/PhaseBasedProtocolsTab";
import { useLanguage } from "@/lib/LanguageContext";
import { usePermissions } from "@/lib/usePermissions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Lock, Trash2, FileText, Sparkles, MessageCircle } from "lucide-react";
const LockIcon = Lock;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  date: string;
  diagnosis: string;
  vasScore: number;
  rom: string;
  notes?: string;
  therapist?: string;
}

interface Patient {
  id: string;
  nameAr: string;
  nameEn: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  nationalId: string;
  bloodType: string;
  allergies: string;
  dvt?: string;
  emergencyContact: string;
  emergencyPhone: string;
  address: string;  occupation?: string;
  referral?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  medicalHistory?: string;
  pastSurgeries?: string;
  chronicDiseases?: string;  currentMedications?: string;
  drugAllergies?: string;
  doctor?: string;
  active_protocol?: ProtocolState | string | null;
}

interface ProtocolState {
  protocolId: string;
  currentPhase: number;
  completedCriteria: string[];
}

// ─── Empty initial state ───────────────────────────────────────────────────────
const EMPTY_PATIENT = (id: string): Patient => ({
  id,
  nameAr: "",
  nameEn: "",
  age: 0,
  gender: "",
  phone: "",
  email: "",
  nationalId: "",
  bloodType: "",
  allergies: "",
  dvt: "",
  emergencyContact: "",
  emergencyPhone: "",
  address: "",
  occupation: "",
  referral: "",
  chiefComplaint: "",
  diagnosis: "",
  medicalHistory: "",
  pastSurgeries: "",
  chronicDiseases: "",
  currentMedications: "",
  drugAllergies: "",
  doctor: "",
  active_protocol: undefined,
});

// ─── Phase-Based Protocols Database ──────────────────────────────────────────

interface ProtocolPhase {
  phaseNumber: number;
  weeks: string;
  goalsAr: string[];
  goalsEn: string[];
  precautionsAr: string[];
  precautionsEn: string[];
  criteria: {
    key: string;
    labelAr: string;
    labelEn: string;
  }[];
}

interface ClinicalProtocol {
  id: string;
  nameAr: string;
  nameEn: string;
  keywords: string[];
  phases: ProtocolPhase[];
}

const CLINICAL_PROTOCOLS: ClinicalProtocol[] = [
  {
    id: "acl_reconstruction",
    nameAr: "إعادة بناء الرباط الصليبي الأمامي (ACL Reconstruction)",
    nameEn: "ACL Reconstruction Protocol",
    keywords: ["acl", "رباط صليبي", "cruciate", "anterior cruciate", "تمزق الرباط"],
    phases: [
      {
        phaseNumber: 1,
        weeks: "الأسابيع 1 - 4",
        goalsAr: ["ثني الركبة حتى 90 درجة", "استعادة امتداد الركبة الكامل (0 درجة)", "تفعيل العضلة الرباعية (Quadriceps)", "السيطرة على التورم والألم"],
        goalsEn: ["Knee flexion to 90 degrees", "Restore full extension (0 degrees)", "Activate Quadriceps", "Control swelling & pain"],
        precautionsAr: ["ممنوع تمارين فرد الركبة النشط في السلسلة المفتوحة (Active OKC Extension)", "استخدام دعامة الركبة مقفلة أثناء المشي", "التحميل بالوزن حسب التحمل"],
        precautionsEn: ["No active open-kinetic chain extension", "Wear locked brace while walking", "Weight-bearing as tolerated"],
        criteria: [
          { key: "full_extension", labelAr: "امتداد كامل للركبة (0 درجة)", labelEn: "Full passive knee extension (0°)" },
          { key: "flexion_90", labelAr: "ثني الركبة لـ 90 درجة على الأقل", labelEn: "Knee flexion to 90°" },
          { key: "slr_no_lag", labelAr: "رفع الساق مستقيمة (SLR) بدون ارتخاء الركبة", labelEn: "Straight Leg Raise (SLR) without lag" },
          { key: "minimal_effusion", labelAr: "تورم بسيط جداً أو مسيطر عليه", labelEn: "Minimal joint effusion" }
        ]
      },
      {
        phaseNumber: 2,
        weeks: "الأسابيع 5 - 8",
        goalsAr: ["مدى حركي كامل للثني (120-135 درجة)", "مشية طبيعية بدون عرج وبدون عكازات", "تحسين ثبات الركبة العضلي", "البدء بالتمارين المجهدة الخفيفة"],
        goalsEn: ["Full flexion ROM (120-135°)", "Normal gait pattern without crutches", "Improve dynamic knee stability", "Begin light resisted exercises"],
        precautionsAr: ["تجنب الالتفاف أو الدوران المفاجئ على الساق المصابة", "تجنب الركض أو القفز"],
        precautionsEn: ["Avoid pivoting or sudden twisting", "No running or jumping yet"],
        criteria: [
          { key: "normal_gait", labelAr: "نمط مشي طبيعي بدون عكازات وبدون دعامة", labelEn: "Normal gait pattern without assistive devices" },
          { key: "flexion_120", labelAr: "ثني الركبة لـ 120 درجة أو أكثر", labelEn: "Knee flexion to 120°" },
          { key: "balance_single_leg", labelAr: "الوقوف بثبات على ساق واحدة لـ 20 ثانية", labelEn: "Single leg stance balance for 20 seconds" }
        ]
      },
      {
        phaseNumber: 3,
        weeks: "الأسابيع 9 - 16",
        goalsAr: ["قوة عضلية تعادل 80% من الساق السليمة", "إدخال تمارين الركض الخفيف بخط مستقيم", "تحسين القدرة الارتدادية العضلية"],
        goalsEn: ["Quadriceps strength > 80% of uninvolved limb", "Introduce light straight-line running", "Improve neuromuscular control"],
        precautionsAr: ["تجنب ممارسة الرياضات الالتحامية أو تغيير الاتجاه الحاد", "مراقبة أي علامات تورم بعد التدريب"],
        precautionsEn: ["No contact sports or cutting maneuvers", "Monitor joint for post-activity swelling"],
        criteria: [
          { key: "limb_symmetry_80", labelAr: "تماثل قوة الساقين بنسبة 80% في جهاز ضغط الرجل", labelEn: "Limb symmetry index > 80% on leg press" },
          { key: "pain_free_jogging", labelAr: "القدرة على الهرولة بخط مستقيم بدون ألم", labelEn: "Pain-free straight line jogging" }
        ]
      },
      {
        phaseNumber: 4,
        weeks: "الأسابيع 17 - 24+",
        goalsAr: ["العودة الكاملة للرياضة (RTS)", "تماثل قوة الساقين بنسبة 90% أو أكثر", "إتقان الحركات الرياضية الخاصة بالملعب"],
        goalsEn: ["Full return to sports", "Limb symmetry index > 90%", "Master sport-specific agility drills"],
        precautionsAr: ["عدم العودة للمنافسة قبل تقييم واجتياز اختبارات العودة للملاعب رسمياً"],
        precautionsEn: ["No competitive play before passing RTS testing battery"],
        criteria: [
          { key: "limb_symmetry_90", labelAr: "تماثل القوة بنسبة 90% أو أكثر", labelEn: "Limb symmetry index > 90% on functional testing" },
          { key: "hop_tests_pass", labelAr: "اجتياز اختبارات القفز الوظيفية (Hop Tests)", labelEn: "Pass functional hop test battery (>90% symmetry)" },
          { key: "psychological_readiness", labelAr: "الجاهزية النفسية التامة للعب (درجة عالية في مقياس ACL-RSI)", labelEn: "Complete psychological readiness (high score on ACL-RSI)" }
        ]
      }
    ]
  },
  {
    id: "lumbar_disc",
    nameAr: "بروتوكول الانزلاق الغضروفي القطني (Lumbar Disc Herniation)",
    nameEn: "Lumbar Disc Herniation Protocol",
    keywords: ["lumbar", "disc", "herniation", "sciatica", "عرق النسا", "انزلاق غضروفي", "ظهر", "back pain", "spinal"],
    phases: [
      {
        phaseNumber: 1,
        weeks: "الأسابيع 1 - 2",
        goalsAr: ["تخفيف الألم الحاد", "تصحيح وضعية الجلوس والوقوف", "تقليل الالتهاب حول العصب", "تعليم المريض ميكانيكا الجسم السليمة"],
        goalsEn: ["Relieve acute pain", "Correct sitting and standing posture", "Reduce nerve root inflammation", "Teach proper body mechanics"],
        precautionsAr: ["تجنب ثني العمود الفقري للأمام (Flexion)", "تجنب الجلوس الطويل", "تجنب رفع الأوزان الثقيلة", "عدم ممارسة تمارين اللمس (Toe Touches)"],
        precautionsEn: ["Avoid spinal flexion", "Avoid prolonged sitting", "Avoid heavy lifting", "No toe touch exercises"],
        criteria: [
          { key: "pain_below_knee_gone", labelAr: "اختفاء الألم أسفل الركبة", labelEn: "Pain below knee resolved" },
          { key: "sitting_30min", labelAr: "القدرة على الجلوس 30 دقيقة بدون ألم", labelEn: "Able to sit 30 min pain-free" },
          { key: "slr_60", labelAr: "اختبار رفع الساق المستقيمة (SLR) أكثر من 60 درجة", labelEn: "Straight Leg Raise > 60°" }
        ]
      },
      {
        phaseNumber: 2,
        weeks: "الأسابيع 3 - 4",
        goalsAr: ["تحسين القوة الأساسية (Core)", "استعادة المدى الحركي الكامل للعمود الفقري", "البدء بتمارين التمدد和治疗ية"],
        goalsEn: ["Improve core strength", "Restore full spinal ROM", "Begin McKenzie extension exercises"],
        precautionsAr: ["تجنب الحركات الدورانية المفاجئة", "عدم العودة للرياضة قبل التقييم"],
        precautionsEn: ["Avoid sudden rotational movements", "No return to sport before assessment"],
        criteria: [
          { key: "core_stability", labelAr: "ثبات الجذع الأساسي (Core) لمدة 30 ثانية", labelEn: "Core stability hold for 30 seconds" },
          { key: "pain_free_rom", labelAr: "مدى حركي كامل للظهر بدون ألم", labelEn: "Full pain-free lumbar ROM" }
        ]
      },
      {
        phaseNumber: 3,
        weeks: "الأسابيع 5 - 8",
        goalsAr: ["تقوية عضلات الظهر والبطن", "العودة التدريجية للأنشطة اليومية", "الوقاية من تكرار الإصابة"],
        goalsEn: ["Strengthen back and abdominal muscles", "Gradual return to daily activities", "Prevent recurrence"],
        precautionsAr: ["مراقبة علامات التحذير (ألم، تنميل)"],
        precautionsEn: ["Monitor for red flags (pain, numbness)"],
        criteria: [
          { key: "full_activity", labelAr: "العودة الكاملة للأنشطة اليومية بدون ألم", labelEn: "Full pain-free daily activities" },
          { key: "back_strength", labelAr: "قوة عضلات الظهر تعادل 80%", labelEn: "Back muscle strength > 80%" }
        ]
      }
    ]
  },
  {
    id: "shoulder_impingement",
    nameAr: "بروتوكول تأهيل الكتف (Shoulder Impingement / Rotator Cuff)",
    nameEn: "Shoulder Impingement & Rotator Cuff Protocol",
    keywords: ["shoulder", "impingement", "rotator cuff", "supraspinatus", "subacromial", "painful arc", "كتف", "كفة مدورة"],
    phases: [
      {
        phaseNumber: 1,
        weeks: "الأسابيع 1 - 3",
        goalsAr: ["تخفيف الألم والالتهاب", "استعادة المدى الحركي السلبي الكامل", "تفعيل العضلات بدون ألم"],
        goalsEn: ["Reduce pain and inflammation", "Restore full passive ROM", "Activate muscles pain-free"],
        precautionsAr: ["تجنب رفع الذراع فوق الكتف", "تجنب حمل الأوزان", "تجنب الحركات فوق الرأس"],
        precautionsEn: ["Avoid lifting arm above shoulder", "No heavy lifting", "Avoid overhead activities"],
        criteria: [
          { key: "pain_at_rest_gone", labelAr: "اختفاء الألم عند الراحة", labelEn: "No pain at rest" },
          { key: "passive_rom_90", labelAr: "مدى حركي سلبي للثني 90 درجة", labelEn: "Passive flexion ROM to 90°" }
        ]
      },
      {
        phaseNumber: 2,
        weeks: "الأسابيع 4 - 7",
        goalsAr: ["المدى الحركي النشط الكامل", "تقوية الكفة المدورة", "تحسين ثبات لوح الكتف"],
        goalsEn: ["Full active ROM", "Strengthen rotator cuff", "Improve scapular stability"],
        precautionsAr: ["تجنب رفع الأوزان الثقيلة", "تجنب الحركات القوية فجأة"],
        precautionsEn: ["Avoid heavy resistance", "Avoid sudden explosive movements"],
        criteria: [
          { key: "active_rom_full", labelAr: "مدى حركي نشط كامل بدون ألم", labelEn: "Full active ROM pain-free" },
          { key: "scapular_stability", labelAr: "ثبات لوح الكتف أثناء الحركة", labelEn: "Scapular stability during movement" }
        ]
      },
      {
        phaseNumber: 3,
        weeks: "الأسابيع 8 - 12",
        goalsAr: ["تقوية متقدمة للكتف", "العودة للأنشطة الرياضية", "الوقاية من الإصابة"],
        goalsEn: ["Advanced strengthening", "Return to sport activities", "Prevent recurrence"],
        precautionsAr: ["التدرج في العودة للرياضات العلوية"],
        precautionsEn: ["Gradual return to overhead sports"],
        criteria: [
          { key: "strength_80", labelAr: "قوة الكتف تعادل 80% من الطرف السليم", labelEn: "Shoulder strength > 80% of uninvolved side" },
          { key: "sport_specific", labelAr: "القدرة على أداء الحركات الرياضية الخاصة", labelEn: "Able to perform sport-specific movements" }
        ]
      }
    ]
  },
  {
    id: "total_knee_replacement",
    nameAr: "بروتوكول ما بعد تغيير مفصل الركبة (TKR)",
    nameEn: "Total Knee Replacement (TKR) Protocol",
    keywords: ["knee replacement", "total knee", "tkr", "arthroplasty", "ركبة صناعية", "تغيير مفصل", " knee"],
    phases: [
      {
        phaseNumber: 1,
        weeks: "الأسابيع 1 - 2",
        goalsAr: ["السيطرة على التورم والألم", "استعادة امتداد الركبة الكامل (0 درجة)", "ثني الركبة حتى 60 درجة", "المشي باستخدام المشاية أو العكازات"],
        goalsEn: ["Control swelling and pain", "Restore full knee extension (0°)", "Knee flexion to 60°", "Ambulate with walker/crutches"],
        precautionsAr: ["تجنب ثني الركبة أكثر من 90 درجة", "تجنب التواء الركبة", "الكمادات الباردة المنتظمة"],
        precautionsEn: ["Avoid flexion beyond 90°", "Avoid twisting the knee", "Regular ice packs"],
        criteria: [
          { key: "extension_0", labelAr: "امتداد كامل للركبة (0 درجة)", labelEn: "Full extension (0°)" },
          { key: "flexion_60", labelAr: "ثني الركبة لـ 60 درجة", labelEn: "Knee flexion to 60°" },
          { key: "independent_transfer", labelAr: "الانتقال من السرير للكرسي بشكل مستقل", labelEn: "Independent bed-to-chair transfer" }
        ]
      },
      {
        phaseNumber: 2,
        weeks: "الأسابيع 3 - 6",
        goalsAr: ["ثني الركبة حتى 110 درجة", "المشي بدون أجهزة مساعدة", "تقوية العضلة الرباعية"],
        goalsEn: ["Flexion to 110°", "Ambulate without assistive devices", "Strengthen quadriceps"],
        precautionsAr: ["تجنب الجري والقفز", "تجنب صعود الدرج بدون درابزين"],
        precautionsEn: ["No running or jumping", "Avoid stairs without railing"],
        criteria: [
          { key: "flexion_110", labelAr: "ثني الركبة 110 درجة", labelEn: "Knee flexion to 110°" },
          { key: "no_device_walking", labelAr: "المشي بدون عكازات أو مشاية", labelEn: "Walking without assistive device" }
        ]
      },
      {
        phaseNumber: 3,
        weeks: "الأسابيع 7 - 12",
        goalsAr: ["القوة العضلية تعادل 80% من الساق السليمة", "صعود ونزول الدرج بشكل طبيعي", "العودة للأنشطة اليومية"],
        goalsEn: ["Strength > 80% of uninvolved limb", "Normal stair negotiation", "Return to daily activities"],
        precautionsAr: ["تجنب الرياضات عالية التأثير", "مراقبة أي علامات تورم"],
        precautionsEn: ["Avoid high-impact sports", "Monitor for swelling"],
        criteria: [
          { key: "strength_80_tkr", labelAr: "قوة الساق تعادل 80%", labelEn: "Limb strength > 80%" },
          { key: "stairs_normal", labelAr: "صعود ونزول الدرج بشكل طبيعي", labelEn: "Normal stair climbing" }
        ]
      }
    ]
  },
  {
    id: "frozen_shoulder",
    nameAr: "بروتوكول الكتف المتجمد (Frozen Shoulder / Adhesive Capsulitis)",
    nameEn: "Frozen Shoulder (Adhesive Capsulitis) Protocol",
    keywords: ["frozen shoulder", "adhesive capsulitis", "كتف متجمد", "محفظة لاصق", "shoulder stiffness"],
    phases: [
      {
        phaseNumber: 1,
        weeks: "مرحلة التجميد (Freezing) - أسابيع 1 - 8",
        goalsAr: ["تخفيف الألم", "الحفاظ على المدى الحركي المتبقي", "تحسين النوم"],
        goalsEn: ["Pain relief", "Maintain remaining ROM", "Improve sleep"],
        precautionsAr: ["تجنب التمدد العنيف", "تمارين بندولية فقط", "عدم إجبار الكتف على الحركة"],
        precautionsEn: ["Avoid aggressive stretching", "Pendulum exercises only", "Do not force shoulder movement"],
        criteria: [
          { key: "pain_control", labelAr: "السيطرة على الألم (VAS أقل من 4)", labelEn: "Pain controlled (VAS < 4)" },
          { key: "pendulum_mastery", labelAr: "إتقان التمارين البندولية", labelEn: "Master pendulum exercises" }
        ]
      },
      {
        phaseNumber: 2,
        weeks: "مرحلة التجمد (Frozen) - أسابيع 8 - 16",
        goalsAr: ["تحسين المدى الحركي بالتمدد اللطيف", "تقوية الكتف ضمن حدود الألم"],
        goalsEn: ["Improve ROM with gentle stretching", "Strengthen shoulder within pain limits"],
        precautionsAr: ["التمدد ضمن حدود الألم فقط", "عدم استخدام أوزان ثقيلة"],
        precautionsEn: ["Stretch only within pain limits", "No heavy weights"],
        criteria: [
          { key: "flexion_120_frozen", labelAr: "ثني الكتف لـ 120 درجة", labelEn: "Shoulder flexion to 120°" },
          { key: "abduction_90", labelAr: "إبعاد الكتف لـ 90 درجة", labelEn: "Shoulder abduction to 90°" }
        ]
      },
      {
        phaseNumber: 3,
        weeks: "مرحلة الذوبان (Thawing) - أسابيع 16 - 24+",
        goalsAr: ["المدى الحركي الكامل", "تقوية متقدمة", "العودة للأنشطة"],
        goalsEn: ["Full ROM", "Advanced strengthening", "Return to activities"],
        precautionsAr: ["التدرج في العودة للأنشطة العلوية"],
        precautionsEn: ["Gradual return to overhead activities"],
        criteria: [
          { key: "full_rom_frozen", labelAr: "المدى الحركي الكامل للكتف", labelEn: "Full shoulder ROM" },
          { key: "strength_full", labelAr: "قوة الكتف طبيعية", labelEn: "Normal shoulder strength" }
        ]
      }
    ]
  }
];

// ─── Differential Diagnosis Decision Tree Database ───────────────────────────

interface DiagnosisNode {
  symptomKey: string;
  symptomLabelAr: string;
  symptomLabelEn: string;
  keywords: string[];
  tests: {
    key: string;
    nameAr: string;
    nameEn: string;
    descAr: string;
    descEn: string;
  }[];
  outcomes: {
    combination: Record<string, "positive" | "negative">;
    diagnosisAr: string;
    diagnosisEn: string;
    confidence: string;
  }[];
}

const DIAGNOSIS_DECISION_TREE: DiagnosisNode[] = [
  {
    symptomKey: "anterior_knee_pain",
    symptomLabelAr: "ألم أمامي في الركبة (Anterior Knee Pain)",
    symptomLabelEn: "Anterior Knee Pain",
    keywords: ["knee", "patellofemoral", "runner's knee", "pfps", "patellar", "anterior knee", "jumper's knee", "patellar tendon", "chondromalacia"],
    tests: [
      { key: "clarkes", nameAr: "Clarke's Test (طحن الرضفة)", nameEn: "Clarke's Test (Patellar Grind)", descAr: "فحص الاحتكاك تحت الرضفة أثناء انقباض العضلة الرباعية", descEn: "Tests for patellofemoral cartilage degeneration" },
      { key: "apprehension", nameAr: "Patellar Apprehension Test (فحص الخوف من الخلع)", nameEn: "Patellar Apprehension Test", descAr: "دفع الرضفة للخارج لمحاكاة الخلع ومراقبة رد فعل المريض", descEn: "Tests for patellar subluxation or instability" }
    ],
    outcomes: [
      { combination: { clarkes: "positive", apprehension: "negative" }, diagnosisAr: "متلازمة ألم المفصل الرضفي الفخذي (Patellofemoral Pain Syndrome - PFPS)", diagnosisEn: "Patellofemoral Pain Syndrome (PFPS)", confidence: "90%" },
      { combination: { clarkes: "negative", apprehension: "positive" }, diagnosisAr: "عدم ثبات الرضفة / خلع متكرر (Patellar Instability / Subluxation)", diagnosisEn: "Patellar Instability", confidence: "95%" },
      { combination: { clarkes: "positive", apprehension: "positive" }, diagnosisAr: "اعتلال أوتار الرضفة مع خشونة الرضفة (Patellar Tendinopathy with Chondromalacia Patella)", diagnosisEn: "Patellar Tendinopathy with Chondromalacia", confidence: "85%" },
      { combination: { clarkes: "negative", apprehension: "negative" }, diagnosisAr: "اعتلال وتر الرضفة البسيط (Patellar Tendinopathy / Jumper's Knee)", diagnosisEn: "Patellar Tendinopathy (Jumper's Knee)", confidence: "70%" }
    ]
  },
  {
    symptomKey: "shoulder_impingement",
    symptomLabelAr: "ألم الكتف العلوي مع رفع الذراع (Shoulder Pain / Painful Arc)",
    symptomLabelEn: "Shoulder Pain / Painful Arc",
    keywords: ["shoulder", "impingement", "subacromial", "rotator cuff", "supraspinatus", "frozen shoulder", "adhesive capsulitis", "painful arc"],
    tests: [
      { key: "neer", nameAr: "Neer's Test (فحص زنقة الكتف)", nameEn: "Neer's Test", descAr: "رفع الذراع سلبياً للداخل لإثارة أوتار الكفة المدورة", descEn: "Tests for shoulder impingement" },
      { key: "empty_can", nameAr: "Empty Can Test (فحص العضلة فوق الشوكية)", nameEn: "Empty Can Test (Jobe)", descAr: "مقاومة إبعاد الكتف بزاوية 30 درجة مع تدوير الإبهام للأسفل", descEn: "Tests for Supraspinatus tendon tear or weakness" }
    ],
    outcomes: [
      { combination: { neer: "positive", empty_can: "negative" }, diagnosisAr: "متلازمة الانحشار تحت الأخرمي (Subacromial Impingement Syndrome)", diagnosisEn: "Subacromial Impingement Syndrome", confidence: "85%" },
      { combination: { neer: "positive", empty_can: "positive" }, diagnosisAr: "تمزق وتر العضلة فوق الشوكية (Supraspinatus Tendon Tear)", diagnosisEn: "Supraspinatus Tendon Tear", confidence: "90%" },
      { combination: { neer: "negative", empty_can: "positive" }, diagnosisAr: "اعتلال الكفة المدورة المنعزل (Isolated Rotator Cuff Tendinopathy)", diagnosisEn: "Isolated Rotator Cuff Tendinopathy", confidence: "75%" },
      { combination: { neer: "negative", empty_can: "negative" }, diagnosisAr: "التهاب محفظة الكتف اللاصق المبكر (Early Adhesive Capsulitis)", diagnosisEn: "Early Adhesive Capsulitis / Frozen Shoulder", confidence: "60%" }
    ]
  }
];

// ─── VAS Indicator ────────────────────────────────────────────────────────────

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
};

const translateMock = (_isRtl: boolean, val?: string) => val || "";





// ─── Clinical Knowledge Base (EBP & Contraindications) ───────────────────────

const EBP_DATABASE = [
  {
    keywords: ["acl", "رباط صليبي"],
    titleAr: "بناءً على تشخيص: إتلاف الرباط الصليبي (ACL)",
    titleEn: "Based on Diagnosis: Anterior Cruciate Ligament (ACL)",
    bulletsAr: [
      "المرحلة الحادة (الأسبوع 1-2): التركيز على تقليل التورم واستعادة مد الركبة الكامل (0 درجة). تجنب تمارين السلسلة المفتوحة (Open Kinetic Chain) بقوة عالية.",
      "الاختبارات السريرية الموصى بها: Lachman Test, Pivot Shift Test, Anterior Drawer Test.",
      "المرحلة المتوسطة: البدء بتمارين السلسلة المغلقة (Closed Kinetic Chain) مثل السكوات الخفيف ورفع الحوض.",
      "العودة للرياضة: تتطلب قوة عضلات الفخذ الأمامية (Quadriceps) تصل لـ 90% مقارنة بالساق السليمة، واختبارات القفز (Hop Tests)."
    ],
    bulletsEn: [
      "Acute Phase (Week 1-2): Focus on reducing swelling and restoring full extension (0 degrees). Avoid heavy Open Kinetic Chain exercises.",
      "Recommended Clinical Tests: Lachman Test, Pivot Shift Test, Anterior Drawer Test.",
      "Intermediate Phase: Begin Closed Kinetic Chain exercises like light squats and bridges.",
      "Return to Sport (RTS): Requires Quadriceps strength at >90% Limb Symmetry Index (LSI) and passing Hop Tests."
    ],
    ref: "JOSPT Clinical Practice Guidelines (2023)"
  },
  {
    keywords: ["tennis elbow", "مرفق التنس", "epicondylitis"],
    titleAr: "بناءً على تشخيص: التهاب لقيمة العضد الجانبية (مرفق التنس)",
    titleEn: "Based on Diagnosis: Lateral Epicondylitis (Tennis Elbow)",
    bulletsAr: [
      "المرحلة الحادة: التوقف عن الحركات المتكررة المؤلمة، واستخدام الثلج ومسكنات الألم الموضعية.",
      "التحميل اللامركزي (Eccentric Loading): هو حجر الأساس في العلاج. تمارين إطالة للمعصم والساعد.",
      "التدخل اليدوي (Manual Therapy): استخدام تقنيات تحريك المفاصل (Mulligan) لتخفيف الألم.",
      "العودة للنشاط: التدرج في رفع الأوزان وتعديل قبضة المضرب أو الأدوات."
    ],
    bulletsEn: [
      "Acute Phase: Avoid repetitive painful movements, use ice and topical analgesics.",
      "Eccentric Loading: The cornerstone of treatment. Wrist and forearm stretching and strengthening.",
      "Manual Therapy: Joint mobilization techniques (Mulligan) to relieve pain.",
      "Return to Activity: Gradual return to weight lifting and modifying grip size."
    ],
    ref: "American Physical Therapy Association (APTA) Guidelines"
  },
  {
    keywords: ["meniscus", "غضروف هلالي", "غضروف الركبة"],
    titleAr: "بناءً على تشخيص: تمزق الغضروف الهلالي",
    titleEn: "Based on Diagnosis: Meniscus Tear",
    bulletsAr: [
      "المرحلة الأولى: حماية المفصل وتقليل التورم. تجنب ثني الركبة العميق والتحميل العنيف.",
      "التمارين: التركيز على تمارين الثبات متساوي القياس (Isometric) لعضلة الفخذ الأمامية.",
      "المرحلة المتقدمة: تحسين التوازن العميق (Proprioception) وتمارين السلسلة المغلقة.",
      "تحذير: تجنب الحركات الدورانية المفاجئة على ركبة محملة بالوزن."
    ],
    bulletsEn: [
      "Phase 1: Protect the joint and reduce swelling. Avoid deep knee flexion and heavy loading.",
      "Exercises: Focus on isometric strengthening for the quadriceps.",
      "Advanced Phase: Improve proprioception and closed kinetic chain exercises.",
      "Warning: Avoid sudden pivoting and twisting on a weight-bearing knee."
    ],
    ref: "Clinical Orthopaedic Rehabilitation (Brotzman)"
  },
  {
    keywords: ["frozen shoulder", "كتف متجمد", "محفظة لاصق"],
    titleAr: "بناءً على تشخيص: الكتف المتجمد (التهاب المحفظة اللاصق)",
    titleEn: "Based on Diagnosis: Frozen Shoulder (Adhesive Capsulitis)",
    bulletsAr: [
      "مرحلة التجميد (الألم): التركيز على تخفيف الألم بالحرارة والتمارين البندولية (Pendulum).",
      "مرحلة التجمد (التيبس): البدء بتمارين الإطالة اللطيفة ضمن حدود الألم.",
      "مرحلة الذوبان (التعافي): تكثيف تمارين المدى الحركي (ROM) والتقوية التدريجية.",
      "تنبيه: التمدد العنيف في المرحلة الأولى قد يزيد من الالتهاب."
    ],
    bulletsEn: [
      "Freezing Phase (Pain): Focus on pain relief with heat and Pendulum exercises.",
      "Frozen Phase (Stiffness): Gentle stretching within pain limits.",
      "Thawing Phase (Recovery): Intensive ROM exercises and gradual strengthening.",
      "Warning: Aggressive stretching in the acute phase may worsen inflammation."
    ],
    ref: "Journal of Shoulder and Elbow Surgery"
  },
  {
    keywords: ["osteoarthritis", "خشونة", "احتكاك مفاصل", "oa"],
    titleAr: "بناءً على تشخيص: الفصال العظمي (خشونة المفاصل)",
    titleEn: "Based on Diagnosis: Osteoarthritis (OA)",
    bulletsAr: [
      "إدارة الوزن: إنقاص الوزن بنسبة 5% يقلل العبء على الركبة بنسبة كبيرة.",
      "التمارين المائية (Aquatic Therapy): تعتبر الخيار الأفضل لتقليل الضغط على المفاصل.",
      "تقوية العضلات: التركيز على تقوية العضلات المحيطة بالمفصل لامتصاص الصدمات.",
      "التثقيف: تعليم المريض كيفية استخدام الأدوات المساعدة وحماية المفصل."
    ],
    bulletsEn: [
      "Weight Management: 5% weight loss significantly reduces joint load.",
      "Aquatic Therapy: Highly recommended to reduce joint stress.",
      "Muscle Strengthening: Focus on muscles surrounding the joint for shock absorption.",
      "Education: Joint protection strategies and assistive devices."
    ],
    ref: "OARSI Guidelines for Non-Surgical Management"
  },
  {
    keywords: ["sciatica", "disc", "انزلاق غضروفي", "عرق النسا"],
    titleAr: "بناءً على تشخيص: انزلاق غضروفي / عرق النسا",
    titleEn: "Based on Diagnosis: Herniated Disc / Sciatica",
    bulletsAr: [
      "تحديد الاتجاه (Directional Preference): فحص ما إذا كانت حركات الثني أو المد تخفف الألم (طريقة McKenzie).",
      "المركزة (Centralization): الهدف هو سحب الألم من الساق إلى الظهر.",
      "الثبات الأساسي (Core Stability): تقوية عضلات الجذع والبطن العميقة.",
      "تجنب: تجنب الجلوس لفترات طويلة ورفع الأوزان مع ثني الظهر."
    ],
    bulletsEn: [
      "Directional Preference: Determine if flexion or extension relieves symptoms (McKenzie method).",
      "Centralization: The primary goal is to move symptoms from the leg back to the spine.",
      "Core Stability: Strengthen deep core and abdominal muscles.",
      "Avoid: Prolonged sitting and lifting weights with a flexed spine."
    ],
    ref: "NICE Guidelines for Low Back Pain and Sciatica"
  },
  {
    keywords: ["stroke", "hemiplegia", "جلطة دماغية", "شلل نصفي"],
    titleAr: "بناءً على تشخيص: السكتة الدماغية / الشلل النصفي",
    titleEn: "Based on Diagnosis: Stroke / Hemiplegia",
    bulletsAr: [
      "المرونة العصبية (Neuroplasticity): التكرار العالي للتمارين الوظيفية الموجهة نحو الهدف.",
      "منع التيبس (Spasticity Management): وضعيات الجلوس والنوم الصحيحة وإطالة العضلات.",
      "تدريب المشي (Gait Training): استخدام أجهزة المشي مع دعم وزن الجسم (BWSTT).",
      "نهج (Bobath/PNF): تقنيات تسهيل الحركة وتقليل الحركات العشوائية."
    ],
    bulletsEn: [
      "Neuroplasticity: High repetition of task-oriented functional exercises.",
      "Spasticity Management: Proper positioning and stretching to prevent contractures.",
      "Gait Training: Body Weight Supported Treadmill Training (BWSTT) if available.",
      "Bobath/PNF: Facilitation techniques for proper movement patterns."
    ],
    ref: "AHA/ASA Stroke Rehabilitation Guidelines"
  },
  {
    keywords: ["rotator cuff", "تمزق أوتار الكتف", "الكفة المدورة"],
    titleAr: "بناءً على تشخيص: تمزق أوتار الكفة المدورة",
    titleEn: "Based on Diagnosis: Rotator Cuff Tear",
    bulletsAr: [
      "المرحلة الأولى: حماية الوتر الممزق وتجنب رفع الذراع فوق مستوى الكتف.",
      "الحركة السلبية (Passive ROM): الحفاظ على حركة المفصل دون إجهاد الوتر.",
      "التقوية: التركيز على العضلات المثبتة للوح الكتف (Scapular Stabilizers).",
      "تجنب: تجنب الحركات السريعة والمتكررة أعلى مستوى الرأس."
    ],
    bulletsEn: [
      "Phase 1: Protect the torn tendon, avoid overhead activities.",
      "Passive ROM: Maintain joint mobility without stressing the tendon.",
      "Strengthening: Focus on Scapular Stabilizers before progressing to the rotator cuff.",
      "Avoid: Rapid, repetitive overhead movements."
    ],
    ref: "American Academy of Orthopaedic Surgeons (AAOS)"
  },
  {
    keywords: ["plantar fasciitis", "اللفافة الأخمصية", "شوكة عظمية"],
    titleAr: "بناءً على تشخيص: التهاب اللفافة الأخمصية",
    titleEn: "Based on Diagnosis: Plantar Fasciitis",
    bulletsAr: [
      "التمارين الأساسية: إطالة عضلة السمانة واللفافة الأخمصية (Stretching).",
      "العلاج اليدوي: تدليك اللفافة وتحريك مفاصل القدم.",
      "الموجات التصادمية (Shockwave Therapy): فعالة جداً في الحالات المزمنة.",
      "الأحذية والفرشات: استخدام ضبان طبي لدعم قوس القدم (Orthotics)."
    ],
    bulletsEn: [
      "Core Exercises: Calf and plantar fascia stretching are essential.",
      "Manual Therapy: Fascial massage and foot joint mobilization.",
      "Shockwave Therapy (ESWT): Highly effective for chronic cases.",
      "Footwear: Use orthotics to support the medial longitudinal arch."
    ],
    ref: "JOSPT Clinical Practice Guidelines for Heel Pain"
  }
];

const CONTRAINDICATIONS_DATABASE = [
  {
    keywords: ["pacemaker", "تنظيم ضربات", "جهاز تنظيم"],
    nameAr: "جهاز تنظيم ضربات القلب (Pacemaker)",
    nameEn: "Pacemaker",
    blockedDevices: ["tens", "كهربائ", "diathermy", "شورت ويف", "shockwave", "تصادم"],
    blockedExercises: []
  },
  {
    keywords: ["pregnancy", "حمل", "حامل", "حوامل"],
    nameAr: "الحمل (Pregnancy)",
    nameEn: "Pregnancy",
    blockedDevices: ["tens", "كهربائ", "diathermy", "شورت ويف", "shockwave", "تصادم", "ultrasound", "فوق صوتي"],
    blockedExercises: []
  },
  {
    keywords: ["cancer", "سرطان", "ورم", "خبيث", "malignancy", "tumor"],
    nameAr: "السرطان / الأورام (Malignancy/Tumor)",
    nameEn: "Cancer / Tumor",
    blockedDevices: ["ultrasound", "فوق صوتي", "hot packs", "حرار", "diathermy", "laser", "ليزر"],
    blockedExercises: []
  },
  {
    keywords: ["dvt", "جلطة الساق", "خثار وريدي"],
    nameAr: "جلطة الأوردة العميقة (DVT)",
    nameEn: "Deep Vein Thrombosis (DVT)",
    blockedDevices: ["hot packs", "حرار", "compression", "ضغط"],
    blockedExercises: ["تدليك", "massage", "تمدد عنيف", "stretching"]
  },
  {    keywords: ["metal", "معدن", "شريحة", "شرائح", "مسامير", "مفصل صناعي"],
    nameAr: "الزراعات المعدنية (Metal Implants)",
    nameEn: "Metal Implants",
    blockedDevices: ["diathermy", "شورت ويف", "حرار", "hot pack", "infrared", "حمراء"],
    blockedExercises: []
  },  {
    keywords: ["osteoporosis", "هشاشة"],
    nameAr: "هشاشة العظام (Osteoporosis)",
    nameEn: "Osteoporosis",
    blockedDevices: [],
    blockedExercises: ["manipulation", "طقطقة", "قفز", "jump", "high impact"]
  },
  {
    keywords: ["cervical fracture", "كسر عنق", "كسر في الفقرات العنقية"],
    nameAr: "كسر في الفقرات العنقية (Cervical Fracture)",
    nameEn: "Cervical Fracture",
    blockedDevices: ["cervical traction", "شد عنقي"],
    blockedExercises: ["neck manipulation", "طقطقة الرقبة", "cervical traction", "شد عنقي"]
  },
  {
    keywords: ["lumbar fracture", "كسر قطني", "كسر في الفقرات القطنية"],
    nameAr: "كسر في الفقرات القطنية (Lumbar Fracture)",
    nameEn: "Lumbar Fracture",
    blockedDevices: ["lumbar traction", "شد قطني"],
    blockedExercises: ["lumbar manipulation", "طقطقة الظهر", "lumbar traction", "شد قطني"]
  }
];

// ─── VAS Indicator ────────────────────────────────────────────────────────────

function VASIndicator({ score }: { score: number }) {
  const color = score <= 3 ? "bg-emerald-500" : score <= 6 ? "bg-amber-500" : "bg-red-500";
  const label = score <= 3 ? "خفيف" : score <= 6 ? "متوسط" : "شديد";
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`h-2 w-4 rounded-sm transition-all ${i < score ? color : "bg-muted"}`} />
        ))}
      </div>
      <span className="text-sm font-medium tabular-nums">{score}/10</span>
      <Badge variant="outline" className={`text-xs ${score <= 3 ? "border-emerald-300 text-emerald-700" : score <= 6 ? "border-amber-300 text-amber-700" : "border-red-300 text-red-700"}`}>
        {label}
      </Badge>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 min-w-[120px] max-w-[180px]">{label}</span>
      <span className="text-sm font-medium text-right flex-1">{value}</span>
    </div>
  );
}

// ─── Tab: General Info ────────────────────────────────────────────────────────

function GeneralInfoTab({ patient }: { patient: Patient }) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
      <Card>        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-lg">🪪</span> {isRtl ? "البيانات الشخصية" : "Personal Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label={isRtl ? "الاسم" : "Name"} value={isRtl ? patient.nameAr : translateMock(isRtl, patient.nameAr)} />
          <InfoRow label={isRtl ? "رقم الملف" : "File Number"} value={patient.id} />
          <InfoRow label={isRtl ? "السن" : "Age"} value={`${patient.age} ${isRtl ? "سنة" : "years"}`} />
          <InfoRow label={isRtl ? "الجنس" : "Gender"} value={translateMock(isRtl, patient.gender)} />
          <InfoRow label={isRtl ? "المهنة" : "Occupation"} value={translateMock(isRtl, patient.occupation) || (isRtl ? "غير محدد" : "Not specified")} />
          <InfoRow label={isRtl ? "الطبيب المعالج المسؤول" : "Assigned Doctor"} value={translateMock(isRtl, patient.doctor) || (isRtl ? "غير محدد" : "Not specified")} />
        </CardContent>
      </Card>

      <Card>        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-lg">📞</span> {isRtl ? "بيانات التواصل" : "Contact Information"}
          </CardTitle>
        </CardHeader>        <CardContent>
          <InfoRow label={isRtl ? "رقم الهاتف" : "Phone Number"} value={patient.phone} />
          <InfoRow label={isRtl ? "العنوان" : "Address"} value={translateMock(isRtl, patient.address)} />
          <Separator className="my-3" />
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">{isRtl ? "جهة الاتصال في الطوارئ" : "EMERGENCY CONTACT"}</p>
          <InfoRow label={isRtl ? "الاسم" : "Name"} value={translateMock(isRtl, patient.emergencyContact)} />
          <InfoRow label={isRtl ? "الهاتف" : "Phone"} value={patient.emergencyPhone} />
        </CardContent>
      </Card>      <Card className="border-teal-200 bg-teal-50/10 dark:bg-teal-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-teal-800 dark:text-teal-400">
            <span className="text-lg">🩺</span> {isRtl ? "جهة التحويل (Doctor Referral)" : "Doctor Referral"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label={isRtl ? "الطبيب أو الجهة المحولة" : "Referring Doctor / Entity"} value={translateMock(isRtl, patient.referral) || (isRtl ? "ذاتي (بدون تحويل)" : "Self-referred")} />
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <span className="text-lg">⚠️</span> {isRtl ? "تنبيهات طبية" : "Medical Alerts"}
          </CardTitle>
        </CardHeader>        <CardContent className="flex flex-wrap gap-2">
          {patient.allergies && patient.allergies !== "لا يوجد" && (
            <Badge className="text-sm px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold border-none shadow-sm">
              {isRtl ? "حساسية:" : "Allergy:"} {translateMock(isRtl, patient.allergies)}
            </Badge>
          )}
          {patient.dvt && patient.dvt !== "" && (
            <Badge className="text-sm px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold border-none shadow-sm">
              ⚠️ {isRtl ? "تنبيه:" : "Alert:"} {translateMock(isRtl, patient.dvt)}
            </Badge>
          )}
          {(!patient.allergies || patient.allergies === "لا يوجد") && (!patient.dvt || patient.dvt === "") && (
            <span className="text-xs text-slate-400">{isRtl ? "لا توجد تنبيهات طبية مسجلة لهذا المريض" : "No medical alerts recorded for this patient"}</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Medical Records ─────────────────────────────────────────────────────

function MedicalRecordsTab({ patient, onEditMedicalClick }: { patient: Patient; onEditMedicalClick: () => void }) {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";
  const { hasPermission } = usePermissions();
  const { user: authUser } = useAuth();
  const clinicId = authUser?.clinicId;
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);  const [form, setForm] = useState({ diagnosis: "", vasScore: 0, notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Load sessions from Supabase on mount
  useEffect(() => {
    async function fetchSessions() {
      setIsLoadingSessions(true);
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("*")
          .eq('clinic_id', clinicId)
          .eq("patient_id", patient.id)
          .order("date", { ascending: false });
        if (!error && data) {
          const mapped: Session[] = data.map((s: any) => ({
            id: s.id,
            date: s.date,
            diagnosis: s.diagnosis || "",
            vasScore: s.vasScore ?? s.vas_score ?? 0,
            rom: s.rom || "",
            notes: s.notes || "",
            therapist: s.therapist || "",
          }));
          setSessions(mapped);
        } else {
          setSessions([]);
        }
      } catch {
        setSessions([]);
      } finally {
        setIsLoadingSessions(false);
      }
    }
    fetchSessions();
  }, [patient.id]);
  const [isDiagAssistantOpen, setIsDiagAssistantOpen] = useState(false);
  const [selectedSymptomKey, setSelectedSymptomKey] = useState("");
  const [testResults, setTestResults] = useState<Record<string, "positive" | "negative">>({});
  const [isSavingDiagnosis, setIsSavingDiagnosis] = useState(false);

  const currentDiagnosis = form.diagnosis || patient.diagnosis || "";

  const matchedDiagnosisNode = useMemo(() => {
    if (!currentDiagnosis.trim()) return null;
    const lower = currentDiagnosis.toLowerCase();
    return DIAGNOSIS_DECISION_TREE.find(node =>
      node.keywords.some(kw => lower.includes(kw))
    ) || null;
  }, [currentDiagnosis]);

  const openDiagAssistant = () => {
    const node = matchedDiagnosisNode;
    if (node) {
      setSelectedSymptomKey(node.symptomKey);
      setTestResults({});
    } else {
      setSelectedSymptomKey(currentDiagnosis.trim() ? "_no_match" : "");
      setTestResults({});
    }
    setIsDiagAssistantOpen(true);
  };

  const getRegionSearchTerms = (region: (typeof BODY_PAIN_REGIONS)[number]) => {
    const withoutParentheses = (value: string) => value.replace(/\s*\([^)]*\)/g, "").trim();
    return [
      region.nameAr,
      region.nameEn,
      withoutParentheses(region.nameAr),
      withoutParentheses(region.nameEn),
    ]
      .map((term) => term.toLowerCase().trim())
      .filter(Boolean);
  };

  const syncPainMapFromDiagnosis = (diagnosis: string) => {
    const normalizedDiagnosis = diagnosis.toLowerCase();
    const nextRegions = BODY_PAIN_REGIONS
      .filter((region) => getRegionSearchTerms(region).some((term) => normalizedDiagnosis.includes(term)))
      .map((region) => region.id);

    setSelectedRegions((current) => {
      if (current.length === nextRegions.length && current.every((id) => nextRegions.includes(id))) {
        return current;
      }
      return nextRegions;
    });
  };
  
  const handleRegionSelect = (muscleName: string) => {
    // Append the newly selected muscle to the diagnosis field
    setForm((f) => {
      const current = f.diagnosis.trim();
      if (!current) {
        return { ...f, diagnosis: muscleName };
      }
      if (current.includes(muscleName)) {
        return f; // Avoid duplicate appends
      }
      const separator = isRtl ? "، " : ", ";
      return { ...f, diagnosis: `${current}${separator}${muscleName}` };
    });
  };  const handleMapperChange = (regions: string[]) => {
    setSelectedRegions(regions);
  };

  const removeDelimitedValue = (text: string, value: string) => {
    return text
      .split(/،|,/)
      .map((part) => part.trim())
      .filter((part) => part && part !== value)
      .join(isRtl ? "، " : ", ");
  };

  const handleRegionDeselect = (muscleName: string) => {
    setForm((f) => {
      return { ...f, diagnosis: removeDelimitedValue(f.diagnosis, muscleName) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const therapistName = "";
    const today = new Date().toISOString().split("T")[0];

    // Build the session row — matches Supabase sessions table schema
    const sessionRow: any = {
      patient_id: patient.id,
      clinic_id: clinicId,
      date: today,
      diagnosis: form.diagnosis,
      vasScore: form.vasScore,
      notes: form.notes || "",
      therapist: therapistName,
    };

    try {
      const { data: inserted, error } = await supabase
        .from("sessions")
        .insert([sessionRow])
        .select()
        .single();

      if (error) throw error;

      const newSession: Session = {
        id: inserted.id,
        date: inserted.date,
        diagnosis: inserted.diagnosis || form.diagnosis,
        vasScore: inserted.vasScore ?? inserted.vas_score ?? form.vasScore,
        rom: inserted.rom || "",
        notes: inserted.notes || form.notes,
        therapist: inserted.therapist || therapistName,
      };

      // Also create/update appointment record so home page reflects this session
      const startTime = new Date();
      startTime.setSeconds(0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 45);

      await supabase.from("appointments").insert([{
        patient_id: patient.id,
        clinic_id: clinicId,
        patient_name: patient.nameAr,
        doctor_name: therapistName,
        appointment_type: "جلسة علاج",
        status: "مؤكد",
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      }]).then(() => {}, () => {}); // best-effort — don't block on failure

      setSessions([newSession, ...sessions]);
    } catch (err) {
      console.warn("Failed to save session to Supabase:", err);
      // Fallback: add to local state with temp id
      const newSession: Session = {
        id: `S-${Date.now()}`,
        date: today,
        diagnosis: form.diagnosis,
        vasScore: form.vasScore,
        rom: "",
        notes: form.notes,
        therapist: therapistName,
      };
      setSessions([newSession, ...sessions]);
    }

    setForm({ diagnosis: "", vasScore: 0, notes: "" });
    setSelectedRegions([]);
    setIsSubmitting(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase.from("sessions").delete().eq('clinic_id', clinicId).eq("id", sessionId);
      if (error) throw error;
    } catch (err) {
      console.warn("Failed to delete session from Supabase:", err);
    }
    // Remove from local state regardless
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setDeletingSessionId(null);
  };  // Convert sessions data format to ProgressCharts data format
  const chartData = sessions.map((s) => ({
    date: s.date,
    vasScore: s.vasScore,
    label: s.diagnosis,
  }));  const matchedEBP = useMemo(() => {
    if (!patient.diagnosis) return null;
    const diag = patient.diagnosis.toLowerCase();
    return EBP_DATABASE.find(ebp => ebp.keywords.some(kw => diag.includes(kw))) || null;
  }, [patient.diagnosis]);

  const [ebpOpen, setEbpOpen] = useState(false);

  const selectedDiagnosisNode = DIAGNOSIS_DECISION_TREE.find((node) => node.symptomKey === selectedSymptomKey);
  const recommendedDiag = useMemo(() => {
    if (!selectedDiagnosisNode) return null;
    const allTestsAnswered = selectedDiagnosisNode.tests.every((test) => testResults[test.key]);
    if (!allTestsAnswered) return null;

    return selectedDiagnosisNode.outcomes.find((outcome) =>
      Object.entries(outcome.combination).every(([key, value]) => testResults[key] === value)
    ) || null;
  }, [selectedDiagnosisNode, testResults]);

  const handleSymptomChange = (value: string) => {
    setSelectedSymptomKey(value);
    setTestResults({});
  };

  const handleApplyDiagnosis = async () => {
    if (!recommendedDiag) return;
    setIsSavingDiagnosis(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const diagnosis = isRtl ? recommendedDiag.diagnosisAr : recommendedDiag.diagnosisEn;
    setForm((current) => ({
      ...current,
      diagnosis,
    }));
    syncPainMapFromDiagnosis(diagnosis);
    setIsSavingDiagnosis(false);
    setIsDiagAssistantOpen(false);
  };

  return (
    <div className="pt-4 space-y-6">
      <Card className="border-teal-200 bg-white">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-lg">📋</span> {isRtl ? "الملف الطبي للمريض" : "Patient Medical File"}
          </CardTitle>          <div className="flex items-center gap-2">
            {matchedEBP && (
              <Button variant="secondary" size="sm" onClick={() => setEbpOpen(true)} className="h-8 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                📚 {isRtl ? "توجيهات سريرية (EBP)" : "EBP Guidelines"}
              </Button>
            )}
            {hasPermission("edit_emr") && (
              <>
                <Button variant="outline" size="sm" onClick={openDiagAssistant} disabled={!currentDiagnosis.trim()} className={`h-8 border-teal-600 text-teal-700 bg-teal-50 hover:bg-teal-100 cursor-pointer print:hidden ${!currentDiagnosis.trim() ? "opacity-40 cursor-not-allowed" : ""}`}>
                  🔍 {isRtl ? "مساعد التشخيص التفريقي" : "Diagnostic Assistant"}
                </Button>
                <Button variant="outline" size="sm" onClick={onEditMedicalClick} className="h-8 border-teal-650/40 text-teal-700 hover:bg-teal-50 cursor-pointer print:hidden">
                  {isRtl ? "تعديل الملف الطبي" : "Edit Medical File"}
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          <InfoRow label={isRtl ? "الشكوى الرئيسية" : "Chief Complaint"} value={translateMock(isRtl, patient.chiefComplaint) || (isRtl ? "غير محدد" : "Not specified")} />
          <InfoRow label={isRtl ? "التشخيص" : "Diagnosis"} value={translateMock(isRtl, patient.diagnosis) || (isRtl ? "غير محدد" : "Not specified")} />
          <InfoRow label={isRtl ? "التاريخ المرضي" : "Medical History"} value={translateMock(isRtl, patient.medicalHistory) || (isRtl ? "غير محدد" : "Not specified")} />
          <InfoRow label={isRtl ? "العمليات السابقة" : "Previous Surgeries"} value={translateMock(isRtl, patient.pastSurgeries) || (isRtl ? "غير محدد" : "Not specified")} />
          <InfoRow label={isRtl ? "الأمراض المزمنة" : "Chronic Diseases"} value={translateMock(isRtl, patient.chronicDiseases) || (isRtl ? "غير محدد" : "Not specified")} />
          <InfoRow label={isRtl ? "الأدوية الحالية" : "Current Medications"} value={translateMock(isRtl, patient.currentMedications) || (isRtl ? "غير محدد" : "Not specified")} />
          <InfoRow label={isRtl ? "الحساسية للأدوية" : "Drug Allergies"} value={translateMock(isRtl, patient.drugAllergies) || (isRtl ? "غير محدد" : "Not specified")} />        </CardContent>
      </Card>      {/* EBP Dialog */}
      <Dialog open={ebpOpen} onOpenChange={setEbpOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-blue-700 flex items-center gap-2 text-lg">
              📚 {isRtl ? "الممارسة القائمة على الدليل (EBP)" : "Evidence-Based Practice (EBP)"}
            </DialogTitle>
            <div className="text-slate-600 mt-2 font-medium leading-relaxed" dir={isRtl ? "rtl" : "ltr"}>
              {matchedEBP && (
                <div className="space-y-4 mt-4">
                  <p><strong>{isRtl ? matchedEBP.titleAr : matchedEBP.titleEn}</strong></p>
                  <ul className="list-disc pl-6 pr-6 space-y-2 text-sm">
                    {(isRtl ? matchedEBP.bulletsAr : matchedEBP.bulletsEn).map((bullet, idx) => (
                      <li key={idx}>
                        {bullet.includes(":") ? (
                          <>
                            <strong>{bullet.split(":")[0]}:</strong> {bullet.split(":").slice(1).join(":")}
                          </>
                        ) : (
                          bullet
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-400 mt-4 border-t pt-2">
                    {isRtl ? "المرجع: " : "Reference: "} {matchedEBP.ref}
                  </p>
                </div>
              )}
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Differential Diagnosis Assistant Dialog */}
      <Dialog open={isDiagAssistantOpen} onOpenChange={setIsDiagAssistantOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-bold flex items-center gap-2 ${isRtl ? "text-right" : "text-left"}`}>
              <span>🔍 {isRtl ? "مساعد التشخيص التفريقي" : "Differential Diagnosis Assistant"}</span>
            </DialogTitle>
            <DialogDescription className={`text-xs text-slate-400 ${isRtl ? "text-right" : "text-left"}`}>
              {currentDiagnosis.trim()
                ? (isRtl ? `بناءً على التشخيص: "${currentDiagnosis}"` : `Based on diagnosis: "${currentDiagnosis}"`)
                : (isRtl ? "اكتب التشخيص أولاً ليظهر المساعد." : "Write a diagnosis first for the assistant to activate.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2" dir={isRtl ? "rtl" : "ltr"}>
            {selectedSymptomKey === "_no_match" ? (
              <div className="p-6 text-center">
                <p className="text-sm text-slate-500">
                  {isRtl
                    ? `لم يتم العثور على بروتوكول تشخيص تفريقي يطابق "${currentDiagnosis}".`
                    : `No differential diagnosis protocol found matching "${currentDiagnosis}".`}
                </p>
              </div>
            ) : !selectedSymptomKey ? (
              <div className="p-6 text-center">
                <p className="text-sm text-slate-500">
                  {isRtl ? "اكتب التشخيص في الحقل أعلاه أولاً." : "Enter a diagnosis in the field above first."}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">{isRtl ? "العرض الرئيسي للمريض" : "Chief Symptom"}</Label>
                  <select
                    value={selectedSymptomKey}
                    onChange={(e) => handleSymptomChange(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 text-slate-700"
                  >
                    {DIAGNOSIS_DECISION_TREE.map(node => (
                      <option key={node.symptomKey} value={node.symptomKey}>
                        {isRtl ? node.symptomLabelAr : node.symptomLabelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {isRtl ? "الاختبارات الخاصة المطلوبة (Special Tests)" : "Required Special Tests"}
                  </Label>
                  
                  <div className="space-y-2">
                    {selectedDiagnosisNode?.tests.map((test) => (
                      <div key={test.key} className="p-2.5 border rounded-lg bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
                        <div className="flex-1">
                          <p className="font-bold text-slate-800">{isRtl ? test.nameAr : test.nameEn}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{isRtl ? test.descAr : test.descEn}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setTestResults(prev => ({ ...prev, [test.key]: "positive" }))}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${testResults[test.key] === "positive" ? "bg-rose-500 border-rose-500 text-white" : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50"}`}
                          >
                            {isRtl ? "إيجابي ✅" : "Positive ✅"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTestResults(prev => ({ ...prev, [test.key]: "negative" }))}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${testResults[test.key] === "negative" ? "bg-teal-500 border-teal-500 text-white" : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50"}`}
                          >
                            {isRtl ? "سلبي ❌" : "Negative ❌"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {recommendedDiag ? (
                  <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/10 space-y-2 animate-in fade-in zoom-in-95 duration-200 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-[9px] bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 px-1.5 py-0.5 rounded-full">
                        {isRtl ? "التشخيص المقترح" : "Suggested Diagnosis"}
                      </span>
                      <span className="text-teal-700">
                        {isRtl ? `دقة متوقعة: ${recommendedDiag.confidence}` : `Confidence: ${recommendedDiag.confidence}`}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 leading-normal">
                      {isRtl ? recommendedDiag.diagnosisAr : recommendedDiag.diagnosisEn}
                    </p>
                    <div className="pt-1">
                      <Button
                        onClick={handleApplyDiagnosis}
                        disabled={isSavingDiagnosis}
                        className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] text-xs font-semibold h-8"
                      >
                        {isSavingDiagnosis ? (isRtl ? "جاري الحفظ..." : "Applying...") : (isRtl ? "اعتماد هذا التشخيص وحفظه" : "Apply & Save to EMR")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-dashed text-center text-[10px] text-slate-400 bg-slate-50/50">
                    {isRtl ? "أدخل جميع نتائج الاختبارات لإظهار التشخيص المقترح." : "Complete all test inputs to get suggested diagnosis."}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {hasPermission("edit_emr") && (
        <Card className="border-teal-200 dark:border-teal-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-lg">➕</span> {isRtl ? "تسجيل جلسة جديدة" : "Record New Session"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Session Form */}
            <form onSubmit={handleSubmit} className="space-y-4 lg:col-span-3">              {/* Symptom quick-chips definition */}
              {(() => {                const SYMPTOM_CHIPS = [
                  { ar: "ألم",     en: "Pain"          },
                  { ar: "تنميل",   en: "Numbness"      },
                  { ar: "تورم",    en: "Swelling"      },
                  { ar: "جرح",     en: "Wound"         },
                  { ar: "شد عضلي", en: "Muscle Strain" },
                ];

                const toggleSymptom = (label: string) => {
                  setForm((f) => {
                    const sep = isRtl ? "، " : ", ";
                    const current = f.diagnosis.trim();
                    if (current.includes(label)) {
                      // remove it
                      let updated = current;
                      updated = updated.replace(`${sep}${label}`, "");
                      updated = updated.replace(`${label}${sep}`, "");
                      updated = updated.replace(label, "");
                      return { ...f, diagnosis: updated.trim() };
                    } else {
                      return { ...f, diagnosis: current ? `${current}${isRtl ? "، " : ", "}${label}` : label };
                    }
                  });
                };

                const isActive = (label: string) => form.diagnosis.includes(label);

                return (
                  <>
                    {/* Diagnosis field */}
                    <div className="space-y-1.5">
                      <Label htmlFor="diagnosis">{isRtl ? "التشخيص ومكان الألم" : "Diagnosis & Pain Location"}</Label>
                      <Input
                        id="diagnosis"
                        placeholder={isRtl ? "مثال: ألم في العضلة الدالية" : "e.g., Deltoid pain"}
                        value={form.diagnosis}
                        onChange={(e) => {
                          const diagnosis = e.target.value;
                          setForm((f) => ({ ...f, diagnosis }));
                          syncPainMapFromDiagnosis(diagnosis);
                        }}
                        required
                        dir={isRtl ? "rtl" : "ltr"}
                      />
                      {/* Symptom chips */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {SYMPTOM_CHIPS.map((chip) => {
                          const label = isRtl ? chip.ar : chip.en;
                          const active = isActive(label);
                          return (
                            <button
                              key={chip.ar}
                              type="button"
                              onClick={() => toggleSymptom(label)}
                              className={`px-3 py-0.5 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer select-none
                                ${active
                                  ? "bg-[#4F46BA] text-white border-[#4F46BA] shadow-sm"
                                  : "bg-white text-teal-700 border-teal-300 hover:bg-teal-50 hover:border-teal-500"
                                }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* VAS slider */}
                    <div className="space-y-2">
                      <Label>
                        {isRtl ? "مقياس الألم (VAS) — القيمة الحالية:" : "Pain Score (VAS) — Current Value:"}{" "}
                        <span className="font-semibold text-foreground">{form.vasScore}/10</span>
                      </Label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-12 text-center">{isRtl ? "لا ألم" : "No Pain"}</span>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={form.vasScore}
                          onChange={(e) => setForm((f) => ({ ...f, vasScore: Number(e.target.value) }))}
                          className="flex-1 accent-teal-600 cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground w-12 text-center">{isRtl ? "أشد ألم" : "Max Pain"}</span>
                      </div>
                      <VASIndicator score={form.vasScore} />
                    </div>
                  </>
                );
              })()}


              <div className="space-y-1.5">
                <Label htmlFor="notes">{isRtl ? "ملاحظات الجلسة" : "Session Notes"}</Label>
                <Textarea 
                  id="notes" 
                  placeholder={isRtl ? "وصف تفصيلي للجلسة، الإجراءات المتبعة..." : "Detailed session description, procedures..."}
                  value={form.notes} 
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} 
                  rows={3} 
                  dir={isRtl ? "rtl" : "ltr"} 
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSubmitting || !form.diagnosis} className="min-w-[140px] bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9]">
                  {isSubmitting ? (isRtl ? "جارٍ الحفظ..." : "Saving...") : (isRtl ? "حفظ الجلسة" : "Save Session")}
                </Button>
              </div>
            </form>

            {/* Body Pain Mapper */}
            <div className="lg:col-span-2">
              <BodyPainMapper 
                selectedRegions={selectedRegions} 
                onChange={handleMapperChange}
                onRegionSelect={handleRegionSelect}
                onRegionDeselect={handleRegionDeselect}
              />            </div>
          </div>
        </CardContent>
      </Card>
      )}      {/* Progress Chart and Timeline side-by-side */}
      {hasPermission("view_patient_history") ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sessions Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            {isRtl ? `سجل الجلسات (${sessions.length} جلسة)` : `Session Log (${sessions.length} sessions)`}
          </h3>
          {isLoadingSessions ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              {isRtl ? "جاري تحميل الجلسات..." : "Loading sessions..."}
            </div>
          ) : (
          <div className="relative">
            <div className={`absolute ${isRtl ? "right-[11px]" : "left-[11px]"} top-0 bottom-0 w-0.5 bg-border`} />
            <div className="space-y-4">
              {sessions.length === 0 && (
                <p className="text-sm text-slate-400 py-6 text-center">
                  {isRtl ? "لا توجد جلسات مسجلة بعد." : "No sessions recorded yet."}
                </p>
              )}
              {sessions.map((session, idx) => (
                <div key={session.id} className={`flex gap-4 ${isRtl ? "pr-8" : "pl-8"} relative`}>
                  <div className={`absolute ${isRtl ? "right-0" : "left-0"} top-3 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${idx === 0 ? "bg-teal-600 border-teal-600 text-white" : "bg-background border-border text-muted-foreground"}`}>
                    {sessions.length - idx}
                  </div>
                  <Card className="flex-1">
                    <CardContent className="pt-4 pb-3 space-y-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-medium text-sm">{session.diagnosis}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{session.date} · {session.therapist}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">{isRtl ? "أحدث جلسة" : "Latest Session"}</Badge>}
                          {hasPermission("edit_emr") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingSessionId(session.id)}
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-1 h-7 w-7 rounded-lg transition-colors"
                              title={isRtl ? "حذف الجلسة" : "Delete Session"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{isRtl ? "مقياس الألم" : "Pain Score"}</p>
                        <VASIndicator score={session.vasScore} />
                      </div>
                      {session.rom && (
                        <div>
                          <p className="text-xs text-muted-foreground">{isRtl ? "المدى الحركي" : "Range of Motion"}</p>
                          <p className="text-sm font-medium">{session.rom}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">{isRtl ? "ملاحظات" : "Notes"}</p>
                        <p className="text-sm leading-relaxed">{session.notes}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Progress Spline Chart */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            {isRtl ? "رسم بياني لمتابعة الحالة" : "Patient Progress Dashboard"}
          </h3>
          <ProgressCharts data={chartData} />        </div>
      </div>
      ) : null}

      {/* Delete Session Confirmation Dialog */}
      <Dialog open={!!deletingSessionId} onOpenChange={(open: boolean) => !open && setDeletingSessionId(null)}>
        <DialogContent className="sm:max-w-sm text-center" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center space-y-4 pt-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-2">
              <Trash2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-800">
              {isRtl ? "تأكيد حذف الجلسة" : "Confirm Delete Session"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {isRtl
                ? "هل أنت متأكد من حذف هذه الجلسة نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
                : "Are you sure you want to permanently delete this session? This action cannot be undone."}
            </DialogDescription>
          </div>
          <div className={`mt-6 flex gap-3 w-full ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            <Button type="button" variant="outline" onClick={() => setDeletingSessionId(null)} className="flex-1 rounded-xl font-bold">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={() => deletingSessionId && handleDeleteSession(deletingSessionId)}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
            >
              {isRtl ? "نعم، احذف الجلسة" : "Yes, Delete Session"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab: Radiology ───────────────────────────────────────────────────────────

function RadiologyTab() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { hasPermission } = usePermissions();  const [files, setFiles] = useState<{ name: string; size: string; type: string; date: string; url: string }[]>([]);
  const [deleteFileIdx, setDeleteFileIdx] = useState<number | null>(null);
  const [viewFileIdx, setViewFileIdx] = useState<number | null>(null);

  const executeDeleteFile = () => {
    if (deleteFileIdx === null) return;
    setFiles((prev) => prev.filter((_, i) => i !== deleteFileIdx));
    setDeleteFileIdx(null);
  };  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
    setFiles((prev) => [{ name: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB`, type: ext, date: new Date().toISOString().split("T")[0], url: "" }, ...prev]);
    e.target.value = "";
  };

  const typeIcon: Record<string, string> = { MRI: "🧲", "X-Ray": "🔬", PDF: "📄", JPG: "🖼️", PNG: "🖼️", DCM: "🧲" };  return (
    <div className="pt-4 space-y-6">
      <Card className="border-dashed border-2 border-teal-200 bg-teal-50/30 hover:bg-teal-50/50 transition-colors">
        <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-3xl shadow-sm text-teal-600">
            📤
          </div>
          <p className="text-sm font-semibold text-slate-700">{isRtl ? "ارفع الأشعة والتحاليل (DICOM، JPG، PDF)" : "Upload Scans & Lab Results (DICOM, JPG, PDF)"}</p>
          <label>
            <span className="inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-transparent bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] shadow-md h-10 px-6 py-2 cursor-pointer active:scale-95">
              {isRtl ? "اختر ملفًا" : "Choose File"}
            </span>
            <input type="file" accept=".dcm,.jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleUpload} />
          </label>
          <p className="text-xs text-teal-600/70 font-medium">{isRtl ? "يتم حفظ الملفات بشكل آمن ومشفر" : "Files are saved securely and encrypted"}</p>
        </CardContent>
      </Card>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isRtl ? `الملفات المرفوعة (${files.length})` : `Uploaded Files (${files.length})`}
        </h3>        {files.map((f, i) => (
          <Card key={i} className="shadow-sm hover:shadow-md transition-shadow border-slate-100 rounded-xl overflow-hidden group">
            <CardContent className="py-3 px-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform">
                {typeIcon[f.type] ?? "📁"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{f.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="bg-slate-50 text-[10px] py-0">{f.type}</Badge>
                  <span className="text-[11px] text-slate-400 font-mono">{f.size}</span>
                  <span className="text-[11px] text-slate-400">· {f.date}</span>
                </div>
              </div>              <div className="flex gap-2 opacity-100 sm:opacity-50 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" size="sm" onClick={() => setViewFileIdx(i)} className="rounded-lg h-8 text-xs font-semibold">{isRtl ? "عرض" : "View"}</Button>
                {hasPermission("delete_emr") && (
                  <Button variant="ghost" size="sm" onClick={() => setDeleteFileIdx(i)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg h-8 px-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete File Confirmation Modal */}
      <Dialog open={deleteFileIdx !== null} onOpenChange={(open: boolean) => !open && setDeleteFileIdx(null)}>
        <DialogContent className="sm:max-w-sm text-center" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center space-y-4 pt-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-2">
              <Trash2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-800">
              {isRtl ? "تأكيد الحذف" : "Confirm Deletion"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {isRtl 
                ? "هل أنت متأكد من حذف هذا الملف الطبي؟ لا يمكن التراجع عن هذا الإجراء." 
                : "Are you sure you want to permanently delete this medical file? This action cannot be undone."}
            </DialogDescription>
          </div>
          <div className={`mt-6 flex gap-3 w-full ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            <Button type="button" variant="outline" onClick={() => setDeleteFileIdx(null)} className="flex-1 rounded-xl font-bold">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="button" onClick={executeDeleteFile} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
              {isRtl ? "نعم، احذف" : "Yes, Delete"}
            </Button>
          </div>        </DialogContent>
      </Dialog>

      {/* View File Modal Simulator */}
      <Dialog open={viewFileIdx !== null} onOpenChange={(open: boolean) => !open && setViewFileIdx(null)}>
        <DialogContent className="sm:max-w-2xl min-h-[500px] flex flex-col p-0 overflow-hidden" showCloseButton={true}>
          <DialogHeader className="p-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">{viewFileIdx !== null ? typeIcon[files[viewFileIdx].type] || "📁" : "📁"}</span>
              {viewFileIdx !== null ? files[viewFileIdx].name : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 flex items-center justify-center p-8">
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl w-full h-full min-h-[350px] flex flex-col items-center justify-center text-slate-400 gap-4">
              <span className="text-6xl">🔍</span>
              <p className="text-sm font-semibold">{isRtl ? "معاينة الملف الطبي (محاكاة)" : "Medical File Preview (Simulation)"}</p>
              <p className="text-xs">{isRtl ? "في النسخة الحقيقية، سيتم عرض صورة الأشعة أو ملف PDF هنا." : "In production, the DICOM/PDF viewer will render here."}</p>
            </div>
          </div>
          <div className="p-4 bg-white border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setViewFileIdx(null)}>{isRtl ? "إغلاق" : "Close"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab: Packages ────────────────────────────────────────────────────────────

function PackagesTab({ patient, onUpdatePatient }: { patient: any, onUpdatePatient: (p: any) => void }) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user: authUser } = useAuth();
  const clinicId = authUser?.clinicId;

  // Initialize from patient data
  const [pkg, setPkg] = useState({
    nameAr: patient.activePackage || "كشف أول",
    nameEn: patient.activePackage || "First Examination",
    totalSessions: patient.sessionsTotal || 0,
    usedSessions: patient.sessionsUsed || 0,
    price: 0,
  });

  const [isUpdating, setIsUpdating] = useState(false);

  const remaining = pkg.totalSessions - pkg.usedSessions;
  const pct = pkg.totalSessions > 0 ? Math.round((pkg.usedSessions / pkg.totalSessions) * 100) : 0;
  const isFinished = remaining <= 0 && pkg.totalSessions > 0;

  const handleConsumeSession = async () => {
    if (remaining <= 0 || isUpdating) return;
    setIsUpdating(true);
    const newUsed = pkg.usedSessions + 1;
    
    try {
      const { error } = await supabase
        .from("patients")
        .update({ sessionsUsed: newUsed })
        .eq("clinic_id", clinicId)
        .eq("id", patient.id);
        
      if (!error) {
        setPkg({ ...pkg, usedSessions: newUsed });
        onUpdatePatient({ ...patient, sessionsUsed: newUsed });
      }
    } catch (e) {
      console.error(e);
    }
    setIsUpdating(false);
  };

  const handleRenewPackage = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    
    const newPackageName = prompt(isRtl ? "أدخل اسم الباقة الجديدة:" : "Enter new package name:", "باقة 6 جلسات");
    if (!newPackageName) {
      setIsUpdating(false);
      return;
    }
    
    const sessionsStr = prompt(isRtl ? "أدخل إجمالي عدد الجلسات:" : "Enter total sessions:", "6");
    const totalSessions = parseInt(sessionsStr || "0", 10);
    
    if (isNaN(totalSessions) || totalSessions <= 0) {
      alert(isRtl ? "عدد الجلسات غير صالح" : "Invalid sessions count");
      setIsUpdating(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("patients")
        .update({ 
          activePackage: newPackageName,
          sessionsTotal: totalSessions,
          sessionsUsed: 0
        })
        .eq("clinic_id", clinicId)
        .eq("id", patient.id);
        
      if (!error) {
        setPkg({ 
          ...pkg, 
          nameAr: newPackageName,
          nameEn: newPackageName,
          totalSessions: totalSessions,
          usedSessions: 0
        });
        onUpdatePatient({ 
          ...patient, 
          activePackage: newPackageName,
          sessionsTotal: totalSessions,
          sessionsUsed: 0
        });
        
        // Optionally create an invoice here or tell user to create one
        alert(isRtl ? "تم تجديد الباقة بنجاح!" : "Package renewed successfully!");
      }
    } catch (e) {
      console.error(e);
    }
    setIsUpdating(false);
  };

  return (
    <div className="pt-4 space-y-4">
      <Card className={`border ${isFinished ? 'border-rose-200' : 'border-emerald-200'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{isRtl ? pkg.nameAr : pkg.nameEn}</CardTitle>
            <Badge className={isFinished ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}>
              {isFinished 
                ? (isRtl ? "منتهية" : "Finished") 
                : (isRtl ? "نشطة" : "Active")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{isRtl ? "استهلاك الجلسات" : "Sessions Usage"}</span>
              <span className="font-medium">{pkg.usedSessions} / {pkg.totalSessions} {isRtl ? "جلسة" : "sessions"}</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${isFinished ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{pct}% {isRtl ? "مُستخدم" : "used"}</span>
              <span className={`font-semibold ${isFinished ? 'text-rose-700' : 'text-emerald-700'}`}>
                {remaining} {isRtl ? "جلسة متبقية" : "sessions remaining"}
              </span>
            </div>
          </div>
          <Separator />
          <div className="flex gap-2 pt-1">
            <Button 
              onClick={handleConsumeSession} 
              disabled={remaining <= 0 || isUpdating} 
              className="flex-1 bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9]"
            >
              {isUpdating ? (isRtl ? "جاري..." : "Processing...") : (isRtl ? "استهلاك جلسة" : "Consume Session")}
            </Button>
            <Button 
              onClick={handleRenewPackage}
              disabled={isUpdating}
              variant="outline" 
              className="flex-1"
            >
              {isRtl ? "تجديد/تغيير الباقة" : "Renew/Change Package"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{isRtl ? "الباقات السابقة" : "Previous Packages"}</h3>
        <p className="text-sm text-muted-foreground text-center py-4">{isRtl ? "لا توجد باقات سابقة" : "No previous packages"}</p>
      </div>
    </div>
  );
}

function PatientInvoicesTab({ patientId }: { patientId: string }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user: authUser } = useAuth();
  const clinicId = authUser?.clinicId;

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .eq('clinic_id', clinicId)
          .eq("patient_id", patientId)
          .order("date", { ascending: false });

        if (!error && data && data.length > 0) {
          setInvoices(data);
          setIsLoading(false);
          return;
        }
      } catch (err) {}

      // Fallback to local storage invoices
      const localInvs = localStorage.getItem("prime_physio_invoices");
      if (localInvs) {
        const parsed = JSON.parse(localInvs);
        const filtered = parsed.filter((inv: any) => inv.patientId === patientId);
        setInvoices(filtered);
      }
      setIsLoading(false);
    };

    fetchInvoices();
  }, [patientId]);

  return (
    <div className="pt-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span>💵</span> {isRtl ? "فواتير ومعاملات المريض" : "Patient Invoices & Transactions"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-slate-500">{isRtl ? "جاري تحميل الفواتير..." : "Loading invoices..."}</div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-center text-slate-400">{isRtl ? "لا توجد فواتير مسجلة لهذا المريض." : "No invoices registered for this patient."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${isRtl ? "text-right" : "text-left"}`}>
                <thead className="bg-muted/50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="p-3">{isRtl ? "رقم الفاتورة" : "Invoice ID"}</th>
                    <th className="p-3">{isRtl ? "البيان" : "Description"}</th>
                    <th className="p-3">{isRtl ? "القيمة" : "Amount"}</th>
                    <th className="p-3">{isRtl ? "التاريخ" : "Date"}</th>
                    <th className="p-3">{isRtl ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono font-semibold">{inv.id}</td>
                      <td className="p-3 text-slate-700">{inv.description}</td>
                      <td className="p-3 font-semibold font-mono">{inv.amount}</td>
                      <td className="p-3 font-mono text-xs">{inv.date}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          inv.status === "مدفوع" || inv.status === "Paid" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Neuro Reference ─────────────────────────────────────────────────────

function NeuroReferenceTab() {
  const { language } = useLanguage();
  const isRtl = language === "ar";  const neuroData = [
    { level: "C1", myotome: "Neck flexion", dermatome: "Top of head (Vertex)" },
    { level: "C2", myotome: "Neck extension / rotation", dermatome: "Back of head (Occiput)" },
    { level: "C3", myotome: "Lateral neck flexion", dermatome: "Lateral neck & supraclavicular area" },
    { level: "C4", myotome: "Shoulder shrug / elevation (Diaphragm)", dermatome: "Top of shoulder & clavicle" },
    { level: "C5", myotome: "Shoulder abduction (Elbow flexion)", dermatome: "Lateral upper arm" },
    { level: "C6", myotome: "Wrist extension (Elbow flexion)", dermatome: "Thumb & lateral forearm" },
    { level: "C7", myotome: "Elbow extension (Wrist flexion)", dermatome: "Middle finger" },
    { level: "C8", myotome: "Finger flexion", dermatome: "Little finger & medial forearm" },
    { level: "T1", myotome: "Finger abduction", dermatome: "Medial upper arm" },
    { level: "L2", myotome: "Hip flexion", dermatome: "Anterior upper thigh" },
    { level: "L3", myotome: "Knee extension", dermatome: "Anterior lower thigh above knee" },
    { level: "L4", myotome: "Ankle dorsiflexion", dermatome: "Medial calf & ankle" },
    { level: "L5", myotome: "Great toe extension", dermatome: "Dorsum of foot & middle toes" },
    { level: "S1", myotome: "Ankle plantarflexion", dermatome: "Lateral foot & heel" },
    { level: "S2", myotome: "Knee flexion", dermatome: "Back of thigh & popliteal fossa" },
    { level: "S3", myotome: "Bowel & bladder control", dermatome: "Saddle area & gluteal fold" },
    { level: "S4", myotome: "Bowel & bladder control", dermatome: "Perineum (Saddle area)" },
    { level: "S5", myotome: "Bowel & bladder control", dermatome: "Perianal region" },
  ];

  return (
    <div className="pt-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Anatomical Reference Image */}
        <Card className="lg:col-span-5 border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#0d8a8a]">
              {isRtl ? "مخطط التوزيع العصبي والحركي (3D Map)" : "Neurological 3D Map (Dermatomes & Myotomes)"}
            </CardTitle>
          </CardHeader>          <CardContent className="flex flex-col items-center justify-center pt-2 gap-4">
            <div className="relative rounded-xl overflow-hidden border border-slate-150 bg-slate-950/5 p-2">
              <img 
                src="/dermatome_myotome_3d_map_1781309657456.png" 
                alt="Dermatomes and Myotomes 3D Map" 
                className="max-w-full h-auto object-contain max-h-[420px] rounded-lg"
              />
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              {isRtl 
                ? "توضيح ثلاثي الأبعاد لتوزيع جذور الأعصاب وتأثيرها الحسي (Dermatomes) والعضلي (Myotomes)" 
                : "3D visual representing nerve root sensory distribution (Dermatomes) and muscle functions (Myotomes)"}
            </p>

            <Separator className="my-2" />

            <div className="relative rounded-xl overflow-hidden border border-slate-150 bg-slate-950/5 p-2">
              <img 
                src="/dermatome_myotome_chart_1781344723098.png" 
                alt="Dermatomes and Myotomes Reference Chart" 
                className="max-w-full h-auto object-contain max-h-[420px] rounded-lg"
              />
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              {isRtl 
                ? "مخطط بياني توضيحي وتفصيلي للجذور العصبية للأطراف العلوية والسفلية" 
                : "Detailed reference chart of nerve roots for upper and lower extremities"}
            </p>
          </CardContent>
        </Card>

        {/* Neurological Levels Reference Table */}
        <Card className="lg:col-span-7 border-teal-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-[#0d8a8a]">
              {isRtl ? "جدول مرجع الجذور العصبية والحركية" : "Nerve Roots & Clinical Functions Table"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse" dir="ltr">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-2.5 px-3 font-bold text-center text-[#0d8a8a]">{isRtl ? "الجذر العصبي" : "Nerve Root"}</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-350">{isRtl ? "الوظيفة الحركية (Myotome)" : "Muscle Function (Myotome)"}</th>
                    <th className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-350">{isRtl ? "التوزيع الحسي (Dermatome)" : "Sensory Zone (Dermatome)"}</th>
                  </tr>
                </thead>
                <tbody>
                  {neuroData.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors last:border-0">
                      <td className="py-2.5 px-3 font-bold text-center text-[#0d8a8a] bg-teal-50/30 rounded-lg">{row.level}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-650 dark:text-slate-300">
                        {row.myotome}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {row.dermatome}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Rehab Protocol Planner ──────────────────────────────────────────────

interface Exercise {
  id: string;
  type?: "exercise" | "device";
  nameAr: string;
  nameEn: string;
  categoryAr: string;
  categoryEn: string;
  descAr: string;
  descEn: string;
  defaultReps: string;
}

const EXERCISE_DATABASE: Exercise[] = [  { id: "ex-1", nameAr: "تمرين تمدد ماكنزي للظهر", nameEn: "Lumbar Extension (McKenzie)", categoryAr: "الجزع", categoryEn: "Trunk", descAr: "الاستلقاء على البطن ورفع الجزء العلوي باستخدام الذراعين مع إبقاء الحوض ثابتاً.", descEn: "Lie on stomach and press up with arms while keeping pelvis on the table.", defaultReps: "3 Sets x 10 Reps" },
  { id: "ex-2", nameAr: "تمرين بلانك ثبات الجذع", nameEn: "Core Stabilization (Plank)", categoryAr: "الجزع", categoryEn: "Trunk", descAr: "الحفاظ على استقامة الجسم مستنداً على الساعدين وأطراف أصابع القدم.", descEn: "Hold a straight body posture supported by forearms and toes.", defaultReps: "3 Sets x 30 Secs" },
  { id: "ex-3", nameAr: "تمرين الجسر لتقوية الأرداف", nameEn: "Glute Bridge", categoryAr: "الطرف السفلي", categoryEn: "Lower Limb", descAr: "الاستلقاء على الظهر مع ثني الركبتين ورفع الحوض لأعلى.", descEn: "Lie on back with knees bent and lift hips towards the ceiling.", defaultReps: "3 Sets x 12 Reps" },
  { id: "ex-4", nameAr: "إطالة أوتار الركبة (Hamstring Stretch)", nameEn: "Hamstring Wall Stretch", categoryAr: "الطرف السفلي", categoryEn: "Lower Limb", descAr: "رفع القدم واستنادها على جدار أو استخدام حبل شد لإطالة الفخذ الخلفي.", descEn: "Elevate leg against a wall or use a strap to stretch back of thigh.", defaultReps: "3 Sets x 30 Secs hold" },
  { id: "ex-5", nameAr: "تمرين تدوير الكتف الخارجي بالأربطة", nameEn: "Shoulder External Rotation", categoryAr: "الطرف العلوي", categoryEn: "Upper Limb", descAr: "تثبيت المرفق بجانب الجسم وتدوير الساعد للخارج باستخدام شريط المقاومة.", descEn: "Keep elbow at side and rotate forearm outward against resistance band.", defaultReps: "3 Sets x 15 Reps" },  { id: "ex-6", nameAr: "تمرين إطالة وتأهيل الرقبة (Chin Tuck)", nameEn: "Cervical Retraction (Chin Tuck)", categoryAr: "الرقبة", categoryEn: "Neck", descAr: "سحب الرأس موازياً للخلف دون خفض الرأس لتقوية عضلات الرقبة العميقة.", descEn: "Pull head straight back, keeping eyes level, to activate deep neck flexors.", defaultReps: "3 Sets x 10 Reps (5s hold)" },
  { id: "ex-7", nameAr: "تمرين قط وحصان لمرونة الظهر (Cat-Cow)", nameEn: "Cat-Cow Stretch", categoryAr: "الجزع", categoryEn: "Trunk", descAr: "الوقوف على الأطراف الأربعة وعمل تقوس وتقعير متبادل للعمود الفقري ببطء.", descEn: "On hands and knees, alternate between arching and rounding your back.", defaultReps: "2 Sets x 12 Reps" },
  { id: "ex-8", nameAr: "تمرين سكوات الجدار للركبة (Wall Sit)", nameEn: "Wall Sit", categoryAr: "الطرف السفلي", categoryEn: "Lower Limb", descAr: "الاستناد بالظهر على الحائط والنزول بوضعية القرفصاء بزاوية 90 درجة مع الثبات.", descEn: "Lean back against a wall and slide down to a 90-degree bend, holding posture.", defaultReps: "3 Sets x 20-30 Secs" },
  { id: "ex-9", nameAr: "إطالة عضلات الصدر البارزة (Pectoralis Stretch)", nameEn: "Doorway Chest Stretch", categoryAr: "الطرف العلوي", categoryEn: "Upper Limb", descAr: "الوقوف عند مدخل الباب ووضع الساعدين على الجانبين مع التقدم للأمام بلطف.", descEn: "Place forearms on doorway frame and step forward slowly to stretch chest.", defaultReps: "3 Sets x 30 Secs" },
  { id: "ex-10", nameAr: "رفع الكعب لتقوية بطة الساق (Calf Raise)", nameEn: "Standing Calf Raises", categoryAr: "الطرف السفلي", categoryEn: "Lower Limb", descAr: "الوقوف مستقيماً والارتفاع على أطراف أصابع القدمين ببطء ثم النزول.", descEn: "Stand straight and raise up onto toes slowly, then lower back down.", defaultReps: "3 Sets x 15 Reps" },
  { id: "ex-11", nameAr: "ثني الركبة بمقاومة الأربطة (Prone Hamstring Curl)", nameEn: "Prone Banded Hamstring Curl", categoryAr: "الطرف السفلي", categoryEn: "Lower Limb", descAr: "الاستلقاء على البطن وثني الركبة باتجاه المؤخرة بمقاومة مطاطية.", descEn: "Lie on stomach and bend knee towards glutes against band resistance.", defaultReps: "3 Sets x 12 Reps" },
  { id: "ex-12", nameAr: "حركة صدفة البحر لعضلات الحوض والورك", nameEn: "Clamshell Exercise", categoryAr: "الطرف السفلي", categoryEn: "Lower Limb", descAr: "الاستلقاء الجانبي مع ثني الركبتين وفتح الركبة العلوية دون تحريك الحوض.", descEn: "Lie on side with bent knees, open top knee outward while keeping feet together.", defaultReps: "3 Sets x 12 Reps" },
  { id: "ex-13", nameAr: "حركة الرأس التناظرية لمرونة العنق (Neck Rotation)", nameEn: "Active Neck Rotation Stretch", categoryAr: "الرقبة", categoryEn: "Neck", descAr: "تحريك الرأس لليمين واليسار ببطء لمدى الحركة المتاح دون ألم.", descEn: "Rotate neck slowly to the right and left, holding for 5 seconds.", defaultReps: "2 Sets x 10 Reps" },  { id: "ex-14", nameAr: "تمارين الفك والوجه لتأهيل العضلات (Jaw Mobilization)", nameEn: "Temporomandibular Joint Exercise", categoryAr: "الرأس", categoryEn: "Head", descAr: "تمارين فتح وإغلاق الفك ببطء مع تثبيت جانبي الوجه.", descEn: "Slow controlled opening and closing of jaw to relieve TMJ tension.", defaultReps: "2 Sets x 10 Reps" },
];

const DEVICE_DATABASE: Exercise[] = [
  { id: "dev-1", type: "device", nameAr: "جهاز التحفيز الكهربائي (TENS)", nameEn: "TENS Electrical Stimulation", categoryAr: "جهاز", categoryEn: "Device", descAr: "استخدام جهاز TENS لتخفيف الألم.", descEn: "Use TENS machine for pain relief.", defaultReps: "20 Mins" },
  { id: "dev-2", type: "device", nameAr: "الموجات فوق الصوتية (Ultrasound)", nameEn: "Therapeutic Ultrasound", categoryAr: "جهاز", categoryEn: "Device", descAr: "استخدام الموجات فوق الصوتية العلاجية لتقليل الالتهاب.", descEn: "Apply therapeutic ultrasound to reduce inflammation.", defaultReps: "10 Mins" },
  { id: "dev-3", type: "device", nameAr: "الكمادات الحرارية (Hot Packs)", nameEn: "Hot Packs Therapy", categoryAr: "جهاز", categoryEn: "Device", descAr: "وضع كمادات حرارية لزيادة تدفق الدم.", descEn: "Apply hot packs to increase blood flow.", defaultReps: "15 Mins" },
  { id: "dev-4", type: "device", nameAr: "علاج بالليزر البارد (LLLT)", nameEn: "Low Level Laser Therapy (LLLT)", categoryAr: "جهاز", categoryEn: "Device", descAr: "ليزر منخفض الطاقة لتسريع التئام الأنسجة.", descEn: "Low level laser to promote tissue healing.", defaultReps: "5-10 Mins" },
  { id: "dev-5", type: "device", nameAr: "علاج بالليزر عالي الكثافة (HILT)", nameEn: "High Intensity Laser Therapy (HILT)", categoryAr: "جهاز", categoryEn: "Device", descAr: "ليزر عالي الكثافة لتخفيف الألم العميق.", descEn: "High intensity laser for deep tissue pain relief.", defaultReps: "10-15 Mins" },  { id: "dev-6", type: "device", nameAr: "الأشعة تحت الحمراء (Infrared)", nameEn: "Infrared Therapy", categoryAr: "جهاز", categoryEn: "Device", descAr: "أشعة حرارية لتنشيط الدورة الدموية السطحية.", descEn: "Infrared heat to stimulate superficial blood flow.", defaultReps: "15 Mins" },
  { id: "dev-7", type: "device", nameAr: "موجات قصيرة (Shortwave Diathermy)", nameEn: "Shortwave Diathermy", categoryAr: "جهاز", categoryEn: "Device", descAr: "تسخين عميق للأنسجة والمفاصل.", descEn: "Deep tissue and joint heating.", defaultReps: "20 Mins" },
  { id: "dev-8", type: "device", nameAr: "جهاز الشد العنقي (Cervical Traction)", nameEn: "Cervical Traction", categoryAr: "جهاز", categoryEn: "Device", descAr: "سحب ميكانيكي لتخفيف الضغط على الأعصاب العنقية.", descEn: "Mechanical traction to decompress cervical nerves.", defaultReps: "15 Mins" },
  { id: "dev-9", type: "device", nameAr: "جهاز الشد القطني (Lumbar Traction)", nameEn: "Lumbar Traction", categoryAr: "جهاز", categoryEn: "Device", descAr: "سحب ميكانيكي لتخفيف الضغط على الأعصاب القطنية.", descEn: "Mechanical traction to decompress lumbar nerves.", defaultReps: "20 Mins" },
];

function RehabProtocolPlannerTab({ patient }: { patient: Patient }) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user: authUser } = useAuth();
  const clinicId = authUser?.clinicId;

  const [selectedExercises, setSelectedExercises] = useState<(Exercise & { customReps?: string; note?: string })[]>([]);
  const [contraindicationAlert, setContraindicationAlert] = useState<{ open: boolean; exercise: Exercise | null; reason: string }>({ open: false, exercise: null, reason: "" });
  const [goals, setGoals] = useState("");
  const [localProtocolState, setLocalProtocolState] = useState<ProtocolState | null>(() => {
    if (patient.active_protocol) return patient.active_protocol;
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(`patient_active_protocol_${patient.id}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Parse patient's active protocol
  const activeProtocolState = useMemo(() => {
    if (localProtocolState) return localProtocolState;
    if (patient && patient.active_protocol) {
      try {
        const state = typeof patient.active_protocol === "string" 
          ? JSON.parse(patient.active_protocol) 
          : patient.active_protocol;
        return state || null;
      } catch (e) {
        console.warn("Failed to parse active protocol", e);
        return null;
      }
    }
    return null;
  }, [localProtocolState, patient]);

  const persistProtocolState = async (state: ProtocolState | null) => {
    setLocalProtocolState(state);
    try {
      if (state) {
        localStorage.setItem(`patient_active_protocol_${patient.id}`, JSON.stringify(state));
      } else {
        localStorage.removeItem(`patient_active_protocol_${patient.id}`);
      }
    } catch {}

    try {
      const { error } = await supabase
        .from("patients")
        .update({ active_protocol: state })
        .eq('clinic_id', clinicId)
        .eq("id", patient.id);
      if (error) {
        console.warn("Protocol saved locally; Supabase sync skipped or failed.", error.message || error);
      }
    } catch (e) {
      console.warn("Protocol saved locally; Supabase sync skipped or failed.", e);
    }
  };

  const activeProtocol = useMemo(() => {
    if (!activeProtocolState) return null;
    return CLINICAL_PROTOCOLS.find(p => p.id === activeProtocolState.protocolId) || null;
  }, [activeProtocolState]);

  const activePhase = useMemo(() => {
    if (!activeProtocol || !activeProtocolState) return null;
    return activeProtocol.phases.find(p => p.phaseNumber === activeProtocolState.currentPhase) || null;
  }, [activeProtocol, activeProtocolState]);

  const patientDiagnosis = patient.diagnosis || "";
  const matchedProtocolIds = useMemo(() => {
    if (!patientDiagnosis.trim()) return new Set<string>();
    const lower = patientDiagnosis.toLowerCase();
    return new Set(
      CLINICAL_PROTOCOLS.filter(p => p.keywords.some(kw => lower.includes(kw))).map(p => p.id)
    );
  }, [patientDiagnosis]);

  // Assign protocol
  const handleAssignProtocol = async (protocolId: string) => {
    const initialState: ProtocolState = {
      protocolId,
      currentPhase: 1,
      completedCriteria: []
    };
    await persistProtocolState(initialState);
    
    // Seed initial goals from phase 1
    const proto = CLINICAL_PROTOCOLS.find(p => p.id === protocolId);
    if (proto && proto.phases[0]) {
      const initialGoals = isRtl 
        ? proto.phases[0].goalsAr.join(" - ") 
        : proto.phases[0].goalsEn.join(" - ");
      setGoals(initialGoals);
    }
  };

  // Toggle checklist
  const handleToggleCriterion = async (criterionKey: string) => {
    if (!activeProtocolState) return;
    const completed = [...(activeProtocolState.completedCriteria || [])];
    const idx = completed.indexOf(criterionKey);
    if (idx > -1) {
      completed.splice(idx, 1);
    } else {
      completed.push(criterionKey);
    }

    const updatedState = {
      ...activeProtocolState,
      completedCriteria: completed
    };

    await persistProtocolState(updatedState);
  };

  // Move to next phase
  const handleUpgradePhase = async () => {
    if (!activeProtocolState || !activeProtocol || !activePhase) return;
    
    const nextPhaseNum = activeProtocolState.currentPhase + 1;
    if (nextPhaseNum > activeProtocol.phases.length) return;

    const updatedState = {
      protocolId: activeProtocolState.protocolId,
      currentPhase: nextPhaseNum,
      completedCriteria: []
    };

    await persistProtocolState(updatedState);

    const nextPhaseData = activeProtocol.phases.find(p => p.phaseNumber === nextPhaseNum);
    if (nextPhaseData) {
      const nextGoals = isRtl 
        ? nextPhaseData.goalsAr.join(" - ") 
        : nextPhaseData.goalsEn.join(" - ");
      setGoals(nextGoals);
    }
  };

  // Remove protocol
  const handleRemoveProtocol = async () => {
    await persistProtocolState(null);
    setGoals("");
  };
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [dbTab, setDbTab] = useState<"exercise" | "device">("exercise");
  const [customLibraryItems, setCustomLibraryItems] = useState<Exercise[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("prime_physio_templates_v3");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any[];
        const mapped = parsed
          .filter(p => p.type === "exercise" || p.type === "device")
          .map(p => ({
            id: p.id,
            type: p.type,
            nameAr: p.titleAr,
            nameEn: p.titleEn || p.titleAr,
            categoryAr: p.type === "device" ? "جهاز" : (p.category || "عام"),
            categoryEn: p.type === "device" ? "Device" : (p.category || "General"),
            descAr: p.contentAr,
            descEn: p.contentEn || p.contentAr,
            defaultReps: p.type === "device" ? "15 Mins" : "3 Sets x 10 Reps",
          }));
        setCustomLibraryItems(mapped);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);  const addExercise = (ex: Exercise) => {
    if (selectedExercises.some((e) => e.id === ex.id)) return;    const allPatientData = [
      patient.medicalHistory,
      patient.chronicDiseases,
      patient.pastSurgeries,
      patient.chiefComplaint,
      patient.diagnosis
    ].filter(Boolean).join(" ").toLowerCase();
    
    // Check all red flags dynamically
    for (const flag of CONTRAINDICATIONS_DATABASE) {
      const hasFlag = flag.keywords.some(kw => allPatientData.includes(kw));
      if (hasFlag) {
        // Check if the exercise/device is blocked for this red flag
        const nameLowerAr = ex.nameAr.toLowerCase();
        const nameLowerEn = ex.nameEn.toLowerCase();
        
        let isBlocked = false;
        if (ex.type === "device") {
          isBlocked = flag.blockedDevices.some(b => nameLowerAr.includes(b) || nameLowerEn.includes(b));
        } else {
          isBlocked = flag.blockedExercises.some(b => nameLowerAr.includes(b) || nameLowerEn.includes(b));
        }

        if (isBlocked) {
          const reason = isRtl ? flag.nameAr : flag.nameEn;
          setContraindicationAlert({ open: true, exercise: ex, reason });
          return; // Wait for user to override or cancel
        }
      }
    }

    setSelectedExercises([...selectedExercises, { ...ex, customReps: ex.defaultReps, note: "" }]);
  };

  const confirmAddContraindicated = () => {
    if (contraindicationAlert.exercise) {
      const ex = contraindicationAlert.exercise;
      setSelectedExercises([...selectedExercises, { ...ex, customReps: ex.defaultReps, note: "" }]);
    }
    setContraindicationAlert({ open: false, exercise: null, reason: "" });
  };

  const removeExercise = (id: string) => {
    setSelectedExercises(selectedExercises.filter((e) => e.id !== id));
  };

  const updateExercise = (id: string, field: "customReps" | "note", val: string) => {
    setSelectedExercises(
      selectedExercises.map((e) => (e.id === id ? { ...e, [field]: val } : e))
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // Anatomical filters helper
  const getCategories = () => {
    return [
      { id: "all", ar: "الكل", en: "All" },
      { id: "الرأس", ar: "الرأس", en: "Head" },
      { id: "الرقبة", ar: "الرقبة", en: "Neck" },
      { id: "الجزع", ar: "الجزع", en: "Trunk" },
      { id: "الطرف العلوي", ar: "الطرف العلوي", en: "Upper Limb" },
      { id: "الطرف السفلي", ar: "الطرف السفلي", en: "Lower Limb" }
    ];
  };  const combinedExercises = [
    ...customLibraryItems.filter(i => i.type === "exercise" || !i.type),
    ...EXERCISE_DATABASE.filter(e => !customLibraryItems.some(c => c.nameAr === e.nameAr))
  ];

  const combinedDevices = [
    ...customLibraryItems.filter(i => i.type === "device"),
    ...DEVICE_DATABASE.filter(e => !customLibraryItems.some(c => c.nameAr === e.nameAr))
  ];

  const filteredDatabase = (dbTab === "exercise" ? combinedExercises : combinedDevices).filter(ex => {
    if (dbTab === "device") return true; // No category filters for devices
    if (activeFilter === "all") return true;
    return ex.categoryAr === activeFilter;
  });  return (
    <div className="pt-4 space-y-6 print:p-0">
      {/* Contraindication Alert Dialog */}
      <Dialog open={contraindicationAlert.open} onOpenChange={(open: boolean) => !open && setContraindicationAlert({ open: false, exercise: null, reason: "" })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              ⚠️ {isRtl ? "تحذير وتنبيه طبي خطير (Red Flag)" : "Critical Medical Contraindication"}
            </DialogTitle>            <div className="text-slate-700 mt-2 font-medium leading-relaxed">
              {isRtl ? (
                <>
                  لقد حاولت إضافة <strong>{contraindicationAlert.exercise?.nameAr}</strong>.
                  هذا الإجراء يتعارض مع حالة المريض المسجلة: <strong>{contraindicationAlert.reason}</strong>.
                  هل أنت متأكد من رغبتك في تجاوز هذا التحذير؟
                </>
              ) : (
                <>
                  You attempted to add <strong>{contraindicationAlert.exercise?.nameEn}</strong>.
                  This procedure is contraindicated due to the patient&apos;s condition: <strong>{contraindicationAlert.reason}</strong>.
                  Are you sure you want to override this warning?
                </>
              )}
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-start">
            <Button variant="outline" onClick={() => setContraindicationAlert({ open: false, exercise: null, reason: "" })}>
              {isRtl ? "إلغاء (آمن)" : "Cancel (Safe)"}
            </Button>
            <Button variant="destructive" onClick={confirmAddContraindicated}>
              {isRtl ? "تجاوز التحذير وإضافة" : "Override and Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>      {/* Assign Protocol Card */}
      {!activeProtocolState && (
        <Card className="border-teal-200 bg-teal-50/10 print:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#0d8a8a] flex items-center gap-2">
              <span>📋</span> {isRtl ? "تفعيل بروتوكول علاجي مرحلي" : "Activate Phase-Based Protocol"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
            <p className="text-xs text-slate-500 max-w-xl">
              {isRtl 
                ? (patientDiagnosis.trim() ? `تم اقتراح البروتوكولات المناسبة بناءً على تشخيص المريض.` : "حدد بروتوكولاً علاجياً لمتابعة تأهيل المريض.")
                : (patientDiagnosis.trim() ? `Protocols are auto-suggested based on the patient's diagnosis.` : "Select a protocol to track patient rehabilitation.")}
            </p>
            <div className="flex flex-wrap gap-2">
              {CLINICAL_PROTOCOLS.map(proto => {
                const isMatch = matchedProtocolIds.has(proto.id);
                const hasMatches = matchedProtocolIds.size > 0;
                return (
                  <Button
                    key={proto.id}
                    onClick={() => handleAssignProtocol(proto.id)}
                    className={`text-xs font-semibold px-4 h-9 ${isMatch ? "bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] ring-2 ring-[#4F46BA]/30" : hasMatches ? "bg-slate-100 hover:bg-slate-200 text-slate-500" : "bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9]"}`}
                  >
                    {isRtl ? proto.nameAr : proto.nameEn}
                    {isMatch && <span className="mr-1.5 text-[10px] opacity-80">{isRtl ? "✓ موصى به" : "✓ Recommended"}</span>}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stepper & Current Phase Checklist Card */}
      {activeProtocolState && activeProtocol && activePhase && (
        <Card className="border-teal-200 dark:border-teal-900 bg-white shadow-xs print:hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-teal-50/50 to-cyan-50/30 dark:from-teal-950/20 dark:to-cyan-950/10 border-b border-teal-100 dark:border-teal-900">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {isRtl ? activeProtocol.nameAr : activeProtocol.nameEn}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] border-teal-300 text-teal-700 bg-teal-50">
                    {isRtl ? activePhase.weeks : `Weeks: ${activePhase.weeks}`}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveProtocol}
                className="text-slate-400 hover:text-rose-500 h-8 px-2"
              >
                {isRtl ? "إلغاء البروتوكول ✕" : "Remove Protocol ✕"}
              </Button>
            </div>

            {/* Stepper Steps indicator */}
            <div className="flex items-center justify-between w-full max-w-md mx-auto pt-6 pb-2" dir="ltr">
              {activeProtocol.phases.map((p, idx) => {
                const isCompleted = p.phaseNumber < activeProtocolState.currentPhase;
                const isActive = p.phaseNumber === activeProtocolState.currentPhase;
                return (
                  <div key={p.phaseNumber} className="flex items-center flex-1 last:flex-initial">
                    <div className="flex flex-col items-center relative">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                          ${isCompleted 
                            ? "bg-emerald-500 text-white shadow-sm" 
                            : isActive 
                              ? "bg-teal-600 text-white ring-4 ring-teal-100 shadow-sm" 
                              : "bg-slate-100 text-slate-400"}`}
                      >
                        {isCompleted ? "✓" : p.phaseNumber}
                      </div>
                      <span className="text-[9px] mt-1.5 font-semibold text-slate-500 whitespace-nowrap">
                        {language === "ar" ? `المرحلة ${p.phaseNumber}` : `Phase ${p.phaseNumber}`}
                      </span>
                    </div>
                    {idx < activeProtocol.phases.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 -mt-4 transition-all duration-500
                          ${p.phaseNumber < activeProtocolState.currentPhase ? "bg-emerald-500" : "bg-slate-200"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Goals & Precautions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-teal-100 bg-teal-50/10 space-y-2">
                <h4 className="text-xs font-bold text-teal-800 dark:text-teal-400 flex items-center gap-1.5">
                  🎯 {isRtl ? "أهداف المرحلة الحالية" : "Current Phase Goals"}
                </h4>
                <ul className="list-disc pr-4 pl-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  {(isRtl ? activePhase.goalsAr : activePhase.goalsEn).map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/10 space-y-2">
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5">
                  ⚠️ {isRtl ? "محاذير وتنبيهات" : "Precautions & Warnings"}
                </h4>
                <ul className="list-disc pr-4 pl-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  {(isRtl ? activePhase.precautionsAr : activePhase.precautionsEn).map((p, i) => (
                    <li key={i} className="font-medium">{p}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Progression Criteria checklist */}
            <div className="p-3.5 rounded-xl border bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  📋 {isRtl ? "شروط ترقية المرحلة (Progression Criteria)" : "Progression Criteria Checklist"}
                </h4>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                  {activeProtocolState.completedCriteria.length} / {activePhase.criteria.length} {isRtl ? "مكتمل" : "completed"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activePhase.criteria.map((c) => {
                  const isChecked = activeProtocolState.completedCriteria.includes(c.key);
                  return (
                    <div
                      key={c.key}
                      onClick={() => handleToggleCriterion(c.key)}
                      className={`flex items-center gap-3 p-2 border rounded-lg cursor-pointer transition-all hover:bg-white select-none
                        ${isChecked ? "border-emerald-250 bg-emerald-50/10 text-slate-800" : "border-slate-150 text-slate-500"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all
                          ${isChecked ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white"}`}
                      >
                        {isChecked && "✓"}
                      </div>
                      <span className="text-[11px] font-medium leading-none">
                        {isRtl ? c.labelAr : c.labelEn}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress Button */}
              {activeProtocolState.currentPhase < activeProtocol.phases.length && (
                <div className="flex justify-end pt-1">
                  <Button
                    onClick={handleUpgradePhase}
                    disabled={activeProtocolState.completedCriteria.length < activePhase.criteria.length}
                    className={`text-xs font-semibold px-4 h-9 shadow-sm transition-all duration-300
                      ${activeProtocolState.completedCriteria.length >= activePhase.criteria.length
                        ? "bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] cursor-pointer"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"}`}
                  >
                    🚀 {isRtl ? "الترقية إلى المرحلة التالية" : "Upgrade to Next Phase"}
                  </Button>
                </div>
              )}

              {activeProtocolState.currentPhase === activeProtocol.phases.length && (
                <div className="p-3 border border-emerald-200 bg-emerald-50/10 rounded-lg text-center text-xs text-emerald-800 font-bold animate-pulse">
                  🎉 {isRtl ? "لقد وصل المريض للمرحلة النهائية من البروتوكول التأهيلي!" : "The patient has reached the final stage of rehabilitation!"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print-Only Clinic Header Letterhead */}
      <div className="hidden print:flex flex-col mb-6 pb-4 border-b-2 border-teal-600">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-teal-800 tracking-wider">PRIME PHYSIO CLINIC</h1>
            <p className="text-xs text-slate-500">Physical Therapy & Rehabilitation Specialist Center</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">{isRtl ? "برنامج التمارين المنزلية" : "Home Exercise Program (HEP)"}</p>
            <p className="text-xs text-slate-500">{isRtl ? "التاريخ:" : "Date:"} {new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</p>
          </div>
        </div>        <div className="mt-4 p-3 bg-slate-50 border rounded-xl grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="font-bold text-slate-500">{isRtl ? "اسم المريض: " : "Patient Name: "}</span>
            <span className="font-semibold">{patient.nameAr}</span>
          </div>
          <div>
            <span className="font-bold text-slate-500">{isRtl ? "رقم الملف: " : "File ID: "}</span>
            <span className="font-mono font-semibold">{patient.id}</span>
          </div>          <div>
            <span className="font-bold text-slate-500">{isRtl ? "الجنس / السن: " : "Gender / Age: "}</span>
            <span className="font-semibold">{patient.gender} · {patient.age} {isRtl ? "سنة" : "years"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
        {/* Left Side: Exercise Database */}        <Card className="lg:col-span-5 border-teal-200 print:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-800 dark:text-white flex gap-2">
              <Button 
                variant={dbTab === "exercise" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setDbTab("exercise")}
                className={`flex-1 text-xs ${dbTab === "exercise" ? "bg-[#4F46BA] text-white" : ""}`}
              >
                {isRtl ? "التمارين التأهيلية" : "Exercises"}
              </Button>
              <Button 
                variant={dbTab === "device" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setDbTab("device")}
                className={`flex-1 text-xs ${dbTab === "device" ? "bg-[#4F46BA] text-white" : ""}`}
              >
                {isRtl ? "الأجهزة العلاجية" : "Devices"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Category filter buttons */}
            {dbTab === "exercise" && (
              <div className="flex flex-wrap gap-1 pb-2 border-b">
                {getCategories().map(cat => (
                  <Button
                    key={cat.id}
                    variant={activeFilter === cat.id ? "default" : "outline"}
                    className={`h-7 text-[10px] px-2 py-1 ${activeFilter === cat.id ? "bg-[#4F46BA] text-white" : "text-slate-600"}`}
                    onClick={() => setActiveFilter(cat.id)}
                  >
                    {isRtl ? cat.ar : cat.en}
                  </Button>
                ))}
              </div>
            )}

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredDatabase.map((ex) => (
                <div 
                  key={ex.id} 
                  className="p-3 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 flex justify-between items-center transition-colors cursor-pointer group"
                  onClick={() => addExercise(ex)}
                >
                  <div className="flex-1 min-w-0">                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] py-0 ${ex.type === 'device' ? 'border-amber-250 text-amber-700' : 'border-teal-250 text-teal-700'}`}>
                        {isRtl ? ex.categoryAr : ex.categoryEn}
                      </Badge>
                      <p className="font-semibold text-xs text-slate-800 dark:text-white truncate">
                        {isRtl ? ex.nameAr : ex.nameEn}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-1">
                      {isRtl ? ex.descAr : ex.descEn}
                    </p>
                  </div>                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`h-8 w-8 rounded-full p-0 transition-transform shrink-0 ${ex.type === 'device' ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 group-hover:scale-105' : 'text-[#0d8a8a] bg-teal-50 hover:bg-teal-100 group-hover:scale-105'}`}
                  >
                    ➕
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Active Rehab Plan Customizer */}
        <Card className="lg:col-span-7 border-teal-250 print:border-none print:shadow-none">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-800 dark:text-white print:text-xl">
                {isRtl ? "خطة التمارين المنزلية (HEP)" : "Customized Home Exercise Program (HEP)"}
              </CardTitle>
            </div>
            <Button 
              onClick={handlePrint} 
              disabled={selectedExercises.length === 0} 
              className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] gap-2 print:hidden"
            >
              🖨️ {isRtl ? "طباعة البرنامج" : "Print Program"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Treatment Goals Input */}
            <div className="space-y-1.5">
              <Label htmlFor="goals" className="text-xs print:font-bold">
                {isRtl ? "الأهداف العلاجية للبرنامج" : "Clinical Program Goals"}
              </Label>
              <Input 
                id="goals" 
                placeholder={isRtl ? "مثال: تقوية عضلات الجذع وتخفيف الضغط على الفقرة L4/L5" : "e.g., Core strengthening, Lumbar decomp."}
                value={goals} 
                onChange={(e) => setGoals(e.target.value)}
                className="print:border-b print:border-t-0 print:border-x-0 print:rounded-none"
              />
            </div>

            {/* List of Scheduled Exercises */}
            <div className="space-y-3">
              <Label className="text-xs print:font-bold">{isRtl ? "التمارين المجدولة" : "Assigned Exercises"}</Label>
              {selectedExercises.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-2xl text-slate-400 text-xs">
                  {isRtl ? "اختر تمارين من المكتبة على اليمين لبناء الخطة." : "Add exercises from the database to populate the plan."}
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedExercises.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="p-3 border rounded-xl bg-slate-50/40 dark:bg-slate-900/10 space-y-3 relative print:border print:bg-transparent"
                    >                      {/* Close icon */}
                      <button 
                        onClick={() => removeExercise(item.id)} 
                        className={`absolute top-2 ${isRtl ? "left-2" : "right-2"} text-slate-400 hover:text-rose-500 text-xs transition-colors print:hidden`}
                      >
                        ❌
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-teal-700 dark:text-teal-400">#{index + 1}</span>
                          <h4 className="font-bold text-xs text-slate-800 dark:text-white">
                            {isRtl ? item.nameAr : item.nameEn}
                          </h4>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                          {isRtl ? item.descAr : item.descEn}
                        </p>
                      </div>

                      {/* Custom Params */}
                      <div className="grid grid-cols-2 gap-3 print:grid-cols-2">                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold block">{item.type === "device" ? (isRtl ? "مدة الاستخدام" : "Duration") : (isRtl ? "التكرار والمجموعات" : "Sets & Reps")}</span>
                          <Input 
                            value={item.customReps} 
                            onChange={(e) => updateExercise(item.id, "customReps", e.target.value)} 
                            className="h-8 text-xs print:border-none print:p-0"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 font-bold block">{isRtl ? "ملاحظات التوجيه" : "Special Instructions"}</span>
                          <Input 
                            value={item.note} 
                            onChange={(e) => updateExercise(item.id, "note", e.target.value)} 
                            placeholder={isRtl ? "سرعة الأداء، فترات الراحة..." : "Rest periods, form focus..."}
                            className="h-8 text-xs print:border-none print:p-0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { language, t } = useLanguage();
  const isRtl = language === "ar";
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const clinicId = user?.clinicId;

  // Real-time collaboration state
  const [activeEditors, setActiveEditors] = useState<{ email: string; name: string; role: string; initials: string; bg: string }[]>([]);
  const [lockedFields, setLockedFields] = useState<Record<string, { user: string; email: string }>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const broadcastLock = (field: string) => {
    if (!user?.email) return;
    supabase.channel(`patient-${resolvedParams.id}`).send({
      type: "broadcast",
      event: "lock",
      payload: { field, user: user.name || user.email, email: user.email },
    }).catch(() => {});
  };

  const broadcastUnlock = (field: string) => {
    if (!user?.email) return;
    supabase.channel(`patient-${resolvedParams.id}`).send({
      type: "broadcast",
      event: "unlock",
      payload: { field, email: user.email },
    }).catch(() => {});
  };

  const [patient, setPatient] = useState<Patient>(EMPTY_PATIENT(resolvedParams.id));

  // Load real patient data from Supabase
  useEffect(() => {
    async function fetchPatient() {
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq('clinic_id', clinicId)
          .eq("id", resolvedParams.id)
          .single();
        if (!error && data) {
          // Map DB fields (which may differ) back to the Patient interface
          setPatient((prev) => ({
            ...prev,
            id: data.id,
            nameAr: data.nameAr || data.namear || prev.nameAr,
            nameEn: data.nameEn || data.nameen || prev.nameEn,
            age: data.age ?? prev.age,
            gender: data.gender || prev.gender,
            phone: data.phone || prev.phone,
            email: data.email || prev.email || "",
            nationalId: data.nationalId || data.national_id || prev.nationalId || "",
            bloodType: data.bloodType || data.blood_type || prev.bloodType || "",
            allergies: data.allergies || prev.allergies || "",
            dvt: data.dvt || prev.dvt || "",
            emergencyContact: data.emergencyContact || data.emergency_contact || prev.emergencyContact || "",
            emergencyPhone: data.emergencyPhone || data.emergency_phone || prev.emergencyPhone || "",
            address: data.address || prev.address || "",
            occupation: data.occupation || prev.occupation || "",
            referral: data.referral || prev.referral || "",
            chiefComplaint: data.chiefComplaint || data.chief_complaint || (data.medical_history as any)?.chiefComplaint || prev.chiefComplaint || "",
            diagnosis: data.diagnosis || (data.medical_history as any)?.diagnosis || prev.diagnosis || "",
            medicalHistory: data.medicalHistory || data.medical_history_text || (data.medical_history as any)?.medicalHistory || prev.medicalHistory || "",
            pastSurgeries: data.pastSurgeries || (data.medical_history as any)?.pastSurgeries || prev.pastSurgeries || "",
            chronicDiseases: data.chronicDiseases || (data.medical_history as any)?.chronicDiseases || prev.chronicDiseases || "",
            currentMedications: data.currentMedications || (data.medical_history as any)?.currentMedications || prev.currentMedications || "",
            drugAllergies: data.drugAllergies || (data.medical_history as any)?.drugAllergies || prev.drugAllergies || "",
            doctor: data.doctor || data.assignedDoctor || prev.doctor || "",
            active_protocol: data.active_protocol ?? prev.active_protocol,
          }));
        }
      } catch (err) {
        console.warn("Failed to fetch patient from Supabase:", err);
      }
    }
    fetchPatient();
  }, [resolvedParams.id]);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nameAr: patient.nameAr,
    nameEn: patient.nameEn,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email,
    allergies: patient.allergies,
    emergencyContact: patient.emergencyContact,
    emergencyPhone: patient.emergencyPhone,
    address: patient.address,
    occupation: patient.occupation || "",
    referral: patient.referral || "",
    dvt: patient.dvt || "",
  });

  useEffect(() => {
    setEditForm({
      nameAr: patient.nameAr,
      nameEn: patient.nameEn,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      allergies: patient.allergies,
      emergencyContact: patient.emergencyContact,
      emergencyPhone: patient.emergencyPhone,
      address: patient.address,
      occupation: patient.occupation || "",
      referral: patient.referral || "",
      dvt: patient.dvt || "",
    });  }, [patient]);

  const [isMedicalEditOpen, setIsMedicalEditOpen] = useState(false);
  const [medicalEditForm, setMedicalEditForm] = useState({
    chiefComplaint: patient.chiefComplaint || "",
    diagnosis: patient.diagnosis || "",
    medicalHistory: patient.medicalHistory || "",
    pastSurgeries: patient.pastSurgeries || "",
    chronicDiseases: patient.chronicDiseases || "",
    currentMedications: patient.currentMedications || "",
    drugAllergies: patient.drugAllergies || "",
  });
  const [medicalEditPainRegions, setMedicalEditPainRegions] = useState<string[]>([]);

  useEffect(() => {
    setMedicalEditForm({
      chiefComplaint: patient.chiefComplaint || "",
      diagnosis: patient.diagnosis || "",
      medicalHistory: patient.medicalHistory || "",
      pastSurgeries: patient.pastSurgeries || "",
      chronicDiseases: patient.chronicDiseases || "",
      currentMedications: patient.currentMedications || "",
      drugAllergies: patient.drugAllergies || "",
    });
  }, [patient]);

  // When the medical edit dialog opens, pre-populate the pain map from existing diagnosis
  useEffect(() => {
    if (isMedicalEditOpen) {
      syncMedicalEditPainMap(medicalEditForm.diagnosis);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMedicalEditOpen]);

  // Sync pain map regions from a diagnosis string (used in the medical edit dialog)
  const syncMedicalEditPainMap = (diagnosis: string) => {
    const normalized = diagnosis.toLowerCase();
    const withoutParens = (v: string) => v.replace(/\s*\([^)]*\)/g, "").trim();
    const matched = BODY_PAIN_REGIONS
      .filter((region) =>
        [region.nameAr, region.nameEn, withoutParens(region.nameAr), withoutParens(region.nameEn)]
          .map((t) => t.toLowerCase().trim())
          .filter(Boolean)
          .some((term) => normalized.includes(term))
      )
      .map((r) => r.id);
    setMedicalEditPainRegions(matched);
  };

  const handleMedicalEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPatient({
      ...patient,
      ...medicalEditForm,
    });
    setIsMedicalEditOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPatient({
      ...patient,
      ...editForm,
    });
    setIsEditOpen(false);
  };

  return (    <div className="min-h-screen bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <div className="border-b bg-card sticky top-16 z-40 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => router.back()}>
            {isRtl ? "← رجوع" : "← Back"}
          </Button>          <Separator orientation="vertical" className="h-6" />          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-sm font-bold text-teal-700 dark:text-teal-300 flex-shrink-0">
            {getInitials(isRtl ? patient.nameAr : translateMock(isRtl, patient.nameAr))}
          </div>          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{isRtl ? patient.nameAr : translateMock(isRtl, patient.nameAr)}</h1>
            <p className="text-xs text-muted-foreground">
              {patient.id} · {isRtl ? patient.gender : (patient.gender === "ذكر" ? "Male" : "Female")} · {isRtl ? "السن:" : "Age:"} {patient.age} {isRtl ? "سنة" : "years"}
            </p>
          </div>

          {/* Active Editors (Google Docs style) */}
          <div className="flex items-center -space-x-1.5 overflow-hidden rtl:space-x-reverse print:hidden">
            {activeEditors
              .filter((e) => e.email !== user?.email)
              .map((editor, i) => (
                <div
                  key={editor.email || i}
                  title={`${editor.name} (${editor.role})`}
                  className={`w-7 h-7 rounded-full border border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm cursor-pointer select-none transition-all hover:-translate-y-0.5 ${editor.bg || "bg-teal-600"}`}
                >
                  {editor.initials}
                </div>
              ))}
            {activeEditors.filter((e) => e.email !== user?.email).length > 0 && (
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full ms-2 animate-pulse hidden sm:inline">
                {isRtl ? "نشط الآن" : "Active Now"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>{isRtl ? "تعديل البيانات" : "Edit Profile"}</Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">        <Tabs defaultValue="general">
          <TabsList className="flex flex-wrap h-auto w-full max-w-5xl justify-start gap-1 p-1 print:hidden">
            <TabsTrigger value="general">{isRtl ? "المعلومات العامة" : "General Info"}</TabsTrigger>
            <TabsTrigger value="radiology">{isRtl ? "الأشعة والتحاليل" : "Scans & Reports"}</TabsTrigger>
            <TabsTrigger value="records">{isRtl ? "السجلات الطبية" : "Medical Records"}</TabsTrigger>
            <TabsTrigger value="reports" className="text-teal-600 dark:text-teal-400 font-bold"><FileText className="w-3.5 h-3.5 mr-1 ml-1"/> {isRtl ? "التقارير الذكية" : "Smart Reports"}</TabsTrigger>
            <TabsTrigger value="protocols">{isRtl ? "بروتوكولات التأهيل" : "Rehab Protocols"}</TabsTrigger>
            <TabsTrigger value="ai-planner" className="text-indigo-600 dark:text-indigo-400 font-bold"><Sparkles className="w-3.5 h-3.5 mr-1 ml-1"/> {isRtl ? "المولد الذكي" : "AI Planner"}</TabsTrigger>
            <TabsTrigger value="brainstorm" className="text-blue-600 dark:text-blue-400 font-bold"><MessageCircle className="w-3.5 h-3.5 mr-1 ml-1"/> {isRtl ? "التفكير السريري" : "Brainstorming"}</TabsTrigger>
            <TabsTrigger value="packages">{isRtl ? "الباقات" : "Packages"}</TabsTrigger>
            <TabsTrigger value="neuro">{isRtl ? "دليل الأعصاب" : "Neuro Reference"}</TabsTrigger>
          </TabsList>
          <TabsContent value="general"><GeneralInfoTab patient={patient} /></TabsContent>
          <TabsContent value="radiology"><RadiologyTab /></TabsContent>
          <TabsContent value="records"><MedicalRecordsTab patient={patient} onEditMedicalClick={() => setIsMedicalEditOpen(true)} /></TabsContent>
          <TabsContent value="reports"><SmartReportsTab patient={patient} /></TabsContent>
          <TabsContent value="protocols"><PhaseBasedProtocolsTab patient={patient} /></TabsContent>
          <TabsContent value="ai-planner"><AiPlannerTab patient={patient} /></TabsContent>
          <TabsContent value="brainstorm"><ClinicalBrainstormTab patient={patient} /></TabsContent>
          <TabsContent value="packages"><PackagesTab patient={patient} onUpdatePatient={setPatient} /></TabsContent>
          <TabsContent value="neuro"><NeuroReferenceTab /></TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-bold ${isRtl ? "text-right" : "text-left"}`}>
              {isRtl ? "تعديل البيانات الشخصية" : "Edit Personal Profile"}
            </DialogTitle>
          </DialogHeader>          <form onSubmit={handleEditSubmit} className="space-y-4 py-2" dir={isRtl ? "rtl" : "ltr"}>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">{isRtl ? "الاسم" : "Name"}</Label>
              <Input value={editForm.nameAr} onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">{isRtl ? "السن" : "Age"}</Label>
                <Input type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) })} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">{isRtl ? "الجنس" : "Gender"}</Label>
                <select 
                  value={editForm.gender} 
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 text-slate-700"
                >
                  <option value="ذكر">{isRtl ? "ذكر" : "Male"}</option>
                  <option value="أنثى">{isRtl ? "أنثى" : "Female"}</option>
                </select>
              </div>
            </div>             <div className="space-y-1">
               <Label className="text-xs font-semibold text-slate-700">{isRtl ? "الهاتف" : "Phone"}</Label>
               <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} required />
             </div>            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">{isRtl ? "العنوان" : "Address"}</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">{isRtl ? "المهنة" : "Occupation"}</Label>
                <Input value={editForm.occupation} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">{isRtl ? "جهة التحويل" : "Doctor Referral"}</Label>
                <Input value={editForm.referral} onChange={(e) => setEditForm({ ...editForm, referral: e.target.value })} />
              </div>
            </div>
             <div className="grid grid-cols-2 gap-3 border-t pt-3 mt-3">
               <div className="space-y-1">
                 <Label className="text-xs font-semibold text-slate-700">{isRtl ? "تنبيه الحساسية" : "Allergy Alert"}</Label>
                 <Input value={editForm.allergies} onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })} placeholder={isRtl ? "مثال: بنسلين" : "e.g. Penicillin"} />
               </div>
               <div className="space-y-1">
                 <Label className="text-xs font-semibold text-slate-700">{isRtl ? "تنبيه طبي آخر (مثل DVT)" : "Other Medical Alert (e.g. DVT)"}</Label>
                 <Input value={editForm.dvt} onChange={(e) => setEditForm({ ...editForm, dvt: e.target.value })} placeholder={isRtl ? "مثال: تاريخ جلطة ساق DVT" : "e.g. History of DVT"} />
               </div>
             </div>
             <DialogFooter className={`pt-3 border-t mt-4 flex gap-2 ${isRtl ? "justify-end" : "justify-start flex-row-reverse"}`}>
               <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
               <Button type="submit" className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9]">{isRtl ? "حفظ التعديلات" : "Save Changes"}</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Medical File Modal */}
      <Dialog open={isMedicalEditOpen} onOpenChange={setIsMedicalEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-bold ${isRtl ? "text-right" : "text-left"}`}>
              {isRtl ? "تعديل الملف الطبي" : "Edit Medical File"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMedicalEditSubmit} className="space-y-4 py-2" dir={isRtl ? "rtl" : "ltr"}>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">{isRtl ? "الشكوى الرئيسية" : "Chief Complaint"}</Label>
              <Input
                value={medicalEditForm.chiefComplaint}
                onChange={(e) => setMedicalEditForm({ ...medicalEditForm, chiefComplaint: e.target.value })}
                placeholder={isRtl ? "مثال: ألم في الكتف" : "e.g. Shoulder pain"}
              />
            </div>

            {/* Diagnosis field with auto-highlight on pain map */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                {isRtl ? "التشخيص ومكان الألم" : "Diagnosis & Pain Location"}
              </Label>
              <Input
                value={medicalEditForm.diagnosis}
                onChange={(e) => {
                  const diagnosis = e.target.value;
                  setMedicalEditForm({ ...medicalEditForm, diagnosis });
                  syncMedicalEditPainMap(diagnosis);
                }}
                placeholder={isRtl ? "مثال: ألم في الركبة اليمنى" : "e.g. Right knee pain"}
                dir={isRtl ? "rtl" : "ltr"}
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRtl
                  ? "اكتب مكان الألم وستتلوّن المنطقة المقابلة تلقائياً في الخريطة"
                  : "Type the pain location and the corresponding region will highlight automatically on the map"}
              </p>
            </div>

            {/* Interactive Pain Map — auto-highlights as you type diagnosis */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2">
              <BodyPainMapper
                selectedRegions={medicalEditPainRegions}
                onChange={(regions) => {
                  setMedicalEditPainRegions(regions);
                  // Append newly clicked region name to the diagnosis field
                  const selectedIds = regions.filter((id) => !medicalEditPainRegions.includes(id));
                  const deselectedIds = medicalEditPainRegions.filter((id) => !regions.includes(id));
                  if (selectedIds.length > 0) {
                    const region = BODY_PAIN_REGIONS.find((r) => r.id === selectedIds[0]);
                    if (region) {
                      const name = isRtl ? region.nameAr : region.nameEn;
                      setMedicalEditForm((f) => {
                        const current = f.diagnosis.trim();
                        if (!current) return { ...f, diagnosis: name };
                        if (current.includes(name)) return f;
                        return { ...f, diagnosis: `${current}${isRtl ? "، " : ", "}${name}` };
                      });
                    }
                  }
                  if (deselectedIds.length > 0) {
                    const region = BODY_PAIN_REGIONS.find((r) => r.id === deselectedIds[0]);
                    if (region) {
                      const name = isRtl ? region.nameAr : region.nameEn;
                      setMedicalEditForm((f) => ({
                        ...f,
                        diagnosis: f.diagnosis
                          .split(/،|,/)
                          .map((p) => p.trim())
                          .filter((p) => p && p !== name)
                          .join(isRtl ? "، " : ", "),
                      }));
                    }
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">{isRtl ? "التاريخ المرضي" : "Medical History"}</Label>
                <Textarea
                  value={medicalEditForm.medicalHistory}
                  onChange={(e) => setMedicalEditForm({ ...medicalEditForm, medicalHistory: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">{isRtl ? "العمليات السابقة" : "Previous Surgeries"}</Label>
                <Textarea
                  value={medicalEditForm.pastSurgeries}
                  onChange={(e) => setMedicalEditForm({ ...medicalEditForm, pastSurgeries: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">{isRtl ? "الأمراض المزمنة" : "Chronic Diseases"}</Label>
                <Input
                  value={medicalEditForm.chronicDiseases}
                  onChange={(e) => setMedicalEditForm({ ...medicalEditForm, chronicDiseases: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">{isRtl ? "الأدوية الحالية" : "Current Medications"}</Label>
                <Input
                  value={medicalEditForm.currentMedications}
                  onChange={(e) => setMedicalEditForm({ ...medicalEditForm, currentMedications: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">{isRtl ? "الحساسية للأدوية" : "Drug Allergies"}</Label>
              <Input
                value={medicalEditForm.drugAllergies}
                onChange={(e) => setMedicalEditForm({ ...medicalEditForm, drugAllergies: e.target.value })}
                placeholder={isRtl ? "مثال: بنسلين" : "e.g. Penicillin"}
              />
            </div>
            <DialogFooter className={`pt-3 border-t mt-4 flex gap-2 ${isRtl ? "justify-end" : "justify-start flex-row-reverse"}`}>
              <Button type="button" variant="outline" onClick={() => setIsMedicalEditOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9]">{isRtl ? "حفظ الملف الطبي" : "Save Medical File"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
