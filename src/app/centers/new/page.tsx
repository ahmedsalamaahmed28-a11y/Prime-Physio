"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Building, ArrowRight, Loader2 } from "lucide-react";

export default function NewCenterPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 30);

  const handleNameChange = (val: string) => {
    setShortName(val);
    if (!slug || slug === generateSlug(shortName)) {
      setSlug(generateSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortName.trim() || !slug.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/setup/center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          short_name: shortName.trim(),
          full_name: fullName.trim() || shortName.trim(),
          slug: slug.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create center");
      }

      window.location.href = "/subscribe";
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setIsLoading(false);
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
          <h1 className="text-xl font-bold text-slate-800">
            {isRtl ? "إنشاء أول مركز" : "Create Your First Center"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? "أدخل بيانات المركز الرئيسي للعيادة"
              : "Enter your main clinic center details"}
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
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  placeholder={isRtl ? "المركز الرئيسي" : "Main Center"}
                  value={shortName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full pl-10 text-slate-700 flex h-9 min-w-0 rounded-lg border bg-white px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#4F46BA] focus-visible:ring-[3px] focus-visible:ring-[#4F46BA]/20"
                  required
                />
              </div>
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
                className="w-full text-slate-700 flex h-9 min-w-0 rounded-lg border bg-white px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#4F46BA] focus-visible:ring-[3px] focus-visible:ring-[#4F46BA]/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">
                {isRtl ? "الرابط المختصر" : "Slug"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-300">/</span>
                <input
                  type="text"
                  placeholder="main-center"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="w-full pl-7 text-slate-700 flex h-9 min-w-0 rounded-lg border bg-white px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-[#4F46BA] focus-visible:ring-[3px] focus-visible:ring-[#4F46BA]/20"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isRtl ? "مستخدم في الرابط (أحرف إنجليزية وأرقام فقط)" : "Used in URLs (english letters and numbers only)"}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !shortName.trim() || !slug.trim()}
              className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50 mt-6"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
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
