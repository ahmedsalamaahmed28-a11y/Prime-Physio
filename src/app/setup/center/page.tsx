"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { ArrowRight, Upload, X } from "lucide-react";

export default function SetupCenterPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();

  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.clinicId) {
      window.location.href = "/home";
    }
  }, [user?.clinicId]);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 30);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;
    const formData = new FormData();
    formData.append("file", logoFile);
    const res = await fetch("/api/upload/logo", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to upload logo");
    }
    const data = await res.json();
    return data.url || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortName.trim() || !slug.trim()) return;
    setLoading(true);
    setError("");
    try {
      let logoUrl: string | null = null;
      if (logoFile) {
        logoUrl = await uploadLogo();
      }
      const res = await fetch("/api/setup/center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          short_name: shortName.trim(),
          full_name: fullName.trim() || shortName.trim(),
          slug: slug.trim(),
          logo_url: logoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create center");
      window.location.href = "/subscribe";
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
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
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">
                {isRtl ? "اسم المركز" : "Center Name"}
              </label>
              <input
                type="text"
                placeholder={isRtl ? "المركز الرئيسي" : "Main Center"}
                value={shortName}
                onChange={(e) => {
                  setShortName(e.target.value);
                  if (!slug || slug === generateSlug(shortName)) {
                    setSlug(generateSlug(e.target.value));
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
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
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
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#4F46BA] cursor-pointer flex items-center justify-center overflow-hidden bg-slate-50/50 transition-colors"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">
                    {logoFile
                      ? logoFile.name
                      : isRtl
                        ? "اختر صورة للمركز"
                        : "Choose a clinic logo"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isRtl ? "PNG, JPG — مقاس مربع" : "PNG, JPG — square preferred"}
                  </p>
                </div>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !shortName.trim() || !slug.trim()}
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
  );
}
