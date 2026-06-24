"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/Loader";
import { Upload, ArrowRight, Check, X } from "lucide-react";
import { getAppValue, setAppValue } from "@/lib/appStorage";

const SPECIALIZATIONS = [
  { id: "pediatric", ar: "تأهيل أطفال", en: "Pediatric Rehab" },
  { id: "sports", ar: "إصابات ملاعب", en: "Sports Injuries" },
  { id: "neuro", ar: "تأهيل عصبي", en: "Neuro Rehab" },
  { id: "ortho", ar: "علاج عظام", en: "Orthopedic PT" },
  { id: "cardio", ar: "تأهيل قلبي", en: "Cardiac Rehab" },
  { id: "geriatric", ar: "تأهيل مسنين", en: "Geriatric Rehab" },
  { id: "manual", ar: "علاج يدوي", en: "Manual Therapy" },
  { id: "vestibular", ar: "تأهيل دهليزي", en: "Vestibular Rehab" },
  { id: "pelvic", ar: "تأهيل حوضي", en: "Pelvic Floor Therapy" },
  { id: "respiratory", ar: "تأهيل تنفسي", en: "Respiratory Therapy" },
];

export default function CenterSetupPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user, isLoading: authLoading } = useAuth();
  const { data: session, status } = useSession();
  const router = useRouter();
  const userEmail = user?.email || session?.user?.email || "";

  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");

  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth guard — supports both NextAuth (Google) and Supabase (email/password)
  const isAuthenticated = status === "authenticated" || !!user;
  const isAuthLoading = status === "loading" || authLoading;

  // Slug uniqueness check (debounced)
  const checkSlug = useCallback(async (val: string) => {
    if (val.length < 2) { setSlugAvailable(null); return; }
    setSlugChecking(true);
    try {
      const res = await fetch(`/api/slug-check?slug=${encodeURIComponent(val)}`);
      const data = await res.json();
      setSlugAvailable(data.available);
    } catch {
      setSlugAvailable(null);
    } finally {
      setSlugChecking(false);
    }
  }, []);

  const handleSlugChange = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
    setSlug(cleaned);
    if (slugTimer.current) clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(() => checkSlug(cleaned), 400);
  };

  const toggleSpecialization = (id: string) => {
    setSpecializations((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!shortName.trim() || !slug.trim()) {
      setError(isRtl ? "الرجاء إدخال اسم المركز والرمز التعريفي" : "Please enter center name and slug");
      return;
    }

    if (slugAvailable === false) {
      setError(isRtl ? "الرمز التعريفي مستخدم بالفعل" : "This slug is already taken");
      return;
    }

    if (!userEmail) {
      setError(isRtl ? "لم يتم تحميل بيانات المستخدم" : "User data not loaded");
      return;
    }

    setIsLoading(true);

    let logoUrl = "";
    if (logoFile) {
      const formData = new FormData();
      formData.append("file", logoFile);
      formData.append("email", userEmail);
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

    const pendingPlanId = await getAppValue<string>("pending_plan_id", "basic");

    try {
      const res = await fetch("/api/center-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          planId: pendingPlanId,
          shortName: shortName.trim(),
          fullName: fullName.trim(),
          slug: slug.trim().toLowerCase(),
          specializations,
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

  useEffect(() => {
    return () => { if (slugTimer.current) clearTimeout(slugTimer.current); };
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex items-center justify-center" dir={isRtl ? "rtl" : "ltr"}>
        <Loader size={24} color="#4F46BA" />
      </div>
    );
  }
  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = `/manage?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex items-center justify-center" dir={isRtl ? "rtl" : "ltr"}>
        <Loader size={24} color="#4F46BA" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
            {isRtl ? "تم إنشاء المركز بنجاح!" : "Center Created Successfully!"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {isRtl ? "جاري تحويلك إلى صفحة تسجيل الدخول الخاصة بمركزك..." : "Redirecting to your center's login page..."}
          </p>

          <div className="flex justify-center mb-6">
            <Loader size={24} color="#4F46BA" />
          </div>

          <button 
            onClick={async () => {
              window.location.href = `/${createdSlug}`;
            }}
            className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white font-bold py-3 rounded-2xl text-sm hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isRtl ? "انقر هنا للتحويل الآن" : "Click here to redirect now"}
            <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          </button>

          {/* Auto-redirect effect */}
          <img 
            src="/empty.gif" 
            alt="" 
            className="hidden" 
            onError={() => {
              setTimeout(() => {
                window.location.href = `/${createdSlug}`;
              }, 2000);
            }}
          />
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
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
              {isRtl ? "إنشاء المركز" : "Create Center"}
            </h2>
            <p className="text-slate-500 text-sm">
              {isRtl ? "أدخل بيانات مركزك العلاجي" : "Enter your center information"}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
              <span className="text-red-500 text-xs">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "اسم المركز المختصر" : "Short Center Name"} *</label>
              <input value={shortName} onChange={(e) => setShortName(e.target.value)}
                placeholder={isRtl ? "مثلاً: مركز السلام للتأهيل" : "e.g. Al-Salam Rehab Center"}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#4F46BA] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "اسم المركز بالكامل" : "Full Center Name"}</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder={isRtl ? "مثلاً: مركز السلام الدولي للعلاج الطبيعي والتأهيل" : "e.g. Al-Salam International PT & Rehab Center"}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#4F46BA] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "الرمز التعريفي (Slug)" : "Center Slug"} *</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 whitespace-nowrap">primephysio.vercel.app/</span>
                <div className="flex-1 relative">
                  <input value={slug} onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder={isRtl ? "السلام" : "al-salam"}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-[#4F46BA] transition-colors ltr"
                    dir="ltr"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {slugChecking ? (
                      <Loader size={14} color="#94a3b8" />
                    ) : slugAvailable === true ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : slugAvailable === false ? (
                      <X className="w-4 h-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
              </div>
              {slugAvailable === false && (
                <p className="text-[11px] text-red-500 mt-1">{isRtl ? "هذا الرمز مستخدم بالفعل" : "This slug is already taken"}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "التخصصات" : "Specializations"}</label>
              <div dir="ltr" className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((spec) => {
                  const selected = specializations.includes(spec.id);
                  return (
                    <button key={spec.id} type="button" onClick={() => toggleSpecialization(spec.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selected
                          ? "bg-[#4F46BA]/10 border-[#4F46BA] text-[#4F46BA]"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {isRtl ? spec.ar : spec.en}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "شعار المركز" : "Center Logo"}</label>
              <label className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#4F46BA]/40 transition-colors block">
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={logoPreview} alt="Preview" className="w-20 h-20 object-contain rounded-lg" />
                    <span className="text-[11px] text-slate-400">{logoFile?.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-slate-300" />
                    <span className="text-xs text-slate-400">{isRtl ? "اضغط لرفع شعار المركز" : "Click to upload center logo"}</span>
                    <span className="text-[10px] text-slate-300">{isRtl ? "PNG, JPG — حد أقصى 5 ميجابايت" : "PNG, JPG — Max 5MB"}</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) { setError(isRtl ? "الرجاء اختيار صورة" : "Please select an image"); return; }
                    if (file.size > 5 * 1024 * 1024) { setError(isRtl ? "حجم الصورة يجب أن لا يتجاوز 5 ميجابايت" : "Image must be under 5MB"); return; }
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                    setError("");
                  }}
                />
              </label>
            </div>

            <button type="submit" disabled={isLoading || !shortName.trim() || !slug.trim() || slugAvailable === false}
              className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white font-bold py-3 rounded-2xl text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
            >
              {isLoading ? (
                <><Loader size={16} /> {isRtl ? "جاري الإنشاء..." : "Creating..."}</>
              ) : (
                <>{isRtl ? "إنشاء المركز" : "Create Center"} <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} /></>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
