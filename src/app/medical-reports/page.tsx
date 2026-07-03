"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Printer, Download, User, Calendar, Activity, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function MedicalReportsPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRtl = language === "ar";
  
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [reportType, setReportType] = useState("referral");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function fetchPatients() {
      if (!user?.clinicId) return;
      const { data } = await supabase
        .from("patients")
        .select("id, nameAr, nameEn, phone, diagnosis")
        .eq("clinic_id", user.clinicId);
      if (data) setPatients(data);
    }
    fetchPatients();
  }, [user?.clinicId]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

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
    <div className="min-h-screen bg-slate-50/50 pb-20 print:bg-white print:pb-0" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header (Hidden in Print) */}
      <div className="bg-gradient-to-b from-[#4F46BA] to-[#7c3aed] text-white pt-10 pb-20 px-6 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">{isRtl ? "التقارير الطبية" : "Medical Reports"}</h1>
            <p className="text-white/80 text-sm mt-1">
              {isRtl ? "إصدار تقارير طبية رسمية للمرضى" : "Generate official medical reports for patients"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:max-w-full print:px-0 print:m-0">
        
        {/* Controls (Hidden in Print) */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-white border-b pb-4">
              <CardTitle className="text-lg text-indigo-950">{isRtl ? "إعدادات التقرير" : "Report Settings"}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Select Patient */}
              <div className="space-y-2">
                <Label>{isRtl ? "اختر المريض" : "Select Patient"}</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                >
                  <option value="">{isRtl ? "-- اختر مريضاً --" : "-- Select Patient --"}</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {isRtl ? p.nameAr || p.nameEn : p.nameEn || p.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Report Type */}
              <div className="space-y-2">
                <Label>{isRtl ? "نوع التقرير" : "Report Type"}</Label>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant={reportType === "referral" ? "default" : "outline"} 
                    onClick={() => setReportType("referral")}
                    className="justify-start"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {isRtl ? "خطاب تحويل" : "Referral Letter"}
                  </Button>
                  <Button 
                    variant={reportType === "progress" ? "default" : "outline"} 
                    onClick={() => setReportType("progress")}
                    className="justify-start"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    {isRtl ? "تقرير تقدم" : "Progress Report"}
                  </Button>
                  <Button 
                    variant={reportType === "discharge" ? "default" : "outline"} 
                    onClick={() => setReportType("discharge")}
                    className="justify-start"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
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
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handlePrint} disabled={!selectedPatientId}>
                  <Printer className="w-4 h-4 mr-2" />
                  {isRtl ? "طباعة" : "Print"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Preview / Print Area */}
        <div className="lg:col-span-2 print:col-span-1 print:w-full">
          <Card className="border-0 shadow-lg min-h-[800px] print:shadow-none print:border-none print:min-h-0">
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

              {!selectedPatient ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 print:hidden">
                  <FileText className="w-16 h-16 mb-4 opacity-20" />
                  <p>{isRtl ? "يرجى اختيار مريض لعرض التقرير" : "Please select a patient to view the report"}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Patient Info */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 print:border-slate-300">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">{isRtl ? "اسم المريض" : "Patient Name"}</p>
                      <p className="text-base font-semibold text-slate-900">{isRtl ? selectedPatient.nameAr || selectedPatient.nameEn : selectedPatient.nameEn || selectedPatient.nameAr}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">{isRtl ? "رقم الهاتف" : "Phone Number"}</p>
                      <p className="text-base font-semibold text-slate-900">{selectedPatient.phone || "N/A"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-slate-500 uppercase">{isRtl ? "التشخيص المبدئي" : "Primary Diagnosis"}</p>
                      <p className="text-base font-semibold text-slate-900">{selectedPatient.diagnosis || (isRtl ? "غير محدد" : "Not specified")}</p>
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
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
