"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Plus, Building } from "lucide-react";
import Link from "next/link";

interface Branch {
  id: string;
  short_name: string;
  full_name: string;
  slug: string;
  logo_url: string | null;
  status: string;
}

export default function CentersPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const clinicId = user?.clinicId;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [planLimit, setPlanLimit] = useState(1);

  useEffect(() => {
    if (clinicId === undefined) return;
    loadBranches();
  }, [clinicId]);

  const loadBranches = async () => {
    if (!clinicId) return;
    try {
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("plan_name")
        .eq("clinic_id", clinicId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      const plan = (subData && subData[0]?.plan_name) || "basic";
      setPlanLimit(plan === "gold" ? 2 : 1);

      const { data } = await supabase
        .from("branches")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: true });
      setBranches(data || []);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !clinicId) return null;
    const ext = logoFile.name.split(".").pop();
    const path = `${clinicId}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("branch-logos")
      .upload(path, logoFile);
    if (uploadErr) {
      console.warn("[Upload] Failed:", uploadErr);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from("branch-logos")
      .getPublicUrl(path);
    return urlData?.publicUrl || null;
  };

  const handleCreate = async () => {
    if (!shortName || !fullName || !slug) {
      setError(isRtl ? "يرجى ملء جميع الحقول" : "Please fill all fields");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const logoUrl = await uploadLogo();
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: clinicId,
          short_name: shortName,
          full_name: fullName,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
          logo_url: logoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }
      setBranches(prev => [...prev, data.branch]);
      setShowForm(false);
      setShortName("");
      setFullName("");
      setSlug("");
      setLogoFile(null);
      setLogoPreview(null);
    } catch (err: any) {
      setError(err?.message || "Failed to create center");
    } finally {
      setSaving(false);
    }
  };

  const autoSlug = (val: string) => {
    return val.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  };

  if (isLoading) return null;

  const atLimit = branches.length >= planLimit;

  return (
    <div className="min-h-screen bg-neutral-100 p-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isRtl ? "مراكزي" : "My Centers"}
            </h1>
            <p className="text-sm text-slate-400">
              {isRtl ? `لديك ${branches.length} من أصل ${planLimit} مركز` : `${branches.length} of ${planLimit} centers used`}
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              disabled={atLimit}
              className="bg-[#4F46BA] hover:bg-[#4338ca] disabled:bg-gray-300 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all disabled:cursor-not-allowed"
              title={atLimit ? (isRtl ? "لقد وصلت للحد الأقصى" : "Limit reached") : ""}
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {atLimit && !showForm && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg p-3 mb-4 text-center">
            {isRtl
              ? `لقد وصلت للحد الأقصى من المراكز (${planLimit}). قم بترقية خطتك لإضافة المزيد.`
              : `You've reached the max centers (${planLimit}). Upgrade your plan to add more.`}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">
              {isRtl ? "إنشاء مركز جديد" : "Create New Center"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  {isRtl ? "الاسم المختصر" : "Short Name"}
                </label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => {
                    setShortName(e.target.value);
                    if (!slug || slug === autoSlug(shortName)) {
                      setSlug(autoSlug(e.target.value));
                    }
                  }}
                  placeholder={isRtl ? "مثال: عيادة المعادي" : "e.g. Maadi Clinic"}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  {isRtl ? "الاسم الكامل" : "Full Name"}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isRtl ? "مثال: مركز Prime Physio الطبي - المعادي" : "e.g. Prime Physio Medical Center - Maadi"}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  {isRtl ? "الرمز التعريفي" : "Identifier"}
                  <span className="text-[10px] text-slate-400 mr-1">
                    {isRtl ? "(يظهر في الرابط)" : "(appears in URL)"}
                  </span>
                </label>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <span>primephysio.vercel.app/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(autoSlug(e.target.value))}
                    placeholder="my-clinic"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  {isRtl ? "شعار المركز" : "Center Logo"}
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <img src="/logo.png" alt="Prime Physio" className="w-10 h-10 object-contain opacity-50" />
                    )}
                  </div>
                  <label className="cursor-pointer bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs text-slate-500 hover:bg-gray-50 transition-colors">
                    {isRtl ? "اختيار صورة" : "Choose Image"}
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-10 rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {isRtl ? "إنشاء المركز" : "Create Center"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 border border-gray-200 text-slate-500 font-medium h-10 rounded-lg text-sm hover:bg-gray-50"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}

        {branches.length === 0 && !showForm ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <div className="w-16 h-16 bg-[#4F46BA]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-[#4F46BA]" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">
              {isRtl ? "أنشئ مركزك الأول" : "Create Your First Center"}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {isRtl
                ? "أضف مركزك الأول للبدء في إدارة المرضى والمواعيد"
                : "Add your first center to start managing patients and appointments"}
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-12 w-12 rounded-full flex items-center justify-center mx-auto shadow-lg transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        ) : (
          !showForm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map((branch) => (
                <div key={branch.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    {branch.logo_url ? (
                      <img src={branch.logo_url} alt={branch.short_name} className="w-full h-full object-contain" />
                    ) : (
                      <img src="/logo.png" alt="Prime Physio" className="w-8 h-8 object-contain opacity-50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{branch.short_name}</p>
                    <p className="text-xs text-slate-400 truncate">{branch.full_name}</p>
                    <p className="text-[10px] text-slate-300 font-mono">/{branch.slug}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">
                    {branch.status}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        <div className="text-center mt-8">
          <Link
            href="/home"
            className="text-sm text-[#4F46BA] hover:text-[#4338ca] font-medium"
          >
            {isRtl ? "تخطي، سأفعل ذلك لاحقاً ← الذهاب إلى لوحة التحكم" : "Skip, I'll do this later → Go to Dashboard"}
          </Link>
        </div>
      </div>
    </div>
  );
}
