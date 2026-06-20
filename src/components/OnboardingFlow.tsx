"use client";
import React, { useState } from "react";
import { Zap, Shield, Crown, Check, Building, Clock, MapPin, Phone, Loader2, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";

interface OnboardingFlowProps {
  step: "plan" | "clinic" | "done";
  setStep: (s: "plan" | "clinic" | "done") => void;
  clinicId?: string | null;
  isRtl: boolean;
}

const PLANS = [
  { id: "basic", nameAr: "الأساسية", nameEn: "Basic", price: 500, icon: Zap, gradient: "from-slate-400 to-slate-500", badgeAr: "أساسي", badgeEn: "Essential" },
  { id: "silver", nameAr: "الفضية", nameEn: "Silver", price: 1000, icon: Shield, gradient: "from-cyan-500 to-blue-600", badgeAr: "الأكثر طلباً", badgeEn: "Most Popular" },
  { id: "gold", nameAr: "الذهبية", nameEn: "Gold", price: 1500, icon: Crown, gradient: "from-[#FF8C00] via-[#FFC300] to-[#FFF082]", badgeAr: "كامل", badgeEn: "Full" },
];

export default function OnboardingFlow({ step, setStep, clinicId, isRtl }: OnboardingFlowProps) {
  const { language } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<string>("basic");
  const [loading, setLoading] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePlanSelect = async () => {
    setLoading(true);
    try {
      await fetch("/api/subscription/select-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, plan: selectedPlan }),
      });
      setStep("clinic");
    } catch {
      console.error("Failed to select plan");
    } finally {
      setLoading(false);
    }
  };

  const handleClinicSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("clinic_settings").upsert({
        clinic_id: clinicId,
        user_id: "default",
        clinic_name: clinicName || "Prime Physio Clinic",
        phone: phone || "0114002020",
        address: address || "Main branch",
        working_hours: "09:00 AM - 09:00 PM",
        branches: [{ id: "main", name: clinicName || "Prime Physio Clinic", phone: phone || "0114002020", address: address || "Main branch", hours: [
          { day: "الأحد", from: "09:00 AM", to: "05:00 PM", isOpen: true },
          { day: "الإثنين", from: "09:00 AM", to: "05:00 PM", isOpen: true },
          { day: "الثلاثاء", from: "09:00 AM", to: "05:00 PM", isOpen: true },
          { day: "الأربعاء", from: "09:00 AM", to: "05:00 PM", isOpen: true },
          { day: "الخميس", from: "09:00 AM", to: "05:00 PM", isOpen: true },
          { day: "الجمعة", from: "09:00 AM", to: "05:00 PM", isOpen: false },
          { day: "السبت", from: "09:00 AM", to: "05:00 PM", isOpen: false },
        ]}],
      }, { onConflict: "user_id" });
      if (error) throw error;
      setStep("done");
    } catch (err) {
      console.error("Failed to save clinic settings", err);
    } finally {
      setSaving(false);
    }
  };

  if (step === "plan") {
    return (
      <div className="max-w-4xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {isRtl ? "اختر الباقة المناسبة" : "Choose Your Plan"}
          </h2>
          <p className="text-slate-500 text-sm">
            {isRtl ? "اختر الباقة التي تناسب حجم عيادتك" : "Select the plan that fits your clinic"}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative p-6 rounded-2xl border-2 text-center transition-all ${
                  isSelected
                    ? "border-[#4F46BA] bg-[#4F46BA]/5 shadow-lg shadow-[#4F46BA]/10"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border mb-3 ${
                  plan.id === "basic" ? "bg-slate-100 text-slate-600 border-slate-200" :
                  plan.id === "silver" ? "bg-cyan-100 text-cyan-700 border-cyan-200" :
                  "bg-amber-100 text-amber-700 border-amber-200"
                }`}>
                  {isRtl ? plan.badgeAr : plan.badgeEn}
                </span>
                <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? "text-[#4F46BA]" : "text-slate-400"}`} />
                <h3 className="text-lg font-bold text-slate-800">{isRtl ? plan.nameAr : plan.nameEn}</h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">{plan.price}<span className="text-sm font-normal text-slate-500">{isRtl ? " ج.م/شهر" : " EGP/mo"}</span></p>
                {isSelected && <Check className="w-5 h-5 text-[#4F46BA] mx-auto mt-3" />}
              </button>
            );
          })}
        </div>
        <div className="text-center mt-6">
          <button
            onClick={handlePlanSelect}
            disabled={loading}
            className="px-8 py-3 bg-[#4F46BA] text-white rounded-xl font-semibold hover:bg-[#3D36A0] disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRtl ? "جاري الحجز..." : "Reserving..."}
              </span>
            ) : (
              isRtl ? "تأكيد الباقة" : "Confirm Plan"
            )}
          </button>
        </div>
      </div>
    );
  }

  if (step === "clinic") {
    return (
      <div className="max-w-lg mx-auto" dir={isRtl ? "rtl" : "ltr"}>
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#4F46BA]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Building className="w-6 h-6 text-[#4F46BA]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {isRtl ? "إعداد العيادة" : "Clinic Setup"}
          </h2>
          <p className="text-slate-500 text-sm">
            {isRtl ? "أدخل بيانات عيادتك الأساسية" : "Enter your clinic details"}
          </p>
        </div>
        <form onSubmit={handleClinicSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isRtl ? "اسم العيادة" : "Clinic Name"}
            </label>
            <div className="relative">
              <Building className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder={isRtl ? "اسم العيادة" : "Clinic Name"}
                className={`w-full h-10 rounded-lg border border-slate-200 bg-white text-sm px-3 ${isRtl ? "pr-10" : "pl-10"} focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isRtl ? "رقم الهاتف" : "Phone Number"}
            </label>
            <div className="relative">
              <Phone className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isRtl ? "رقم الهاتف" : "Phone Number"}
                className={`w-full h-10 rounded-lg border border-slate-200 bg-white text-sm px-3 ${isRtl ? "pr-10" : "pl-10"} focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isRtl ? "العنوان" : "Address"}
            </label>
            <div className="relative">
              <MapPin className={`absolute top-3 w-4 h-4 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={isRtl ? "عنوان العيادة" : "Clinic Address"}
                rows={2}
                className={`w-full rounded-lg border border-slate-200 bg-white text-sm px-3 py-2 ${isRtl ? "pr-10" : "pl-10"} focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none resize-none`}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#4F46BA] text-white rounded-xl font-semibold hover:bg-[#3D36A0] disabled:opacity-50 transition-all"
          >
            {saving ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRtl ? "جادي الحفظ..." : "Saving..."}
              </span>
            ) : (
              isRtl ? "حفظ ومتابعة" : "Save & Continue"
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="text-center py-12" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        {isRtl ? "تم الإعداد بنجاح!" : "Setup Complete!"}
      </h2>
      <p className="text-slate-500 mb-6">
        {isRtl ? "عيادتك جاهزة. يمكنك الآن البدء في إضافة المرضى والمواعيد." : "Your clinic is ready. Start adding patients and appointments."}
      </p>
      <a
        href="/dashboard"
        className="inline-block px-8 py-3 bg-[#4F46BA] text-white rounded-xl font-semibold hover:bg-[#3D36A0] transition-all"
      >
        {isRtl ? "الذهاب إلى لوحة التحكم" : "Go to Dashboard"}
      </a>
    </div>
  );
}
