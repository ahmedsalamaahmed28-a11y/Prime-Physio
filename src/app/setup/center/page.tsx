"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { ArrowRight, Upload, X } from "lucide-react";
import SetupSteps from "@/components/SetupSteps";

export default function SetupCenterPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user, isLoading: authLoading } = useAuth();

  interface CenterEntry {
    id: string;
    shortName: string;
    fullName: string;
    slug: string;
    logoFile: File | null;
    logoPreview: string | null;
  }

  const [centers, setCenters] = useState<CenterEntry[]>([
    { id: crypto.randomUUID(), shortName: "", fullName: "", slug: "", logoFile: null, logoPreview: null },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addCenter = () => {
    setCenters(prev => [...prev, {
      id: crypto.randomUUID(), shortName: "", fullName: "", slug: "", logoFile: null, logoPreview: null,
    }]);
  };

  const removeCenter = (id: string) => {
    setCenters(prev => prev.filter(c => c.id !== id));
  };

  const updateCenter = (id: string, field: keyof CenterEntry, value: any) => {
    setCenters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  useEffect(() => {
    if (!authLoading && user?.clinicId) {
      window.location.href = "/home";
    }
  }, [authLoading, user?.clinicId]);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 30);

  const handleLogoChange = (centerId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateCenter(centerId, "logoFile", file);
    const reader = new FileReader();
    reader.onload = () => updateCenter(centerId, "logoPreview", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (centers.some(c => !c.shortName.trim() || !c.slug.trim())) return;
    setLoading(true);
    setError("");

    try {
      const centersData = [];
      for (const center of centers) {
        let logoUrl: string | null = null;
        if (center.logoFile) {
          const formData = new FormData();
          formData.append("file", center.logoFile);
          const uploadRes = await fetch("/api/upload/logo", {
            method: "POST",
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            logoUrl = uploadData.url;
          }
        }
        centersData.push({
          short_name: center.shortName.trim(),
          full_name: center.fullName.trim() || center.shortName.trim(),
          slug: center.slug.trim(),
          logo_url: logoUrl,
        });
      }

      const res = await fetch("/api/setup/center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centers: centersData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create centers");
      
      // Update auth context with new clinicId BEFORE redirect to prevent race condition
      if (data.clinicId) {
        try {
          const enrichRes = await fetch("/api/auth/enrich");
          if (enrichRes.ok) {
            const enrichData = await enrichRes.json();
            if (enrichData.clinicId) {
              // Trigger auth context update by calling enrich endpoint
              // The auth context will pick up the new clinicId via its enrich logic
            }
          }
        } catch {}
      }
      
      // Small delay to allow auth context to update before redirect
      setTimeout(() => {
        window.location.href = "/subscribe";
      }, 100);
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <SetupSteps />
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex flex-col items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/logo.png" alt="Prime Physio" className="w-8 h-8 object-contain" />
            <span className="text-sm font-bold text-[#4F46BA]">Prime Physio</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4 text-xs">
            <span className="text-emerald-600 font-medium">✓ {isRtl ? "الحساب" : "Account"}</span>
            <span className="text-slate-300">→</span>
            <span className="text-[#4F46BA] font-semibold">{isRtl ? "المركز" : "Center"}</span>
            <span className="text-slate-300">→</span>
            <span className="text-slate-400">{isRtl ? "الباقة" : "Plan"}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            {isRtl ? "إنشاء أول مركز" : "Create Your First Center"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl ? "أدخل بيانات المركز الرئيسي للعيادة" : "Enter your main clinic center details"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {centers.map((center, idx) => (
              <div key={center.id} className="border border-slate-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700">
                    {isRtl ? `المركز ${idx + 1}` : `Center ${idx + 1}`}
                  </h3>
                  {centers.length > 1 && (
                    <button type="button" onClick={() => removeCenter(center.id)}
                      className="text-xs text-red-500 hover:text-red-700">
                      {isRtl ? "حذف" : "Remove"}
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">
                    {isRtl ? "اسم المركز" : "Center Name"}
                  </label>
                  <input
                    type="text"
                    placeholder={isRtl ? "المركز الرئيسي" : "Main Center"}
                    value={center.shortName}
                    onChange={(e) => {
                      updateCenter(center.id, "shortName", e.target.value);
                      const generatedSlug = generateSlug(e.target.value);
                      if (!center.slug || center.slug === generateSlug(center.shortName)) {
                        updateCenter(center.id, "slug", generatedSlug);
                      }
                    }}
                    className="w-full text-slate-700 flex h-9 min-w-0 rounded-lg border bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-[#4F46BA] focus-visible:ring-[3px] focus-visible:ring-[#4F46BA]/20"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">
                    {isRtl ? "الاسم الكامل للمركز" : "Full Center Name"}
                  </label>
                  <input
                    type="text"
                    placeholder={isRtl ? "مركز العلاج الطبيعي الرئيسي" : "Main Physiotherapy Center"}
                    value={center.fullName}
                    onChange={(e) => updateCenter(center.id, "fullName", e.target.value)}
                    className="w-full text-slate-700 flex h-9 min-w-0 rounded-lg border bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-[#4F46BA] focus-visible:ring-[3px] focus-visible:ring-[#4F46BA]/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">
                    {isRtl ? "الرابط المختصر" : "Slug"}
                  </label>
                  <input
                    type="text"
                    placeholder="main-center"
                    value={center.slug}
                    onChange={(e) => updateCenter(center.id, "slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="w-full text-slate-700 flex h-9 min-w-0 rounded-lg border bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-[#4F46BA] focus-visible:ring-[3px] focus-visible:ring-[#4F46BA]/20"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isRtl ? "أحرف إنجليزية وأرقام فقط" : "English letters and numbers only"}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">
                    {isRtl ? "شعار المركز" : "Clinic Logo"}
                  </label>
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => fileInputRefs.current[center.id]?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#4F46BA] cursor-pointer flex items-center justify-center overflow-hidden bg-slate-50/50 transition-colors"
                    >
                      {center.logoPreview ? (
                        <img src={center.logoPreview} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <Upload className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">
                        {center.logoFile
                          ? center.logoFile.name
                          : isRtl
                            ? "اختر صورة للمركز"
                            : "Choose a clinic logo"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {isRtl ? "PNG, JPG — مقاس مربع" : "PNG, JPG — square preferred"}
                      </p>
                    </div>
                    {center.logoPreview && (
                      <button
                        type="button"
                        onClick={() => { updateCenter(center.id, "logoFile", null); updateCenter(center.id, "logoPreview", null); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    ref={el => { fileInputRefs.current[center.id] = el; }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoChange(center.id, e)}
                    className="hidden"
                  />
                </div>
              </div>
            ))}

            <button type="button" onClick={addCenter}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-slate-400 hover:border-[#4F46BA] hover:text-[#4F46BA] transition-colors text-sm">
              {isRtl ? "+ إضافة مركز تاني" : "+ Add Another Center"}
            </button>

            <button
              type="submit"
              disabled={loading || centers.some(c => !c.shortName.trim() || !c.slug.trim())}
              className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-10 rounded-lg transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-1">
                  {isRtl ? "متابعة" : "Continue"}
                  <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
