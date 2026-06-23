"use client";
import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { Loader } from "@/components/Loader";
import { Upload, ArrowRight } from "lucide-react";

export default function ClinicSetupPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!shortName.trim() || !slug.trim()) {
      setError(isRtl ? "الرجاء إدخال اسم المركز والرمز التعريفي" : "Please enter clinic name and slug");
      return;
    }

    if (!user?.clinicId) {
      setError(isRtl ? "لم يتم تحميل بيانات العيادة" : "Clinic data not loaded");
      return;
    }

    setIsLoading(true);

    let logoUrl = "";
    if (logoFile) {
      const formData = new FormData();
      formData.append("file", logoFile);
      formData.append("clinicId", user.clinicId);
      try {
        const uploadRes = await fetch("/api/upload/logo", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "فشل رفع الشعار");
        logoUrl = uploadData.url;
      } catch (e: any) {
        setError(e?.message || "فشل رفع الشعار");
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: user.clinicId,
          slug: slug.trim(),
          fullName: fullName.trim(),
          shortName: shortName.trim(),
          logoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء المركز");
      setCreatedSlug(slug.trim());
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
            {isRtl ? "تم إنشاء المركز بنجاح!" : "Clinic Created Successfully!"}
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            {isRtl ? "يمكنك الآن البدء في إضافة المرضى والجلسات" : "You can now start adding patients and sessions"}
          </p>
          <button onClick={() => { window.location.href = createdSlug ? `/${createdSlug}` : "/home"; }}
            className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white font-bold py-3 rounded-2xl text-sm hover:opacity-90 transition-all shadow-md"
          >
            {isRtl ? "دخول للمنصة" : "Enter Dashboard"}
            <ArrowRight className={`w-4 h-4 inline mr-1 ${isRtl ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white" dir={isRtl ? "rtl" : "ltr"}>
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2">
          <img src="/logo.png" alt="Prime Physio" className="w-7 h-7 object-contain" />
          <span className="text-sm font-bold text-[#4F46BA]">Prime Physio</span>
        </div>
      </nav>
      <main className="px-4 py-8 sm:py-12">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
              {isRtl ? "إنشاء المركز" : "Create Clinic"}
            </h2>
            <p className="text-slate-500 text-sm">
              {isRtl ? "أدخل بيانات مركزك العلاجي" : "Enter your clinic information"}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
              <span className="text-red-500 text-xs">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8 space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "اسم المركز المختصر" : "Short Clinic Name"} *</label>
              <input value={shortName} onChange={(e) => setShortName(e.target.value)}
                placeholder={isRtl ? "مثلاً: مركز السلام للتأهيل" : "e.g. Al-Salam Rehab Center"}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#4F46BA] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "اسم المركز بالكامل" : "Full Clinic Name"}</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder={isRtl ? "مثلاً: مركز السلام الدولي للعلاج الطبيعي والتأهيل" : "e.g. Al-Salam International PT & Rehab Center"}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#4F46BA] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "الرمز التعريفي (Slug)" : "Clinic Slug"} *</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 whitespace-nowrap">primephysio.vercel.app/</span>
                <input value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                  placeholder={isRtl ? "السلام" : "al-salam"}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-[#4F46BA] transition-colors ltr"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "شعار المركز" : "Clinic Logo"}</label>
              <label className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#4F46BA]/40 transition-colors block">
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={logoPreview} alt="Preview" className="w-20 h-20 object-contain rounded-lg" />
                    <span className="text-[11px] text-slate-400">{logoFile?.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-slate-300" />
                    <span className="text-xs text-slate-400">{isRtl ? "اضغط لرفع شعار المركز" : "Click to upload clinic logo"}</span>
                    <span className="text-[10px] text-slate-300">{isRtl ? "PNG, JPG — حد أقصى 2 ميجابايت" : "PNG, JPG — Max 2MB"}</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) { setError(isRtl ? "الرجاء اختيار صورة" : "Please select an image"); return; }
                    if (file.size > 2 * 1024 * 1024) { setError(isRtl ? "حجم الصورة يجب أن لا يتجاوز 2 ميجابايت" : "Image must be under 2MB"); return; }
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                    setError("");
                  }}
                />
              </label>
            </div>

            <button type="submit" disabled={isLoading || !shortName.trim() || !slug.trim()}
              className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white font-bold py-3 rounded-2xl text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
            >
              {isLoading ? (
                <><Loader size={16} /> {isRtl ? "جاري الإنشاء..." : "Creating..."}</>
              ) : (
                <>{isRtl ? "إنشاء المركز" : "Create Clinic"} <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} /></>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
