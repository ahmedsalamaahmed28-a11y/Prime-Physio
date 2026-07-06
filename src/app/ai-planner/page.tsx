"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Activity, UserCircle, ShieldAlert, Sparkles, Printer, Save, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AiPlannerPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [diagnosis, setDiagnosis] = useState("");
  const [age, setAge] = useState("");
  const [activityLevel, setActivityLevel] = useState(isRtl ? "متوسط" : "Moderate");
  const [precautions, setPrecautions] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState("");
  const [provider, setProvider] = useState("");

  const handleGenerate = async () => {
    if (!diagnosis || !age) {
      alert(isRtl ? "يرجى إدخال التشخيص والعمر على الأقل" : "Please enter at least the diagnosis and age");
      return;
    }

    setIsGenerating(true);
    setGeneratedPlan("");

    const promptText = isRtl
      ? `قم بإنشاء خطة تأهيل وعلاج طبيعي متكاملة لمدة 4 أسابيع لمريض. 
التشخيص: ${diagnosis}
العمر: ${age} سنة
مستوى النشاط: ${activityLevel}
المحاذير الطبية: ${precautions || "لا يوجد"}

يرجى تقسيم الخطة إلى 4 أسابيع بوضوح، مع ذكر الأهداف، التمارين، والمحاذير لكل أسبوع. استخدم تنسيق Markdown.`
      : `Create a comprehensive 4-week physical therapy rehabilitation plan for a patient.
Diagnosis: ${diagnosis}
Age: ${age} years old
Activity Level: ${activityLevel}
Medical Precautions: ${precautions || "None"}

Please divide the plan clearly into 4 weeks, mentioning goals, exercises, and precautions for each week. Use Markdown formatting.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: promptText }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedPlan(data.content);
        setProvider(data.provider || "AI");
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (e) {
      console.error(e);
      alert(isRtl ? "حدث خطأ أثناء التوليد" : "An error occurred during generation");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPlan);
    alert(isRtl ? "تم النسخ!" : "Copied!");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 print:bg-white print:pb-0" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-gradient-to-b from-[#4F46BA] to-[#7c3aed] text-white pt-10 pb-20 px-6 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">{isRtl ? "مولد الخطط الذكي" : "AI Treatment Planner"}</h1>
            <p className="text-white/80 text-sm mt-1">
              {isRtl 
                ? "إنشاء خطط تأهيل مخصصة في ثوانٍ بالاعتماد على الذكاء الاصطناعي" 
                : "Generate customized rehab protocols in seconds using AI"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 print:block print:max-w-full print:px-0 print:m-0">
        
        {/* Input Form (Left) */}
        <div className="lg:col-span-4 space-y-6 print:hidden">
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-white border-b pb-4">
              <CardTitle className="text-lg text-indigo-950 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                {isRtl ? "بيانات الحالة" : "Patient Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-500" />
                  {isRtl ? "التشخيص الطبي" : "Medical Diagnosis"} <span className="text-rose-500">*</span>
                </Label>
                <Input 
                  placeholder={isRtl ? "مثال: تمزق الرباط الصليبي الأمامي" : "e.g., ACL Tear"}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-slate-500" />
                    {isRtl ? "العمر" : "Age"} <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    type="number"
                    placeholder="28"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRtl ? "مستوى النشاط" : "Activity Level"}</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value)}
                  >
                    <option value={isRtl ? "خامل" : "Sedentary"}>{isRtl ? "خامل" : "Sedentary"}</option>
                    <option value={isRtl ? "متوسط" : "Moderate"}>{isRtl ? "متوسط" : "Moderate"}</option>
                    <option value={isRtl ? "نشط" : "Active"}>{isRtl ? "نشط" : "Active"}</option>
                    <option value={isRtl ? "رياضي" : "Athlete"}>{isRtl ? "رياضي" : "Athlete"}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-500" />
                  {isRtl ? "المحاذير الطبية (اختياري)" : "Precautions (Optional)"}
                </Label>
                <Textarea 
                  placeholder={isRtl ? "مثال: يمنع ثني الركبة أكثر من 90 درجة" : "e.g., No knee flexion beyond 90 degrees"}
                  value={precautions}
                  onChange={(e) => setPrecautions(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md h-12 text-base font-semibold"
                onClick={handleGenerate}
                disabled={isGenerating || !diagnosis || !age}
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    {isRtl ? "جاري التوليد..." : "Generating..."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    {isRtl ? "توليد خطة تأهيل" : "Generate Rehab Plan"}
                  </span>
                )}
              </Button>

            </CardContent>
          </Card>
        </div>

        {/* Output Area (Right) */}
        <div className="lg:col-span-8 print:col-span-1 print:w-full">
          <Card className="border-0 shadow-lg min-h-[600px] h-full flex flex-col print:shadow-none print:border-none print:min-h-0">
            <CardHeader className="bg-slate-50 border-b print:hidden flex flex-row items-center justify-between py-4">
              <CardTitle className="text-lg text-slate-800">
                {isRtl ? "الخطة المقترحة" : "Proposed Plan"}
              </CardTitle>
              {generatedPlan && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 text-slate-600">
                    <Copy className="w-4 h-4" />
                    {isRtl ? "نسخ" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                    <Printer className="w-4 h-4" />
                    {isRtl ? "طباعة" : "Print"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6 flex-1 overflow-auto bg-white print:p-0">
              
              {!generatedPlan && !isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 print:hidden space-y-4 opacity-60 mt-20">
                  <Brain className="w-20 h-20" />
                  <p className="text-lg text-center max-w-sm">
                    {isRtl 
                      ? "أدخل بيانات الحالة الطبية ثم اضغط على 'توليد' لإنشاء خطة التأهيل الكاملة المخصصة للمريض." 
                      : "Enter patient details and click 'Generate' to create a customized full rehab plan."}
                  </p>
                </div>
              )}

              {isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-indigo-400 mt-20 space-y-6">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-indigo-100 rounded-full"></div>
                    <div className="w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                    <Sparkles className="w-8 h-8 absolute top-8 left-8 text-indigo-500 animate-pulse" />
                  </div>
                  <p className="text-lg font-medium text-slate-600">
                    {isRtl ? "الذكاء الاصطناعي يقوم بتحليل الحالة وبناء الخطة..." : "AI is analyzing the case and building the plan..."}
                  </p>
                </div>
              )}

              {generatedPlan && !isGenerating && (
                <div className="prose prose-slate max-w-none prose-headings:text-indigo-900 prose-a:text-indigo-600 rtl:prose-p:text-right rtl:prose-ul:text-right rtl:prose-ol:text-right">
                  <div className="hidden print:block mb-8 border-b-2 border-indigo-600 pb-4">
                    <h1 className="text-3xl font-bold text-indigo-900 mb-2">PRIME PHYSIO</h1>
                    <h2 className="text-xl text-slate-600">{isRtl ? "خطة التأهيل والعلاج الطبيعي" : "Rehabilitation & Physical Therapy Plan"}</h2>
                    <div className="mt-4 flex gap-6 text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg">
                      <p><strong>{isRtl ? "التشخيص:" : "Diagnosis:"}</strong> {diagnosis}</p>
                      <p><strong>{isRtl ? "العمر:" : "Age:"}</strong> {age}</p>
                      <p><strong>{isRtl ? "التاريخ:" : "Date:"}</strong> {new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</p>
                    </div>
                  </div>
                  
                  <ReactMarkdown>{generatedPlan}</ReactMarkdown>
                  
                  <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400 print:hidden">
                    <p>{isRtl ? "تحذير: هذه الخطة مولدة بالذكاء الاصطناعي ويجب مراجعتها من قبل الطبيب المعالج قبل تطبيقها." : "Disclaimer: This plan is AI-generated and must be reviewed by the attending physician before implementation."}</p>
                    <Badge variant="outline" className="bg-slate-50">{isRtl ? "تم التوليد بواسطة" : "Generated by"} {provider}</Badge>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
