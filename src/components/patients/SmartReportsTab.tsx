"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, User, Activity, CheckCircle2 } from "lucide-react";
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

export function SmartReportsTab({ patient }: { patient: Patient }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRtl = language === "ar";
  
  const [reportType, setReportType] = useState("referral");
  const [notes, setNotes] = useState("");

  const getReportTitle = () => {
    switch(reportType) {
      case "referral": return isRtl ? "خطاب تحويل طبي (Medical Referral)" : "Medical Referral Letter";
      case "progress": return isRtl ? "تقرير تقدم حالة (Progress Report)" : "Progress Report";
      case "discharge": return isRtl ? "تقرير خروج وتوصيات (Discharge Summary)" : "Discharge Summary";
      default: return "";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:max-w-full print:px-0 print:m-0" dir={isRtl ? "rtl" : "ltr"}>
      {/* Controls (Hidden in Print) */}
      <div className="lg:col-span-1 space-y-6 print:hidden">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-lg text-teal-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              {isRtl ? "إعدادات التقرير" : "Report Settings"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Report Type */}
            <div className="space-y-2">
              <Label>{isRtl ? "نوع التقرير" : "Report Type"}</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  variant={reportType === "referral" ? "default" : "outline"} 
                  onClick={() => setReportType("referral")}
                  className={reportType === "referral" ? "bg-teal-600 hover:bg-teal-700 justify-start" : "justify-start"}
                >
                  <User className="w-4 h-4 mr-2 ml-2" />
                  {isRtl ? "خطاب تحويل" : "Referral Letter"}
                </Button>
                <Button 
                  variant={reportType === "progress" ? "default" : "outline"} 
                  onClick={() => setReportType("progress")}
                  className={reportType === "progress" ? "bg-teal-600 hover:bg-teal-700 justify-start" : "justify-start"}
                >
                  <Activity className="w-4 h-4 mr-2 ml-2" />
                  {isRtl ? "تقرير تقدم" : "Progress Report"}
                </Button>
                <Button 
                  variant={reportType === "discharge" ? "default" : "outline"} 
                  onClick={() => setReportType("discharge")}
                  className={reportType === "discharge" ? "bg-teal-600 hover:bg-teal-700 justify-start" : "justify-start"}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2 ml-2" />
                  {isRtl ? "تقرير خروج" : "Discharge Summary"}
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{isRtl ? "ملاحظات وتوصيات الطبيب" : "Doctor's Notes & Recommendations"}</Label>
              <Textarea 
                rows={4} 
                placeholder={isRtl ? "اكتب تفاصيل الخطة العلاجية والتوصيات..." : "Write treatment plan and recommendations..."}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t flex gap-2">
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={handlePrint}>
                <Download className="w-4 h-4 mr-2 ml-2" />
                {isRtl ? "طباعة" : "Print"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Preview / Print Area */}
      <div className="lg:col-span-2 print:col-span-1 print:w-full">
        <Card className="border-0 shadow-lg min-h-[600px] print:shadow-none print:border-none print:min-h-0">
          <CardContent className="p-10 print:p-0">
            {/* Report Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PRIME PHYSIO</h1>
                <p className="text-sm text-slate-500 font-medium">{isRtl ? "مركز العلاج الطبيعي والتأهيل" : "Physiotherapy & Rehab Center"}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-slate-800">{getReportTitle()}</h2>
                <p className="text-sm text-slate-500 mt-1">{isRtl ? "التاريخ:" : "Date:"} {new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 print:border-slate-300">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">{isRtl ? "اسم المريض" : "Patient Name"}</p>
                  <p className="text-base font-semibold text-slate-900">{isRtl ? patient.nameAr || patient.nameEn : patient.nameEn || patient.nameAr}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">{isRtl ? "رقم الهاتف" : "Phone Number"}</p>
                  <p className="text-base font-semibold text-slate-900">{patient.phone || "N/A"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">{isRtl ? "التشخيص المبدئي" : "Primary Diagnosis"}</p>
                  <p className="text-base font-semibold text-slate-900">{patient.diagnosis || (isRtl ? "غير محدد" : "Not specified")}</p>
                </div>
              </div>

              {/* Dynamic Content based on type */}
              <div className="space-y-4">
                {reportType === "referral" && (
                  <>
                    <h3 className="text-lg font-bold text-slate-800 border-b pb-2">{isRtl ? "إلى من يهمه الأمر / الطبيب المعالج" : "To Whom It May Concern / Attending Physician"}</h3>
                    <p className="text-slate-700 leading-relaxed">
                      {isRtl 
                        ? "نحيل إليكم المريض المذكور أعلاه لاستكمال التقييم الطبي. بناءً على جلسات العلاج الطبيعي، لوحظت الأعراض التالية التي قد تتطلب تقييماً متخصصاً:"
                        : "We are referring the above-mentioned patient for further medical evaluation. Based on physiotherapy sessions, the following symptoms were observed:"}
                    </p>
                  </>
                )}
                
                {reportType === "progress" && (
                  <>
                    <h3 className="text-lg font-bold text-slate-800 border-b pb-2">{isRtl ? "التقدم العلاجي" : "Therapeutic Progress"}</h3>
                    <p className="text-slate-700 leading-relaxed">
                      {isRtl 
                        ? "يخضع المريض المذكور لجلسات تأهيل وعلاج طبيعي منتظمة، وقد أظهر استجابة للبروتوكول العلاجي كالتالي:"
                        : "The patient is undergoing regular physiotherapy rehabilitation and has shown the following response to the protocol:"}
                    </p>
                  </>
                )}

                {reportType === "discharge" && (
                  <>
                    <h3 className="text-lg font-bold text-slate-800 border-b pb-2">{isRtl ? "ملخص الخروج والتوصيات" : "Discharge Summary & Recommendations"}</h3>
                    <p className="text-slate-700 leading-relaxed">
                      {isRtl 
                        ? "أنهى المريض البرنامج التأهيلي بنجاح ووصل للأهداف العلاجية المرجوة. يُنصح باتباع التوصيات التالية للحفاظ على النتائج:"
                        : "The patient has successfully completed the rehab program and reached the desired therapeutic goals. The following recommendations should be followed to maintain results:"}
                    </p>
                  </>
                )}

                {/* Notes Field */}
                <div className="min-h-[200px] mt-6 p-4 bg-white border rounded-lg whitespace-pre-wrap text-slate-700 print:border-none print:p-0">
                  {notes || (isRtl ? "(لا توجد ملاحظات إضافية تم إدخالها)" : "(No additional notes provided)")}
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-16 pt-8 border-t flex justify-between items-end">
                <div className="text-center">
                  <p className="font-bold text-slate-800">{user?.name || "Dr. Physiotherapist"}</p>
                  <p className="text-sm text-slate-500">{isRtl ? "أخصائي العلاج الطبيعي" : "Physiotherapist"}</p>
                </div>
                <div className="text-center border-t border-slate-300 w-48 pt-2">
                  <p className="text-xs text-slate-400">{isRtl ? "التوقيع / الختم" : "Signature / Stamp"}</p>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
