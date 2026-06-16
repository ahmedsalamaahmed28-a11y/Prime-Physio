"use client";

import { useState, useEffect } from "react";
import { Users, Phone, Calendar, Edit, Trash2, Stethoscope, Star } from "lucide-react";
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
import { logAuditAction } from "@/lib/audit";
import { usePermissions } from "@/lib/usePermissions";
import { supabase } from "@/lib/supabase";

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { language, t } = useLanguage();
  const isRtl = language === "ar";
  const { hasPermission } = usePermissions();

  const translateName = (arName: string) => {
    if (isRtl || !arName) return arName || "";
    const cleanName = arName.trim().replace("د/ ", "د. ");
    const map: Record<string, string> = {
      "أحمد سلامة": "Ahmed Salama",
      "د. أحمد سلامة": "Dr. Ahmed Salama",
      "منى حسين": "Mona Hussein",
      "د. منى حسين": "Dr. Mona Hussein",
      "خالد عمر": "Khaled Omar",
      "د. خالد عمر": "Dr. Khaled Omar",
      "سارة أحمد": "Sara Ahmed",
      "د. سارة أحمد": "Dr. Sara Ahmed",
      "سحر طارق": "Sahar Tarek"
    };
    return map[cleanName] || cleanName;
  };

  useEffect(() => {
    fetchStaff();
    fetchRelatedCounts();
  }, []);

  const fetchRelatedCounts = async () => {
    const [{ data: patientRows }, { data: appointmentRows }] = await Promise.all([
      supabase.from("patients").select("assignedDoctor,status"),
      supabase.from("appointments").select("therapist,date"),
    ]);

    setPatients(patientRows || []);
    setAppointments(appointmentRows || []);
  };

  const isDoctorRole = (role: string) =>
    ["مدير العياده", "استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي"].includes(role);

  const doctorRows = staff.filter((member) => isDoctorRole(member.role) || String(member.specialty || "").length > 0);
  const employeeRows = staff.filter((member) => !isDoctorRole(member.role) && !String(member.specialty || "").length);

  const today = new Date().toISOString().slice(0, 10);

  const getDoctorTitle = (member: any) => {
    if (member.name?.startsWith("د.") || member.name?.startsWith("Dr.")) return member.name;
    return `د. ${translateName(member.name)}`;
  };

  const getDoctorSpecialty = (member: any) => {
    if (member.specialty) return translateName(member.specialty);
    return translateName(member.role);
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      
      setStaff(data || []);
    } catch (e) {
      console.error("Failed to fetch staff from Supabase", e);
    }
  };
  
  const [formData, setFormData] = useState({
    name: "",
    role: "أخصائي علاج طبيعي",
    email: "",
    phone: "",
  });

  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [deleteStaffEmail, setDeleteStaffEmail] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    status: "نشط"
  });

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert(isRtl ? "الرجاء تعبئة الاسم والبريد الإلكتروني" : "Please fill in Name and Email");
      return;
    }

    let formattedName = formData.name.trim();
    const isDoctorOrAdmin = ["مدير العياده", "استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي"].includes(formData.role);
    if (isDoctorOrAdmin && !formattedName.startsWith("د.") && !formattedName.startsWith("د/")) {
      formattedName = `د. ${formattedName}`;
    }

    const newStaff = {
      name: formattedName,
      role: formData.role,
      email: formData.email,
      phone: formData.phone || "0500000000",
      status: "نشط",
      permissions: [],
    };

    try {
      const { error } = await supabase.from('staff').insert([newStaff]);
      if (error) throw error;
      
      await fetchStaff();
      logAuditAction("CREATE_STAFF", "STAFF_MANAGEMENT", `Added new staff member: ${formattedName} (${formData.email})`);
      
      setIsOpen(false);
      setFormData({
        name: "",
        role: "أخصائي علاج طبيعي",
        email: "",
        phone: "",
      });
    } catch (err: any) {
      alert("Error adding staff: " + err.message);
    }
  };

  const handleEditClick = (member: any) => {
    setEditingEmail(member.email);
    setEditFormData({
      name: member.name,
      role: member.role,
      email: member.email,
      phone: member.phone,
      status: member.status
    });
    setIsEditOpen(true);
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name) {
      alert(isRtl ? "الرجاء تعبئة الاسم" : "Please fill in Name");
      return;
    }

    let formattedName = editFormData.name.trim();
    const isDoctorOrAdmin = ["مدير العياده", "استشاري علاج طبيعي", "أخصائي علاج طبيعي", "ممارس علاج طبيعي"].includes(editFormData.role);
    if (isDoctorOrAdmin && !formattedName.startsWith("د.") && !formattedName.startsWith("د/")) {
      formattedName = `د. ${formattedName}`;
    }

    try {
      const { error } = await supabase.from('staff').update({
        name: formattedName,
        role: editFormData.role,
        phone: editFormData.phone,
        status: editFormData.status
      }).eq('email', editingEmail);

      if (error) throw error;

      await fetchStaff();
      logAuditAction("UPDATE_STAFF", "STAFF_MANAGEMENT", `Updated details for staff member: ${formattedName} (${editingEmail})`);
      
      setIsEditOpen(false);
      setEditingEmail(null);
    } catch (err: any) {
      alert("Error updating staff: " + err.message);
    }
  };

  const handleDeleteStaffClick = (email: string) => {
    setDeleteStaffEmail(email);
  };

  const executeDeleteStaff = async () => {
    if (deleteStaffEmail === null) return;
    const staffToDelete = staff.find(m => m.email === deleteStaffEmail);
    
    try {
      const { error } = await supabase.from('staff').delete().eq('email', deleteStaffEmail);
      if (error) throw error;
      
      await fetchStaff();
      
      if (staffToDelete) {
        logAuditAction("DELETE_STAFF", "STAFF_MANAGEMENT", `Deleted staff member: ${staffToDelete.name} (${deleteStaffEmail})`);
      }
      setDeleteStaffEmail(null);
    } catch (err: any) {
      alert("Error deleting staff: " + err.message);
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isRtl ? "" : "flex-row-reverse"}`}>
        <div>
          <h1 className={`text-2xl font-bold text-slate-800 flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
            <div className="bg-teal-50 p-2 rounded-xl">
              <Users className="w-6 h-6 text-[#0d8a8a]" />
            </div>
            {isRtl ? "إدارة الطاقم الطبي والموظفين" : "Medical Staff & Employees"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isRtl ? "إدارة وتعديل بيانات المعالجين، الاستقبال، والموظفين في العيادة" : "Manage clinic therapist records, receptionist profiles, and staff accounts"}
          </p>
        </div>
        {hasPermission("manage_staff") && (
          <Button onClick={() => setIsOpen(true)} className="bg-[#0d8a8a] hover:bg-[#085454] text-white gap-2 self-start sm:self-auto rounded-xl font-bold px-6 shadow-md transition-all active:scale-95">
            <Users className="w-4 h-4" />
            {isRtl ? "إضافة موظف جديد" : "Add New Employee"}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <section id="doctors" className="space-y-3">
          <div className={`flex items-center justify-between ${isRtl ? "" : "flex-row-reverse"}`}>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#0d8a8a]" />
              {isRtl ? `الأطباء (${doctorRows.length})` : `Doctors (${doctorRows.length})`}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctorRows.map((doc) => (
              <Card key={doc.email} className="shadow-xs hover:shadow-md transition-shadow">
                <CardHeader className={`flex flex-row items-center gap-4 pb-3 ${isRtl ? "" : "flex-row-reverse"}`}>
                  <div className="w-14 h-14 rounded-full bg-teal-100 text-[#0d8a8a] flex items-center justify-center font-bold text-xl">
                    {getDoctorTitle(doc).split(" ").filter(Boolean)[1]?.[0] || getDoctorTitle(doc)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-bold text-slate-900 truncate ${isRtl ? "text-right" : "text-left"}`}>{getDoctorTitle(doc)}</h3>
                    <p className={`text-[10px] text-muted-foreground mt-0.5 ${isRtl ? "text-right" : "text-left"}`}>{getDoctorSpecialty(doc)}</p>
                    <div className={`flex items-center gap-1 mt-1 text-xs text-amber-500 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold">{doc.rating || 5}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-3 border-t">
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg">
                      <span className="text-slate-400 block mb-0.5">{t("active_patients")}</span>
                      <strong className="text-slate-800 text-base">
                        {patients.filter((p) => p.assignedDoctor === doc.name && p.status !== "inactive").length}
                      </strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg">
                      <span className="text-slate-400 block mb-0.5">{t("today_sessions")}</span>
                      <strong className="text-slate-800 text-base">
                        {appointments.filter((a) => a.therapist === doc.name && a.date === today).length}
                      </strong>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    <div className={`flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{doc.phone || ""}</span>
                    </div>
                  </div>
                  {hasPermission("manage_staff") && (
                    <div className="pt-2 border-t flex justify-center">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteStaffClick(doc.email)} className="text-rose-600 hover:text-rose-700 text-xs gap-1">
                        <Trash2 className="w-3.5 h-3.5" />
                        {isRtl ? "حذف" : "Delete"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="employees" className="space-y-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0d8a8a]" />
            {isRtl ? `الموظفون (${employeeRows.length})` : `Employees (${employeeRows.length})`}
          </h2>
          <Card className="shadow-xs border-slate-100">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-bold">
                {isRtl ? `الطاقم الإداري (${employeeRows.length})` : `Administrative Staff (${employeeRows.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse" dir={isRtl ? "rtl" : "ltr"}>
                  <thead>
                    <tr className="bg-muted/40 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-6">{isRtl ? "الموظف" : "Employee"}</th>
                      <th className="py-3.5 px-6">{isRtl ? "الدور الوظيفي" : "Role"}</th>
                      <th className="py-3.5 px-6">{isRtl ? "رقم الجوال" : "Phone"}</th>
                      <th className="py-3.5 px-6">{isRtl ? "تاريخ الانضمام" : "Date Joined"}</th>
                      <th className="py-3.5 px-6">{isRtl ? "الحالة" : "Status"}</th>
                      <th className="py-3.5 px-6 text-center">{isRtl ? "الإجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm text-slate-700">
                    {employeeRows.map((member) => (
                      <tr key={member.email} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-900">{translateName(member.name)}</div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            {isRtl ? member.role : 
                              member.role === "مدير العياده" ? "Clinic Manager" :
                              member.role === "استشاري علاج طبيعي" ? "Physio Consultant" :
                              member.role === "أخصائي علاج طبيعي" ? "Physio Specialist" :
                              member.role === "ممارس علاج طبيعي" ? "Physio Practitioner" :
                              member.role === "موظف استقبال" ? "Receptionist" : member.role}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 font-mono text-xs">{member.phone}</td>
                        <td className="py-4 px-6 font-mono text-xs">{member.dateJoined}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 font-medium text-xs ${member.status === "نشط" ? "text-emerald-600" : "text-slate-400"}`}>
                            {isRtl ? member.status : (member.status === "نشط" ? "Active" : "Inactive")}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex justify-center gap-2">
                            {hasPermission("manage_staff") ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleEditClick(member)}
                                  className="text-blue-600 hover:text-blue-700 text-xs gap-1"
                                >
                                  {isRtl ? "تعديل" : "Edit"}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDeleteStaffClick(member.email)}
                                  className="text-rose-600 hover:text-rose-700 text-xs gap-1"
                                >
                                  {isRtl ? "حذف" : "Delete"}
                                </Button>
                              </>
                            ) : (
                              <span className="text-slate-300 text-xs">--</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Add Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader className={isRtl ? "text-right" : "text-left"}>
            <DialogTitle>{isRtl ? "إضافة موظف جديد" : "Add New Employee"}</DialogTitle>
            <DialogDescription>
              {isRtl ? "أدخل تفاصيل الموظف الجديد وسيتم مزامنته تلقائياً مع حسابات الصلاحيات." : "Fill in details to add a new employee profile to clinic records."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4 py-4">
            <div className="space-y-1 text-right">
              <Label>{isRtl ? "الاسم الكامل" : "Full Name"}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={isRtl ? "أدخل الاسم الثنائي أو الثلاثي" : "Enter full name"}
                required
              />
            </div>
            <div className="space-y-1 text-right">
              <Label>{isRtl ? "البريد الإلكتروني" : "Email Address"}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="example@primephysio.com"
                required
              />
            </div>
            <div className="space-y-1 text-right">
              <Label>{isRtl ? "رقم الجوال" : "Phone Number"}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="0501234567"
              />
            </div>
            <div className="space-y-1 text-right">
              <Label>{isRtl ? "الدور الوظيفي" : "Role"}</Label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
              >
                <option value="مدير العياده">{isRtl ? "مدير العياده" : "Clinic Manager"}</option>
                <option value="استشاري علاج طبيعي">{isRtl ? "استشاري علاج طبيعي" : "Physiotherapy Consultant"}</option>
                <option value="أخصائي علاج طبيعي">{isRtl ? "أخصائي علاج طبيعي" : "Physiotherapy Specialist"}</option>
                <option value="ممارس علاج طبيعي">{isRtl ? "ممارس علاج طبيعي" : "Physiotherapy Practitioner"}</option>
                <option value="موظف استقبال">{isRtl ? "موظف استقبال" : "Receptionist"}</option>
              </select>
            </div>
            <DialogFooter className="mt-6 flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">{isRtl ? "إلغاء" : "Cancel"}</Button>
                  <Button type="submit" className="bg-[#0d8a8a] hover:bg-[#085454] text-white rounded-xl font-bold px-6">{isRtl ? "إضافة" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader className={isRtl ? "text-right" : "text-left"}>
            <DialogTitle>{isRtl ? "تعديل بيانات الموظف" : "Edit Employee Details"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditStaff} className="space-y-4 py-4">
            <div className="space-y-1 text-right">
              <Label>{isRtl ? "الاسم" : "Name"}</Label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1 text-right">
              <Label>{isRtl ? "البريد الإلكتروني" : "Email"}</Label>
              <Input
                type="email"
                value={editFormData.email}
                disabled
                className="bg-slate-100 dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1 text-right">
              <Label>{isRtl ? "رقم الجوال" : "Phone"}</Label>
              <Input
                value={editFormData.phone}
                onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1 text-right">
              <Label>{isRtl ? "الدور الوظيفي" : "Role"}</Label>
              <select
                value={editFormData.role}
                onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
              >
                <option value="مدير العياده">{isRtl ? "مدير العياده" : "Clinic Manager"}</option>
                <option value="استشاري علاج طبيعي">{isRtl ? "استشاري علاج طبيعي" : "Physiotherapy Consultant"}</option>
                <option value="أخصائي علاج طبيعي">{isRtl ? "أخصائي علاج طبيعي" : "Physiotherapy Specialist"}</option>
                <option value="ممارس علاج طبيعي">{isRtl ? "ممارس علاج طبيعي" : "Physiotherapy Practitioner"}</option>
                <option value="موظف استقبال">{isRtl ? "موظف استقبال" : "Receptionist"}</option>
              </select>
            </div>
            <div className="space-y-1 text-right">
              <Label>{isRtl ? "الحالة" : "Status"}</Label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
              >
                <option value="نشط">{isRtl ? "نشط" : "Active"}</option>
                <option value="غير نشط">{isRtl ? "غير نشط" : "Inactive"}</option>
              </select>
            </div>
            <DialogFooter className="mt-6 flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl font-bold">{isRtl ? "إلغاء" : "Cancel"}</Button>
                  <Button type="submit" className="bg-[#0d8a8a] hover:bg-[#085454] text-white rounded-xl font-bold px-6">{isRtl ? "حفظ التعديلات" : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Staff Confirmation Modal */}
      <Dialog open={deleteStaffEmail !== null} onOpenChange={(open) => !open && setDeleteStaffEmail(null)}>
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
                ? "هل أنت متأكد من حذف الموظف نهائياً؟ ستفقد جميع سجلاته ولن يمكنه الدخول مجدداً." 
                : "Are you sure you want to permanently delete this staff member? This action cannot be undone."}
            </DialogDescription>
          </div>
          <div className={`mt-6 flex gap-3 w-full ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            <Button type="button" variant="outline" onClick={() => setDeleteStaffEmail(null)} className="flex-1 rounded-xl font-bold">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="button" onClick={executeDeleteStaff} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
              {isRtl ? "نعم، احذف" : "Yes, Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
