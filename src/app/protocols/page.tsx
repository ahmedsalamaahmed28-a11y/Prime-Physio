"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Search, BookOpen, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ProtocolPhase {
  phase: string;
  duration: string;
  goals: string[];
  precautions: string[];
  interventions: string[];
  criteria: string[];
}

interface Protocol {
  id: string;
  titleAr: string;
  titleEn: string;
  categoryAr: string;
  categoryEn: string;
  descriptionAr: string;
  descriptionEn: string;
  phases: ProtocolPhase[];
}

const PROTOCOLS_DB: Protocol[] = [
  {
    id: "acl-recon",
    titleAr: "تأهيل إعادة بناء الرباط الصليبي الأمامي (ACL)",
    titleEn: "ACL Reconstruction Rehab Protocol",
    categoryAr: "الركبة",
    categoryEn: "Knee",
    descriptionAr: "بروتوكول قياسي لتأهيل ما بعد عملية الرباط الصليبي مع أو بدون خياطة الغضروف.",
    descriptionEn: "Standard protocol for post-op ACL reconstruction with or without meniscal repair.",
    phases: [
      {
        phase: "المرحلة الأولى: الحماية الفورية",
        duration: "الأسابيع 0 - 2",
        goals: ["تقليل الألم والتورم", "الوصول لمدى حركي كامل في الفرد (Full Extension)", "مدى حركي للثني 90 درجة", "تفعيل عضلة الكواد (Quad Control)"],
        precautions: ["استخدام العكازين (Crutches) حسب توجيهات الجراح", "تجنب دوران الركبة تحت حمل", "تجنب تمرين فرد الركبة المفتوح (Open Kinetic Chain Extension) بمقاومة"],
        interventions: ["تمارين شد الكواد (Quad Sets)", "رفع الساق المستقيمة (SLR)", "تحريك الرضفة (Patellar Mobs)", "تمارين إطالة عضلة السمانة والخلفية", "جهاز التنبيه الكهربائي (NMES) على الكواد"],
        criteria: ["فرد كامل للركبة (0 درجة)", "ثني الركبة 90 درجة", "اختفاء التورم الشديد", "القدرة على أداء SLR بدون لاج (Lag)"]
      },
      {
        phase: "المرحلة الثانية: المشي والتحكم",
        duration: "الأسابيع 2 - 6",
        goals: ["مشي طبيعي بدون عرج", "مدى حركي كامل للثني والفرد", "تحسين التوازن (Proprioception)", "تقوية الطرف السفلي"],
        precautions: ["تجنب الإجهاد المفرط للركبة", "تجنب التمارين البليومترية (Plyometrics)"],
        interventions: ["ركوب الدراجة الثابتة", "سكوات جزئي (Mini Squats)", "تمارين التوازن على قدم واحدة (Single Leg Stance)", "صعود ونزول السلالم التدريجي (Step-ups)"],
        criteria: ["مدى حركي كامل", "مشي بدون أي وسيلة مساعدة", "توازن جيد على قدم واحدة لمدة 10 ثوانٍ"]
      },
      {
        phase: "المرحلة الثالثة: التقوية المتقدمة",
        duration: "الأسابيع 6 - 12",
        goals: ["استعادة قوة الكواد والخلفية إلى 70% من الساق السليمة", "تحكم عصبي عضلي جيد أثناء الحركات الجانبية", "الاستعداد للجري الخفيف"],
        precautions: ["عدم بدء الجري قبل اجتياز اختبارات القوة والتوازن"],
        interventions: ["سكوات كامل (Goblet Squats)", "تمارين الاندفاع (Lunges)", "الهرولة الخفيفة (Jogging progression)", "تمارين الرشاقة البسيطة (Agility drills)"],
        criteria: ["لا يوجد ألم مع التمارين", "قوة الكواد 70%", "اجتياز اختبارات الجري الأولية"]
      }
    ]
  },
  {
    id: "rotator-cuff",
    titleAr: "تأهيل إصلاح الكفة المدورة (Rotator Cuff)",
    titleEn: "Rotator Cuff Repair Protocol",
    categoryAr: "الكتف",
    categoryEn: "Shoulder",
    descriptionAr: "بروتوكول بعد عملية إصلاح أوتار الكتف (Small to Medium tear).",
    descriptionEn: "Post-op protocol for small to medium rotator cuff tendon repair.",
    phases: [
      {
        phase: "المرحلة الأولى: أقصى حماية",
        duration: "الأسابيع 0 - 4",
        goals: ["حماية الخياطة الجراحية", "تقليل الألم", "مدى حركي سلبي (PROM) تدريجي"],
        precautions: ["لا يوجد حركة إيجابية (No AROM) للكتف المريض", "لا رفع للأوزان", "ارتداء الحمالة (Sling) طوال الوقت إلا أثناء التمارين"],
        interventions: ["تحريك البندول (Pendulum exercises)", "PROM في اتجاه الرفع والتبعيد في نطاق مريح", "تمارين تحريك لوح الكتف (Scapular retractions)", "حركة اليد والرسغ والكوع إيجابياً"],
        criteria: ["مدى سلبي للرفع 90 درجة", "ألم متحكم به"]
      },
      {
        phase: "المرحلة الثانية: الحركة الإيجابية المساعدة",
        duration: "الأسابيع 4 - 8",
        goals: ["الوصول لمدى حركي سلبي كامل", "بدء الحركة الإيجابية المساعدة (AAROM)", "تفعيل الكفة المدورة بخفة"],
        precautions: ["لا تدريبات مقاومة قوية", "لا رفع ذراع فوق مستوى الكتف بمقاومة"],
        interventions: ["استخدام العصا (Wand exercises) للرفع والتبعيد", "تمارين المشي على الحائط ببطء", "تقوية لوح الكتف (Isometrics)"],
        criteria: ["مدى حركي إيجابي مساعد 120 درجة", "تفعيل جيد للوح الكتف"]
      }
    ]
  }
];

export default function ProtocolsPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});

  const togglePhase = (id: string) => {
    setExpandedPhases(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = ["الكل", ...Array.from(new Set(PROTOCOLS_DB.map(p => isRtl ? p.categoryAr : p.categoryEn)))];

  const filtered = PROTOCOLS_DB.filter(p => {
    const matchSearch = (p.titleAr + p.titleEn).toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === "الكل" || (isRtl ? p.categoryAr === selectedCategory : p.categoryEn === selectedCategory);
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-gradient-to-b from-[#4F46BA] to-[#7c3aed] text-white pt-10 pb-20 px-6">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">{isRtl ? "بروتوكولات التأهيل" : "Rehab Protocols"}</h1>
            <p className="text-white/80 text-sm mt-1">
              {isRtl ? "المرجع الإكلينيكي لأهم خطط التأهيل المعتمدة عالمياً" : "Clinical reference for global evidence-based rehab guidelines"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10 space-y-6">
        {/* Search & Filter */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className={`w-5 h-5 absolute top-3 text-muted-foreground ${isRtl ? "right-3" : "left-3"}`} />
              <Input 
                placeholder={isRtl ? "ابحث عن إصابة أو بروتوكول..." : "Search for protocol..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`h-11 ${isRtl ? "pr-10" : "pl-10"}`}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedCategory === cat 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : "bg-muted text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                >
                  {cat === "الكل" ? (isRtl ? "الكل" : "All") : cat}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Protocols List */}
        <div className="space-y-6">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{isRtl ? "لا توجد نتائج مطابقة لبحثك" : "No matching protocols found"}</p>
            </div>
          ) : (
            filtered.map(protocol => (
              <Card key={protocol.id} className="overflow-hidden border-0 shadow-md">
                <CardHeader className="bg-white border-b pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg mb-2">
                        {isRtl ? protocol.categoryAr : protocol.categoryEn}
                      </span>
                      <CardTitle className="text-xl text-indigo-950 font-bold">
                        {isRtl ? protocol.titleAr : protocol.titleEn}
                      </CardTitle>
                      <CardDescription className="mt-2 text-sm text-slate-500">
                        {isRtl ? protocol.descriptionAr : protocol.descriptionEn}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0 bg-slate-50/50">
                  {protocol.phases.map((phase, idx) => {
                    const phaseId = `${protocol.id}-${idx}`;
                    const isExpanded = expandedPhases[phaseId] || false;

                    return (
                      <div key={idx} className="border-b last:border-b-0 border-slate-200">
                        <button 
                          onClick={() => togglePhase(phaseId)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-indigo-50/50 transition-colors text-left"
                        >
                          <div className={`flex items-center gap-4 ${isRtl ? "flex-row-reverse w-full justify-end" : ""}`}>
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0">
                              {idx + 1}
                            </div>
                            <div className={isRtl ? "text-right" : "text-left"}>
                              <h4 className="font-bold text-slate-800">{phase.phase}</h4>
                              <p className="text-xs font-semibold text-indigo-600 mt-0.5">{phase.duration}</p>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </button>

                        {isExpanded && (
                          <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                              {/* Goals */}
                              <div>
                                <h5 className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-3">
                                  <CheckCircle2 className="w-4 h-4" />
                                  {isRtl ? "أهداف المرحلة" : "Phase Goals"}
                                </h5>
                                <ul className="space-y-2">
                                  {phase.goals.map((goal, i) => (
                                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                      <span className="text-emerald-500 mt-1">•</span>
                                      <span>{goal}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Precautions */}
                              <div>
                                <h5 className="flex items-center gap-2 text-sm font-bold text-red-600 mb-3">
                                  <AlertCircle className="w-4 h-4" />
                                  {isRtl ? "محاذير وتنبيهات" : "Precautions"}
                                </h5>
                                <ul className="space-y-2">
                                  {phase.precautions.map((prec, i) => (
                                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                      <span className="text-red-500 mt-1">•</span>
                                      <span>{prec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Interventions */}
                              <div className="md:col-span-2 pt-4 border-t border-slate-100">
                                <h5 className="flex items-center gap-2 text-sm font-bold text-indigo-700 mb-3">
                                  <Activity className="w-4 h-4" />
                                  {isRtl ? "التدخلات والعلاج الطبيعي" : "Interventions"}
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {phase.interventions.map((intv, i) => (
                                    <div key={i} className="bg-indigo-50/50 px-3 py-2 rounded-lg text-sm text-slate-700 border border-indigo-100/50">
                                      {intv}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Criteria */}
                              <div className="md:col-span-2 pt-4 border-t border-slate-100">
                                <h5 className="text-sm font-bold text-slate-700 mb-3">
                                  {isRtl ? "معايير الانتقال للمرحلة التالية" : "Progression Criteria"}
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                  {phase.criteria.map((crit, i) => (
                                    <span key={i} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-xs font-semibold">
                                      ✓ {crit}
                                    </span>
                                  ))}
                                </div>
                              </div>

                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
