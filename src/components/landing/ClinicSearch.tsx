"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building, Search, ArrowLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

type Clinic = { id: string; name: string; name_en: string | null; slug: string; city: string | null; logo_url: string | null };

export default function ClinicSearch() {
  const { language } = useLanguage();
  const en = language === "en";
  const [query, setQuery] = useState("");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setClinics([]);
      setSearched(false);
      setError("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/public/clinics?q=${encodeURIComponent(value)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("search");
        const data = await response.json();
        setClinics(Array.isArray(data.clinics) ? data.clinics : []);
        setSearched(true);
      } catch (e) {
        if (!controller.signal.aborted) setError(en ? "Clinic search is temporarily unavailable." : "البحث عن المراكز غير متاح مؤقتًا.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, en]);

  return (
    <section className="pp-wrap py-10 md:py-14" aria-label={en ? "Find your clinic" : "ابحث عن مركزك"} dir={en ? "ltr" : "rtl"}>
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40 md:p-8">
        <div className="mb-5 text-center">
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#4F46BA]"><Building size={23}/></span>
          <h2 className="text-xl font-bold text-slate-900 md:text-2xl">{en ? "Find your clinic" : "ابحث عن مركزك"}</h2>
          <p className="mt-2 text-sm text-slate-500">{en ? "Search by clinic name or city to open its dedicated sign-in page." : "ابحث باسم المركز أو المدينة للوصول إلى صفحة الدخول الخاصة به."}</p>
        </div>
        <div className="relative">
          <Search className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 ${en ? "left-4" : "right-4"}`}/>
          <input value={query} onChange={e => setQuery(e.target.value)} type="search" minLength={2}
            placeholder={en ? "Clinic name or city..." : "اسم المركز أو المدينة..."}
            className={`h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none transition focus:border-[#4F46BA] focus:bg-white focus:ring-4 focus:ring-indigo-100 ${en ? "pl-12 pr-12" : "pr-12 pl-12"}`}
            aria-label={en ? "Search clinics" : "البحث عن المراكز"} />
          {loading && <Loader2 className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-[#4F46BA] ${en ? "right-4" : "left-4"}`}/>}
        </div>
        {error && <p role="alert" className="mt-4 text-center text-sm text-red-600">{error}</p>}
        {searched && !loading && !error && clinics.length === 0 && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">{en ? "No active clinic with a dedicated link was found." : "لم نعثر على مركز نشط لديه رابط دخول مخصص حتى الآن."}</p>}
        {clinics.length > 0 && <div className="mt-4 grid gap-2">
          {clinics.map(clinic => <Link key={clinic.id} href={`/clinic/${encodeURIComponent(clinic.slug)}`} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/50">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-[#4F46BA]">{clinic.logo_url ? <img src={clinic.logo_url} alt="" className="h-full w-full object-contain"/> : <Building size={20}/>}</span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-800">{en ? clinic.name_en || clinic.name : clinic.name}</strong><small className="text-xs text-slate-500">{clinic.city || (en ? "Clinic" : "مركز علاج طبيعي")}</small></span>
            <ArrowLeft className={`h-4 w-4 shrink-0 text-slate-400 ${en ? "rotate-180" : ""}`}/>
          </Link>)}
        </div>}
        {query.trim().length < 2 && <p className="mt-3 text-center text-xs text-slate-400">{en ? "Enter at least 2 characters to search." : "اكتب حرفين على الأقل لبدء البحث."}</p>}
      </div>
    </section>
  );
}
