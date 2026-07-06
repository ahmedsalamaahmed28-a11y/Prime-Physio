"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, AlertTriangle, Star, Activity, CheckCircle } from "lucide-react";

interface Patient {
  id: string;
  nameAr: string;
  nameEn: string;
  age: number;
}

// ─── Phase-Based Protocol Data ────────────────────────────────────────────────
type ProtocolPhase = {
  id: string;
  nameAr: string;
  nameEn: string;
  durationAr: string;
  durationEn: string;
  goalsAr: string[];
  goalsEn: string[];
  precautionsAr: string[];
  precautionsEn: string[];
  exercisesAr: string[];
  exercisesEn: string[];
  criteriaToProgressAr: string[];
  criteriaToProgressEn: string[];
};

type Protocol = {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  phases: ProtocolPhase[];
};

const PROTOCOLS_LIBRARY: Protocol[] = [
  {
    id: "acl_moon",
    nameAr: "بروتوكول MOON لإعادة بناء الرباط الصليبي (ACL)",
    nameEn: "MOON ACL Reconstruction Protocol",
    descriptionAr: "بروتوكول قياسي عالمي يركز على استعادة المدى الحركي مبكراً وتقوية العضلة الرباعية.",
    descriptionEn: "Standard evidence-based protocol focusing on early ROM and quad activation.",
    phases: [
      {
        id: "phase_1",
        nameAr: "المرحلة الأولى: حماية الأنسجة واستعادة المدى الحركي",
        nameEn: "Phase 1: Tissue Protection & Early ROM",
        durationAr: "الأسابيع 0 - 2",
        durationEn: "Weeks 0 - 2",
        goalsAr: [
          "حماية الرقعة (Graft)",
          "التحكم في التورم والألم",
          "استعادة فرد الركبة بالكامل (Full Extension)",
          "ثني الركبة حتى 90 درجة"
        ],
        goalsEn: [
          "Protect graft",
          "Control swelling and pain",
          "Restore full extension",
          "Flexion to 90 degrees"
        ],
        precautionsAr: [
          "تجنب الانقباض القوي جداً للعضلة الرباعية في الزوايا المفتوحة",
          "المشي بالعكازات مع تحميل جزئي للوزن حسب تعليمات الجراح"
        ],
        precautionsEn: [
          "Avoid forceful open chain quad extensions",
          "Use crutches, partial weight bearing as per surgeon"
        ],
        exercisesAr: [
          "Ankle Pumps (مضخات الكاحل)",
          "Quad Sets (انقباض العضلة الرباعية الثابت)",
          "Heel Slides (سحب الكعب لثني الركبة)",
          "Patellar Mobilization (تحريك الصابونة)"
        ],
        exercisesEn: [
          "Ankle Pumps",
          "Quad Sets",
          "Heel Slides",
          "Patellar Mobilization"
        ],
        criteriaToProgressAr: [
          "فرد الركبة بالكامل (0 درجة)",
          "ثني الركبة 90 درجة على الأقل",
          "القدرة على أداء SLR (رفع الساق مستقيمة) بدون Lag",
          "ألم بسيط جداً أو معدوم"
        ],
        criteriaToProgressEn: [
          "Full extension (0 degrees)",
          "Flexion to at least 90 degrees",
          "Good SLR without lag",
          "Minimal to no pain"
        ]
      },
      {
        id: "phase_2",
        nameAr: "المرحلة الثانية: تقوية العضلات والتحكم العصبي العضلي",
        nameEn: "Phase 2: Strengthening & Neuromuscular Control",
        durationAr: "الأسابيع 2 - 6",
        durationEn: "Weeks 2 - 6",
        goalsAr: [
          "استعادة المدى الحركي بالكامل (Full ROM)",
          "المشي الطبيعي بدون عكازات",
          "زيادة قوة العضلة الرباعية والخلفية"
        ],
        goalsEn: [
          "Restore full ROM",
          "Normal gait without crutches",
          "Increase quad and hamstring strength"
        ],
        precautionsAr: [
          "تجنب التمارين العنيفة التي تسبب تورماً",
          "تجنب الجري أو القفز"
        ],
        precautionsEn: [
          "Avoid forceful exercises causing swelling",
          "No running or jumping"
        ],
        exercisesAr: [
          "Mini Squats (قرفصاء جزئية 0-40 درجة)",
          "Step-ups (صعود الدرج للأمام وللجانب)",
          "Calf Raises (رفع الساق على المشط)",
          "Single Leg Balance (توازن على ساق واحدة)"
        ],
        exercisesEn: [
          "Mini Squats (0-40 deg)",
          "Step-ups (Forward/Lateral)",
          "Calf Raises",
          "Single Leg Balance"
        ],
        criteriaToProgressAr: [
          "مدى حركي كامل 0-130 درجة",
          "مشي طبيعي (Normal Gait)",
          "قوة العضلة الرباعية > 70% مقارنة بالجهة السليمة"
        ],
        criteriaToProgressEn: [
          "Full ROM 0-130 deg",
          "Normal Gait",
          "Quad strength > 70% of uninvolved side"
        ]
      },
      {
        id: "phase_3",
        nameAr: "المرحلة الثالثة: العودة للنشاط الرياضي المبدئي",
        nameEn: "Phase 3: Return to Basic Activity",
        durationAr: "الأسابيع 6 - 12",
        durationEn: "Weeks 6 - 12",
        goalsAr: [
          "بدء الركض الخفيف (Jogging)",
          "تحسين التوافق العضلي العصبي (Agility)",
          "استعادة 85% من القوة العضلية"
        ],
        goalsEn: [
          "Initiate jogging program",
          "Improve agility and proprioception",
          "Restore 85% muscle strength"
        ],
        precautionsAr: [
          "التوقف فوراً إذا ظهر ألم أو تورم أثناء الجري"
        ],
        precautionsEn: [
          "Stop immediately if pain or swelling occurs during running"
        ],
        exercisesAr: [
          "Lunges (الاندفاع للأمام وللجانب)",
          "Plyometrics خفيفة (قفز خفيف)",
          "الجري على سير متحرك (Treadmill Jogging)"
        ],
        exercisesEn: [
          "Lunges (Forward/Lateral)",
          "Light Plyometrics",
          "Treadmill Jogging"
        ],
        criteriaToProgressAr: [
          "اجتياز اختبارات القفز (Hop Tests) بنسبة > 85%",
          "لا يوجد تورم بعد التمارين المجهدة"
        ],
        criteriaToProgressEn: [
          "Hop tests > 85%",
          "No swelling after strenuous activities"
        ]
      }
    ]
  },
  {
    id: "lumbar_disc",
    nameAr: "بروتوكول الانزلاق الغضروفي القطني (ماكنزي)",
    nameEn: "Lumbar Disc Herniation (McKenzie)",
    descriptionAr: "بروتوكول يعتمد على التقييم الميكانيكي والتمارين المتكررة لتخفيف الضغط الغضروفي (Centralization).",
    descriptionEn: "MDT based protocol focusing on centralization of symptoms.",
    phases: [
      {
        id: "ld_phase_1",
        nameAr: "المرحلة الأولى: تخفيف الألم والمركزة",
        nameEn: "Phase 1: Pain Reduction & Centralization",
        durationAr: "الأسابيع 0 - 2",
        durationEn: "Weeks 0 - 2",
        goalsAr: [
          "تقليل الألم المنتشر (Radicular Pain)",
          "تحقيق مركزة الألم (Centralization)",
          "تحسين وضعية الجسم (Posture Correction)"
        ],
        goalsEn: [
          "Reduce radicular pain",
          "Achieve symptom centralization",
          "Improve posture"
        ],
        precautionsAr: [
          "تجنب الانثناء القطني (Lumbar Flexion) بشكل قاطع",
          "تجنب الجلوس لفترات طويلة"
        ],
        precautionsEn: [
          "Strictly avoid lumbar flexion",
          "Avoid prolonged sitting"
        ],
        exercisesAr: [
          "Prone Lying (الاستلقاء على البطن)",
          "Prone on Elbows (الاستناد على الكوعين)",
          "Extension in Lying (فرد الظهر من الانبطاح)",
          "Posture Correction in Sitting"
        ],
        exercisesEn: [
          "Prone Lying",
          "Prone on Elbows",
          "Extension in Lying",
          "Posture Correction in Sitting"
        ],
        criteriaToProgressAr: [
          "اختفاء الألم المنتشر للساق (Centralization)",
          "تحسن ملحوظ في مدى حركة فرد الظهر",
          "القدرة على الجلوس بوضعية صحيحة بدون ألم لـ 30 دقيقة"
        ],
        criteriaToProgressEn: [
          "Abolition of leg symptoms",
          "Significant improvement in extension ROM",
          "Ability to sit with good posture pain-free"
        ]
      },
      {
        id: "ld_phase_2",
        nameAr: "المرحلة الثانية: استعادة الحركة والتقوية الأولية",
        nameEn: "Phase 2: Mobility Restoration & Early Strengthening",
        durationAr: "الأسابيع 2 - 4",
        durationEn: "Weeks 2 - 4",
        goalsAr: [
          "استعادة المدى الحركي الطبيعي تدريجياً",
          "بدء تقوية عضلات الجذع (Core Stability)"
        ],
        goalsEn: [
          "Gradually restore normal ROM",
          "Initiate core stability training"
        ],
        precautionsAr: [
          "إدخال حركات الانثناء بحذر شديد",
          "تجنب حمل الأوزان الثقيلة"
        ],
        precautionsEn: [
          "Introduce flexion movements with extreme caution",
          "Avoid heavy lifting"
        ],
        exercisesAr: [
          "Bird-Dog (توازن الأطراف)",
          "Pelvic Tilts (إمالة الحوض)",
          "Plank from Knees (لوح الارتكاز)"
        ],
        exercisesEn: [
          "Bird-Dog",
          "Pelvic Tilts",
          "Plank from Knees"
        ],
        criteriaToProgressAr: [
          "لا يوجد ألم محيطي بعد التمارين",
          "قدرة على تثبيت الجذع أثناء التمارين"
        ],
        criteriaToProgressEn: [
          "No peripheralization with new exercises",
          "Good core stability control"
        ]
      }
    ]
  },
  {
    id: "frozen_shoulder",
    nameAr: "بروتوكول الكتف المتجمد (Adhesive Capsulitis)",
    nameEn: "Frozen Shoulder Protocol",
    descriptionAr: "بروتوكول للتعامل مع مراحل الكتف المتجمد المختلفة: التجميد، التجمد، والذوبان.",
    descriptionEn: "Protocol managing stages of frozen shoulder: Freezing, Frozen, Thawing.",
    phases: [
      {
        id: "fs_phase_1",
        nameAr: "المرحلة الأولى: الألم (Freezing) - تقليل الالتهاب",
        nameEn: "Phase 1: Freezing - Pain Control",
        durationAr: "الأشهر 0 - 3",
        durationEn: "Months 0 - 3",
        goalsAr: [
          "تقليل الألم والالتهاب",
          "الحفاظ على ما يمكن من المدى الحركي",
          "منع التيبس التام"
        ],
        goalsEn: [
          "Reduce pain and inflammation",
          "Maintain available ROM",
          "Prevent complete stiffness"
        ],
        precautionsAr: [
          "تجنب تمطيط الأنسجة بقوة",
          "تجنب الحركات التي تزيد الألم الحاد"
        ],
        precautionsEn: [
          "No aggressive stretching",
          "Avoid movements provoking sharp pain"
        ],
        exercisesAr: [
          "Pendulum Exercises (تمارين البندول)",
          "Passive ROM (تحريك المفصل سلبياً)",
          "Scapular Retractions (ضم لوحي الكتف)"
        ],
        exercisesEn: [
          "Pendulum Exercises",
          "Pain-free Passive ROM",
          "Scapular Retractions"
        ],
        criteriaToProgressAr: [
          "انخفاض مستوى الألم أثناء الراحة",
          "استقرار المدى الحركي وعدم نقصانه السريع"
        ],
        criteriaToProgressEn: [
          "Decreased resting pain",
          "Stabilization of ROM loss"
        ]
      },
      {
        id: "fs_phase_2",
        nameAr: "المرحلة الثانية: التيبس (Frozen) - استعادة المدى الحركي",
        nameEn: "Phase 2: Frozen - ROM Restoration",
        durationAr: "الأشهر 4 - 9",
        durationEn: "Months 4 - 9",
        goalsAr: [
          "زيادة المدى الحركي بجميع الاتجاهات",
          "تقليل قصر المحفظة المفصلية",
          "تحسين الميكانيكا الحيوية للكتف"
        ],
        goalsEn: [
          "Increase ROM in all planes",
          "Decrease capsular contracture",
          "Improve shoulder biomechanics"
        ],
        precautionsAr: [
          "التمدد يجب أن يكون ضمن نطاق التحمل",
          "تجنب الإجهاد الزائد للعضلات الدوارة"
        ],
        precautionsEn: [
          "Stretching should be tolerable",
          "Avoid overstressing rotator cuff"
        ],
        exercisesAr: [
          "Wall Crawl (تسلق الجدار بالأصابع)",
          "Towel Stretch (تمطيط بالمنشفة)",
          "Wand Exercises (تمارين العصا)"
        ],
        exercisesEn: [
          "Wall Crawl",
          "Towel Stretch for IR",
          "Wand / Cane Exercises"
        ],
        criteriaToProgressAr: [
          "تحسن كبير في المدى الحركي",
          "القدرة على أداء المهام اليومية بألم خفيف"
        ],
        criteriaToProgressEn: [
          "Significant ROM improvement",
          "ADLs performed with minimal pain"
        ]
      }
    ]
  },
  {
    id: "tkr_protocol",
    nameAr: "بروتوكول التأهيل بعد تغيير مفصل الركبة (TKR)",
    nameEn: "Total Knee Replacement (TKR) Protocol",
    descriptionAr: "يركز هذا البروتوكول على تقليل التورم واستعادة الحركة الطبيعية مبكراً وخاصة الفرد الكامل للركبة.",
    descriptionEn: "Focuses on early mobilization, swelling reduction, and achieving full knee extension.",
    phases: [
      {
        id: "tkr_phase_1",
        nameAr: "المرحلة الأولى: الحركة المبكرة وتقليل التورم",
        nameEn: "Phase 1: Early Mobility & Swelling Control",
        durationAr: "الأسابيع 0 - 3",
        durationEn: "Weeks 0 - 3",
        goalsAr: [
          "تحقيق فرد الركبة بالكامل (0 درجة)",
          "ثني الركبة حتى 90 درجة",
          "تقليل التورم والألم"
        ],
        goalsEn: [
          "Achieve full knee extension (0 deg)",
          "Knee flexion to 90 deg",
          "Reduce swelling and pain"
        ],
        precautionsAr: [
          "تجنب وضع مخدة تحت الركبة (لتفادي قصر العضلات الخلفية)",
          "الاعتماد على المشاية أو العكازات حسب تحمل الألم"
        ],
        precautionsEn: [
          "Avoid placing pillow under knee",
          "Use walker/crutches as tolerated"
        ],
        exercisesAr: [
          "Ankle Pumps (مضخات الكاحل)",
          "Quad Sets (انقباض العضلة الرباعية)",
          "Heel Slides (سحب الكعب لثني الركبة)",
          "Passive Knee Extension (الفرد السلبي للركبة)"
        ],
        exercisesEn: [
          "Ankle Pumps",
          "Quad Sets",
          "Heel Slides",
          "Passive Knee Extension"
        ],
        criteriaToProgressAr: [
          "فرد الركبة بالكامل 0 درجة",
          "ثني الركبة 90 درجة على الأقل",
          "القدرة على رفع الساق ممدودة (SLR) بدون تأخير"
        ],
        criteriaToProgressEn: [
          "Full extension 0 deg",
          "Flexion to at least 90 deg",
          "Good SLR without lag"
        ]
      },
      {
        id: "tkr_phase_2",
        nameAr: "المرحلة الثانية: التقوية والمشي الطبيعي",
        nameEn: "Phase 2: Strengthening & Normal Gait",
        durationAr: "الأسابيع 4 - 8",
        durationEn: "Weeks 4 - 8",
        goalsAr: [
          "زيادة الثني إلى 115 درجة",
          "المشي بدون وسائل مساعدة",
          "زيادة قوة العضلات المحيطة بالركبة"
        ],
        goalsEn: [
          "Increase flexion to 115 deg",
          "Ambulate without assistive devices",
          "Increase knee muscle strength"
        ],
        precautionsAr: [
          "تجنب الرياضات العنيفة أو الجري",
          "تجنب الحركات المفاجئة والالتوائية"
        ],
        precautionsEn: [
          "Avoid high impact sports or running",
          "Avoid sudden twisting movements"
        ],
        exercisesAr: [
          "Mini Squats (قرفصاء جزئية)",
          "Step-ups (صعود الدرج)",
          "Stationary Bike (الدراجة الثابتة)",
          "Wall Slides (انزلاق الحائط)"
        ],
        exercisesEn: [
          "Mini Squats",
          "Step-ups",
          "Stationary Bike",
          "Wall Slides"
        ],
        criteriaToProgressAr: [
          "مشي طبيعي خالي من العرج",
          "قدرة جيدة على التوازن على قدم واحدة",
          "ثني الركبة > 110 درجة"
        ],
        criteriaToProgressEn: [
          "Normal uncompensated gait",
          "Good single leg balance",
          "Knee flexion > 110 deg"
        ]
      }
    ]
  },
  {
    id: "achilles_repair",
    nameAr: "بروتوكول التأهيل بعد خياطة وتر أخيل",
    nameEn: "Achilles Tendon Repair Protocol",
    descriptionAr: "التأهيل التدريجي لوتر أخيل مع التركيز على حماية الخياطة واستعادة مرونة وقوة الوتر ببطء.",
    descriptionEn: "Gradual rehab focusing on graft protection and slow restoration of tendon flexibility and strength.",
    phases: [
      {
        id: "achilles_phase_1",
        nameAr: "المرحلة الأولى: حماية الوتر",
        nameEn: "Phase 1: Tendon Protection",
        durationAr: "الأسابيع 0 - 4",
        durationEn: "Weeks 0 - 4",
        goalsAr: [
          "حماية مكان الجراحة",
          "السيطرة التامة على التورم"
        ],
        goalsEn: [
          "Protect surgical site",
          "Complete control of swelling"
        ],
        precautionsAr: [
          "تجنب التمدد القوي للوتر (Dorsiflexion) نهائياً",
          "لبس الحذاء الطبي (CAM boot) مع استخدام أسافين للكعب"
        ],
        precautionsEn: [
          "Strictly avoid passive dorsiflexion",
          "Wear CAM boot with heel wedges"
        ],
        exercisesAr: [
          "حركات خفيفة للأصابع",
          "انقباض ثابت خفيف لعضلات الساق",
          "تقوية عضلات الحوض والركبة (بدون تحميل على الكاحل)"
        ],
        exercisesEn: [
          "Gentle toe movements",
          "Sub-maximal isometric calf contractions",
          "Hip and knee strengthening (NWB)"
        ],
        criteriaToProgressAr: [
          "التئام الجرح بشكل سليم",
          "لا يوجد ألم أثناء الراحة"
        ],
        criteriaToProgressEn: [
          "Proper wound healing",
          "No resting pain"
        ]
      },
      {
        id: "achilles_phase_2",
        nameAr: "المرحلة الثانية: الحركة التدريجية",
        nameEn: "Phase 2: Gradual Mobilization",
        durationAr: "الأسابيع 4 - 8",
        durationEn: "Weeks 4 - 8",
        goalsAr: [
          "استعادة الحركة للدرجة الصفرية (Neutral)",
          "التحميل الجزئي إلى الكامل للوزن بوجود الحذاء الطبي"
        ],
        goalsEn: [
          "Restore neutral dorsiflexion",
          "Partial to full weight bearing in CAM boot"
        ],
        precautionsAr: [
          "إزالة أسافين الكعب تدريجياً حسب توجيهات الطبيب",
          "لا تزال حركات التمدد العنيف ممنوعة"
        ],
        precautionsEn: [
          "Gradually remove heel wedges per MD protocol",
          "Aggressive stretching still contraindicated"
        ],
        exercisesAr: [
          "حركة الكاحل الإيجابية (Active ROM)",
          "استخدام الدراجة الثابتة (بكعب القدم وليس المشط)",
          "تمارين التوازن الخفيفة داخل الحذاء الطبي"
        ],
        exercisesEn: [
          "Active ROM ankle",
          "Stationary bike (pedal with heel)",
          "Light balance exercises in boot"
        ],
        criteriaToProgressAr: [
          "المشي بوزن كامل داخل الحذاء الطبي بدون ألم",
          "مدى حركي للكاحل يصل للصفر درجة"
        ],
        criteriaToProgressEn: [
          "Full WB in boot pain-free",
          "Ankle ROM reaches neutral"
        ]
      }
    ]
  },
  {
    id: "tennis_elbow",
    nameAr: "بروتوكول مرفق التنس (Lateral Epicondylitis)",
    nameEn: "Tennis Elbow Protocol",
    descriptionAr: "يعتمد هذا البروتوكول على التمارين اللامركزية (Eccentric) لتخفيف الألم وتحسين قوة أوتار الكوع.",
    descriptionEn: "Relies heavily on eccentric exercises to reduce pain and improve tendon capacity.",
    phases: [
      {
        id: "te_phase_1",
        nameAr: "المرحلة الأولى: تخفيف الألم",
        nameEn: "Phase 1: Pain Relief",
        durationAr: "الأسابيع 0 - 2",
        durationEn: "Weeks 0 - 2",
        goalsAr: [
          "تخفيف ألم منطقة اللقيمة الجانبية",
          "تقليل الالتهاب"
        ],
        goalsEn: [
          "Relieve pain at lateral epicondyle",
          "Reduce inflammation"
        ],
        precautionsAr: [
          "تجنب الحركات المتكررة التي تسبب الألم (مثل الإمساك بقوة)",
          "تجنب حمل الأشياء وراحة اليد متجهة للأسفل (Pronation)"
        ],
        precautionsEn: [
          "Avoid repetitive pain-provoking gripping",
          "Avoid lifting objects with forearm pronated"
        ],
        exercisesAr: [
          "تمطيط لطيف لعضلات الساعد الخلفية",
          "انقباض ثابت خفيف (Isometric Extension)",
          "استخدام دعامة المرفق عند الحاجة"
        ],
        exercisesEn: [
          "Gentle Wrist Extensor Stretch",
          "Isometric Extension",
          "Use of counterforce brace"
        ],
        criteriaToProgressAr: [
          "انخفاض ملحوظ في ألم الـ Isometric",
          "القدرة على التمطيط بدون ألم حاد"
        ],
        criteriaToProgressEn: [
          "Significant reduction in isometric pain",
          "Ability to stretch without sharp pain"
        ]
      },
      {
        id: "te_phase_2",
        nameAr: "المرحلة الثانية: التقوية اللامركزية (Eccentric)",
        nameEn: "Phase 2: Eccentric Strengthening",
        durationAr: "الأسابيع 2 - 6",
        durationEn: "Weeks 2 - 6",
        goalsAr: [
          "إعادة بناء مرونة وقوة الوتر",
          "تحسين قوة القبضة"
        ],
        goalsEn: [
          "Rebuild tendon capacity",
          "Improve grip strength"
        ],
        precautionsAr: [
          "ألم عضلي بسيط مقبول، لكن ألم المرفق الحاد غير مقبول",
          "التقدم بالأوزان يجب أن يكون بطيئاً جداً"
        ],
        precautionsEn: [
          "Mild muscle soreness acceptable, sharp joint pain is not",
          "Progression of weights must be very slow"
        ],
        exercisesAr: [
          "تمرين الإطالة اللامركزي باستخدام وزن خفيف أو FlexBar",
          "تقوية عضلات الكف والأصابع",
          "تقوية عضلات الكتف والظهر"
        ],
        exercisesEn: [
          "Eccentric Wrist Extension (Tyler Twist)",
          "Grip and finger strengthening",
          "Scapular and shoulder strengthening"
        ],
        criteriaToProgressAr: [
          "القدرة على حمل الأوزان الثقيلة بدون ألم",
          "قوة قبضة متساوية مع اليد السليمة"
        ],
        criteriaToProgressEn: [
          "Ability to lift heavier loads pain-free",
          "Grip strength equal to uninvolved side"
        ]
      }
    ]
  },
  {
    id: "plantar_fasciitis",
    nameAr: "بروتوكول التهاب اللفافة الأخمصية (Plantar Fasciitis)",
    nameEn: "Plantar Fasciitis Protocol",
    descriptionAr: "يركز على تقليل ألم الكعب الصباحي، وإطالة اللفافة ووتر أخيل، وتقوية عضلات القدم الداخلية.",
    descriptionEn: "Focuses on reducing morning heel pain, stretching the fascia and Achilles, and intrinsic foot strengthening.",
    phases: [
      {
        id: "pf_phase_1",
        nameAr: "المرحلة الأولى: تخفيف الألم الحاد",
        nameEn: "Phase 1: Acute Pain Relief",
        durationAr: "الأسابيع 0 - 2",
        durationEn: "Weeks 0 - 2",
        goalsAr: [
          "تقليل ألم الخطوة الأولى في الصباح",
          "تقليل الالتهاب الموضعي",
          "تخفيف الضغط عن الكعب"
        ],
        goalsEn: [
          "Reduce first-step morning pain",
          "Decrease local inflammation",
          "Offload the heel"
        ],
        precautionsAr: [
          "تجنب المشي حافي القدمين تماماً",
          "تجنب الوقوف لفترات طويلة أو الجري"
        ],
        precautionsEn: [
          "Strictly avoid barefoot walking",
          "Avoid prolonged standing or running"
        ],
        exercisesAr: [
          "دحرجة زجاجة ماء مثلجة تحت القدم (Ice Bottle Roll)",
          "إطالة اللفافة الأخمصية يدوياً قبل النهوض من السرير",
          "إطالة بطة الساق (Calf Stretch) بالمنشفة"
        ],
        exercisesEn: [
          "Ice Bottle Roll under foot",
          "Manual Plantar Fascia stretch before getting out of bed",
          "Towel Calf Stretch"
        ],
        criteriaToProgressAr: [
          "انخفاض ملحوظ في الألم الصباحي",
          "تحمل الوقوف والمشي العادي بألم خفيف ومقبول"
        ],
        criteriaToProgressEn: [
          "Significant reduction in morning pain",
          "Tolerance to normal walking with minimal pain"
        ]
      },
      {
        id: "pf_phase_2",
        nameAr: "المرحلة الثانية: التقوية وإعادة التأهيل",
        nameEn: "Phase 2: Strengthening & Rehab",
        durationAr: "الأسابيع 2 - 6",
        durationEn: "Weeks 2 - 6",
        goalsAr: [
          "زيادة قوة عضلات القدم الداخلية (Intrinsic muscles)",
          "تحسين تحمل وتر أخيل واللفافة للأحمال",
          "العودة التدريجية للنشاط الطبيعي"
        ],
        goalsEn: [
          "Increase intrinsic foot muscle strength",
          "Improve tissue load tolerance",
          "Gradual return to normal activity"
        ],
        precautionsAr: [
          "زيادة الأحمال التدريجية وتجنب القفز المفاجئ",
          "يجب ارتداء أحذية داعمة أثناء التمارين"
        ],
        precautionsEn: [
          "Progressive loading, avoid sudden jumping",
          "Wear supportive footwear during exercises"
        ],
        exercisesAr: [
          "تجعيد المنشفة بأصابع القدم (Towel Curls)",
          "الرفع على الأمشاط مع وضع منشفة ملفوفة تحت الأصابع (Fasciitis Calf Raises)",
          "التقاط الأشياء الصغيرة بأصابع القدم (Marble Pick-up)",
          "تمارين التوازن على قدم واحدة"
        ],
        exercisesEn: [
          "Towel Curls with toes",
          "Fasciitis Calf Raises (with towel roll under toes)",
          "Marble Pick-up",
          "Single leg balance exercises"
        ],
        criteriaToProgressAr: [
          "المشي واداء المهام اليومية بدون ألم",
          "القدرة على أداء رفع الأمشاط بقدم واحدة بدون ألم"
        ],
        criteriaToProgressEn: [
          "Pain-free normal ADLs",
          "Pain-free single leg calf raises"
        ]
      }
    ]
  },
  {
    id: "carpal_tunnel",
    nameAr: "بروتوكول متلازمة النفق الرسغي (Carpal Tunnel)",
    nameEn: "Carpal Tunnel Syndrome Protocol",
    descriptionAr: "التأهيل التحفظي أو ما بعد الجراحة لمتلازمة النفق الرسغي لتحرير العصب المتوسط وتقوية اليد.",
    descriptionEn: "Conservative or post-op rehab for CTS focusing on median nerve gliding and hand strengthening.",
    phases: [
      {
        id: "cts_phase_1",
        nameAr: "المرحلة الأولى: تخفيف الضغط وتحرير العصب",
        nameEn: "Phase 1: Decompression & Nerve Gliding",
        durationAr: "الأسابيع 0 - 3",
        durationEn: "Weeks 0 - 3",
        goalsAr: [
          "تقليل التنميل والألم الليلي",
          "الحفاظ على حركة الأصابع والرسغ",
          "تحسين الانزلاق العصبي للعصب المتوسط"
        ],
        goalsEn: [
          "Reduce numbness and night pain",
          "Maintain finger/wrist mobility",
          "Improve median nerve gliding"
        ],
        precautionsAr: [
          "تجنب ثني الرسغ القوي لفترات طويلة",
          "ارتداء الجبيرة (Splint) أثناء الليل أو أثناء الأنشطة المجهدة"
        ],
        precautionsEn: [
          "Avoid sustained forceful wrist flexion",
          "Wear night splint or during provocative activities"
        ],
        exercisesAr: [
          "تمارين انزلاق العصب المتوسط (Median Nerve Gliding)",
          "تمارين انزلاق الأوتار (Tendon Gliding)",
          "حركات خفيفة ومستمرة للرسغ والأصابع (Active ROM)"
        ],
        exercisesEn: [
          "Median Nerve Glides",
          "Tendon Gliding exercises",
          "Active ROM for wrist and digits"
        ],
        criteriaToProgressAr: [
          "انخفاض ملحوظ في التنميل والأعراض الليلية",
          "مدى حركي كامل وخالٍ من الألم للأصابع والرسغ"
        ],
        criteriaToProgressEn: [
          "Significant reduction in numbness/night symptoms",
          "Full pain-free active ROM of digits and wrist"
        ]
      },
      {
        id: "cts_phase_2",
        nameAr: "المرحلة الثانية: التقوية واستعادة الوظيفة",
        nameEn: "Phase 2: Strengthening & Functional Return",
        durationAr: "الأسابيع 3 - 6",
        durationEn: "Weeks 3 - 6",
        goalsAr: [
          "استعادة قوة القبضة (Grip Strength)",
          "استعادة قوة الأصابع الدقيقة (Pinch Strength)",
          "العودة للعمل والأنشطة اليومية الكاملة"
        ],
        goalsEn: [
          "Restore grip strength",
          "Restore pinch strength",
          "Return to full work and ADLs"
        ],
        precautionsAr: [
          "تجنب الأدوات الاهتزازية (Vibrating tools) في البداية",
          "الاهتمام ببيئة العمل (Ergonomics) وضعية لوحة المفاتيح"
        ],
        precautionsEn: [
          "Avoid vibrating tools initially",
          "Address workstation ergonomics"
        ],
        exercisesAr: [
          "تمارين الضغط على كرة إسفنجية للقبضة",
          "تمارين استخدام المعجون الطبي (Theraputty)",
          "تقوية عضلات الساعد (Wrist Flexion/Extension) بأوزان خفيفة"
        ],
        exercisesEn: [
          "Sponge ball grip squeezing",
          "Theraputty exercises for pinch/grip",
          "Light resisted wrist flexion/extension"
        ],
        criteriaToProgressAr: [
          "قوة قبضة طبيعية مقارنة باليد الأخرى",
          "لا يوجد ألم أو تنميل مع المهام المجهدة"
        ],
        criteriaToProgressEn: [
          "Normal grip strength symmetrical to uninvolved side",
          "No pain or numbness with strenuous tasks"
        ]
      }
    ]
  },
  {
    id: "rtc_repair",
    nameAr: "بروتوكول التأهيل بعد إصلاح الكفة المدورة (Rotator Cuff Repair)",
    nameEn: "Rotator Cuff Repair Protocol",
    descriptionAr: "تأهيل جراحي دقيق يركز على حماية الوتر المُصلح أولاً، ثم استعادة الحركة، ثم التقوية.",
    descriptionEn: "Precise post-op rehab focusing on graft protection, followed by ROM, and finally strengthening.",
    phases: [
      {
        id: "rtc_phase_1",
        nameAr: "المرحلة الأولى: الحماية التامة والحركة السلبية",
        nameEn: "Phase 1: Maximum Protection & PROM",
        durationAr: "الأسابيع 0 - 4",
        durationEn: "Weeks 0 - 4",
        goalsAr: [
          "حماية مكان العملية (الوتر المُصلح)",
          "تقليل الألم والتورم",
          "الحفاظ على حركة المفاصل المجاورة (الكوع، الرسغ، الرقبة)"
        ],
        goalsEn: [
          "Protect surgical repair",
          "Decrease pain and swelling",
          "Maintain ROM of adjacent joints (elbow, wrist, cervical)"
        ],
        precautionsAr: [
          "ارتداء الحمالة (Sling) طوال الوقت حسب تعليمات الجراح",
          "ممنوع الحركة الإيجابية (Active ROM) للكتف تماماً",
          "ممنوع رفع الأشياء أو دعم وزن الجسم على الذراع"
        ],
        precautionsEn: [
          "Wear sling at all times per MD orders",
          "NO Active ROM of the shoulder",
          "No lifting or supporting body weight"
        ],
        exercisesAr: [
          "تمارين البندول (Pendulum) السلبية تماماً",
          "حركة سلبية للكتف بواسطة المعالج (PROM) في الحدود المسموحة",
          "حركة إيجابية للكوع والرسغ والأصابع"
        ],
        exercisesEn: [
          "Completely passive Pendulum exercises",
          "Therapist-assisted PROM within limits",
          "Active ROM for elbow, wrist, and hand"
        ],
        criteriaToProgressAr: [
          "التئام الجرح بصورة جيدة",
          "الوصول للمدى الحركي السلبي المستهدف للمرحلة (مثال: رفع 90 درجة)"
        ],
        criteriaToProgressEn: [
          "Good wound healing",
          "Achieved target PROM for the phase"
        ]
      },
      {
        id: "rtc_phase_2",
        nameAr: "المرحلة الثانية: الحركة الإيجابية المساعدة (AAROM)",
        nameEn: "Phase 2: Active-Assisted ROM (AAROM)",
        durationAr: "الأسابيع 4 - 8",
        durationEn: "Weeks 4 - 8",
        goalsAr: [
          "التخلي التدريجي عن الحمالة (Sling)",
          "الوصول لمدى حركي إيجابي مساعد كامل أو شبه كامل",
          "بدء تشغيل عضلات الكتف بخفة"
        ],
        goalsEn: [
          "Wean from sling",
          "Achieve full or near-full AAROM",
          "Initiate gentle shoulder muscle activation"
        ],
        precautionsAr: [
          "لا يوجد رفع للأوزان حتى الآن",
          "تجنب الحركات المفاجئة السريعة",
          "تجنب التمدد القوي خلف الظهر"
        ],
        precautionsEn: [
          "No heavy lifting or resistance yet",
          "Avoid sudden jerky movements",
          "Avoid forceful stretching behind back (IR)"
        ],
        exercisesAr: [
          "تمارين العصا المساعدة (Wand Exercises)",
          "تمارين البكرة (Pulleys) ضمن نطاق خالي من الألم",
          "انقباض ثابت خفيف للكتف (Sub-maximal Isometrics)"
        ],
        exercisesEn: [
          "Wand/Cane exercises (AAROM)",
          "Pulleys within pain-free range",
          "Sub-maximal shoulder isometrics"
        ],
        criteriaToProgressAr: [
          "مدى حركي سلبي كامل بدون ألم",
          "القدرة على رفع الذراع (AAROM) بآلية صحيحة بدون تعويض من الرقبة"
        ],
        criteriaToProgressEn: [
          "Full pain-free PROM",
          "Good AAROM mechanics without shoulder shrugging"
        ]
      },
      {
        id: "rtc_phase_3",
        nameAr: "المرحلة الثالثة: التقوية المبكرة",
        nameEn: "Phase 3: Early Strengthening",
        durationAr: "الأسابيع 8 - 12",
        durationEn: "Weeks 8 - 12",
        goalsAr: [
          "استعادة المدى الحركي الإيجابي (AROM) الكامل",
          "تقوية عضلات الكفة المدورة ولوح الكتف بشكل ديناميكي",
          "العودة للمهام اليومية الأساسية"
        ],
        goalsEn: [
          "Restore full AROM",
          "Dynamic strengthening of RTC and scapular stabilizers",
          "Return to basic ADLs"
        ],
        precautionsAr: [
          "تجنب حمل الأوزان الثقيلة جداً أو بعيداً عن الجسم",
          "التقدم بالأوزان يجب أن يسبقه إتقان الحركة بشكل صحيح"
        ],
        precautionsEn: [
          "Avoid heavy lifting away from body",
          "Perfect mechanics required before adding resistance"
        ],
        exercisesAr: [
          "تمارين الحبل المطاطي (Theraband) الخفيفة للداخل والخارج",
          "رفع الأوزان الخفيفة في مستوى لوح الكتف (Scaption)",
          "تقوية عضلات الظهر السفلية للكتف (Rowing)"
        ],
        exercisesEn: [
          "Light Theraband IR/ER",
          "Scaption with light weights",
          "Seated rows for scapular retraction"
        ],
        criteriaToProgressAr: [
          "مدى حركي إيجابي (AROM) كامل بدون ألم",
          "قوة عضلية تصل لـ 4/5"
        ],
        criteriaToProgressEn: [
          "Full pain-free AROM",
          "Muscle strength at least 4/5"
        ]
      }
    ]
  },
  {
    id: "cervical_radiculopathy",
    nameAr: "بروتوكول اعتلال الجذور العنقية (Cervical Radiculopathy)",
    nameEn: "Cervical Radiculopathy Protocol",
    descriptionAr: "يركز على تقليل الضغط على جذور الأعصاب العنقية، مركزة الألم، وتقوية عضلات العنق العميقة.",
    descriptionEn: "Focuses on cervical nerve root decompression, symptom centralization, and deep neck flexor strengthening.",
    phases: [
      {
        id: "cr_phase_1",
        nameAr: "المرحلة الأولى: تخفيف الألم وتقليل الضغط",
        nameEn: "Phase 1: Pain Relief & Decompression",
        durationAr: "الأسابيع 0 - 3",
        durationEn: "Weeks 0 - 3",
        goalsAr: [
          "تقليل الألم المنتشر للذراع (Radicular Pain)",
          "تقليل شد عضلات الرقبة والكتف",
          "تحسين وضعية الرأس (Posture)"
        ],
        goalsEn: [
          "Reduce arm radicular pain",
          "Decrease cervical/upper trap muscle spasm",
          "Improve head posture"
        ],
        precautionsAr: [
          "تجنب الحركات التي تزيد الألم المنتشر (Peripheralization)",
          "تجنب التمدد القوي للرقبة في البداية"
        ],
        precautionsEn: [
          "Avoid movements causing peripheralization",
          "Avoid aggressive neck stretching initially"
        ],
        exercisesAr: [
          "السحب العنقي (Cervical Traction) يدوي أو آلي",
          "تمارين الانكماش العنقي (Chin Tucks)",
          "تحريك العصب (Nerve Gliding) الخفيف جداً إذا لم يزد الألم"
        ],
        exercisesEn: [
          "Cervical Traction (Manual or Mechanical)",
          "Chin Tucks (Cervical Retraction)",
          "Gentle upper limb nerve glides (if tolerated)"
        ],
        criteriaToProgressAr: [
          "تراجع الألم المنتشر للذراع (Centralization)",
          "تحسن القدرة على تحريك الرقبة بدون ألم حاد"
        ],
        criteriaToProgressEn: [
          "Centralization of arm pain",
          "Improved pain-free cervical ROM"
        ]
      },
      {
        id: "cr_phase_2",
        nameAr: "المرحلة الثانية: استعادة الحركة والتقوية العميقة",
        nameEn: "Phase 2: Mobility & Deep Neck Flexor Strengthening",
        durationAr: "الأسابيع 3 - 6",
        durationEn: "Weeks 3 - 6",
        goalsAr: [
          "استعادة مدى الحركة العنقي الكامل",
          "تقوية عضلات الرقبة العميقة (Deep Neck Flexors)",
          "تقوية عضلات لوح الكتف لتثبيت القوام"
        ],
        goalsEn: [
          "Restore full cervical ROM",
          "Strengthen Deep Neck Flexors (DNF)",
          "Strengthen scapular stabilizers for posture"
        ],
        precautionsAr: [
          "التأكد من عدم عودة الألم المنتشر للذراع مع التمارين الجديدة",
          "تجنب إرهاق عضلات الرقبة وتشنجها"
        ],
        precautionsEn: [
          "Ensure no return of radicular symptoms with exercises",
          "Avoid fatiguing neck muscles into spasm"
        ],
        exercisesAr: [
          "تمارين الانكماش العنقي مع رفع الرأس من الاستلقاء",
          "تقوية الرقبة متساوية القياس (Cervical Isometrics) في جميع الاتجاهات",
          "تمارين تقوية الظهر العلوي (Prone Ts, Ys)"
        ],
        exercisesEn: [
          "Chin tucks with head lift (DNF training)",
          "Cervical Isometrics (all planes)",
          "Upper back strengthening (Prone Ts, Ys)"
        ],
        criteriaToProgressAr: [
          "لا يوجد ألم منتشر للذراع نهائياً",
          "قوة طبيعية لعضلات الرقبة العميقة",
          "الحفاظ على وضعية الرأس السليمة أثناء العمل"
        ],
        criteriaToProgressEn: [
          "No radicular arm pain present",
          "Normal Deep Neck Flexor endurance",
          "Maintains proper head posture during work"
        ]
      }
    ]
  },
  {
    id: "ped_cp_spastic",
    nameAr: "تأهيل الأطفال: الشلل الدماغي التشنجي (CP Spastic Diplegia)",
    nameEn: "Pediatrics: CP Spastic Diplegia",
    descriptionAr: "بروتوكول لتقليل الشد العضلي، تحسين التوازن، وتطوير المهارات الحركية الكبرى للطفل.",
    descriptionEn: "Protocol to reduce spasticity, improve balance, and develop gross motor skills in children.",
    phases: [
      {
        id: "cp_phase_1",
        nameAr: "المرحلة الأولى: تقليل الشد والتحكم الوضعي",
        nameEn: "Phase 1: Tone Reduction & Postural Control",
        durationAr: "مستمر (شهور 1 - 3)",
        durationEn: "Ongoing (Months 1 - 3)",
        goalsAr: [
          "تقليل التشنج في عضلات الساقين (Adductors & Calf)",
          "تحسين التحكم في الرأس والجذع",
          "منع التشوهات المفصلية"
        ],
        goalsEn: [
          "Reduce spasticity in lower extremities",
          "Improve head and trunk control",
          "Prevent joint contractures"
        ],
        precautionsAr: [
          "تجنب إثارة ردود الفعل الانعكاسية المرضية (Pathological Reflexes)",
          "التعامل بلطف لعدم إخافة الطفل وزيادة التوتر"
        ],
        precautionsEn: [
          "Avoid triggering pathological reflexes",
          "Gentle handling to prevent increased tone from distress"
        ],
        exercisesAr: [
          "إطالة لطيفة ومستمرة للعضلات الضامة وبطة الساق",
          "تحفيز التوازن على الكرة العلاجية (Physioball)",
          "الجلوس المائل المدعوم لتقوية الرقبة والجذع"
        ],
        exercisesEn: [
          "Prolonged gentle stretching of adductors and plantarflexors",
          "Vestibular stimulation on physioball",
          "Supported inclined sitting for core/neck"
        ],
        criteriaToProgressAr: [
          "انخفاض ملحوظ في درجة الشد (Ashworth Scale)",
          "قدرة الطفل على تثبيت رأسه مستقلاً لـ 30 ثانية"
        ],
        criteriaToProgressEn: [
          "Decreased Modified Ashworth Scale score",
          "Independent head control for 30 seconds"
        ]
      },
      {
        id: "cp_phase_2",
        nameAr: "المرحلة الثانية: التطور الحركي والمشي",
        nameEn: "Phase 2: Motor Development & Gait",
        durationAr: "مستمر (شهور 4 - 12)",
        durationEn: "Ongoing (Months 4 - 12)",
        goalsAr: [
          "تحفيز الحبو (Crawling) والوقوف",
          "تحسين نمط المشي (استخدام الجبائر إذا لزم الأمر)",
          "زيادة الاستقلالية الحركية"
        ],
        goalsEn: [
          "Promote crawling and standing",
          "Improve gait pattern (with orthotics if needed)",
          "Increase functional independence"
        ],
        precautionsAr: [
          "مراقبة نمو العظام لتجنب الخلع (خاصة مفصل الحوض)",
          "استخدام الجبائر (AFO) لمنع سقوط القدم والمشي على الأمشاط"
        ],
        precautionsEn: [
          "Monitor for hip subluxation",
          "Ensure consistent AFO wear to prevent toe walking"
        ],
        exercisesAr: [
          "تدريب الوقوف في جهاز الوقوف (Standers)",
          "المشي باستخدام المشاية الخلفية (Posterior Walker)",
          "تمارين نقل الوزن (Weight Shifting) من الجانب للجانب"
        ],
        exercisesEn: [
          "Standing frame training",
          "Gait training with posterior walker",
          "Lateral weight shifting exercises"
        ],
        criteriaToProgressAr: [
          "المشي لمسافات قصيرة بمساعدة",
          "تحسن التوازن أثناء الوقوف"
        ],
        criteriaToProgressEn: [
          "Assisted ambulation for short distances",
          "Improved standing balance"
        ]
      }
    ]
  },
  {
    id: "ped_erbs",
    nameAr: "تأهيل الأطفال: ملخ الولادة (Erb's Palsy)",
    nameEn: "Pediatrics: Erb's Palsy",
    descriptionAr: "تأهيل لإصابة الضفيرة العضدية للأطفال لاستعادة حركة و وظيفة الذراع المصاب.",
    descriptionEn: "Brachial plexus injury rehab aiming to restore upper extremity mobility and function.",
    phases: [
      {
        id: "erbs_phase_1",
        nameAr: "المرحلة الأولى: حماية المفصل والتنشيط المبكر",
        nameEn: "Phase 1: Joint Protection & Early Activation",
        durationAr: "من الولادة حتى 3 شهور",
        durationEn: "Birth to 3 months",
        goalsAr: [
          "منع خلع مفصل الكتف",
          "الحفاظ على المدى الحركي الكامل السلبي (PROM)",
          "تشجيع الإدراك الحسي للذراع المصاب"
        ],
        goalsEn: [
          "Prevent shoulder subluxation",
          "Maintain full PROM",
          "Encourage sensory awareness of affected arm"
        ],
        precautionsAr: [
          "ممنوع سحب الطفل من ذراعه نهائياً",
          "دعم الذراع جيداً أثناء حمل الطفل"
        ],
        precautionsEn: [
          "NEVER pull child by the affected arm",
          "Always support the arm during handling/carrying"
        ],
        exercisesAr: [
          "حركات سلبية (PROM) لطيفة لكل مفاصل الذراع",
          "تحفيز لمسي للذراع بمواد مختلفة",
          "تثبيت الكتف بحمالة خفيفة أو لصق طبي حسب الحاجة"
        ],
        exercisesEn: [
          "Gentle PROM for all UE joints",
          "Tactile sensory stimulation",
          "Shoulder stabilization with taping if indicated"
        ],
        criteriaToProgressAr: [
          "لا يوجد قصر في العضلات (Contractures)",
          "بدء ظهور انقباض عضلي إرادي بسيط"
        ],
        criteriaToProgressEn: [
          "No muscle contractures present",
          "Initiation of trace voluntary muscle contractions"
        ]
      },
      {
        id: "erbs_phase_2",
        nameAr: "المرحلة الثانية: التقوية واللعب الموجه",
        nameEn: "Phase 2: Strengthening & Purposeful Play",
        durationAr: "الشهور 4 - 12",
        durationEn: "Months 4 - 12",
        goalsAr: [
          "زيادة الحركة الإيجابية للذراع (AROM)",
          "استخدام الذراعين معاً في اللعب",
          "تقوية العضلات الضعيفة (الدوران الخارجي ورفع الكتف)"
        ],
        goalsEn: [
          "Increase AROM",
          "Promote bimanual play",
          "Strengthen weak muscles (ER and abduction)"
        ],
        precautionsAr: [
          "تجنب تعويض الحركات بالظهر أو الرقبة",
          "منع تكوّن نمط (Waiters Tip) عبر الجبائر الليلية إذا لزم"
        ],
        precautionsEn: [
          "Avoid compensatory trunk movements",
          "Prevent 'waiter's tip' posture"
        ],
        exercisesAr: [
          "تشجيع الطفل على الوصول للألعاب باليد المصابة",
          "تمارين الزحف لتحميل الوزن على الذراعين",
          "العلاج المائي (Hydrotherapy) لتسهيل الحركة"
        ],
        exercisesEn: [
          "Reaching for toys with affected hand",
          "Crawling to promote weight bearing through arms",
          "Hydrotherapy for movement facilitation"
        ],
        criteriaToProgressAr: [
          "قدرة الطفل على جلب يده لفمه",
          "استخدام اليدين معاً في حمل لعبة كبيرة"
        ],
        criteriaToProgressEn: [
          "Ability to bring hand to mouth",
          "Bimanual handling of a large toy"
        ]
      }
    ]
  },
  {
    id: "ped_motor_delay",
    nameAr: "تأهيل الأطفال: تأخر النمو الحركي (Delayed Motor Development)",
    nameEn: "Pediatrics: Delayed Motor Development",
    descriptionAr: "بروتوكول تحفيزي لمساعدة الطفل على اكتساب المهارات الحركية الأساسية (الجلوس، الحبو، المشي) في وقتها الطبيعي.",
    descriptionEn: "Facilitation protocol to help children achieve fundamental motor milestones.",
    phases: [
      {
        id: "delay_phase_1",
        nameAr: "المرحلة الأولى: التحكم المركزي (الرأس والجذع)",
        nameEn: "Phase 1: Core Control (Head & Trunk)",
        durationAr: "يُحدد حسب استجابة الطفل",
        durationEn: "Varies by response",
        goalsAr: [
          "تثبيت الرأس أثناء الجلوس أو السحب للجلوس",
          "الجلوس المستقل بدون دعم",
          "القدرة على التقلب (Rolling) للجهتين"
        ],
        goalsEn: [
          "Head stability during pull-to-sit",
          "Independent sitting",
          "Rolling bidirectionally"
        ],
        precautionsAr: [
          "عدم ترك الطفل في وضعيات خاطئة لفترة طويلة",
          "مراعاة فترات نوم وتغذية الطفل"
        ],
        precautionsEn: [
          "Do not leave in abnormal postures",
          "Respect sleep/feed schedules to avoid fatigue"
        ],
        exercisesAr: [
          "وقت البطن (Tummy Time) مع التحفيز البصري والصوتي",
          "التدحرج بمساعدة المعالج على بساط التمرين",
          "الجلوس المدعوم (Supported Sitting) مع اللعب بالأيدي"
        ],
        exercisesEn: [
          "Tummy time with audio/visual tracking",
          "Assisted rolling on mat",
          "Supported sitting focusing on midline play"
        ],
        criteriaToProgressAr: [
          "جلوس مستقل ثابت لـ 1 دقيقة",
          "قدرة تامة على التقلب في الاتجاهين"
        ],
        criteriaToProgressEn: [
          "Independent sitting for 1 minute",
          "Full independent rolling bidirectionally"
        ]
      },
      {
        id: "delay_phase_2",
        nameAr: "المرحلة الثانية: التنقل والحركة المتقدمة",
        nameEn: "Phase 2: Mobility & Advanced Movement",
        durationAr: "يُحدد حسب استجابة الطفل",
        durationEn: "Varies by response",
        goalsAr: [
          "الانتقال من الجلوس للحبو (Transitions)",
          "الوقوف والمشي الجانبي على الأثاث (Cruising)",
          "المشي المستقل"
        ],
        goalsEn: [
          "Transitions (sit to quad)",
          "Pull-to-stand and cruising",
          "Independent walking"
        ],
        precautionsAr: [
          "توفير بيئة آمنة مبطنة لتجنب إصابات السقوط",
          "تجنب إجبار الطفل على المشي قبل استعداد مفاصل الحوض"
        ],
        precautionsEn: [
          "Provide padded safe environment",
          "Avoid forced walking before pelvic readiness"
        ],
        exercisesAr: [
          "وضع الألعاب بعيداً لتشجيع الحبو",
          "الوقوف بجانب طاولة منخفضة وتشجيع أخذ خطوات جانبية",
          "المشي مع الإمساك بيد المعالج أو الأهل"
        ],
        exercisesEn: [
          "Placing toys out of reach to encourage crawling",
          "Standing at low table for cruising",
          "Supported walking holding hands"
        ],
        criteriaToProgressAr: [
          "الوقوف المستقل لعدة ثوانٍ",
          "أخذ 3-5 خطوات مستقلة بدون مساعدة"
        ],
        criteriaToProgressEn: [
          "Independent standing for several seconds",
          "Taking 3-5 independent steps"
        ]
      }
    ]
  }
];

export function PhaseBasedProtocolsTab({ patient }: { patient: Patient }) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  
  // State: For demo, we just use the first protocol (ACL MOON)
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(PROTOCOLS_LIBRARY[0]);
  
  // State: Which phase is the patient currently in (0-indexed)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  
  // State: Track which criteria are checked for the current phase
  const [checkedCriteria, setCheckedCriteria] = useState<Record<number, boolean>>({});

  const handleToggleCriteria = (idx: number) => {
    setCheckedCriteria(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const currentPhase = selectedProtocol?.phases[currentPhaseIndex];
  
  const allCriteriaChecked = currentPhase 
    ? (isRtl ? currentPhase.criteriaToProgressAr : currentPhase.criteriaToProgressEn).every((_, idx) => checkedCriteria[idx])
    : false;

  const handleAdvancePhase = () => {
    if (selectedProtocol && currentPhaseIndex < selectedProtocol.phases.length - 1) {
      setCurrentPhaseIndex(prev => prev + 1);
      setCheckedCriteria({});
    }
  };

  if (!selectedProtocol || !currentPhase) return null;

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Sidebar: Protocols List & Timeline */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-lg text-slate-800">
              {isRtl ? "مكتبة البروتوكولات (Protocols)" : "Protocols Library"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {PROTOCOLS_LIBRARY.map((protocol) => (
                <Button 
                  key={protocol.id}
                  variant={selectedProtocol?.id === protocol.id ? "default" : "outline"}
                  className={`w-full justify-start ${selectedProtocol?.id === protocol.id ? 'bg-slate-800 hover:bg-slate-900' : ''}`}
                  onClick={() => {
                    setSelectedProtocol(protocol);
                    setCurrentPhaseIndex(0);
                    setCheckedCriteria({});
                  }}
                >
                  <Activity className="w-4 h-4 mr-2 ml-2" />
                  <span className="truncate">{isRtl ? protocol.nameAr : protocol.nameEn}</span>
                </Button>
              ))}
            </div>

            <Separator className="my-6" />

            <h3 className="font-bold text-slate-800 mb-4 text-sm">
              {isRtl ? "تدرج المريض (Patient Progress)" : "Patient Progress"}
            </h3>
            
            <div className="relative border-l-2 border-slate-200 ml-3 rtl:mr-3 rtl:ml-0 space-y-6 pl-4 rtl:pr-4 rtl:pl-0">
              {selectedProtocol.phases.map((phase, idx) => {
                const isCompleted = idx < currentPhaseIndex;
                const isActive = idx === currentPhaseIndex;
                const isLocked = idx > currentPhaseIndex;
                
                return (
                  <div key={phase.id} className="relative">
                    <div className={`absolute -left-[21px] rtl:-right-[21px] w-4 h-4 rounded-full border-2 ${
                      isCompleted ? 'bg-emerald-500 border-emerald-500' : 
                      isActive ? 'bg-white border-blue-600' : 
                      'bg-white border-slate-300'
                    }`}>
                      {isActive && <div className="absolute inset-[2px] bg-blue-600 rounded-full" />}
                    </div>
                    
                    <button 
                      className={`text-right rtl:text-right text-left rtl:w-full ${
                        isCompleted ? 'text-emerald-700' :
                        isActive ? 'text-blue-700 font-bold' :
                        'text-slate-400'
                      }`}
                      onClick={() => {
                        if (isCompleted || isActive) {
                          setCurrentPhaseIndex(idx);
                          setCheckedCriteria({}); // Reset criteria view when jumping back
                        }
                      }}
                      disabled={isLocked}
                    >
                      <div className="text-sm">{isRtl ? phase.nameAr : phase.nameEn}</div>
                      <div className="text-xs mt-1 opacity-80">{isRtl ? phase.durationAr : phase.durationEn}</div>
                    </button>
                  </div>
                );
              })}
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Main Content: Phase Details */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="border-0 shadow-lg border-t-4 border-t-blue-600">
          <CardHeader className="bg-white border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 mb-2">
                  {isRtl ? currentPhase.durationAr : currentPhase.durationEn}
                </Badge>
                <CardTitle className="text-xl text-slate-800">
                  {isRtl ? currentPhase.nameAr : currentPhase.nameEn}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            
            {/* Goals & Precautions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 font-bold text-slate-800">
                  <Star className="w-5 h-5 text-emerald-600" />
                  {isRtl ? "أهداف المرحلة" : "Phase Goals"}
                </h4>
                <ul className="space-y-2">
                  {(isRtl ? currentPhase.goalsAr : currentPhase.goalsEn).map((goal, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center gap-2 font-bold text-slate-800">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  {isRtl ? "محاذير (Precautions)" : "Precautions"}
                </h4>
                <ul className="space-y-2">
                  {(isRtl ? currentPhase.precautionsAr : currentPhase.precautionsEn).map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-rose-700 bg-rose-50 p-2 rounded-md text-sm border border-rose-100">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Separator />

            {/* Exercises List */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-bold text-slate-800">
                <Activity className="w-5 h-5 text-indigo-600" />
                {isRtl ? "التمارين المقترحة لهذه المرحلة" : "Recommended Exercises"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(isRtl ? currentPhase.exercisesAr : currentPhase.exercisesEn).map((ex, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    {ex}
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Criteria Checklist */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mt-8">
              <h4 className="flex items-center gap-2 font-bold text-blue-900 mb-4">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                {isRtl ? "شروط الانتقال للمرحلة التالية (Criteria to Progress)" : "Criteria to Progress"}
              </h4>
              <p className="text-sm text-blue-700/80 mb-4">
                {isRtl ? "حدد الشروط التي اجتازها المريض لتتمكن من ترقيته للمرحلة القادمة." : "Check the milestones achieved by the patient to unlock the next phase."}
              </p>
              
              <div className="space-y-3">
                {(isRtl ? currentPhase.criteriaToProgressAr : currentPhase.criteriaToProgressEn).map((criteria, i) => (
                  <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checkedCriteria[i] ? 'bg-white border-emerald-500 shadow-sm' : 'bg-white/50 border-blue-200 hover:bg-white'
                  }`}>
                    <div className="mt-0.5">
                      {checkedCriteria[i] ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${checkedCriteria[i] ? 'text-slate-800' : 'text-slate-600'}`}>
                      {criteria}
                    </span>
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={!!checkedCriteria[i]}
                      onChange={() => handleToggleCriteria(i)}
                    />
                  </label>
                ))}
              </div>

              {/* Advance Button */}
              {currentPhaseIndex < (selectedProtocol.phases.length - 1) && (
                <div className="mt-6 flex justify-end">
                  <Button 
                    className={`gap-2 ${allCriteriaChecked ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                    disabled={!allCriteriaChecked}
                    onClick={handleAdvancePhase}
                  >
                    {isRtl ? "ترقية للمرحلة القادمة" : "Advance to Next Phase"}
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {currentPhaseIndex === (selectedProtocol.phases.length - 1) && allCriteriaChecked && (
                <div className="mt-6 p-4 bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-800 font-bold text-center flex items-center justify-center gap-2">
                  <Star className="w-5 h-5" />
                  {isRtl ? "تهانينا! المريض أتم البروتوكول بنجاح." : "Congratulations! Protocol completed successfully."}
                </div>
              )}

            </div>

          </CardContent>
        </Card>
      </div>

    </div>
  );
}
