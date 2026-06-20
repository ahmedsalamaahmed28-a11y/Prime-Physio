"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SelectMenu from "@/components/SelectMenu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

interface LibraryItem {
  id: string;
  type: "breakfast" | "lunch" | "dinner" | "snacks" | "exercise";
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
}

export default function ClinicalNutritionPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth(); const clinicId = user?.clinicId;

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const translateName = (arName: string, enName?: string) => {
    if (isRtl) return arName;
    if (enName) return enName;
    const map: Record<string, string> = {
      "أحمد محمد السيد": "Ahmed Mohamed El-Sayed",
      "فاطمة علي حسن": "Fatima Ali Hassan",
      "محمود إبراهيم": "Mahmoud Ibrahim",
      "نورا حسن": "Noura Hassan",
      "كريم عادل": "Karim Adel",
      "سمر طارق": "Samar Tarek",
    };
    return map[arName] || arName;
  };

  // Load patients from Supabase only
  useEffect(() => {
    async function loadPatients() {
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq('clinic_id', clinicId)
          .order("id", { ascending: true });

        if (error) {
          console.error("Failed to load patients from Supabase", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          setPatients([]);
          return;
        }

        setPatients(data || []);
        if (data?.length) setSelectedPatientId(data[0].id);
      } catch (err) {
        console.error("Unexpected error loading patients from Supabase", err);
        setPatients([]);
      }
    }
    loadPatients();
  }, []);

  // Calculator states
  const [weight, setWeight] = useState<number>(75);
  const [height, setHeight] = useState<number>(175);
  const [waist, setWaist] = useState<number>(90);
  const [hip, setHip] = useState<number>(100);
  const [gender, setGender] = useState<"male" | "female">("male");

  // Diet Program states
  const [dietPlan, setDietPlan] = useState({
    breakfast: "",
    lunch: "",
    dinner: "",
    snacks: "",
  });

  const [targetCalories, setTargetCalories] = useState<number>(1800);
  const [proteinRatio, setProteinRatio] = useState<number>(35); // %
  const [carbRatio, setCarbRatio] = useState<number>(40); // %
  const [fatRatio, setFatRatio] = useState<number>(25); // %

  // Loaded templates state
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

  // Load templates from Supabase
  useEffect(() => {
    async function loadTemplates() {
      const { data, error } = await supabase
        .from("treatment_templates")
        .select("payload")
        .eq("kind", "clinical_library");

      if (error) {
        console.error("Failed to load templates from Supabase", error);
        return;
      }

      const nutritionItems = (data || [])
        .map((row: any) => row.payload)
        .filter((item: any) => ["breakfast", "lunch", "dinner", "snacks"].includes(item.subType || item.type))
        .map((item: any) => ({
          id: item.id,
          type: item.subType || item.type,
          titleAr: item.titleAr,
          titleEn: item.titleEn,
          contentAr: item.contentAr,
          contentEn: item.contentEn,
        }));

      setLibraryItems(nutritionItems);
    }
    loadTemplates();
  }, []);

  // Load patient specific data from Supabase when selectedPatientId changes
  useEffect(() => {
    if (!selectedPatientId) return;

    async function loadPatientNutrition() {
      const activePat = patients.find(p => p.id === selectedPatientId);
      const { data, error } = await supabase
        .from("patient_nutrition")
        .select("*")
        .eq("patient_id", selectedPatientId)
        .eq('clinic_id', clinicId)
        .maybeSingle();

      if (error) {
        console.error("Failed to load patient nutrition from Supabase", error);
      }

      setWeight(data?.weight ? Number(data.weight) : 75);
      setHeight(data?.height ? Number(data.height) : 175);
      setWaist(data?.waist ? Number(data.waist) : 90);
      setHip(data?.hip ? Number(data.hip) : 100);
      const patientGender = String(activePat?.gender || "").toLowerCase();
      setGender((data?.gender as "male" | "female") || (patientGender.includes("female") ? "female" : "male"));

      if (data?.diet_plan && Object.keys(data.diet_plan).length > 0) {
        setDietPlan(data.diet_plan);
        return;
      }

      setDietPlan({
        breakfast: "3 boiled eggs + half whole wheat pita + green salad cup + unsweetened green tea",
        lunch: "200g grilled chicken breast + 6 tbsp steamed brown rice + mixed steamed vegetables",
        dinner: "1 can drained tuna + mixed green salad with olive oil dressing + 1 cup greek yogurt",
        snacks: "A handful of raw mixed nuts + 1 green apple or pear",
      });
    }

    loadPatientNutrition();
  }, [selectedPatientId, isRtl, patients]);

  const handleSavePatientNutrition = async () => {
    const { error } = await supabase.from("patient_nutrition").upsert({
      patient_id: selectedPatientId,
      clinic_id: clinicId,
      weight,
      height,
      waist,
      hip,
      gender,
      diet_plan: dietPlan,
    }, { onConflict: "patient_id" });

    if (error) {
      console.error("Failed to save patient nutrition to Supabase", error);
      alert("Failed to save nutrition plan");
      return;
    }

    alert("Assessment and diet plan saved successfully to patient file!");
  };

  const getOptions = (type: "breakfast" | "lunch" | "dinner" | "snacks") => {
    return libraryItems.filter(item => item.type === type);
  };

  // Calculations
  const heightInMeters = height / 100;
  const bmi = heightInMeters > 0 ? Number((weight / (heightInMeters * heightInMeters)).toFixed(1)) : 0;
  const whr = hip > 0 ? Number((waist / hip).toFixed(2)) : 0;

  // BMI Interpretation
  let bmiCategory = "";
  let bmiColor = "";
  let bmiProgressValue = 0; // mapped to max 100 scale
  if (bmi < 18.5) {
    bmiCategory = isRtl ? "نقص وزن (Underweight)" : "Underweight";
    bmiColor = "text-sky-500 bg-sky-50 dark:bg-sky-950/20 border-sky-200";
    bmiProgressValue = (bmi / 18.5) * 30;
  } else if (bmi >= 18.5 && bmi < 25) {
    bmiCategory = isRtl ? "وزن مثالي (Normal)" : "Normal";
    bmiColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200";
    bmiProgressValue = 30 + ((bmi - 18.5) / 6.5) * 30;
  } else if (bmi >= 25 && bmi < 30) {
    bmiCategory = isRtl ? "وزن زائد (Overweight)" : "Overweight";
    bmiColor = "text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200";
    bmiProgressValue = 60 + ((bmi - 25) / 5) * 20;
  } else {
    bmiCategory = isRtl ? "سمنة (Obese)" : "Obese";
    bmiColor = "text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-200";
    bmiProgressValue = 80 + Math.min(((bmi - 30) / 15) * 20, 20);
  }

  // WHR Interpretation
  let whrCategory = "";
  let whrColor = "";
  if (gender === "male") {
    if (whr < 0.9) {
      whrCategory = isRtl ? "مخاطر منخفضة (Low Risk)" : "Low Health Risk";
      whrColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200";
    } else if (whr >= 0.9 && whr < 1.0) {
      whrCategory = isRtl ? "مخاطر متوسطة (Moderate Risk)" : "Moderate Health Risk";
      whrColor = "text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200";
    } else {
      whrCategory = isRtl ? "مخاطر مرتفعة جداً (High Risk)" : "High Health Risk";
      whrColor = "text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-200";
    }
  } else {
    if (whr < 0.8) {
      whrCategory = isRtl ? "مخاطر منخفضة (Low Risk)" : "Low Health Risk";
      whrColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200";
    } else if (whr >= 0.8 && whr < 0.85) {
      whrCategory = isRtl ? "مخاطر متوسطة (Moderate Risk)" : "Moderate Health Risk";
      whrColor = "text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200";
    } else {
      whrCategory = isRtl ? "مخاطر مرتفعة جداً (High Risk)" : "High Health Risk";
      whrColor = "text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-200";
    }
  }

  // Macronutrients calculation in grams
  const proteinGrams = Math.round(((targetCalories * (proteinRatio / 100)) / 4));
  const carbGrams = Math.round(((targetCalories * (carbRatio / 100)) / 4));
  const fatGrams = Math.round(((targetCalories * (fatRatio / 100)) / 9));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 print:p-0" dir={isRtl ? "rtl" : "ltr"}>
      {/* Print-Only Clinic Header Letterhead */}
      <div className="hidden print:flex flex-col mb-6 pb-4 border-b-2 border-[#4F46BA] w-full" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-2xl font-bold text-indigo-800 tracking-wider">PRIME PHYSIO CLINIC</h1>
            <p className="text-xs text-slate-500">Physical Therapy & Rehabilitation Specialist Center</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">{isRtl ? "تقرير برنامج التغذية العلاجية" : "Clinical Nutrition Program Report"}</p>
            <p className="text-xs text-slate-500">{isRtl ? "التاريخ:" : "Date:"} {new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-slate-50 border rounded-xl grid grid-cols-2 gap-4 text-xs w-full">
          <div>
            <span className="font-bold text-slate-500">{isRtl ? "اسم المريض: " : "Patient Name: "}</span>
            <span className="font-semibold">
              {(() => {
                const p = patients.find(x => x.id === selectedPatientId);
                return p ? translateName(p.nameAr, p.nameEn) : "";
              })()}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-500">{isRtl ? "رقم الملف: " : "File ID: "}</span>
            <span className="font-mono font-semibold">{selectedPatientId}</span>
          </div>
          <div>
            <span className="font-bold text-slate-500">{isRtl ? "القياسات البدنية: " : "Biometrics: "}</span>
            <span className="font-semibold">
              {isRtl ? "الطول: " : "Height: "}{height}cm · {isRtl ? "الوزن: " : "Weight: "}{weight}kg
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-500">{isRtl ? "المؤشرات والتقييم: " : "Indices & Assessment: "}</span>
            <span className="font-semibold">
              BMI: {bmi} ({bmiCategory.split(" ")[0]}) · WHR: {whr} ({whrCategory.split(" ")[0]})
            </span>
          </div>
        </div>
      </div>

      {/* Print-Only Diet Plan Template */}
      <div className="hidden print:block space-y-6 w-full" dir={isRtl ? "rtl" : "ltr"}>
        <div className="border rounded-2xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#4F46BA] text-white text-xs font-bold">
                <th className="py-3 px-4 text-right border-b border-[#4338ca] w-1/4">{isRtl ? "الوجبة" : "Meal"}</th>
                <th className="py-3 px-4 text-right border-b border-[#4338ca] w-3/4">{isRtl ? "المكونات الغذائية الموصى بها" : "Recommended Dietary Content"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <tr className="hover:bg-slate-50">
                <td className="py-4 px-4 font-bold text-indigo-800">🌅 {isRtl ? "وجبة الإفطار" : "Breakfast"}</td>
                <td className="py-4 px-4 whitespace-pre-line leading-relaxed">{dietPlan.breakfast}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-4 px-4 font-bold text-indigo-800">☀️ {isRtl ? "وجبة الغداء" : "Lunch"}</td>
                <td className="py-4 px-4 whitespace-pre-line leading-relaxed">{dietPlan.lunch}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-4 px-4 font-bold text-indigo-800">🌌 {isRtl ? "وجبة العشاء" : "Dinner"}</td>
                <td className="py-4 px-4 whitespace-pre-line leading-relaxed">{dietPlan.dinner}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-4 px-4 font-bold text-indigo-800">🍎 {isRtl ? "الوجبات الخفيفة" : "Snacks"}</td>
                <td className="py-4 px-4 whitespace-pre-line leading-relaxed">{dietPlan.snacks}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-2xl bg-slate-50/50">
            <h4 className="font-bold text-xs text-indigo-800 mb-2">{isRtl ? "الأهداف الحيوية والسعرات" : "Macronutrient Targets"}</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>{isRtl ? "السعرات المستهدفة:" : "Target Calories:"}</span>
                <span className="font-bold">{targetCalories} kcal</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? "البروتين الموصى به:" : "Recommended Protein:"}</span>
                <span className="font-bold">{proteinRatio}% ({proteinGrams}g)</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? "الكربوهيدرات الموصى بها:" : "Recommended Carbs:"}</span>
                <span className="font-bold">{carbRatio}% ({carbGrams}g)</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? "الدهون الصحية الموصى بها:" : "Recommended Fats:"}</span>
                <span className="font-bold">{fatRatio}% ({fatGrams}g)</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 border rounded-2xl bg-slate-50/50 flex flex-col justify-center text-[10px] text-indigo-800 leading-relaxed">
            <p className="font-bold mb-1">💡 {isRtl ? "توجيهات الطبيب المتابع:" : "Physician Instructions:"}</p>
            <p>{isRtl 
              ? "يُنصح بالالتزام الكامل بكميات شرب المياه اليومية (3 لتر على الأقل) وتوزيع الوجبات بفترات زمنية متساوية للمحافظة على كفاءة الأيض والاستشفاء العضلي." 
              : "Keep hydration levels high (3L daily) and space meals equally to optimize metabolism and muscle tissue recovery."}</p>
          </div>
        </div>
      </div>

      {/* Screen-Only Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#4F46BA]">{isRtl ? "قسم التغذية العلاجية" : "Clinical Nutrition Program"}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isRtl 
              ? "تقييم التركيب البدني للمريض ووضع الأنظمة الغذائية العلاجية المناسبة لدعم خطة الاستشفاء والتأهيل"
              : "Evaluate physical demographics and assign specific therapeutic diets for rehabilitation support."}
          </p>
        </div>
      </div>

      {/* Patient Selection Bar */}
      <div className="bg-card border p-4 rounded-xl flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden">
        <div className="space-y-2 flex-1 max-w-md">
          <Label className="text-xs font-semibold text-slate-500">{isRtl ? "اختيار المريض لتطبيق التقييم والنظام الغذائي عليه" : "Select Patient for Assessment & Diet Plan"}</Label>
          <SelectMenu
            items={patients.map((p) => ({ value: p.id, label: `${translateName(p.nameAr, p.nameEn)} (${p.id})` }))}
            value={selectedPatientId}
            onValueChange={setSelectedPatientId}
            placeholder={isRtl ? "اختر مريض..." : "Select patient..."}
            searchPlaceholder={isRtl ? "بحث..." : "Search"}
            nothingFound={isRtl ? "لا يوجد نتائج" : "Nothing found."}
          />
        </div>
        <Button 
          onClick={handleSavePatientNutrition}
          className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white"
        >
          💾 {isRtl ? "حفظ في ملف المريض المختار" : "Save to Selected Patient's File"}
        </Button>
      </div>

      <Tabs defaultValue="assessment" className="w-full print:hidden">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/60 p-1">
          <TabsTrigger value="assessment">{isRtl ? "التقييم (Assessment)" : "Assessment"}</TabsTrigger>
          <TabsTrigger value="program">{isRtl ? "النظام الغذائي (Program)" : "Diet Program"}</TabsTrigger>
        </TabsList>

        {/* Tab content 1: Assessment */}
        <TabsContent value="assessment" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calculator Card */}
            <Card className="border-indigo-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-800 dark:text-white">
                  {isRtl ? "أدوات القياس المترية" : "Metric Measurement Inputs"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isRtl ? "أدخل القياسات الحيوية للمريض بدقة" : "Enter correct anthropometric parameters"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Gender Selection */}
                <div className="space-y-1.5">
                  <Label>{isRtl ? "الجنس" : "Gender"}</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant={gender === "male" ? "default" : "outline"} 
                      className={gender === "male" ? "bg-[#4F46BA] text-white" : ""}
                      onClick={() => setGender("male")}
                    >
                      {isRtl ? "ذكر" : "Male"}
                    </Button>
                    <Button 
                      type="button" 
                      variant={gender === "female" ? "default" : "outline"} 
                      className={gender === "female" ? "bg-[#4F46BA] text-white" : ""}
                      onClick={() => setGender("female")}
                    >
                      {isRtl ? "أنثى" : "Female"}
                    </Button>
                  </div>
                </div>

                {/* Height Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="height">{isRtl ? "الطول (سم)" : "Height (cm)"}</Label>
                  <Input 
                    id="height" 
                    type="number" 
                    value={height} 
                    onChange={(e) => setHeight(Number(e.target.value))} 
                    min={50} 
                    max={250} 
                  />
                </div>

                {/* Weight Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="weight">{isRtl ? "الوزن (كجم)" : "Weight (kg)"}</Label>
                  <Input 
                    id="weight" 
                    type="number" 
                    value={weight} 
                    onChange={(e) => setWeight(Number(e.target.value))} 
                    min={10} 
                    max={300} 
                  />
                </div>

                {/* Waist Circumference */}
                <div className="space-y-1.5">
                  <Label htmlFor="waist">{isRtl ? "محيط الخصر (سم)" : "Waist Circumference (cm)"}</Label>
                  <Input 
                    id="waist" 
                    type="number" 
                    value={waist} 
                    onChange={(e) => setWaist(Number(e.target.value))} 
                    min={30} 
                    max={200} 
                  />
                </div>

                {/* Hip Circumference */}
                <div className="space-y-1.5">
                  <Label htmlFor="hip">{isRtl ? "محيط الورك (سم)" : "Hip Circumference (cm)"}</Label>
                  <Input 
                    id="hip" 
                    type="number" 
                    value={hip} 
                    onChange={(e) => setHip(Number(e.target.value))} 
                    min={30} 
                    max={200} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Results Column */}
            <div className="space-y-6">
              {/* BMI Result */}
              <Card className="border-indigo-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-800 dark:text-white">
                    {isRtl ? "مؤشر كتلة الجسم (BMI)" : "Body Mass Index (BMI)"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-3xl font-extrabold text-[#4F46BA]">{bmi}</span>
                    <Badge className={bmiColor} variant="outline">{bmiCategory}</Badge>
                  </div>

                  <div className="space-y-1 pt-2">
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#4F46BA] rounded-full transition-all duration-300" style={{ width: `${bmiProgressValue}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-sans">
                      <span>&lt; 18.5</span>
                      <span>18.5 - 24.9</span>
                      <span>25 - 29.9</span>
                      <span>&ge; 30</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>{isRtl ? "نقص وزن" : "Underweight"}</span>
                      <span>{isRtl ? "وزن مثالي" : "Normal"}</span>
                      <span>{isRtl ? "وزن زائد" : "Overweight"}</span>
                      <span>{isRtl ? "سمنة مفرطة" : "Obese"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Waist-to-Hip Ratio Result */}
              <Card className="border-indigo-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-800 dark:text-white">
                    {isRtl ? "نسبة الخصر إلى الورك (W/H Ratio)" : "Waist-to-Hip Ratio (W/H Ratio)"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-3xl font-extrabold text-[#4F46BA]">{whr}</span>
                    <Badge className={whrColor} variant="outline">{whrCategory}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {isRtl 
                      ? "تُستخدم نسبة الخصر إلى الورك كدليل سريري لتقييم توزيع الدهون في منطقة البطن والمخاطر القلبية الوعائية المصاحبة لها." 
                      : "Waist-to-hip ratio determines abdominal fat distribution and cardiovascular disease risks."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab content 2: Program */}
        <TabsContent value="program" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Diet Plan Formulation Cards */}
            <div className="lg:col-span-8 space-y-4">
              <Card className="border-indigo-100">
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base text-slate-800 dark:text-white">
                      {isRtl ? "خطة النظام الغذائي المجدول" : "Daily Diet Schedule"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {isRtl 
                        ? "خصص الوجبات المحددة للمريض لدعم خطة التعافي ومعدلات الحرق الحيوية" 
                        : "Customize the meals allocated to support recovery & physiological parameters"}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => window.print()}
                    variant="outline"
                    size="sm"
                    className="border-[#4F46BA] text-indigo-700 hover:bg-indigo-50 gap-1.5 shrink-0 h-9"
                  >
                    🖨️ {isRtl ? "طباعة البرنامج" : "Print Program"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Breakfast */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="breakfast" className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                        🌅 {isRtl ? "وجبة الإفطار (Breakfast)" : "Breakfast Meal"}
                      </Label>
                      {getOptions("breakfast").length > 0 && (
                        <select 
                          className="text-[10px] bg-background border border-indigo-200 text-indigo-800 rounded px-1.5 py-0.5 outline-none max-w-[200px]"
                          onChange={(e) => {
                            if (e.target.value) {
                              setDietPlan({ ...dietPlan, breakfast: e.target.value });
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>{isRtl ? "📋 اختر من القوالب..." : "📋 Select template..."}</option>
                          {getOptions("breakfast").map((opt) => (
                            <option key={opt.id} value={isRtl ? opt.contentAr : opt.contentEn}>
                              {isRtl ? opt.titleAr : opt.titleEn}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <Textarea 
                      id="breakfast"
                      value={dietPlan.breakfast}
                      onChange={(e) => setDietPlan({...dietPlan, breakfast: e.target.value})}
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  {/* Lunch */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="lunch" className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                        ☀️ {isRtl ? "وجبة الغداء (Lunch)" : "Lunch Meal"}
                      </Label>
                      {getOptions("lunch").length > 0 && (
                        <select 
                          className="text-[10px] bg-background border border-indigo-200 text-indigo-800 rounded px-1.5 py-0.5 outline-none max-w-[200px]"
                          onChange={(e) => {
                            if (e.target.value) {
                              setDietPlan({ ...dietPlan, lunch: e.target.value });
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>{isRtl ? "📋 اختر من القوالب..." : "📋 Select template..."}</option>
                          {getOptions("lunch").map((opt) => (
                            <option key={opt.id} value={isRtl ? opt.contentAr : opt.contentEn}>
                              {isRtl ? opt.titleAr : opt.titleEn}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <Textarea 
                      id="lunch"
                      value={dietPlan.lunch}
                      onChange={(e) => setDietPlan({...dietPlan, lunch: e.target.value})}
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  {/* Dinner */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="dinner" className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                        🌌 {isRtl ? "وجبة العشاء (Dinner)" : "Dinner Meal"}
                      </Label>
                      {getOptions("dinner").length > 0 && (
                        <select 
                          className="text-[10px] bg-background border border-indigo-200 text-indigo-800 rounded px-1.5 py-0.5 outline-none max-w-[200px]"
                          onChange={(e) => {
                            if (e.target.value) {
                              setDietPlan({ ...dietPlan, dinner: e.target.value });
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>{isRtl ? "📋 اختر من القوالب..." : "📋 Select template..."}</option>
                          {getOptions("dinner").map((opt) => (
                            <option key={opt.id} value={isRtl ? opt.contentAr : opt.contentEn}>
                              {isRtl ? opt.titleAr : opt.titleEn}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <Textarea 
                      id="dinner"
                      value={dietPlan.dinner}
                      onChange={(e) => setDietPlan({...dietPlan, dinner: e.target.value})}
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  {/* Snacks */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="snacks" className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                        🍎 {isRtl ? "الوجبات الخفيفة (Snacks)" : "Snacks & Fruits"}
                      </Label>
                      {getOptions("snacks").length > 0 && (
                        <select 
                          className="text-[10px] bg-background border border-indigo-200 text-indigo-800 rounded px-1.5 py-0.5 outline-none max-w-[200px]"
                          onChange={(e) => {
                            if (e.target.value) {
                              setDietPlan({ ...dietPlan, snacks: e.target.value });
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>{isRtl ? "📋 اختر من القوالب..." : "📋 Select template..."}</option>
                          {getOptions("snacks").map((opt) => (
                            <option key={opt.id} value={isRtl ? opt.contentAr : opt.contentEn}>
                              {isRtl ? opt.titleAr : opt.titleEn}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <Textarea 
                      id="snacks"
                      value={dietPlan.snacks}
                      onChange={(e) => setDietPlan({...dietPlan, snacks: e.target.value})}
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Macro Goals & Targets Sidebar */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="border-indigo-100 bg-indigo-50/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-[#4F46BA]">
                    {isRtl ? "الأهداف الحيوية والسعرات" : "Macronutrient Targets"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Calorie Target input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="calories" className="text-xs font-medium">{isRtl ? "السعرات المستهدفة (كيلو كالوري)" : "Target Calories (kcal)"}</Label>
                    <Input 
                      id="calories"
                      type="number"
                      value={targetCalories}
                      onChange={(e) => setTargetCalories(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Visual Progress / Macro metrics */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-xs font-bold">{isRtl ? "توزيع العناصر الغذائية" : "Macro Distribution"}</Label>
                    
                    {/* Protein */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-semibold text-rose-600">{isRtl ? "البروتين (Protein)" : "Protein"}</span>
                        <span className="font-medium text-slate-500">{proteinRatio}% ({proteinGrams}g)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${proteinRatio}%` }} />
                      </div>
                    </div>

                    {/* Carbs */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-semibold text-amber-600">{isRtl ? "الكربوهيدرات (Carbs)" : "Carbs"}</span>
                        <span className="font-medium text-slate-500">{carbRatio}% ({carbGrams}g)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${carbRatio}%` }} />
                      </div>
                    </div>

                    {/* Fats */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-semibold text-sky-600">{isRtl ? "الدهون الصحية (Fats)" : "Healthy Fats"}</span>
                        <span className="font-medium text-slate-500">{fatRatio}% ({fatGrams}g)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full" style={{ width: `${fatRatio}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 rounded-xl text-[10px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                    💡 {isRtl 
                      ? "يُنصح بزيادة حصة البروتين (٣٠٪ - ٣٥٪) لدعم بناء الأنسجة العضلية التالفة وتسريع التأهيل البدني." 
                      : "Higher protein intake (30%-35%) is recommended for clinical tissue recovery during rehabilitation."}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
