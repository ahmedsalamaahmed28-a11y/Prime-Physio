"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Building, 
  Clock, 
  MapPin, 
  Phone, 
  Save, 
  Check, 
  Lock, 
  Key, 
  Laptop, 
  Smartphone,
  CreditCard,
  Shield,
  FileCheck,
  Camera,
  Upload,
  X,
  Plus,
  Zap,
  Crown,
  Star,
  Users,
  UserCheck,
  Calendar,
  Mail,
  Ticket,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type TabType = "profile" | "clinic" | "verification" | "security" | "delete_account";

export default function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const { language, t } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const clinicId = user?.clinicId;
  
  // Profile Tab States
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  
  // Fetch real user info from Supabase auth
  useEffect(() => {
    const fetchUserAuthInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user && user.email) {
        setEmail(user.email);
        
        // Try to get Google account name, but only if clinicName is empty
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
        if (fullName) {
          setClinicName(prev => prev ? prev : fullName);
          setAccountHolderName(prev => prev ? prev : fullName);
        }
      } else {
        setEmail("");
      }
    };
    fetchUserAuthInfo();
  }, []);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // Security Tab States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySaved, setSecuritySaved] = useState(false);

  // Bank Details States
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [bankSaved, setBankSaved] = useState(false);

  // Default Pricing States
  const [defaultExamPrice, setDefaultExamPrice] = useState("200");
  const [defaultSessionPrice, setDefaultSessionPrice] = useState("100");
  const [pricingSaved, setPricingSaved] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchSettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user || !active) return;

        setEmail(user.email || "");
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
        if (fullName) {
          setClinicName((prev) => prev || fullName);
          setAccountHolderName((prev) => prev || fullName);
        }

        const { data, error } = await supabase
          .from("clinic_settings")
          .select("*")
          .eq("clinic_id", clinicId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Failed to load clinic settings", error);
          return;
        }

        if (!active || !data) return;

        if (data.clinic_name) setClinicName(data.clinic_name);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.address) setAddress(data.address);
        if (data.city) setCity(data.city);
        if (data.country) setCountry(data.country);
        if (data.description) setDescription(data.description);
        if (data.branches && data.branches.length > 0) setBranches(data.branches);
        if (data.default_exam_price) setDefaultExamPrice(String(data.default_exam_price));
        if (data.default_session_price) setDefaultSessionPrice(String(data.default_session_price));
      } catch (err) {
        console.warn("Failed to load profile settings", err);
      }
    };

    fetchSettings();

    return () => {
      active = false;
    };
  }, []);

  // Branch States
  const [branches, setBranches] = useState([
    {
      id: "main",
      title: "الفرع الرئيسي",
      city: "",
      phone: "",
      address: "",
      startingPrice: "",
      hoursSaved: false,
      hours: [
        { day: "الأحد", from: "09:00 AM", to: "05:00 PM", isOpen: true },
        { day: "الاثنين", from: "09:00 AM", to: "05:00 PM", isOpen: true },
        { day: "الثلاثاء", from: "09:00 AM", to: "05:00 PM", isOpen: false },
        { day: "الأربعاء", from: "09:00 AM", to: "05:00 PM", isOpen: true },
        { day: "الخميس", from: "09:00 AM", to: "05:00 PM", isOpen: false },
        { day: "الجمعة", from: "09:00 AM", to: "05:00 PM", isOpen: false },
        { day: "السبت", from: "09:00 AM", to: "05:00 PM", isOpen: false },
      ]
    }
  ]);

  const handleBranchHoursSave = async (idx: number, e: React.FormEvent) => {
    e.preventDefault();
    const updated = [...branches];
    updated[idx].hoursSaved = true;
    setBranches(updated);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('clinic_settings').upsert({
          clinic_id: clinicId,
          user_id: user.id,
          branches: updated,
          updated_at: new Date().toISOString()
        }, { onConflict: 'clinic_id' });
      }
    } catch (err) {}

    setTimeout(() => {
      const reset = [...branches];
      if (reset[idx]) {
        reset[idx].hoursSaved = false;
        setBranches(reset);
      }
    }, 3000);
  };

  const handleAddBranch = () => {
    const nextBranchNum = branches.length + 1;
    const numNames = ["", "الرئيسي", "الثاني", "الثالث", "الرابع", "الخامس"];
    const branchTitleName = numNames[nextBranchNum] || `الفرع رقم ${nextBranchNum}`;
    
    const newBranch = {
      id: `branch-${Date.now()}`,
      title: `الفرع ${branchTitleName} - Prime Physio Clinic`,
      city: "",
      phone: "",
      address: "",
      startingPrice: "300",
      hoursSaved: false,
      hours: [
        { day: "الأحد", from: "09:00 AM", to: "05:00 PM", isOpen: true },
        { day: "الاثنين", from: "09:00 AM", to: "05:00 PM", isOpen: true },
        { day: "الثلاثاء", from: "09:00 AM", to: "05:00 PM", isOpen: false },
        { day: "الأربعاء", from: "09:00 AM", to: "05:00 PM", isOpen: true },
        { day: "الخميس", from: "09:00 AM", to: "05:00 PM", isOpen: false },
        { day: "الجمعة", from: "09:00 AM", to: "05:00 PM", isOpen: false },
        { day: "السبت", from: "09:00 AM", to: "05:00 PM", isOpen: false },
      ]
    };
    setBranches([...branches, newBranch]);
  };

  const handleBankSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBankSaved(true);
    setTimeout(() => setBankSaved(false), 3000);
  };

  const handleBankCancel = () => {
    setAccountHolderName("");
    setBankName("");
    setIban("");
    setSwiftCode("");
    alert(isRtl ? "تم تفريغ البيانات البنكية" : "Bank data cleared");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clinicName.trim() || !phone.trim()) {
      alert(isRtl ? "الرجاء تعبئة الحقول الإجبارية (اسم العيادة ورقم الهاتف)" : "Please fill required fields (Clinic Name and Phone)");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        alert(isRtl ? "يجب تسجيل الدخول أولاً" : "You must be logged in");
        return;
      }

      const updates = {
        clinic_id: clinicId,
        user_id: user.id,
        clinic_name: clinicName,
        email: email,
        phone: phone,
        address: address,
        city: city,
        country: country,
        description: description,
        branches: branches,
        default_exam_price: defaultExamPrice,
        default_session_price: defaultSessionPrice,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('clinic_settings').upsert(updates, { onConflict: 'clinic_id' });
      if (error) {
        console.error("DB Error:", error);
        throw error;
      }
      
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      console.error("Failed to save profile", err);
      alert(isRtl ? "حدث خطأ أثناء حفظ الملف الشخصي: " + (err?.message || JSON.stringify(err)) : "Failed to save profile");
    }
  };

  const handleSecuritySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert(isRtl ? "كلمتا المرور غير متطابقتين!" : "Passwords do not match!");
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setSecuritySaved(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSecuritySaved(false), 3000);
    } catch (err: any) {
      alert(err.message || (isRtl ? "فشل تحديث كلمة المرور" : "Failed to update password"));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* ─── Orange Alert Banner ────────────────────────────────────────── */}
      <div className={`bg-[#FFA000] text-white px-5 py-1.5 rounded-xl flex items-center justify-between shadow-sm -mt-2 sm:-mt-4 mb-6 ${isRtl ? "flex-row-reverse" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
        <p className="text-xs sm:text-sm font-medium flex-1 text-center tracking-wide">
          {isRtl ? "حسابك قيد المراجعة. سنُخطرك فور اكتمال التحقق ⌛" : "Your account is under review. We will notify you once verification is complete ⌛"}
        </p>
        <button className="bg-white text-[#FFA000] px-3 py-0.5 rounded-lg font-bold text-xs hover:bg-slate-50 transition-colors shadow-xs shrink-0 flex items-center gap-1 font-sans cursor-pointer">
          {isRtl ? "عرض الحالة" : "View Status"} ⬆
        </button>
      </div>

      {/* ─── Main Unified Card Container ─────────────────────────────────── */}
      <Card className="shadow-xs border-slate-200/60 bg-white rounded-2xl overflow-hidden p-6 md:p-8">
        
        {/* ─── Tabs Bar ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 border-b border-slate-100 pb-4 mb-8">
          {[
            { id: "profile", label: isRtl ? "الملف" : "Profile" },
            { id: "clinic", label: isRtl ? "العيادة" : "Clinic Settings" },
            { id: "verification", label: isRtl ? "مركز التحقق" : "Verification Center" },
            { id: "security", label: isRtl ? "الأمان" : "Security" },
            { id: "delete_account", label: isRtl ? "حذف الحساب" : "Delete Account" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#4F46BA] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── Tab Content: PROFILE (الملف) ─────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="space-y-8">
            
            {/* Logo Circular Avatar Uploader */}
            <div className="flex flex-col items-center text-center">
              <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 overflow-hidden bg-[#4F46BA] flex items-center justify-center shadow-md relative">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-3xl font-bold tracking-wider font-sans">NT</span>
                  )}
                  
                  {/* Camera icon hover overlay */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-6 h-6" />
                  </div>
                </div>
                
                {/* Invisible file input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                {/* Small camera badge overlapping bottom-left (bottom-right in RTL layout representation) */}
                <div className="absolute bottom-0 left-0 bg-[#4F46BA] text-white p-1 rounded-full shadow-md border border-white">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-3.5 space-y-0.5">
                <h2 className="text-base font-bold text-slate-800">{clinicName || (isRtl ? "اسم العيادة غير محدد" : "Clinic Name Not Set")}</h2>
                <p className="text-xs text-slate-400 font-sans tracking-wide">
                  {isRtl ? "انقر على أيقونة الكاميرا لرفع شعار العيادة" : "Click the camera icon to upload your clinic logo"}
                </p>
              </div>
            </div>

            {/* Profile Input Fields Form */}
            <form onSubmit={handleProfileSave} className="space-y-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                
                {/* Right Column */}
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 font-sans">{isRtl ? "* اسم العيادة / الشركة" : "* Company / Clinic Name"}</label>
                    <Input 
                      value={clinicName} 
                      onChange={(e) => setClinicName(e.target.value)} 
                      className="border-slate-200/80 focus:ring-[#4F46BA] focus:border-[#4F46BA]"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">{isRtl ? "البريد الإلكتروني" : "Email Address"}</label>
                    <Input 
                      type="email" 
                      value={email} 
                      readOnly
                      className="bg-slate-50 border-slate-200/80 text-slate-500 focus:ring-0 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-sans">{isRtl ? "تواصل مع الدعم الفني لتغيير البريد الإلكتروني" : "Contact support to change email"}</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">{isRtl ? "العنوان" : "Address"}</label>
                    <Input 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      className="border-slate-200/80 focus:ring-[#4F46BA] focus:border-[#4F46BA]"
                    />
                  </div>
                </div>

                {/* Left Column */}
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 font-sans">{isRtl ? "* رقم الهاتف" : "* Phone Number"}</label>
                    <Input 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      className="border-slate-200/80 focus:ring-[#4F46BA] focus:border-[#4F46BA] text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 font-sans">{isRtl ? "المدينة" : "City"}</label>
                    <Input 
                      value={city} 
                      onChange={(e) => setCity(e.target.value)} 
                      className="border-slate-200/80 focus:ring-[#4F46BA] focus:border-[#4F46BA]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">{isRtl ? "البلد / المحافظة" : "Country / Region"}</label>
                    <Input 
                      value={country} 
                      onChange={(e) => setCountry(e.target.value)} 
                      className="border-slate-200/80 focus:ring-[#4F46BA] focus:border-[#4F46BA]"
                    />
                  </div>
                </div>

              </div>

              {/* Full Width Description Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isRtl ? "الوصف" : "Description"}</label>
                <Textarea 
                  rows={4} 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="border-slate-200/80 focus:ring-[#4F46BA] focus:border-[#4F46BA] resize-none"
                />
              </div>

              {/* Form Save Button & Feedback */}
              <div className="pt-2 flex justify-between items-center">
                {profileSaved && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    {isRtl ? "تم حفظ البيانات بنجاح!" : "Data saved successfully!"}
                  </span>
                )}
                <Button type="submit" className={`bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white rounded-xl px-6 ${isRtl ? "mr-auto" : "ml-auto"}`}>
                  {isRtl ? "حفظ البيانات" : "Save Details"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ─── Tab Content: CLINIC (العيادة) ─────────────────────────────── */}
        {activeTab === "clinic" && (
          <div className="space-y-10 max-w-4xl mx-auto" dir="rtl">
            
            {/* 0. Default Pricing Section */}
            <div className="bg-gradient-to-br from-indigo-50/60 to-[#4F46BA]/5 rounded-2xl p-6 border border-indigo-200/50 space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-indigo-200/50">
                <CreditCard className="w-5 h-5 text-[#4F46BA]" />
                <h3 className="text-base font-extrabold text-slate-800">{isRtl ? "الأسعار الافتراضية" : "Default Pricing"}</h3>
              </div>
              <p className="text-xs text-slate-500">{isRtl ? "يتم استخدام هذه الأسعار تلقائياً عند إضافة مريض جديد في صفحة المرضى." : "These prices are auto-filled when adding a new patient."}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-600">{isRtl ? "سعر الكشف الأول (ج.م)" : "First Exam Price (EGP)"}</label>
                  <Input
                    type="number"
                    value={defaultExamPrice}
                    onChange={(e) => setDefaultExamPrice(e.target.value)}
                    className="border-slate-200 focus:ring-[#4F46BA] text-right font-mono text-lg font-bold"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-600">{isRtl ? "سعر الجلسة (ج.م)" : "Session Price (EGP)"}</label>
                  <Input
                    type="number"
                    value={defaultSessionPrice}
                    onChange={(e) => setDefaultSessionPrice(e.target.value)}
                    className="border-slate-200 focus:ring-[#4F46BA] text-right font-mono text-lg font-bold"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="button"
                  className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white rounded-xl text-xs gap-1.5 h-10 px-5"
                  onClick={async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await supabase.from('clinic_settings').upsert({
                          clinic_id: clinicId,
                          user_id: user.id,
                          default_exam_price: defaultExamPrice,
                          default_session_price: defaultSessionPrice,
                          updated_at: new Date().toISOString()
                        }, { onConflict: 'clinic_id' });
                        setPricingSaved(true);
                        setTimeout(() => setPricingSaved(false), 3000);
                      }
                    } catch (err) {
                      console.error("Failed to save pricing", err);
                    }
                  }}
                >
                  <Save className="w-4 h-4" />
                  {isRtl ? "حفظ الأسعار" : "Save Pricing"}
                </Button>
                {pricingSaved && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    {isRtl ? "تم حفظ الأسعار بنجاح!" : "Pricing saved!"}
                  </span>
                )}
              </div>
            </div>

            {/* 1. Bank Details Section */}
            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-200/50 space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b">
                <CreditCard className="w-5 h-5 text-[#4F46BA]" />
                <h3 className="text-base font-extrabold text-slate-800">{isRtl ? "البيانات البنكية" : "Bank Details"}</h3>
              </div>
              
              <form onSubmit={handleBankSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-bold text-slate-500">{isRtl ? "اسم صاحب الحساب *" : "Account Holder Name *"}</label>
                    <Input 
                      value={accountHolderName} 
                      onChange={(e) => setAccountHolderName(e.target.value)} 
                      required 
                      className="border-slate-200 focus:ring-[#4F46BA] text-right font-sans"
                    />
                  </div>
                  
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-bold text-slate-500">{isRtl ? "اسم البنك *" : "Bank Name *"}</label>
                    <Input 
                      value={bankName} 
                      onChange={(e) => setBankName(e.target.value)} 
                      required 
                      className="border-slate-200 focus:ring-[#4F46BA] text-right font-sans"
                    />
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-bold text-slate-500">{isRtl ? "رقم IBAN *" : "IBAN *"}</label>
                    <Input 
                      value={iban} 
                      onChange={(e) => setIban(e.target.value)} 
                      required 
                      className="border-slate-200 focus:ring-[#4F46BA] text-left font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-bold text-slate-500">{isRtl ? "SWIFT Code ( اختياري )" : "SWIFT Code (Optional)"}</label>
                    <Input 
                      value={swiftCode} 
                      onChange={(e) => setSwiftCode(e.target.value)} 
                      className="border-slate-200 focus:ring-[#4F46BA] text-left font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-row-reverse gap-3 items-center">
                  <Button type="submit" className={`bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white rounded-xl text-xs gap-1.5 h-10 px-5 ${isRtl ? "" : "flex-row-reverse"}`}>
                    <Save className="w-4 h-4" />
                    {isRtl ? "حفظ التغييرات" : "Save Changes"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleBankCancel}
                    className={`border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 rounded-xl text-xs gap-1.5 h-10 px-5 ${isRtl ? "" : "flex-row-reverse"}`}
                  >
                    <X className="w-4 h-4" />
                    {isRtl ? "إلغاء" : "Cancel"}
                  </Button>
                  {bankSaved && (
                    <span className={`text-xs text-emerald-600 font-bold flex items-center gap-1 ${isRtl ? "ml-auto" : "mr-auto"}`}>
                      <Check className="w-4 h-4" />
                      {isRtl ? "تم حفظ البيانات البنكية بنجاح!" : "Bank details saved successfully!"}
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* 2. Branches & Locations Section */}
            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-200/50 space-y-6">
              <div className={`flex items-center gap-2 pb-3 border-b ${isRtl ? "" : "flex-row-reverse"}`}>
                <MapPin className="w-5 h-5 text-[#4F46BA]" />
                <h3 className="text-base font-extrabold text-slate-800">{isRtl ? "الفروع والمواقع" : "Branches & Locations"}</h3>
              </div>

              <div className="space-y-8">
                {branches.map((branch, bIdx) => (
                  <div key={branch.id} className="p-4 rounded-xl bg-white border border-slate-200/70 space-y-5">
                      <div className={`flex items-center justify-between border-b pb-2 ${isRtl ? "" : "flex-row-reverse"}`}>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                          {branch.title}
                        </span>
                        {bIdx === 0 && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                            {isRtl ? "نشط حالياً" : "Currently Active"}
                          </span>
                        )}
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-right">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">City</label>
                        <Input 
                          value={branch.city} 
                          onChange={(e) => {
                            const updated = [...branches];
                            updated[bIdx].city = e.target.value;
                            setBranches(updated);
                          }} 
                          className="border-slate-200 focus:ring-[#4F46BA] text-right font-sans"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">{isRtl ? "هاتف الفرع" : "Branch Phone"}</label>
                        <Input 
                          value={branch.phone} 
                          onChange={(e) => {
                            const updated = [...branches];
                            updated[bIdx].phone = e.target.value;
                            setBranches(updated);
                          }} 
                          className="border-slate-200 focus:ring-[#4F46BA] text-right font-mono"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">{isRtl ? "العنوان" : "Address"}</label>
                        <Input 
                          value={branch.address} 
                          onChange={(e) => {
                            const updated = [...branches];
                            updated[bIdx].address = e.target.value;
                            setBranches(updated);
                          }} 
                          className="border-slate-200 focus:ring-[#4F46BA] text-right font-sans"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">{isRtl ? "سعر الجلسة الأساسي" : "Default Session Price"}</label>
                        <Input 
                          type="number"
                          value={branch.startingPrice} 
                          onChange={(e) => {
                            const updated = [...branches];
                            updated[bIdx].startingPrice = e.target.value;
                            setBranches(updated);
                          }} 
                          className="border-slate-200 focus:ring-[#4F46BA] text-right font-mono"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 font-semibold pr-1">{isRtl ? "سعر الكشف أو الجلسة الافتراضي للعيادة" : "Default exam or session price"}</p>
                      </div>
                    </div>

                    {/* 3. Working Hours inside Branch */}
                    <div className="space-y-4 pt-2">
                      <div className={`flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
                        <Clock className="w-4.5 h-4.5 text-[#4F46BA]" />
                        <h4 className="text-sm font-bold text-slate-800">{isRtl ? "ساعات العمل" : "Working Hours"}</h4>
                      </div>

                      <form onSubmit={(e) => handleBranchHoursSave(bIdx, e)} className="space-y-6">
                        <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white">
                          <table className="w-full text-right border-collapse" dir="rtl">
                            <thead>
                              <tr className={`bg-slate-100/80 border-b text-xs font-bold text-slate-500 uppercase tracking-wider ${isRtl ? "" : "flex-row-reverse"}`}>
                                <th className="py-3.5 px-6 text-right text-slate-600 font-bold">{isRtl ? "اليوم" : "Day"}</th>
                                <th className="py-3.5 px-4 text-center text-slate-600 font-bold w-20">{isRtl ? "فتح" : "Open"}</th>
                                <th className="py-3.5 px-4 text-center text-slate-600 font-bold">{isRtl ? "من" : "From"}</th>
                                <th className="py-3.5 px-4 text-center text-slate-600 font-bold">{isRtl ? "إلى" : "To"}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                              {branch.hours.map((item, idx) => (
                                <tr key={item.day} className={`hover:bg-slate-50/30 transition-colors ${isRtl ? "" : "flex-row-reverse"}`}>
                                  {/* Day Column */}
                                  <td className="py-4 px-6 font-bold text-slate-800 text-right">
                                    {isRtl ? item.day : ({"الأحد": "Sunday", "الاثنين": "Monday", "الثلاثاء": "Tuesday", "الأربعاء": "Wednesday", "الخميس": "Thursday", "الجمعة": "Friday", "السبت": "Saturday"}[item.day] || item.day)}
                                  </td>
                                  
                                  {/* Toggle Column */}
                                  <td className="py-4 px-4 text-center">
                                    <div className="flex justify-center items-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...branches];
                                          updated[bIdx].hours[idx].isOpen = !updated[bIdx].hours[idx].isOpen;
                                          setBranches(updated);
                                        }}
                                        className={`relative w-10 h-5 rounded-full p-[2px] transition-colors duration-200 focus:outline-none flex cursor-pointer ${
                                          item.isOpen ? "bg-blue-600 justify-end" : "bg-slate-200 justify-start"
                                        }`}
                                      >
                                        <span className="w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200" />
                                      </button>
                                    </div>
                                  </td>

                                  {/* Time From Column */}
                                  <td className="py-3 px-4">
                                    <div className="relative w-full max-w-[260px] mx-auto">
                                      <Input 
                                        value={item.from} 
                                        disabled={!item.isOpen}
                                        onChange={(e) => {
                                          const updated = [...branches];
                                          updated[bIdx].hours[idx].from = e.target.value;
                                          setBranches(updated);
                                        }}
                                        className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 text-left font-sans font-medium h-9"
                                        dir="ltr"
                                      />
                                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                                    </div>
                                  </td>

                                  {/* Time To Column */}
                                  <td className="py-3 px-4">
                                    <div className="relative w-full max-w-[260px] mx-auto">
                                      <Input 
                                        value={item.to} 
                                        disabled={!item.isOpen}
                                        onChange={(e) => {
                                          const updated = [...branches];
                                          updated[bIdx].hours[idx].to = e.target.value;
                                          setBranches(updated);
                                        }}
                                        className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 text-left font-sans font-medium h-9"
                                        dir="ltr"
                                      />
                                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                          <div className="flex justify-start">
                            <Button 
                              type="submit" 
                              className="bg-white hover:bg-slate-50 border border-blue-200 text-[#4F46BA] font-bold rounded-xl text-xs gap-1.5 h-10 px-5 shadow-xs flex items-center justify-center cursor-pointer"
                            >
                              <svg className="w-4 h-4 text-[#4F46BA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                              </svg>
                              {isRtl ? "حفظ إعدادات الفرع" : "Save Branch Settings"}
                            </Button>
                          </div>
                          {branch.hoursSaved && (
                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                              <Check className="w-4 h-4" />
                              {isRtl ? "تم حفظ إعدادات الفرع بنجاح!" : "Branch settings saved successfully!"}
                            </span>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                ))}

                {/* Add Another Branch Button */}
                <div className={`flex justify-start pt-2 border-t ${isRtl ? "" : "flex-row-reverse"}`}>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleAddBranch}
                    className={`border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl text-xs gap-1.5 h-10 px-5 flex items-center justify-center cursor-pointer w-full sm:w-auto ${isRtl ? "" : "flex-row-reverse"}`}
                  >
                    <Plus className="w-4.5 h-4.5 text-slate-400" />
                    {isRtl ? "إضافة فرع آخر" : "Add Another Branch"}
                  </Button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ─── Tab Content: VERIFICATION (مركز التحقق) ────────────────────── */}
        {activeTab === "verification" && (
          <div className="space-y-6 max-w-2xl">
            <div className={`flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200 ${isRtl ? "" : "flex-row-reverse text-right"}`}>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl shrink-0">
                ⚠️
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <h4 className="text-sm font-bold text-amber-800">{isRtl ? "حسابك الطبي غير موثق حالياً" : "Your medical account is currently unverified"}</h4>
                <p className="text-xs text-amber-700 mt-1">{isRtl ? "يرجى رفع المستندات المطلوبة (السجل التجاري والترخيص الطبي) للبدء في تفعيل الدفع الإلكتروني واستقبال حجوزات التأمين." : "Please upload required documents (Commercial Register and Medical License) to activate e-payments and insurance bookings."}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className={`text-xs font-bold text-slate-500 uppercase ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "المستندات المطلوبة" : "Required Documents"}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-50 cursor-pointer transition-colors">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">{isRtl ? "ترخيص المنشأة الطبية (وزارة الصحة)" : "Medical Facility License"}</span>
                  <span className="text-[10px] text-slate-400">{isRtl ? "PDF, JPG (أقصى حجم 5 ميجابايت)" : "PDF, JPG (Max 5MB)"}</span>
                </div>
                <div className="border border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2 hover:bg-slate-50 cursor-pointer transition-colors">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">{isRtl ? "السجل التجاري أو الهوية المهنية" : "Commercial Register or Professional ID"}</span>
                  <span className="text-[10px] text-slate-400">{isRtl ? "PDF, JPG (أقصى حجم 5 ميجابايت)" : "PDF, JPG (Max 5MB)"}</span>
                </div>
              </div>
            </div>

            <div className={`pt-2 border-t flex ${isRtl ? "justify-start" : "justify-end"}`}>
              <Button className={`bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white rounded-xl text-xs gap-1.5 h-9 ${isRtl ? "" : "flex-row-reverse"}`}>
                <FileCheck className="w-4 h-4" />
                {isRtl ? "تقديم المستندات للمراجعة" : "Submit Documents for Review"}
              </Button>
            </div>
          </div>
        )}


        {/* ─── Tab Content: SECURITY (الأمان) ────────────────────────────── */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <form onSubmit={handleSecuritySave} className="space-y-4 max-w-md">
                <div className={`space-y-1.5 ${isRtl ? "text-right" : "text-left"}`}>
                  <label className="text-xs font-bold text-slate-500">{isRtl ? "كلمة المرور الحالية" : "Current Password"}</label>
                  <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required dir="ltr" />
                </div>
                <div className={`space-y-1.5 ${isRtl ? "text-right" : "text-left"}`}>
                  <label className="text-xs font-bold text-slate-500">{isRtl ? "كلمة المرور الجديدة" : "New Password"}</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required dir="ltr" />
                </div>
                <div className={`space-y-1.5 ${isRtl ? "text-right" : "text-left"}`}>
                  <label className="text-xs font-bold text-slate-500">{isRtl ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}</label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required dir="ltr" />
                </div>

                <div className="pt-2 flex justify-between items-center">
                  {securitySaved && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      {isRtl ? "تم تحديث كلمة المرور بنجاح!" : "Password updated successfully!"}
                    </span>
                  )}
                  <Button type="submit" className={`bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white rounded-xl ${isRtl ? "mr-auto" : "ml-auto"}`}>
                    {isRtl ? "حفظ كلمة المرور" : "Save Password"}
                  </Button>
                </div>
              </form>
            </div>

            <div className={`lg:col-span-1 border-slate-100 space-y-4 text-xs ${isRtl ? "border-r pr-6 text-right" : "border-l pl-6 text-left"}`}>
              <div className={`flex gap-3 items-start p-3 rounded-lg border bg-muted/20 ${isRtl ? "" : "flex-row-reverse"}`}>
                <Laptop className="w-5 h-5 text-slate-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className={`flex justify-between items-center mb-0.5 ${isRtl ? "" : "flex-row-reverse"}`}>
                    <span className="font-bold text-slate-800">{isRtl ? "جهاز كمبيوتر (Mac OS)" : "Computer (Mac OS)"}</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">{isRtl ? "الحالي" : "Current"}</span>
                  </div>
                  <p className="text-slate-500">{isRtl ? "القاهرة، مصر" : "Cairo, Egypt"}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">{isRtl ? "النشط حالياً" : "Currently Active"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab Content: DELETE ACCOUNT ──────────────────────────────── */}
        {activeTab === "delete_account" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-red-800 mb-2">
              {isRtl ? "حذف الحساب" : "Delete Account"}
            </h2>
            <p className="text-sm text-red-700 mb-4">
              {isRtl
                ? "حذف حسابك سيؤدي إلى إزالة جميع بياناتك بشكل دائم. لا يمكن التراجع عن هذا الإجراء."
                : "Deleting your account will permanently remove all your data. This action cannot be undone."
              }
            </p>
            
            <div className="bg-white rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold mb-2">
                {isRtl ? "سيتم حذف:" : "Will be deleted:"}
              </h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• {isRtl ? "جميع بيانات العيادة" : "All clinic data"}</li>
                <li>• {isRtl ? "سجلات المرضى" : "Patient records"}</li>
                <li>• {isRtl ? "المواعيد والجلسات" : "Appointments and sessions"}</li>
                <li>• {isRtl ? "الفواتير والمدفوعات" : "Invoices and payments"}</li>
                <li>• {isRtl ? "إعدادات العيادة" : "Clinic settings"}</li>
                <li>• {isRtl ? "سجلات الموظفين" : "Staff records"}</li>
                <li>• {isRtl ? "الحساب الشخصي" : "Personal account"}</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab("profile")}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                {isRtl ? "تأكيد حذف الحساب" : "Confirm Account Deletion"}
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                {isRtl ? "العودة" : "Cancel"}
              </button>
            </div>
          </div>
        )}

      </Card>
    </div>
  );
}