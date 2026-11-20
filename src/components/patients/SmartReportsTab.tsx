"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, User, Activity, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Patient {
  id: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  diagnosis?: string;
}

type ReportType = "referral" | "progress" | "discharge";

export function SmartReportsTab({ patient }: { patient: Patient }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRtl = language === "ar";

  const [reportType, setReportType] = useState<ReportType>("referral");
  const [notes, setNotes] = useState("");
  const [rom, setRom] = useState("");
  const [vasScore, setVasScore] = useState("5");
  const [externalConsent, setExternalConsent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState("");
  const [error, setError] = useState("");

  const getReportTitle = () => {
    switch (reportType) {
      case "referral": return isRtl ? "خطاب تحويل طبي" : "Medical Referral Letter";
      case "progress": return isRtl ? "تقرير تقدم الحالة" : "Progress Report";
      case "discharge": return isRtl ? "ملخص الخروج" : "Discharge Summary";
    }
  };

  const handleGenerate = async () => {
    if (!externalConsent) {
      setError(isRtl ? "يجب تأكيد موافقة المريض أو ممثله المخول أولاً." : "Confirm that the patient or authorized representative has consented first.");
      return;
    }
    if (!patient.diagnosis?.trim() || !rom.trim() || !notes.trim()) {
      setError(isRtl ? "أدخل التشخيص ونتائج الحركة والملاحظات السريرية أولاً." : "Enter the diagnosis, ROM findings, and clinical notes first.");
      return;
    }

    setIsGenerating(true);
    setError("");
    setGeneratedReport("");
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          type: reportType,
          patientId: patient.id,
          consentToExternalProcessing: true,
          // patientId is used only for a clinic-scoped server lookup and is never forwarded to the AI provider.
          clinicalData: {
            vasScore: Number(vasScore),
            rom,
            notes,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.report !== "string") {
        throw new Error(payload.error || (isRtl ? "تعذر إنشاء التقرير." : "Unable to generate the report."));
      }
      setGeneratedReport(payload.report);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (isRtl ? "حدث خطأ غير متوقع." : "An unexpected error occurred."));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:max-w-full print:px-0 print:m-0" dir={isRtl ? "rtl" : "ltr"}>
      <div className="lg:col-span-1 space-y-6 print:hidden">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-lg text-teal-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              {isRtl ? "إعدادات التقرير" : "Report Settings"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>{isRtl ? "نوع التقرير" : "Report Type"}</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button type="button" variant={reportType === "referral" ? "default" : "outline"} onClick={() => setReportType("referral")} className={reportType === "referral" ? "bg-teal-600 hover:bg-teal-700 justify-start" : "justify-start"}>
                  <User className="w-4 h-4 mr-2 ml-2" />{isRtl ? "خطاب تحويل" : "Referral Letter"}
                </Button>
                <Button type="button" variant={reportType === "progress" ? "default" : "outline"} onClick={() => setReportType("progress")} className={reportType === "progress" ? "bg-teal-600 hover:bg-teal-700 justify-start" : "justify-start"}>
                  <Activity className="w-4 h-4 mr-2 ml-2" />{isRtl ? "تقرير تقدم" : "Progress Report"}
                </Button>
                <Button type="button" variant={reportType === "discharge" ? "default" : "outline"} onClick={() => setReportType("discharge")} className={reportType === "discharge" ? "bg-teal-600 hover:bg-teal-700 justify-start" : "justify-start"}>
                  <CheckCircle2 className="w-4 h-4 mr-2 ml-2" />{isRtl ? "تقرير خروج" : "Discharge Summary"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isRtl ? "التشخيص" : "Diagnosis"}</Label>
              <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700 min-h-10">
                {patient.diagnosis || (isRtl ? "لا يوجد تشخيص مسجل" : "No diagnosis recorded")}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-vas">{isRtl ? "درجة الألم (VAS من 0 إلى 10)" : "Pain score (VAS 0–10)"}</Label>
              <input id="report-vas" type="number" min="0" max="10" step="1" value={vasScore} onChange={(event) => setVasScore(event.target.value)} className="w-full rounded-md border border-slate-300 bg-background px-3 py-2 text-sm" />
            </div>

            <div className="space-y-2">
              <Label>{isRtl ? "نتائج المدى الحركي والفحص الموضوعي" : "ROM and objective findings"}</Label>
              <Textarea rows={3} value={rom} onChange={(event) => setRom(event.target.value)} placeholder={isRtl ? "أدخل النتائج المقاسة فقط..." : "Enter measured findings only..."} />
            </div>

            <div className="space-y-2">
              <Label>{isRtl ? "ملاحظات وتوصيات الطبيب" : "Clinical notes and recommendations"}</Label>
              <Textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={isRtl ? "اكتب الملاحظات السريرية دون اسم المريض أو رقم الملف أو الهاتف..." : "Enter clinical notes without patient name, file number, or phone..."} />
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                {isRtl ? "موافقة مشاركة البيانات" : "External AI processing consent"}
              </div>
              <p className="text-xs leading-5 text-amber-900">
                {isRtl
                  ? "سيتم إرسال التشخيص ودرجة الألم ونتائج الحركة والملاحظات السريرية فقط إلى مزود ذكاء اصطناعي خارجي (DeepSeek أو Gemini) لإنشاء التقرير. لن نرسل الاسم أو الهاتف أو رقم الملف أو تاريخ الميلاد أو النوع. لا تضع أي معلومات تعريفية داخل الملاحظات."
                  : "Only diagnosis, pain score, ROM findings, and clinical notes will be sent to an external AI provider (DeepSeek or Gemini). Patient name, phone, file number, date of birth, and gender are not sent. Do not include identifying details in free-text notes."}
              </p>
              <label className="flex items-start gap-2 text-sm text-amber-950 cursor-pointer">
                <input type="checkbox" checked={externalConsent} onChange={(event) => setExternalConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" />
                <span>{isRtl ? "أؤكد أن موافقة المريض أو ممثله المخول على معالجة هذه البيانات السريرية بواسطة مزود خارجي قد تم الحصول عليها." : "I confirm that the patient or authorized representative has consented to this clinical data being processed by an external provider."}</span>
              </label>
            </div>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <Button type="button" className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleGenerate} disabled={isGenerating || !externalConsent}>
              <Sparkles className="w-4 h-4 mr-2 ml-2" />
              {isGenerating ? (isRtl ? "جارٍ إنشاء التقرير..." : "Generating report...") : (isRtl ? "إنشاء تقرير بالذكاء الاصطناعي" : "Generate AI Report")}
            </Button>
            <p className="text-xs text-slate-500">{isRtl ? "لا يتم إرسال أي بيانات قبل تحديد الموافقة والضغط على زر الإنشاء." : "No data is sent until consent is checked and Generate is pressed."}</p>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 print:col-span-1 print:w-full">
        <Card className="border-0 shadow-lg min-h-[600px] print:shadow-none print:border-none print:min-h-0">
          <CardContent className="p-8 print:p-0">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PRIME PHYSIO</h1>
                <p className="text-sm text-slate-500 font-medium">{isRtl ? "مركز العلاج الطبيعي والتأهيل" : "Physiotherapy & Rehab Center"}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-slate-800">{getReportTitle()}</h2>
                <p className="text-sm text-slate-500 mt-1">{isRtl ? "التاريخ:" : "Date:"} {new Date().toLocaleDateString(isRtl ? "ar-EG" : "en-US")}</p>
              </div>
            </div>

            <div className="mb-6 rounded-lg border bg-slate-50 p-4 print:border-slate-300">
              <p className="text-xs font-bold text-slate-500 uppercase">{isRtl ? "المريض (للعرض المحلي فقط)" : "Patient (local display only)"}</p>
              <p className="text-base font-semibold text-slate-900">{isRtl ? patient.nameAr || patient.nameEn : patient.nameEn || patient.nameAr}</p>
              <p className="text-sm text-slate-600">{isRtl ? "رقم الهاتف:" : "Phone:"} {patient.phone || "N/A"}</p>
              <p className="text-sm text-slate-600">{isRtl ? "التشخيص:" : "Diagnosis:"} {patient.diagnosis || (isRtl ? "غير محدد" : "Not specified")}</p>
            </div>

            {generatedReport ? (
              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{generatedReport}</div>
            ) : (
              <div className="min-h-[300px] flex flex-col items-center justify-center text-center text-slate-400 gap-3">
                <FileText className="h-12 w-12" />
                <p>{isRtl ? "أدخل البيانات السريرية واحصل على الموافقة لإنشاء التقرير." : "Enter the clinical findings and obtain consent to generate the report."}</p>
              </div>
            )}

            <div className="mt-16 pt-8 border-t flex justify-between items-end print:mt-10">
              <div className="text-center">
                <p className="font-bold text-slate-800">{user?.name || "Dr. Physiotherapist"}</p>
                <p className="text-sm text-slate-500">{isRtl ? "أخصائي العلاج الطبيعي" : "Physiotherapist"}</p>
              </div>
              <div className="text-center border-t border-slate-300 w-48 pt-2">
                <p className="text-xs text-slate-400">{isRtl ? "التوقيع / الختم" : "Signature / Stamp"}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end print:hidden">
              <Button type="button" variant="outline" onClick={handlePrint} disabled={!generatedReport}>
                <Download className="w-4 h-4 mr-2 ml-2" />{isRtl ? "طباعة التقرير" : "Print report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
