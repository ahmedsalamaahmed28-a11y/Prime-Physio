"use client";

import { useState, useEffect } from "react";
import { Shield, Users, UserPlus, Check, Key, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/LanguageContext";

export default function UsersPermissionsPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const tr = (value: string) => {
    if (isRtl) return value;
    const translations: Record<string, string> = {
      "إدارة المستخدمين والصلاحيات": "User & Permissions Management",
      "التحكم في حسابات الطاقم الطبي والإداري ومستويات الصلاحيات الخاصة بهم": "Manage medical and administrative staff accounts and their permission levels.",
      "إضافة مستخدم جديد": "Add New User",
      "مجموعات الصلاحيات الأساسية": "Default Permission Groups",
      "مدير العيادة (Clinic Manager)": "Clinic Manager",
      "صلاحيات مالية وإدارية كاملة لإدارة شؤون العيادة والتقارير والتوظيف.": "Full financial and administrative access to clinic operations, reports, and staffing.",
      "استشاري علاج طبيعي (PT Consultant)": "Physical Therapy Consultant",
      "تقييم الحالات المعقدة وإصدار البروتوكولات الطبية والخطط العلاجية.": "Assess complex cases and create medical protocols and treatment plans.",
      "أخصائي علاج طبيعي (PT Specialist)": "Physical Therapist",
      "تنفيذ الجلسات وتحديث قياسات المريض العضلية وبرامجه الغذائية والرياضية.": "Deliver sessions and update patient strength measurements, nutrition, and exercise programs.",
      "ممارس علاج طبيعي (PT Practitioner)": "Physical Therapy Practitioner",
      "متابعة تمرينات المريض وتوثيق تقدم الجلسات اليومية للمرضى.": "Monitor patient exercises and document daily session progress.",
      "موظف استقبال (Receptionist)": "Receptionist",
      "تسجيل المرضى وحجز المواعيد وإصدار الفواتير النقدية والتعامل مع التسويات.": "Register patients, book appointments, issue cash invoices, and handle reconciliations.",
      "الحسابات النشطة": "Active Accounts",
      "المستخدم": "User",
      "الدور الوظيفي": "Role",
      "نطاق الصلاحيات": "Permission Scope",
      "الحالة": "Status",
      "الإجراءات": "Actions",
      "تعديل": "Edit",
      "حذف": "Delete",
      "أدخل بيانات الموظف لتوفير صلاحيات الدخول المخصصة له على المنصة.": "Enter the employee details and assign their platform access permissions.",
      "الاسم": "Name",
      "أدخل الاسم الثنائي أو الثلاثي": "Enter the employee's full name",
      "البريد الإلكتروني": "Email Address",
      "المجموعة / الدور الوظيفي": "Group / Job Role",
      "استشاري علاج طبيعي": "PT Consultant",
      "موظف استقبال": "Receptionist",
      "مدير العيادة": "Clinic Manager",
      "مدير العياده": "Clinic Manager",
      "مدير النظام": "System Administrator",
      "تعديل السجلات الطبية وحجز جلسات علاجية": "Edit medical records and book therapy sessions",
      "كامل الصلاحيات المالية والإدارية للعيادة": "Full clinic financial and administrative permissions",
      "صلاحيات طبية كاملة وإصدار خطط علاجية": "Full clinical permissions and treatment plan creation",
      "عرض وتحديث سجلات المرضى وتوثيق الجلسات": "View and update patient records and document sessions",
      "حجز مواعيد واستلام فواتير نقدية": "Book appointments and receive cash payments",
      "أخصائي علاج طبيعي": "Physical Therapist",
      "ممارس علاج طبيعي": "PT Practitioner",
      "وصف الصلاحيات": "Permission Description",
      "وصف مخصص للصلاحيات الممنوحة": "Describe the assigned permissions",
      "نشط": "Active",
      "غير نشط": "Inactive",
      "إلغاء": "Cancel",
      "إضافة": "Add",
      "تعديل صلاحيات المستخدم": "Edit User Permissions",
      "قم بتعديل بيانات المستخدم أو تغيير دوره ومستوى صلاحياته.": "Update the user's details, role, or permission level.",
      "حفظ التعديلات": "Save Changes",
      "تأكيد الحذف": "Confirm Deletion",
      "هل أنت متأكد من حذف هذا المستخدم نهائياً؟ سيتم إلغاء صلاحيات الدخول الخاصة به.": "Are you sure you want to permanently delete this user? Their access permissions will be revoked.",
      "نعم، احذف": "Yes, Delete",
      "الرجاء إدخال الاسم والبريد الإلكتروني": "Please enter the name and email address",
      "هذا البريد الإلكتروني مسجل بالفعل": "This email address is already registered",
      "فشلت إضافة المستخدم": "Failed to add user",
      "فشل تعديل المستخدم": "Failed to update user",
      "فشل حذف المستخدم": "Failed to delete user"
    };
    return translations[value] || value;
  };
  const [users, setUsers] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Forms state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "أخصائي علاج طبيعي",
    permissions: "تعديل السجلات الطبية وحجز جلسات علاجية",
    phone: "0500000000",
    dateJoined: new Date().toISOString().split("T")[0],
    status: "نشط"
  });

  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null);
  const [deleteUserEmail, setDeleteUserEmail] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "",
    permissions: "",
    phone: "",
    dateJoined: "",
    status: ""
  });

  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase.from("staff").select("*").order("created_at", { ascending: true });
      if (error) {
        console.error("Failed to load staff from Supabase", error);
        setUsers([]);
        return;
      }
      setUsers((data || []).map((u: any) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        permissions: u.permissions || "",
        phone: u.phone || "",
        dateJoined: u.date_joined || u.dateJoined || "",
        status: u.status || "نشط",
      })));
    }
    loadUsers();
  }, []);

  const saveUsers = async () => {
    const { data, error } = await supabase.from("staff").select("*").order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to refresh staff from Supabase", error);
      return;
    }
    setUsers((data || []).map((u: any) => ({
      name: u.name,
      email: u.email,
      role: u.role,
      permissions: u.permissions || "",
      phone: u.phone || "",
      dateJoined: u.date_joined || "",
      status: u.status || "نشط",
    })));
  };

  // Auto-set permissions description based on role
  const handleRoleChange = (role: string, isEdit: boolean = false) => {
    let perms = "";
    if (role === "مدير العيادة") {
      perms = "كامل الصلاحيات المالية والإدارية للعيادة";
    } else if (role === "استشاري علاج طبيعي") {
      perms = "صلاحيات طبية كاملة وإصدار خطط علاجية";
    } else if (role === "أخصائي علاج طبيعي") {
      perms = "تعديل السجلات الطبية وحجز جلسات علاجية";
    } else if (role === "ممارس علاج طبيعي") {
      perms = "عرض وتحديث سجلات المرضى وتوثيق الجلسات";
    } else if (role === "موظف استقبال") {
      perms = "حجز مواعيد واستلام فواتير نقدية";
    }

    if (isEdit) {
      setEditFormData(prev => ({ ...prev, role, permissions: perms }));
    } else {
      setFormData(prev => ({ ...prev, role, permissions: perms }));
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert("الرجاء إدخال الاسم والبريد الإلكتروني");
      return;
    }

    // Check duplicate email
    if (users.some(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
      alert("هذا البريد الإلكتروني مسجل بالفعل");
      return;
    }

    const { error } = await supabase.from("staff").insert({
      name: formData.name,
      email: formData.email,
      role: formData.role,
      permissions: formData.permissions,
      phone: formData.phone,
      date_joined: formData.dateJoined,
      status: formData.status,
    });
    if (error) {
      console.error("Failed to add user to Supabase", error);
      alert("فشلت إضافة المستخدم");
      return;
    }
    await saveUsers();
    setIsAddOpen(false);
    setFormData({
      name: "",
      email: "",
      role: "أخصائي علاج طبيعي",
      permissions: "تعديل السجلات الطبية وحجز جلسات علاجية",
      phone: "0500000000",
      dateJoined: new Date().toISOString().split("T")[0],
      status: "نشط"
    });
  };

  const handleEditClick = (user: any) => {
    setEditingUserEmail(user.email);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      phone: user.phone || "0500000000",
      dateJoined: user.dateJoined || new Date().toISOString().split("T")[0],
      status: user.status
    });
    setIsEditOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.email) {
      alert("الرجاء إدخال الاسم والبريد الإلكتروني");
      return;
    }

    const { error } = await supabase
      .from("staff")
      .update({
        name: editFormData.name,
        role: editFormData.role,
        permissions: editFormData.permissions,
        phone: editFormData.phone,
        date_joined: editFormData.dateJoined,
        status: editFormData.status,
      })
      .eq("email", editingUserEmail);
    if (error) {
      console.error("Failed to update user in Supabase", error);
      alert("فشل تعديل المستخدم");
      return;
    }
    await saveUsers();
    setIsEditOpen(false);
    setEditingUserEmail(null);
  };

  const handleDeleteUserClick = (email: string) => {
    setDeleteUserEmail(email);
  };

  const executeDeleteUser = async () => {
    if (!deleteUserEmail) return;
    const { error } = await supabase.from("staff").delete().eq("email", deleteUserEmail);
    if (error) {
      console.error("Failed to delete user from Supabase", error);
      alert("فشل حذف المستخدم");
      return;
    }
    await saveUsers();
    setDeleteUserEmail(null);
  };

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <div className="bg-teal-50 p-2 rounded-xl">
              <Shield className="w-6 h-6 text-[#0d8a8a]" />
            </div>
            إدارة المستخدمين والصلاحيات
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tr("التحكم في حسابات الطاقم الطبي والإداري ومستويات الصلاحيات الخاصة بهم")}</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] gap-2 self-start sm:self-auto rounded-xl font-bold px-6 shadow-md transition-all active:scale-95">
          <UserPlus className="w-4 h-4" />
          إضافة مستخدم جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles list */}
        <Card className="lg:col-span-1 shadow-xs">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Key className="w-5 h-5 text-[#0d8a8a]" />
              مجموعات الصلاحيات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 text-sm">
            {[
              { role: "مدير العيادة (Clinic Manager)", desc: "صلاحيات مالية وإدارية كاملة لإدارة شؤون العيادة والتقارير والتوظيف." },
              { role: "استشاري علاج طبيعي (PT Consultant)", desc: "تقييم الحالات المعقدة وإصدار البروتوكولات الطبية والخطط العلاجية." },
              { role: "أخصائي علاج طبيعي (PT Specialist)", desc: "تنفيذ الجلسات وتحديث قياسات المريض العضلية وبرامجه الغذائية والرياضية." },
              { role: "ممارس علاج طبيعي (PT Practitioner)", desc: "متابعة تمرينات المريض وتوثيق تقدم الجلسات اليومية للمرضى." },
              { role: "موظف استقبال (Receptionist)", desc: "تسجيل المرضى وحجز المواعيد وإصدار الفواتير النقدية والتعامل مع التسويات." },
            ].map((group) => (
              <div key={tr(group.role)} className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
                <span className="font-bold text-slate-800">{group.role}</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{tr(group.desc)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Users table */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              الحسابات النشطة ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">{tr("المستخدم")}</th>
                    <th className="py-3.5 px-6">{tr("الدور الوظيفي")}</th>
                    <th className="py-3.5 px-6">{tr("نطاق الصلاحيات")}</th>
                    <th className="py-3.5 px-6">{tr("الحالة")}</th>
                    <th className="py-3.5 px-6 text-center">{tr("الإجراءات")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm text-slate-700">
                  {users.map((user) => (
                    <tr key={user.email} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{user.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                          {tr(user.role)}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-xs">{user.permissions}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 font-medium text-xs ${user.status === "نشط" ? "text-emerald-600" : "text-slate-400"}`}>
                          <Check className="w-3.5 h-3.5" />
                          {tr(user.status)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(user)}
                            className="text-blue-600 hover:text-blue-700 text-xs gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            تعديل
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUserClick(user.email)}
                            className="text-rose-600 hover:text-rose-700 text-xs gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            حذف
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ADD USER DIALOG */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader className="text-right">
            <DialogTitle>{tr("إضافة مستخدم جديد")}</DialogTitle>
            <DialogDescription>
              أدخل بيانات الموظف لتوفير صلاحيات الدخول المخصصة له على المنصة.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 py-4">
            <div className="space-y-1 text-right">
              <Label htmlFor="name">{tr("الاسم")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="أدخل الاسم الثنائي أو الثلاثي"
                required
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="email">{tr("البريد الإلكتروني")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="example@primephysio.com"
                required
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="role">{tr("المجموعة / الدور الوظيفي")}</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="استشاري علاج طبيعي">{tr("استشاري علاج طبيعي")}</option>
                <option value="أخصائي علاج طبيعي">{tr("أخصائي علاج طبيعي")}</option>
                <option value="ممارس علاج طبيعي">{tr("ممارس علاج طبيعي")}</option>
                <option value="موظف استقبال">{tr("موظف استقبال")}</option>
              </select>
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="permissions">{tr("وصف الصلاحيات")}</Label>
              <Input
                id="permissions"
                value={tr(formData.permissions)}
                onChange={(e) => setFormData(prev => ({ ...prev, permissions: e.target.value }))}
                placeholder={isRtl ? "وصف مخصص للصلاحيات الممنوحة" : "Describe the assigned permissions"}
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="status">{tr("الحالة")}</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="نشط">{tr("نشط")}</option>
                <option value="غير نشط">{tr("غير نشط")}</option>
              </select>
            </div>
            <DialogFooter className="mt-6 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl font-bold">{tr("إلغاء")}</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] rounded-xl font-bold px-6">{tr("إضافة")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader className="text-right">
            <DialogTitle>{tr("تعديل صلاحيات المستخدم")}</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات المستخدم أو تغيير دوره ومستوى صلاحياته.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4 py-4">
            <div className="space-y-1 text-right">
              <Label htmlFor="edit-name">{tr("الاسم")}</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="edit-email">{tr("البريد الإلكتروني")}</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                disabled
                className="bg-slate-100 dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="edit-role">{tr("المجموعة / الدور الوظيفي")}</Label>
              <select
                id="edit-role"
                value={editFormData.role}
                onChange={(e) => handleRoleChange(e.target.value, true)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
              >
                <option value="استشاري علاج طبيعي">{tr("استشاري علاج طبيعي")}</option>
                <option value="أخصائي علاج طبيعي">{tr("أخصائي علاج طبيعي")}</option>
                <option value="ممارس علاج طبيعي">{tr("ممارس علاج طبيعي")}</option>
                <option value="موظف استقبال">{tr("موظف استقبال")}</option>
              </select>
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="edit-permissions">{tr("وصف الصلاحيات")}</Label>
              <Input
                id="edit-permissions"
                value={tr(editFormData.permissions)}
                onChange={(e) => setEditFormData(prev => ({ ...prev, permissions: e.target.value }))}
              />
            </div>
            <div className="space-y-1 text-right">
              <Label htmlFor="edit-status">{tr("الحالة")}</Label>
              <select
                id="edit-status"
                value={editFormData.status}
                onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
              >
                <option value="نشط">{tr("نشط")}</option>
                <option value="غير نشط">{tr("غير نشط")}</option>
              </select>
            </div>
            <DialogFooter className="mt-6 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl font-bold">{tr("إلغاء")}</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] rounded-xl font-bold px-6">{tr("حفظ التعديلات")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Modal */}
      <Dialog open={!!deleteUserEmail} onOpenChange={(open: boolean) => !open && setDeleteUserEmail(null)}>
        <DialogContent className="sm:max-w-sm text-center" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center space-y-4 pt-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-2">
              <Trash2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-800">
              تأكيد الحذف
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              هل أنت متأكد من حذف هذا المستخدم نهائياً؟ سيتم إلغاء صلاحيات الدخول الخاصة به.
            </DialogDescription>
          </div>
          <div className="mt-6 flex gap-3 w-full flex-row-reverse">
            <Button type="button" variant="outline" onClick={() => setDeleteUserEmail(null)} className="flex-1 rounded-xl font-bold">
              إلغاء
            </Button>
            <Button type="button" onClick={executeDeleteUser} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
              نعم، احذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
