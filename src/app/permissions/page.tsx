"use client";

import { useState, useEffect } from "react";
import { Shield, ShieldCheck, ShieldAlert, Save, UserCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/LanguageContext";
import { logAuditAction } from "@/lib/audit";
import { Loader } from "@/components/Loader";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const AVAILABLE_PERMISSIONS = [
  { id: "delete_patient", labelAr: "Ø­Ø°Ù Ù…Ù„Ù Ù…Ø±ÙŠØ¶ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹", labelEn: "Delete Patient", category: "Patients" },
  { id: "edit_patient", labelAr: "ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø±ÙŠØ¶", labelEn: "Edit Patient", category: "Patients" },
  { id: "create_invoice", labelAr: "Ø¥Ù†Ø´Ø§Ø¡ ÙˆØªØ­ØµÙŠÙ„ ÙØ§ØªÙˆØ±Ø©", labelEn: "Create Invoice", category: "Billing" },
  { id: "delete_invoice", labelAr: "Ø¥Ù„ØºØ§Ø¡/Ø­Ø°Ù ÙØ§ØªÙˆØ±Ø©", labelEn: "Delete Invoice", category: "Billing" },
  { id: "refund_invoice", labelAr: "Ø¥ØµØ¯Ø§Ø± Ù…Ø±ØªØ¬Ø¹ Ù…Ø§Ù„ÙŠ", labelEn: "Refund Invoice", category: "Billing" },
  { id: "apply_discount", labelAr: "Ø¥Ø¹Ø·Ø§Ø¡ Ø®ØµÙ… Ù…Ø§Ù„ÙŠ", labelEn: "Apply Discount", category: "Billing" },
  { id: "print_invoice", labelAr: "Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„ÙÙˆØ§ØªÙŠØ±", labelEn: "Print Invoice", category: "Billing" },
  { id: "view_patient_history", labelAr: "Ø§Ù„Ø§Ø·Ù„Ø§Ø¹ Ø¹Ù„Ù‰ Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„Ø·Ø¨ÙŠ (History)", labelEn: "View Medical History", category: "Medical" },
  { id: "edit_emr", labelAr: "ØªØ¹Ø¯ÙŠÙ„ Ø³Ø¬Ù„ Ø·Ø¨ÙŠ (EMR)", labelEn: "Edit EMR", category: "Medical" },
  { id: "delete_emr", labelAr: "Ø­Ø°Ù Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„Ø·Ø¨ÙŠ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„", labelEn: "Delete EMR", category: "Medical" },
  { id: "edit_appointments", labelAr: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ÙˆØ§Ø¹ÙŠØ¯ ÙˆØ§Ù„Ø¬Ø¯ÙˆÙ„Ø©", labelEn: "Manage Appointments", category: "Reception" },
  { id: "send_messages", labelAr: "Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ø¦Ù„ Ù„Ù„Ù…Ø±Ø¶Ù‰", labelEn: "Send Messages", category: "Reception" },
  { id: "manage_staff", labelAr: "Ø¥Ø¶Ø§ÙØ© ÙˆØ­Ø°Ù Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†", labelEn: "Manage Staff", category: "Admin" },
  { id: "view_analytics", labelAr: "Ø§Ù„Ø§Ø·Ù„Ø§Ø¹ Ø¹Ù„Ù‰ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ÙˆØ§Ù„ØªØ­Ù„ÙŠÙ„Ø§Øª", labelEn: "View Analytics", category: "Admin" },
  { id: "export_data", labelAr: "ØªØµØ¯ÙŠØ± Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¹ÙŠØ§Ø¯Ø© (Excel/PDF)", labelEn: "Export Data", category: "Admin" },
  { id: "manage_settings", labelAr: "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©", labelEn: "Manage Settings", category: "Admin" },
  { id: "manage_inventory", labelAr: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ÙˆØ§Ù„Ù…Ø¹Ø¯Ø§Øª", labelEn: "Manage Inventory", category: "Admin" },
];

const getDefaultPerms = (role: string) => {
  const roleName = role || "";
  if (["Ù…Ø¯ÙŠØ± Ø§Ù„Ø¹ÙŠØ§Ø¯Ù‡", "Ù…Ø¯ÙŠØ± Ø§Ù„Ù†Ø¸Ø§Ù…", "admin"].includes(roleName)) {
    return AVAILABLE_PERMISSIONS.map(p => p.id);
  }
  if (["Ø§Ø³ØªØ´Ø§Ø±ÙŠ Ø¹Ù„Ø§Ø¬ Ø·Ø¨ÙŠØ¹ÙŠ", "Ø£Ø®ØµØ§Ø¦ÙŠ Ø¹Ù„Ø§Ø¬ Ø·Ø¨ÙŠØ¹ÙŠ", "Ù…Ù…Ø§Ø±Ø³ Ø¹Ù„Ø§Ø¬ Ø·Ø¨ÙŠØ¹ÙŠ", "doctor"].includes(roleName)) {
    return ["edit_emr", "edit_patient"];
  }
  if (["Ù…ÙˆØ¸Ù Ø§Ø³ØªÙ‚Ø¨Ø§Ù„", "Ù…ÙˆØ¸ÙØ© Ø§Ø³ØªÙ‚Ø¨Ø§Ù„ Ø±Ø¦ÙŠØ³ÙŠØ©", "receptionist"].includes(roleName)) {
    return ["create_invoice", "edit_patient"];
  }
  return [];
};

export default function PermissionsPage() {
  const { language, t } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth(); const clinicId = user?.clinicId;
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedStaffEmail, setSelectedStaffEmail] = useState<string | null>(null);
  
  // permissionsMap: { "email@example.com": ["delete_patient", "edit_emr"] }
  const [permissionsMap, setPermissionsMap] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase.from('staff').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: true });
        if (!error && data) {
          setStaff(data);
          if (data.length > 0) setSelectedStaffEmail(data[0].email);
          
          const perms: Record<string, string[]> = {};
          data.forEach((member) => {
            if (member.permissions && Array.isArray(member.permissions)) {
              perms[member.email] = member.permissions;
            }
          });
          setPermissionsMap(perms);
        }
      } catch (err) {
        console.warn("Failed to load staff permissions", err);
      }
    }
    loadData();
  }, []);

  const handleTogglePermission = (permissionId: string) => {
    if (!selectedStaffEmail || !activeStaffMember) return;
    setPermissionsMap(prev => {
      // If no override exists, start with the default perms
      const basePerms = prev[selectedStaffEmail] !== undefined 
        ? prev[selectedStaffEmail] 
        : getDefaultPerms(activeStaffMember.role);
        
      const hasPerm = basePerms.includes(permissionId);
      return {
        ...prev,
        [selectedStaffEmail]: hasPerm 
          ? basePerms.filter(p => p !== permissionId)
          : [...basePerms, permissionId]
      };
    });
  };

  const handleSave = async () => {
    if (!selectedStaffEmail) return;
    setIsSaving(true);
    
    try {
      const userPerms = permissionsMap[selectedStaffEmail] || getDefaultPerms(activeStaffMember?.role || "");
      const { error } = await supabase
        .from('staff')
        .update({ permissions: userPerms })
        .eq('email', selectedStaffEmail);
        
      if (error) throw error;

      // Log the change in Audit Trail
      const selectedUser = staff.find(s => s.email === selectedStaffEmail);
      if (selectedUser) {
        await logAuditAction("UPDATE_PERMISSIONS", "SECURITY", `Updated custom permissions for ${selectedUser.name} (${selectedUser.email})`);
      }
      
      setToastMessage(isRtl ? "ØªÙ… Ø­ÙØ¸ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª Ø¨Ù†Ø¬Ø§Ø­!" : "Permissions saved successfully!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert("Error saving permissions: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const activeStaffMember = staff.find(s => s.email === selectedStaffEmail);
  const activeUserPerms = selectedStaffEmail 
    ? (permissionsMap[selectedStaffEmail] !== undefined ? permissionsMap[selectedStaffEmail] : (activeStaffMember ? getDefaultPerms(activeStaffMember.role) : [])) 
    : [];

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isRtl ? "" : "flex-row-reverse"}`}>
        <div>
          <h1 className={`text-2xl font-bold text-slate-800 flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
            <div className="bg-rose-50 p-2 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
            </div>
            {isRtl ? "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª (Dynamic Permissions)" : "Dynamic Permissions Management"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isRtl 
              ? "Ø§Ù„ØªØ­ÙƒÙ… Ø§Ù„Ø¯Ù‚ÙŠÙ‚ Ø¨ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ† Ø¨Ø´ÙƒÙ„ ÙØ±Ø¯ÙŠ Ù„ØªØ£Ù…ÙŠÙ† Ø§Ù„Ø­Ø±ÙƒØ§Øª Ø§Ù„Ø­Ø±Ø¬Ø©." 
              : "Fine-grained control over individual employee permissions to secure critical actions."}
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!selectedStaffEmail || isSaving}
          className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] gap-2 self-start sm:self-auto rounded-xl font-bold px-6 shadow-md transition-all active:scale-95"
        >
          {isSaving ? (
            <Loader size={16} color="white" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isRtl ? "Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª" : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Col: Staff Selector */}
        <Card className="lg:col-span-1 shadow-xs border-slate-100">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-slate-500" />
              {isRtl ? "Ø§Ø®ØªØ± Ø§Ù„Ù…ÙˆØ¸Ù" : "Select Staff"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col divide-y divide-border/50 max-h-[600px] overflow-y-auto">
              {staff.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  {isRtl ? "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ¸ÙÙŠÙ† Ù…Ø³Ø¬Ù„ÙŠÙ†" : "No staff found"}
                </div>
              ) : (
                staff.map(member => (
                  <button
                    key={member.email}
                    onClick={() => setSelectedStaffEmail(member.email)}
                    className={`flex flex-col items-start p-4 transition-colors text-right w-full ${
                      selectedStaffEmail === member.email 
                        ? "bg-blue-50 border-r-4 border-blue-500" 
                        : "hover:bg-slate-50 border-r-4 border-transparent"
                    }`}
                  >
                    <span className="font-bold text-sm text-slate-800">{member.name}</span>
                    <span className="text-[11px] text-slate-500">{member.role}</span>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Col: Permissions List */}
        <Card className="lg:col-span-3 shadow-xs border-slate-100">
          <CardHeader className="border-b pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">
                  {isRtl ? "ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„ÙˆØµÙˆÙ„ Ø§Ù„ÙØ±Ø¯ÙŠØ©" : "Individual Access Permissions"}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {activeStaffMember 
                    ? (isRtl ? `ØªØ¹Ø¯ÙŠÙ„ ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„Ù…ÙˆØ¸Ù: ${activeStaffMember.name}` : `Editing permissions for: ${activeStaffMember.name}`)
                    : (isRtl ? "ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ù…ÙˆØ¸Ù Ù„Ù„Ø¨Ø¯Ø¡" : "Please select a staff member to begin")}
                </CardDescription>
              </div>
              {activeStaffMember && (
                <Badge variant="outline" className="bg-slate-100 font-mono text-[10px]">
                  {activeStaffMember.email}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!selectedStaffEmail ? (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                <Shield className="w-16 h-16 text-slate-300 mb-4" />
                <p className="font-semibold text-slate-500">
                  {isRtl ? "Ø§Ø®ØªØ± Ù…ÙˆØ¸ÙØ§Ù‹ Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¬Ø§Ù†Ø¨ÙŠØ© Ù„Ø¹Ø±Ø¶ ØµÙ„Ø§Ø­ÙŠØ§ØªÙ‡" : "Select a staff member from the sidebar to view their permissions"}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Information Alert */}
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-xs flex gap-3 border border-blue-100">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-blue-600" />
                  <p className="leading-relaxed">
                    {isRtl 
                      ? "Ù‡Ø°Ù‡ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª ØªØªØ¬Ø§ÙˆØ² Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ© Ù„Ù„Ø¯ÙˆØ± Ø§Ù„ÙˆØ¸ÙŠÙÙŠ. Ø¹Ù†Ø¯ ØªÙØ¹ÙŠÙ„ ØµÙ„Ø§Ø­ÙŠØ© Ù‡Ù†Ø§ØŒ Ø³ÙŠØªÙ…ÙƒÙ† Ø§Ù„Ù…ÙˆØ¸Ù Ù…Ù† Ø§Ù„Ù‚ÙŠØ§Ù… Ø¨Ù‡Ø§ Ø¨ØºØ¶ Ø§Ù„Ù†Ø¸Ø± Ø¹Ù† Ù…Ø³Ù…Ø§Ù‡ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ. Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø³ÙŠØªÙ… ØªØ³Ø¬ÙŠÙ„Ù‡Ø§ ÙÙŠ (Ø³Ø¬Ù„ Ø§Ù„Ù†Ø´Ø§Ø·Ø§Øª)."
                      : "These permissions override default role-based access. When enabled, the employee can perform the action regardless of their title. All actions are logged in the Audit Trail."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AVAILABLE_PERMISSIONS.map(perm => {
                    const isEnabled = activeUserPerms.includes(perm.id);
                    return (
                      <div 
                        key={perm.id} 
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                          isEnabled ? "bg-white border-blue-200 shadow-sm" : "bg-slate-50 border-slate-200 opacity-70"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${isEnabled ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"}`}>
                            {isEnabled ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${isEnabled ? "text-slate-800" : "text-slate-600"}`}>
                              {isRtl ? perm.labelAr : perm.labelEn}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{perm.category}</p>
                          </div>
                        </div>
                        <Switch 
                          checked={isEnabled} 
                          onCheckedChange={() => handleTogglePermission(perm.id)}
                        />
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold text-sm">
            <ShieldCheck className="w-5 h-5" />
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
