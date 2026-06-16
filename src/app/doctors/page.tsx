"use client";

import { useEffect, useState } from "react";
import { Stethoscope, Calendar, Phone, Users, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/LanguageContext";
import { usePermissions } from "@/lib/usePermissions";
import { logAuditAction } from "@/lib/audit";
import { supabase } from "@/lib/supabase";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDoctorEmail, setDeleteDoctorEmail] = useState<string | null>(null);
  const { language, t } = useLanguage();
  const isRtl = language === "ar";
  const { hasPermission } = usePermissions();
  
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    email: "",
    phone: "",
    status: "متاح",
  });

  const loadDoctors = async () => {
    const [{ data: staff, error }, { data: patients }, { data: appointments }] = await Promise.all([
      supabase.from("staff").select("*").order("created_at", { ascending: true }),
      supabase.from("patients").select("assignedDoctor,status"),
      supabase.from("appointments").select("therapist,date"),
    ]);

    if (error) {
      console.error("Failed to load doctors from Supabase", error);
      setDoctors([]);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const isDoctor = (role: string) =>
      ["مدير العياده", "استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي"].includes(role);
    const doctorRows = (staff || []).filter((s: any) =>
      isDoctor(s.role) || String(s.specialty || "").length > 0
    );

    setDoctors(doctorRows.map((doc: any) => ({
      name: doc.name,
      specialty: doc.specialty || doc.role,
      email: doc.email,
      phone: doc.phone || "",
      rating: doc.rating || 5,
      activePatients: (patients || []).filter((p: any) => p.assignedDoctor === doc.name && p.status !== "inactive").length,
      todaySessions: (appointments || []).filter((a: any) => a.therapist === doc.name && a.date === today).length,
      status: doc.status || "متاح",
    })));
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleDeleteDoctorClick = (email: string) => {
    setDeleteDoctorEmail(email);
  };

  const executeDeleteDoctor = async () => {
    if (deleteDoctorEmail === null) return;
    const doctorToDelete = doctors.find(d => d.email === deleteDoctorEmail);
    try {
      const { error } = await supabase.from('staff').delete().eq('email', deleteDoctorEmail);
      if (error) throw error;
      await loadDoctors();
      if (doctorToDelete) {
        logAuditAction("DELETE_STAFF", "STAFF_MANAGEMENT", `Deleted doctor: ${doctorToDelete.name} (${deleteDoctorEmail})`);
      }
      setDeleteDoctorEmail(null);
    } catch (err: any) {
      alert("Error deleting doctor: " + err.message);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.specialty || !formData.email) {
      alert(isRtl ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    const newDoctor = {
      name: formData.name.startsWith("/. ") || formData.name.startsWith("Dr. ") ? formData.name : (isRtl ? `/. ${formData.name}` : `Dr. ${formData.name}`),
      specialty: formData.specialty,
      email: formData.email,
      phone: formData.phone || "0500000000",
      rating: 5.0,
      activePatients: 0,
      todaySessions: 0,
      status: formData.status,
    };

    const { error } = await supabase.from("staff").insert({
      name: newDoctor.name,
      specialty: newDoctor.specialty,
      email: newDoctor.email,
      phone: newDoctor.phone,
      role: "أخصائي علاج طبيعي",
      status: newDoctor.status,
      rating: newDoctor.rating,
    });
    if (error) {
      console.error("Failed to add doctor to Supabase", error);
      alert(isRtl ? "فشلت إضافة المعالج" : "Failed to add therapist");
      return;
    }
    await loadDoctors();
    setIsOpen(false);
    setFormData({
      name: "",
      specialty: "",
      email: "",
      phone: "",
      status: "متاح",
    });
  };

  const getDoctorName = (doc: any) => {
    return isRtl ? doc.name : (
      doc.name === "/. منى حسين" ? "Dr. Mona Hussein" : 
      doc.name === "/. خالد عمر" ? "Dr. Khaled Omar" : 
      doc.name === "/. سارة أحمد" ? "Dr. Sara Ahmed" : doc.name
    );
  };

  const getDoctorSpecialty = (doc: any) => {
    return isRtl ? doc.specialty : (
      doc.specialty === "أخصائي أول علاج طبيعي - عمود فقري" ? "Senior Physical Therapist - Spine" : 
      doc.specialty === "أخصائي علاج طبيعي - مفاصل وركبة" ? "Physical Therapist - Joints & Knee" : 
      doc.specialty === "أخصائي علاج رياضي" ? "Sports Rehab Specialist" : doc.specialty
    );
  };

  const getDoctorStatus = (doc: any) => {
    return isRtl ? doc.status : (doc.status === "متاح" ? "Available" : "On Leave");
  };

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isRtl ? "" : "flex-row-reverse"}`}>
        <div>
          <h1 className={`text-2xl font-bold text-slate-800 flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
            <Stethoscope className="w-6 h-6 text-blue-600" />
            {t("doctors_title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("doctors_subtitle")}</p>
        </div>
        <Button 
          onClick={() => setIsOpen(true)}
          className={`bg-blue-600 hover:bg-blue-700 text-white gap-2 self-start sm:self-auto ${isRtl ? "" : "flex-row-reverse"}`}
        >
          {t("add_therapist")}
        </Button>
      </div>

      {/* Add Doctor Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-bold text-slate-900 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "إضافة معالج جديد" : "Add New Therapist"}</DialogTitle>
            <DialogDescription className={`text-xs text-slate-500 ${isRtl ? "text-right" : "text-left"}`}>
              {isRtl ? "أدخل تفاصيل الطبيب/المعالج لإضافته إلى الموظفين." : "Enter therapist/doctor details to add to staff."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDoctor} className={`space-y-4 py-2 ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
            <div className="space-y-1">
              <Label htmlFor="docName" className="text-xs font-semibold text-slate-700">{isRtl ? "اسم الطبيب/المعالج *" : "Doctor/Therapist Name *"}</Label>
              <Input
                id="docName"
                placeholder={isRtl ? "د. محمد الحربي" : "Dr. Mohamed Al-Harbi"}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className={isRtl ? "text-right" : "text-left"}
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="specialty" className="text-xs font-semibold text-slate-700">{isRtl ? "التخصص *" : "Specialty *"}</Label>
              <Input
                id="specialty"
                placeholder={isRtl ? "أخصائي علاج طبيعي - عمود فقري" : "Physical Therapist - Spine"}
                value={formData.specialty}
                onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                required
                className={isRtl ? "text-right" : "text-left"}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="docEmail" className="text-xs font-semibold text-slate-700">{isRtl ? "البريد الإلكتروني المهني *" : "Professional Email *"}</Label>
              <Input
                id="docEmail"
                type="email"
                placeholder="doctor@primephysio.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                className="font-mono text-left"
              />
            </div>

            <div className={`grid grid-cols-2 gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
              <div className="space-y-1">
                <Label htmlFor="docPhone" className="text-xs font-semibold text-slate-700">{isRtl ? "رقم الجوال المحمول" : "Mobile Phone"}</Label>
                <Input
                  id="docPhone"
                  placeholder="0500000000"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="docStatus" className="text-xs font-semibold text-slate-700">{isRtl ? "الحالة" : "Status"}</Label>
                <select
                  id="docStatus"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="متاح">{isRtl ? "متاح" : "Available"}</option>
                  <option value="في إجازة">{isRtl ? "في إجازة" : "On Leave"}</option>
                </select>
              </div>
            </div>

            <DialogFooter className={`pt-3 border-t mt-4 flex gap-2 ${isRtl ? "justify-end" : "justify-start flex-row-reverse"}`}>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">{isRtl ? "إضافة" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Doctor Confirmation Modal */}
      <Dialog open={deleteDoctorEmail !== null} onOpenChange={(open) => !open && setDeleteDoctorEmail(null)}>
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
                ? "هل أنت متأكد من حذف هذا الطبيب نهائياً؟ سيتم إزالة جميع بياناته ولن يمكنه الدخول مجدداً."
                : "Are you sure you want to permanently delete this doctor? This action cannot be undone."}
            </DialogDescription>
          </div>
          <div className={`mt-6 flex gap-3 w-full ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            <Button type="button" variant="outline" onClick={() => setDeleteDoctorEmail(null)} className="flex-1 rounded-xl font-bold">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="button" onClick={executeDeleteDoctor} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
              {isRtl ? "نعم، احذف" : "Yes, Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doc) => (
          <Card key={doc.email} className="shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className={`flex flex-row items-center gap-4 pb-3 ${isRtl ? "" : "flex-row-reverse"}`}>
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
                {getDoctorName(doc).split(" ").filter(Boolean)[1]?.[0] || getDoctorName(doc)[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className={`text-sm font-bold text-slate-900 truncate ${isRtl ? "text-right" : "text-left"}`}>{getDoctorName(doc)}</h2>
                  <p className={`text-[10px] text-muted-foreground mt-0.5 ${isRtl ? "text-right" : "text-left"}`}>{getDoctorSpecialty(doc)}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-3 border-t">
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block mb-0.5">{t("active_patients")}</span>
                  <strong className="text-slate-800 text-base">{doc.activePatients}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block mb-0.5">{t("today_sessions")}</span>
                  <strong className="text-slate-800 text-base">{doc.todaySessions}</strong>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className={`flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{doc.phone}</span>
                </div>
              </div>

              <div className={`pt-2 flex justify-between items-center border-t ${isRtl ? "" : "flex-row-reverse"}`}>
                <Badge className={`${
                  doc.status === "متاح" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-amber-50 text-amber-700 border-amber-200"
                } font-normal border`}>
                  {getDoctorStatus(doc)}
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs h-8 rounded-lg">
                    {t("view_appointments")}
                  </Button>
                  {hasPermission("manage_staff") && (
                    <Button variant="outline" size="sm" onClick={() => handleDeleteDoctorClick(doc.email)} className="text-xs h-8 rounded-lg text-rose-600 border-rose-200 hover:bg-rose-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
