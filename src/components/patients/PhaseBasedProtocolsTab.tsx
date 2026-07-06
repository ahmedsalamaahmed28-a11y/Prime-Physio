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
