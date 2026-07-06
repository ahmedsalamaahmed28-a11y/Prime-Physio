"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Activity, User, ShieldAlert, Sparkles, Download, Save, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Patient {
  id: string;
  nameAr: string;
  nameEn: string;
  age: number;
  diagnosis?: string;
}

export function AiPlannerTab({ patient }: { patient: Patient }) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  
  const [diagnosis, setDiagnosis] = useState(patient.diagnosis || "");
  const [age, setAge] = useState(patient.age?.toString() || "");
  const [activityLevel, setActivityLevel] = useState(isRtl ? "متوسط" : "Moderate");
  const [precautions, setPrecautions] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [provider, setProvider] = useState("Gemini Pro 1.5");

  // Sync state if patient changes
  useEffect(() => {
    setDiagnosis(patient.diagnosis || "");
    setAge(patient.age?.toString() || "");
  }, [patient]);

  const handleGenerate = async () => {
    if (!diagnosis || !age) return;
    
    setIsGenerating(true);
    setGeneratedPlan("");
    
    try {
      const prompt = `
Generate a comprehensive physical therapy rehabilitation plan.
Patient Details:
- Diagnosis: ${diagnosis}
- Age: ${age}
- Activity Level: ${activityLevel}
- Precautions/Contraindications: ${precautions || "None"}

Please structure the plan into:
1. Initial Phase (Weeks 1-2): Goals, Modalities, Exercises
2. Intermediate Phase (Weeks 3-4): Goals, Exercises
3. Advanced/Return to Function Phase (Weeks 5+): Goals, Exercises
4. Home Exercise Program (HEP) advice

Output the plan entirely in ${isRtl ? "Arabic" : "English"}, formatted in Markdown.
`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) throw new Error("Failed to generate plan");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        let plan = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const text = parsed.choices[0]?.delta?.content || "";
                plan += text;
                setGeneratedPlan(plan);
              } catch (e) {
                console.error("Error parsing stream chunk", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert(isRtl ? "حدث خطأ أثناء توليد الخطة" : "Error generating plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPlan);
    alert(isRtl ? "تم النسخ بنجاح" : "Copied to clipboard");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 print:block print:max-w-full print:px-0 print:m-0" dir={isRtl ? "rtl" : "ltr"}>
      {/* Input Area (Left) */}
      <div className="lg:col-span-4 space-y-6 print:hidden">
        <Card className="border-0 shadow-lg bg-white/50 backdrop-blur-sm border-indigo-100/50">
          <CardHeader className="bg-indigo-50/50 border-b border-indigo-100/50 pb-4">
            <CardTitle className="text-lg text-indigo-950 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              {isRtl ? "تفاصيل الحالة" : "Case Details"}
            </CardTitle>
            <CardDescription>
              {isRtl ? "أدخل تفاصيل الحالة لتوليد الخطة" : "Enter case details to generate plan"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" />
                {isRtl ? "التشخيص الطبي" : "Medical Diagnosis"} <span className="text-rose-500">*</span>
              </Label>
              <Input 
                placeholder={isRtl ? "مثال: قطع في الرباط الصليبي الأمامي" : "e.g., ACL Tear"}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
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
                {isRtl ? "موانع ومحاذير (اختياري)" : "Precautions (Optional)"}
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
                  {isRtl ? "جارِ التوليد..." : "Generating..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
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
                  <Download className="w-4 h-4" />
                  {isRtl ? "طباعة" : "Print"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-6 flex-1 overflow-auto bg-white print:p-0">
            
            {!generatedPlan && !isGenerating && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 print:hidden space-y-4 opacity-60 mt-20">
                <Sparkles className="w-20 h-20" />
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
  );
}
