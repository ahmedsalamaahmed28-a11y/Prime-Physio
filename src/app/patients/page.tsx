"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Users, 
  Search, 
  UserPlus, 
  ChevronRight, 
  FileText,
  Activity,
  Phone,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { queueOfflineMutation } from "@/lib/offlineQueue";
import { usePermissions } from "@/lib/usePermissions";
import { useAuth } from "@/lib/auth";

// â”€â”€â”€ Mock Data for Seeding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const INITIAL_PATIENTS: any[] = [];

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

function PatientsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams ? (searchParams.get("search") || "") : "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language, t } = useLanguage();
  const isRtl = language === "ar";
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const clinicId = user?.clinicId;
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [deletePatientId, setDeletePatientId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nameAr: "",
    phone: "",
    gender: "Ø°ÙƒØ±",
    age: "",
    address: "",
    activePackage: "Ø¬Ù„Ø³Ø§Øª ÙØ±Ø¯ÙŠØ©",
    sessionsTotal: 0,
    occupation: "",
    emergencyContact: "",
    emergencyPhone: "",
    doctor: "",
    sessionPrice: "200",
    visitType: "ÙƒØ´Ù Ø£ÙˆÙ„",
  });
  const [defaultClinicPrice, setDefaultClinicPrice] = useState("100");
  const [defaultExamPrice, setDefaultExamPrice] = useState("200");
  const [doctorsList, setDoctorsList] = useState<any[]>([]);

  const saveLocalPatients = (data: any[]) => {
    setPatients(data);
  };

  // Load patients and seed if empty
  useEffect(() => {
    async function loadPatients() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("clinic_id", clinicId)
          .order("id", { ascending: true });
        
        if (error) throw error;

        saveLocalPatients(data || []);
      } catch (err: any) {
        console.warn("Database load failed:", err);
        saveLocalPatients([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    async function loadDefaultSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: settings } = await supabase.from('clinic_settings').select('branches, default_exam_price, default_session_price').eq('clinic_id', clinicId).single();
          if (settings) {
            // Load exam price
            if (settings.default_exam_price) {
              setDefaultExamPrice(settings.default_exam_price);
            }
            // Load session price
            if (settings.default_session_price) {
              setDefaultClinicPrice(settings.default_session_price);
            }
            // Set initial form price based on default visit type (ÙƒØ´Ù Ø£ÙˆÙ„)
            const examP = settings.default_exam_price || "200";
            setFormData(prev => ({ ...prev, sessionPrice: examP }));
          }
        }
      } catch (err) {}
    }

    async function loadDoctors() {
      try {
        const { data, error } = await supabase.from("staff").select("name,email,role").eq("clinic_id", clinicId);
        if (error) { console.error("loadDoctors error:", error); return; }
        if (data) {
          const isDoctor = (role: string) =>
            ["Ù…Ø¯ÙŠØ± Ø§Ù„Ø¹ÙŠØ§Ø¯Ù‡", "Ø§Ø³ØªØ´Ø§Ø±ÙŠ Ø¹Ù„Ø§Ø¬ Ø·Ø¨ÙŠØ¹ÙŠ", "Ø£Ø®ØµØ§Ø¦ÙŠ Ø¹Ù„Ø§Ø¬ Ø·Ø¨ÙŠØ¹ÙŠ", "Ù…Ù…Ø§Ø±Ø³ Ø¹Ù„Ø§Ø¬ Ø·Ø¨ÙŠØ¹ÙŠ"].includes(role);
          setDoctorsList(data.filter((s: any) => isDoctor(s.role)));
        }
      } catch (err) { console.error("loadDoctors exception:", err); }
    }

    loadPatients();
    loadDefaultSettings();
    loadDoctors();
  }, []);

  const getPatientName = (p: any) => {
    return isRtl ? p.nameAr : (
      p.nameAr === "Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø³ÙŠØ¯" ? "Ahmed Mohamed El-Sayed" : 
      p.nameAr === "ÙØ§Ø·Ù…Ø© Ø¹Ù„ÙŠ Ø­Ø³Ù†" ? "Fatima Ali Hassan" :
      p.nameAr === "Ù…Ø­Ù…ÙˆØ¯ Ø¥Ø¨Ø±Ø§Ù‡ÙŠÙ…" ? "Mahmoud Ibrahim" :
      p.nameAr === "Ù†ÙˆØ±Ø§ Ø­Ø³Ù†" ? "Noura Hassan" :
      p.nameAr === "ÙƒØ±ÙŠÙ… Ø¹Ø§Ø¯Ù„" ? "Karim Adel" :
      p.nameAr === "Ø³Ù…Ø± Ø·Ø§Ø±Ù‚" ? "Samar Tarek" : p.nameAr
    );
  };

  // Filter patients based on search
  const filteredPatients = patients.filter((p) => {
    const query = searchQuery.toLowerCase();
    const name = getPatientName(p).toLowerCase();
    return (
      name.includes(query) ||
      p.nameAr.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query) ||
      p.phone.includes(query)
    );
  });

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr || !formData.phone) {
      alert(isRtl ? "Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ø§Ø³Ù… ÙˆØ±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„" : "Please enter name and phone number");
      return;
    }

    // Check subscription limit
    try {
      const limitRes = await fetch(`/api/subscription/check-limit?clinic_id=${clinicId}&resource=patients`);
      if (limitRes.ok) {
        const limitData = await limitRes.json();
        if (!limitData.allowed) {
          alert(isRtl
            ? "Ù„Ù‚Ø¯ ØªØ¬Ø§ÙˆØ²Øª Ø§Ù„Ø­Ø¯ Ø§Ù„Ù…Ø³Ù…ÙˆØ­ Ø¨Ù‡ Ù„Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø±Ø¶Ù‰ ÙÙŠ Ø®Ø·ØªÙƒ Ø§Ù„Ø­Ø§Ù„ÙŠØ©. ÙŠØ±Ø¬Ù‰ ØªØ±Ù‚ÙŠØ© Ø§Ø´ØªØ±Ø§ÙƒÙƒ Ù„Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…Ø²ÙŠØ¯ Ù…Ù† Ø§Ù„Ù…Ø±Ø¶Ù‰."
            : "You have reached the patient limit for your current plan. Please upgrade your subscription.");
          return;
        }
      }
    } catch {}

    let newId = "";
    try {
      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .eq("clinic_id", clinicId);
      const count = existing ? existing.length : 0;
      const nextNumber = count + 1;
      newId = `PT-${String(nextNumber).padStart(2, '0')}`;
    } catch (err) {
      const nextNumber = patients.length + 1;
      newId = `PT-${String(nextNumber).padStart(2, '0')}`;
    }

    const newPatient = {
      id: newId,
      clinic_id: clinicId,
      nameAr: formData.nameAr,
      phone: formData.phone,
      gender: formData.gender,
      age: formData.age ? Math.round(Number(formData.age)) : 30,
      address: formData.address || "",
      activePackage: formData.visitType === "ÙƒØ´Ù Ø£ÙˆÙ„" ? (isRtl ? "ÙƒØ´Ù Ø£ÙˆÙ„" : "First Examination") : formData.activePackage,
      sessionsUsed: 0,
      sessionsTotal: formData.visitType === "ÙƒØ´Ù Ø£ÙˆÙ„" ? 1 : (formData.sessionsTotal ? Math.round(Number(formData.sessionsTotal)) : 0),
      status: "ØºÙŠØ± Ù†Ø´Ø·",
      occupation: formData.occupation,
      emergencyContact: formData.emergencyContact,
      emergencyPhone: formData.emergencyPhone,
      doctor: formData.doctor,
    };

    const invoiceId = `INV-${newPatient.id}-${Date.now().toString().substring(8)}`;
    const invoiceDesc = formData.visitType === "ÙƒØ´Ù Ø£ÙˆÙ„"
      ? (isRtl ? "ÙƒØ´Ù Ø£ÙˆÙ„" : "First Examination")
      : (isRtl ? `Ø´Ø±Ø§Ø¡ Ø¨Ø§Ù‚Ø©: ${formData.activePackage}` : `Package Purchase: ${formData.activePackage}`);
    const invoiceAmt = isRtl 
      ? `${formData.sessionPrice || "100"} Ø¬.Ù…` 
      : `${formData.sessionPrice || "100"} EGP`;

    const now = new Date();
    const startTime = new Date(now);
    startTime.setMinutes(startTime.getMinutes() + 30); // Schedule 30 min from now
    startTime.setSeconds(0, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 45); // 45 min session
    const appointmentType = formData.visitType === "ÙƒØ´Ù Ø£ÙˆÙ„" ? "ÙƒØ´Ù Ø£ÙˆÙ„" : "Ø¬Ù„Ø³Ø© Ø¹Ù„Ø§Ø¬";
    const appointmentId = crypto.randomUUID ? crypto.randomUUID() : `APT-${newPatient.id}-${Date.now()}`;

    const newInvoice = {
      id: invoiceId,
      clinic_id: clinicId,
      patient_id: newPatient.id,
      patient_name: newPatient.nameAr,
      description: invoiceDesc,
      amount: invoiceAmt,
      status: "Ø§Ù†ØªØ¸Ø§Ø±",
      payment_method: "â€”",
      date: new Date().toISOString().split("T")[0]
    };

    const newAppointment = {
      id: appointmentId,
      clinic_id: clinicId,
      patient_id: newPatient.id,
      patient_name: newPatient.nameAr,
      doctor_name: formData.doctor || "Ø¯. Ù…Ù†Ù‰ Ø­Ø³ÙŠÙ†",
      appointment_type: appointmentType,
      status: "Ù…Ø¤ÙƒØ¯",
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString()
    };

    // Helper to queue all offline actions
    const queueOfflineActions = () => {
      queueOfflineMutation("patients", "INSERT", newPatient, newPatient.id);
      queueOfflineMutation("invoices", "INSERT", newInvoice, invoiceId);
      queueOfflineMutation("appointments", "INSERT", newAppointment, appointmentId);
      
      saveLocalPatients([...patients, newPatient].sort((a, b) => a.id.localeCompare(b.id)));
      
    };

    // If device is offline, skip network write completely and save offline
    if (typeof window !== "undefined" && !navigator.onLine) {
      console.log("Device is offline, saving patient details to local offline queue.");
      queueOfflineActions();
      setIsOpen(false);
      setFormData({
        nameAr: "",
        phone: "",
        gender: "Ø°ÙƒØ±",
        age: "",
        address: "",
        activePackage: "Ø¬Ù„Ø³Ø§Øª ÙØ±Ø¯ÙŠØ©",
        sessionsTotal: 0,
        occupation: "",
        emergencyContact: "",
        emergencyPhone: "",
        doctor: "",
        sessionPrice: formData.sessionPrice,
        visitType: "ÙƒØ´Ù Ø£ÙˆÙ„",
      });
      return;
    }

    try {
      const { error } = await supabase.from("patients").insert([newPatient]);
      if (error) throw error;
      
      // AUTOMATIC INVOICE CREATION
      try {
        await supabase.from("invoices").insert([newInvoice]);
      } catch (invErr) {
        console.warn("Failed to automatically generate invoice for new patient:", invErr);
      }

      // AUTOMATIC APPOINTMENT CREATION
      try {
        await supabase.from("appointments").insert([newAppointment]);
      } catch (aptErr) {
        console.warn("Failed to automatically create appointment for new patient:", aptErr);
      }

      saveLocalPatients([...patients, newPatient].sort((a, b) => a.id.localeCompare(b.id)));
      setIsOpen(false);
      setFormData({
        nameAr: "",
        phone: "",
        gender: "Ø°ÙƒØ±",
        age: "",
        address: "",
        activePackage: "Ø¬Ù„Ø³Ø§Øª ÙØ±Ø¯ÙŠØ©",
        sessionsTotal: 0,
        occupation: "",
        emergencyContact: "",
        emergencyPhone: "",
        doctor: "",
        sessionPrice: formData.sessionPrice,
        visitType: "ÙƒØ´Ù Ø£ÙˆÙ„",
      });
    } catch (dbError: any) {
      console.warn("Database insert failed, queuing for offline sync:", dbError);
      
      // Save locally & queue for sync
      queueOfflineActions();
      setIsOpen(false);
      setFormData({
        nameAr: "",
        phone: "",
        gender: "Ø°ÙƒØ±",
        age: "",
        address: "",
        activePackage: "Ø¬Ù„Ø³Ø§Øª ÙØ±Ø¯ÙŠØ©",
        sessionsTotal: 0,
        occupation: "",
        emergencyContact: "",
        emergencyPhone: "",
        doctor: "",
        sessionPrice: defaultClinicPrice,
        visitType: "ÙƒØ´Ù Ø£ÙˆÙ„",
      });
    }
  };

  const handleDeletePatientClick = (patientId: string) => {
    setDeletePatientId(patientId);
  };

  const executeDeletePatient = async () => {
    if (!deletePatientId) return;

    try {
      // Delete associated invoices and appointments first so home/billing pages stay clean
      await supabase.from("invoices").delete().eq("patient_id", deletePatientId).eq("clinic_id", clinicId);
      await supabase.from("appointments").delete().eq("patient_id", deletePatientId).eq("clinic_id", clinicId);

      const { error } = await supabase.from("patients").delete().eq("id", deletePatientId).eq("clinic_id", clinicId);
      if (error) throw error;
      saveLocalPatients(patients.filter((p) => p.id !== deletePatientId));
    } catch (err: any) {
      console.warn("Database delete failed, removing from local state:", err);
      saveLocalPatients(patients.filter((p) => p.id !== deletePatientId));
    } finally {
      setDeletePatientId(null);
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* â”€â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isRtl ? "" : "flex-row-reverse"}`}>
        <div>
          <h1 className={`text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
            <Users className="w-6 h-6 text-blue-600" />
            {t("patients_title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("patients_subtitle")}</p>
        </div>
        <Button 
          onClick={() => setIsOpen(true)}
          className={`bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] gap-2 self-start sm:self-auto ${isRtl ? "" : "flex-row-reverse"}`}
        >
          <UserPlus className="w-4 h-4" />
          {t("add_patient")}
        </Button>
      </div>

      {/* Add Patient Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className={`text-lg font-bold text-slate-900 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "Ø¥Ø¶Ø§ÙØ© Ù…Ù„Ù Ù…Ø±ÙŠØ¶ Ø¬Ø¯ÙŠØ¯" : "Add New Patient File"}</DialogTitle>
            <DialogDescription className={`text-xs text-slate-500 ${isRtl ? "text-right" : "text-left"}`}>
              {isRtl ? "Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¯ÙŠÙ…ÙˆØºØ±Ø§ÙÙŠØ© ÙˆØ§Ù„Ø·Ø¨ÙŠØ© Ù„Ø¥Ù†Ø´Ø§Ø¡ Ù…Ù„Ù Ø§Ù„Ù…Ø±ÙŠØ¶ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ." : "Enter medical and demographic details to create the patient record."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPatient} className={`space-y-4 py-2 ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
            <div className={`grid grid-cols-2 gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
              <div className="space-y-1">
                <Label htmlFor="nameAr" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø§Ø³Ù… Ø§Ù„Ù…Ø±ÙŠØ¶ *" : "Patient Name *"}</Label>
                <Input
                  id="nameAr"
                  placeholder={isRtl ? "Ù…Ø«Ø§Ù„: Ø£Ø­Ù…Ø¯ Ø§Ù„Ø³ÙŠØ¯" : "e.g. Ahmed El-Sayed"}
                  value={formData.nameAr}
                  onChange={(e) => setFormData({...formData, nameAr: e.target.value})}
                  required
                  className={isRtl ? "text-right" : "text-left"}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ *" : "Phone Number *"}</Label>
                <Input
                  id="phone"
                  placeholder="0500000000"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                  className="font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
              <div className="space-y-1">
                <Label htmlFor="age" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø§Ù„Ø³Ù†" : "Age"}</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="30"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  className={isRtl ? "text-right" : "text-left"}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gender" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø§Ù„Ø¬Ù†Ø³" : "Gender"}</Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="Ø°ÙƒØ±">{isRtl ? "Ø°ÙƒØ±" : "Male"}</option>
                  <option value="Ø£Ù†Ø«Ù‰">{isRtl ? "Ø£Ù†Ø«Ù‰" : "Female"}</option>
                </select>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
              <div className="space-y-1">
                <Label htmlFor="occupation" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø§Ù„Ù…Ù‡Ù†Ø©" : "Occupation"}</Label>
                <Input
                  id="occupation"
                  placeholder={isRtl ? "Ù…Ù‡Ù†Ø¯Ø³" : "Engineer"}
                  value={formData.occupation}
                  onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                  className={isRtl ? "text-right" : "text-left"}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø§Ù„Ø¹Ù†ÙˆØ§Ù†" : "Address"}</Label>
                <Input
                  id="address"
                  placeholder={isRtl ? "Ø§Ù„Ø¹Ù„ÙŠØ§ØŒ Ø§Ù„Ø±ÙŠØ§Ø¶" : "Olaya, Riyadh"}
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className={isRtl ? "text-right" : "text-left"}
                />
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
              <div className="space-y-1">
                <Label htmlFor="emergencyContact" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø·ÙˆØ§Ø±Ø¦ (Ø§Ù„Ø§Ø³Ù…)" : "Emergency Name"}</Label>
                <Input
                  id="emergencyContact"
                  placeholder={isRtl ? "Ù…Ø­Ù…Ø¯ (Ø£Ø®)" : "Mohamed (Brother)"}
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                  className={isRtl ? "text-right" : "text-left"}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emergencyPhone" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø·ÙˆØ§Ø±Ø¦ (Ù‡Ø§ØªÙ)" : "Emergency Phone"}</Label>
                <Input
                  id="emergencyPhone"
                  placeholder="0500000000"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})}
                  className="font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
              <div className="space-y-1">
                <Label htmlFor="visitType" className="text-xs font-semibold text-slate-700">{isRtl ? "Ù†ÙˆØ¹ Ø§Ù„Ø²ÙŠØ§Ø±Ø©" : "Visit Type"}</Label>
                <select
                  id="visitType"
                  value={formData.visitType}
                  onChange={(e) => {
                    const type = e.target.value;
                    const price = type === "ÙƒØ´Ù Ø£ÙˆÙ„" ? defaultExamPrice : defaultClinicPrice;
                    setFormData({
                      ...formData,
                      visitType: type,
                      sessionsTotal: type === "ÙƒØ´Ù Ø£ÙˆÙ„" ? 1 : 0,
                      sessionPrice: price,
                    });
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="ÙƒØ´Ù Ø£ÙˆÙ„">{isRtl ? "ÙƒØ´Ù Ø£ÙˆÙ„" : "First Examination"}</option>
                  <option value="Ù…ØªØ§Ø¨Ø¹Ø© (Ø¬Ù„Ø³Ø§Øª)">{isRtl ? "Ù…ØªØ§Ø¨Ø¹Ø© (Ø¬Ù„Ø³Ø§Øª)" : "Follow-up (Sessions)"}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="doctor" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø§Ù„Ø·Ø¨ÙŠØ¨ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬" : "Doctor"}</Label>
                <select
                  id="doctor"
                  value={formData.doctor}
                  onChange={(e) => setFormData({...formData, doctor: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">{isRtl ? "ØºÙŠØ± Ù…Ø­Ø¯Ø¯" : "Not specified"}</option>
                  {doctorsList.map((doc) => (
                    <option key={doc.email} value={doc.name}>{doc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.visitType === "Ù…ØªØ§Ø¨Ø¹Ø© (Ø¬Ù„Ø³Ø§Øª)" ? (
              <>
                <div className={`grid grid-cols-2 gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
                  <div className="space-y-1">
                    <Label htmlFor="activePackage" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø¨Ø§Ù‚Ø© Ø§Ù„Ø¹Ù„Ø§Ø¬" : "Package"}</Label>
                    <select
                      id="activePackage"
                      value={formData.activePackage}
                      onChange={(e) => {
                        const pkg = e.target.value;
                        let newPrice = formData.sessionPrice;
                        let newSessions = formData.sessionsTotal;
                        
                        if (pkg === "Ø¨Ø§Ù‚Ø© Ø¹Ù„Ø§Ø¬ Ø§Ù„Ø¸Ù‡Ø±") {
                          newPrice = "1500";
                          newSessions = 10;
                        } else if (pkg === "ØªØ£Ù‡ÙŠÙ„ Ø§Ù„Ø±ÙƒØ¨Ø©") {
                          newPrice = "1200";
                          newSessions = 8;
                        } else {
                          newPrice = defaultClinicPrice;
                          newSessions = 0;
                        }
                        
                        setFormData({...formData, activePackage: pkg, sessionPrice: newPrice, sessionsTotal: newSessions});
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="Ø¬Ù„Ø³Ø§Øª ÙØ±Ø¯ÙŠØ©">{isRtl ? "Ø¬Ù„Ø³Ø§Øª ÙØ±Ø¯ÙŠØ©" : "Individual"}</option>
                      <option value="Ø¨Ø§Ù‚Ø© Ø¹Ù„Ø§Ø¬ Ø§Ù„Ø¸Ù‡Ø±">{isRtl ? "Ø¨Ø§Ù‚Ø© Ø¹Ù„Ø§Ø¬ Ø§Ù„Ø¸Ù‡Ø±" : "Back Package"}</option>
                      <option value="ØªØ£Ù‡ÙŠÙ„ Ø§Ù„Ø±ÙƒØ¨Ø©">{isRtl ? "ØªØ£Ù‡ÙŠÙ„ Ø§Ù„Ø±ÙƒØ¨Ø©" : "Knee Rehab"}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sessionsTotal" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¬Ù„Ø³Ø§Øª" : "Total Sessions"}</Label>
                    <Input
                      id="sessionsTotal"
                      type="number"
                      placeholder="0"
                      value={formData.sessionsTotal || ""}
                      onChange={(e) => setFormData({...formData, sessionsTotal: Number(e.target.value)})}
                      className={isRtl ? "text-right" : "text-left"}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sessionPrice" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø³Ø¹Ø± Ø§Ù„Ø¬Ù„Ø³Ø© / Ø§Ù„Ø¨Ø§Ù‚Ø©" : "Session / Package Price"}</Label>
                  <Input
                    id="sessionPrice"
                    type="number"
                    placeholder="100"
                    value={formData.sessionPrice}
                    onChange={(e) => setFormData({...formData, sessionPrice: e.target.value})}
                    className={isRtl ? "text-right" : "text-left"}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="sessionPrice" className="text-xs font-semibold text-slate-700">{isRtl ? "Ø³Ø¹Ø± Ø§Ù„ÙƒØ´Ù" : "Consultation Price"}</Label>
                <Input
                  id="sessionPrice"
                  type="number"
                  placeholder="100"
                  value={formData.sessionPrice}
                  onChange={(e) => setFormData({...formData, sessionPrice: e.target.value})}
                  className={isRtl ? "text-right" : "text-left"}
                />
              </div>
            )}

            <DialogFooter className={`pt-3 border-t mt-4 flex gap-2 ${isRtl ? "justify-end" : "justify-start flex-row-reverse"}`}>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{isRtl ? "Ø¥Ù„ØºØ§Ø¡" : "Cancel"}</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9]">{isRtl ? "Ø¥Ø¶Ø§ÙØ©" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Patient Confirmation Modal */}
      <Dialog open={!!deletePatientId} onOpenChange={(open: boolean) => !open && setDeletePatientId(null)}>
        <DialogContent className="sm:max-w-sm text-center" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center space-y-4 pt-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-2">
              <Trash2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-800">
              {isRtl ? "ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø°Ù" : "Confirm Deletion"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {isRtl 
                ? `Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù…Ù„Ù Ø§Ù„Ù…Ø±ÙŠØ¶ (${deletePatientId}) Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹ØŸ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ø¹Ù† Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡.` 
                : `Are you sure you want to permanently delete patient (${deletePatientId})? This action cannot be undone.`}
            </DialogDescription>
          </div>
          <div className={`mt-6 flex gap-3 w-full ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            <Button type="button" variant="outline" onClick={() => setDeletePatientId(null)} className="flex-1 rounded-xl font-bold">
              {isRtl ? "Ø¥Ù„ØºØ§Ø¡" : "Cancel"}
            </Button>
            <Button type="button" onClick={executeDeletePatient} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
              {isRtl ? "Ù†Ø¹Ù…ØŒ Ø§Ø­Ø°Ù Ø§Ù„Ù…Ù„Ù" : "Yes, Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Card className="shadow-xs">
        <CardContent className={`p-4 flex flex-col sm:flex-row gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
          <div className="relative flex-1">
            <Search className={`absolute ${isRtl ? "right-3" : "left-3"} top-2.5 h-4 w-4 text-muted-foreground`} />
            <Input
              placeholder={t("search_patient_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${isRtl ? "pr-9 text-right" : "pl-9 text-left"} focus-visible:ring-blue-600`}
            />
          </div>
          <div className="flex gap-2">
            <select className="rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-600">
              <option>{t("all_cases")}</option>
              <option>{isRtl ? "Ù†Ø´Ø·" : "Active"}</option>
              <option>{isRtl ? "ØºÙŠØ± Ù†Ø´Ø·" : "Inactive"}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* â”€â”€â”€ Patients Directory Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Card className="shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className={`w-full ${isRtl ? "text-right" : "text-left"} border-collapse`}>
              <thead>
                <tr className="bg-muted/40 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">{t("file_num")}</th>
                  <th className="py-3.5 px-6">{t("patient_name")}</th>
                  <th className="py-3.5 px-6">{t("phone_num")}</th>
                  <th className="py-3.5 px-6">{t("demographics")}</th>
                  <th className="py-3.5 px-6">{t("current_package")}</th>
                  <th className="py-3.5 px-6">{t("file_status")}</th>
                  <th className="py-3.5 px-6 text-center">{t("medical_file")}</th>
                  <th className="py-3.5 px-6 text-center">{isRtl ? "Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm text-slate-700">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((p) => {
                    const pkgText = isRtl ? p.activePackage : (p.activePackage === "Ø¨Ø§Ù‚Ø© Ø¹Ù„Ø§Ø¬ Ø§Ù„Ø¸Ù‡Ø±" ? "Back Treatment Package" : p.activePackage === "ØªØ£Ù‡ÙŠÙ„ Ø§Ù„Ø±ÙƒØ¨Ø©" ? "Knee Rehab" : "Individual Sessions");
                    const statusText = isRtl ? p.status : (p.status === "Ù†Ø´Ø·" ? "Active" : "Inactive");
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* File Number / ID */}
                        <td className="py-4 px-6 font-mono font-semibold text-slate-900">{p.id}</td>
                        {/* Name */}
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-900">{getPatientName(p)}</div>
                        </td>
                        {/* Phone */}
                        <td className="py-4 px-6">
                          <div className={`flex items-center gap-1 text-slate-600 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono">{p.phone}</span>
                          </div>
                        </td>
                        {/* Demographics */}
                        <td className="py-4 px-6 text-slate-500 text-xs space-y-0.5">
                          <div>
                            {isRtl ? "Ø§Ù„Ø¬Ù†Ø³" : "Gender"}: {isRtl ? p.gender : (p.gender === "Ø°ÙƒØ±" ? "Male" : "Female")} | {isRtl ? "Ø§Ù„Ø¹Ù†ÙˆØ§Ù†" : "Address"}: {p.address}
                          </div>
                          <div>
                            {isRtl ? "Ø§Ù„Ø³Ù†" : "Age"}: {p.age} {isRtl ? "Ø³Ù†Ø©" : "years"}
                          </div>
                        </td>
                        {/* Package */}
                        <td className="py-4 px-6">
                          {p.sessionsTotal > 0 ? (
                            <div className="space-y-1">
                              <span className="text-xs font-medium text-slate-800">{pkgText}</span>
                              <div className={`flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
                                <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="bg-blue-600 h-1.5 rounded-full" 
                                    style={{ width: `${(p.sessionsUsed / p.sessionsTotal) * 100}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">({p.sessionsUsed}/{p.sessionsTotal})</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{pkgText}</span>
                          )}
                        </td>
                        {/* File Status */}
                        <td className="py-4 px-6">
                          <Badge className={`${
                            p.status === "Ù†Ø´Ø·" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          } font-normal border`}>
                            {statusText}
                          </Badge>
                        </td>
                        {/* Link to EMR profile */}
                        <td className="py-4 px-6 text-center">
                          <Link href={`/patients/${p.id}`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className={`text-[#4F46BA] border-[#4F46BA]/30 hover:bg-[#4F46BA]/10 text-xs font-medium gap-1 h-8 rounded-lg ${isRtl ? "" : "flex-row-reverse"}`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {t("open_emr")}
                              <ChevronRight className={`w-3.5 h-3.5 mr-0.5 ${isRtl ? "" : "rotate-180"}`} />
                            </Button>
                          </Link>
                        </td>
                        {/* Delete Button */}
                        <td className="py-4 px-6 text-center">
                          {hasPermission("delete_patient") ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePatientClick(p.id)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-2 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="text-slate-300 text-xs">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      {isRtl ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ø¨Ø­Ø«Ùƒ." : "No matching results found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default function PatientsDirectoryPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">{isRtl ? "Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø³Ø¬Ù„ Ø§Ù„Ù…Ø±Ø¶Ù‰..." : "Loading patient directory..."}</div>}>
      <PatientsContent />
    </Suspense>
  );
}
