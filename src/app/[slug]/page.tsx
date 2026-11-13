"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import {
  ArrowRight, Building, Check, Clock, Eye, EyeClosed, Globe, Lock, Mail, MapPin, Phone,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/LanguageContext";
import { Loader } from "@/components/Loader";

type ClinicProfile = {
  id: string; name: string; name_en?: string | null; slug: string;
  city?: string | null; country?: string | null; phone?: string | null;
  address?: string | null; logo_url?: string | null; public_description?: string | null;
  cover_url?: string | null; whatsapp?: string | null; working_hours?: string | null;
  website_url?: string | null; instagram_url?: string | null; facebook_url?: string | null;
  maps_url?: string | null; primary_color?: string | null; cta_text?: string | null;
};
type PublicService = { id: string; name: string; name_en?: string | null; duration_minutes?: number | null; price?: number | null; is_package?: boolean; package_sessions?: number | null };
type PublicTeamMember = { id: string; name: string; role?: string | null; specialty?: string | null };

export default function BrandedClinicPage() {
  const params = useParams();
  const slug = String(params?.slug || "").toLowerCase();
  const { language, toggleLanguage } = useLanguage();
  const isRtl = language === "ar";
  const { status } = useSession();
  const { user } = useAuth();
  const [clinic, setClinic] = useState<ClinicProfile | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [team, setTeam] = useState<PublicTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const primary = clinic?.primary_color || "#4F46BA";
  const addressText = [clinic?.address, clinic?.city, clinic?.country].filter(Boolean).join("، ");
  const whatsappNumber = (clinic?.whatsapp || clinic?.phone || "").replace(/[^0-9]/g, "");
  const mapsHref = clinic?.maps_url || (addressText ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}` : "");
  const displayName = isRtl ? clinic?.name : (clinic?.name_en || clinic?.name);
  const workingHoursRows = (() => {
    if (!clinic?.working_hours) return [];
    try {
      const parsed = JSON.parse(clinic.working_hours);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const weekdayLabels: Record<string, string> = {
    "الأحد": "Sunday", "الاثنين": "Monday", "الثلاثاء": "Tuesday", "الأربعاء": "Wednesday",
    "الخميس": "Thursday", "الجمعة": "Friday", "السبت": "Saturday",
  };

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    fetch(`/api/public/clinics?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Clinic not found");
        if (!active) return;
        setClinic(payload.clinic || null);
        setServices(Array.isArray(payload.services) ? payload.services : []);
        setTeam(Array.isArray(payload.team) ? payload.team : []);
      })
      .catch(() => { if (active) setNotFound(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        clinicSlug: slug,
        redirect: false,
      });
      if (!result || result.error) {
        throw new Error(isRtl ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password");
      }

      if (!clinic?.id) throw new Error(isRtl ? "بيانات المركز غير متاحة" : "Clinic information is unavailable");
      sessionStorage.setItem("preferred_clinic_id", clinic.id);
      const response = await fetch(`/api/auth/supabase-session?clinic_id=${encodeURIComponent(clinic.id)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.session?.access_token || !payload.session?.refresh_token) {
        throw new Error(payload.error || (isRtl ? "تعذر تفعيل جلسة هذا المركز" : "Could not activate this clinic session"));
      }
      const { error } = await supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      });
      if (error) throw error;
      window.location.replace("/dashboard");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : (isRtl ? "حدث خطأ في الاتصال. حاول مرة أخرى." : "Connection error. Please try again."));
      setLoginLoading(false);
    }
  };

  const sectionTitle = (ar: string, en: string) => isRtl ? ar : en;

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center bg-[#f7f7fc]" dir={isRtl ? "rtl" : "ltr"}><Loader size={34} color="#4F46BA" /></main>;
  }

  if (notFound || !clinic) {
    return (
      <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center bg-[#f7f7fc] px-5">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-9 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-[#4F46BA]"><Building size={30} /></div>
          <h1 className="text-2xl font-black text-slate-900">{sectionTitle("المركز غير موجود", "Clinic not found")}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">{sectionTitle("الرابط غير صحيح أو أن صفحة المركز لم تعد متاحة.", "This link is invalid or this clinic page is no longer available.")}</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#4F46BA] px-5 py-3 text-sm font-bold text-white">{sectionTitle("العودة إلى Prime Physio", "Back to Prime Physio")} <ArrowRight size={16} /></Link>
        </div>
      </main>
    );
  }

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen overflow-x-hidden bg-[#f8f9ff] text-[#0b1c30]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/90 shadow-[0_1px_8px_rgba(0,0,0,.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md" style={{ backgroundColor: primary }}><Building size={21} /></span>
            <span className="flex flex-col leading-tight"><strong className="text-base font-extrabold tracking-tight" style={{ color: primary }}>Prime Physio</strong><small className="mt-1 max-w-[170px] truncate text-[11px] font-medium text-slate-500">{displayName}</small></span>
          </Link>
          <nav className="hidden items-center gap-2 lg:flex">
            <a href="#home" className="rounded-lg px-3 py-2 text-sm font-bold text-white" style={{ backgroundColor: primary }}>{sectionTitle("الرئيسية", "Home")}</a>
            <a href="#services" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950">{sectionTitle("خدماتنا", "Services")}</a>
            {team.length > 0 && <a href="#team" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950">{sectionTitle("الأطباء والخبراء", "Our Team")}</a>}
            <a href="#hours" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950">{sectionTitle("مواعيد العمل", "Working Hours")}</a>
            <a href="#contact" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950">{sectionTitle("تواصل معنا", "Contact")}</a>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={toggleLanguage} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"><Globe size={17} />{isRtl ? "English" : "العربية"}</button>
            <a href="#clinic-login" className="hidden items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 sm:inline-flex" style={{ backgroundColor: primary }}><Lock size={15} />{sectionTitle("حجز موعد / تسجيل الدخول", "Booking / Sign in")}</a>
          </div>
        </div>
      </header>

      <section id="home" className="relative isolate overflow-hidden bg-gradient-to-bl from-[#241b70] via-[#4f46ba] to-[#3621b3] pb-14 pt-7 text-white sm:pb-20 sm:pt-9">
        <div className="pointer-events-none absolute -right-24 -top-36 -z-10 h-[440px] w-[440px] rounded-full bg-indigo-400/30 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-40 left-0 -z-10 h-[420px] w-[420px] rounded-full bg-violet-300/20 blur-[110px]" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-violet-50 backdrop-blur"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /><Check size={15} />{sectionTitle("مركز موثّق على منصة Prime Physio", "Verified clinic on Prime Physio")}</span>
            <span className="hidden items-center gap-2 text-[11px] font-medium text-white/65 sm:inline-flex"><Lock size={14} />{sectionTitle("بيانات مستقلة وآمنة لكل مركز", "Secure, isolated clinic data")}</span>
          </div>
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col gap-5 lg:col-span-7">
              <div className="flex items-center gap-4">
                <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-white p-2.5 shadow-2xl sm:h-20 sm:w-20">
                  {clinic.logo_url ? <img src={clinic.logo_url} alt={displayName || ""} className="h-full w-full object-contain" /> : <Building size={34} style={{ color: primary }} />}
                </div>
                <div className="min-w-0"><p className="mb-1 text-[10px] font-bold tracking-[.2em] text-violet-200">PRIME PHYSIO CENTER</p><h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{displayName}</h1>{clinic.name_en && isRtl && <p className="mt-1 text-sm text-violet-100/80">{clinic.name_en}</p>}</div>
              </div>
              <p className="max-w-2xl text-sm leading-8 text-violet-50/90 sm:text-base">{clinic.public_description || sectionTitle("نرحب بكم في مركزنا للعلاج الطبيعي والتأهيل. تعرّف على خدماتنا وفريقنا الطبي وتواصل معنا مباشرة، أو سجّل الدخول لإدارة ملفات المركز.", "Welcome to our physiotherapy and rehabilitation center. Explore our services and team, contact us, or sign in to your clinic portal.")}</p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {clinic.phone && <a href={`tel:${clinic.phone}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold shadow-lg transition hover:-translate-y-0.5" style={{ color: primary }}><Phone size={18} />{sectionTitle("اتصل بنا", "Call us")}</a>}
                {whatsappNumber && <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(sectionTitle("مرحبًا، أود الاستفسار عن خدمات المركز وحجز موعد.", "Hello, I would like to ask about your services and book an appointment."))}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-600"><Phone size={18} />WhatsApp</a>}
                <a href="#services" className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"><Building size={18} />{sectionTitle("استكشف الخدمات", "Explore services")}</a>
                {whatsappNumber && <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(sectionTitle("أرغب في حجز موعد كشف بالمركز.", "I would like to request an appointment at the clinic."))}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110" style={{ backgroundColor: "#6366f1" }}><Clock size={18} />{sectionTitle("حجز موعد كشف", "Request an appointment")}</a>}
              </div>
              {services.length > 0 && <div className="pt-2"><p className="mb-2 text-xs font-bold text-violet-200">{sectionTitle("خدماتنا المتخصصة:", "Our specialties:")}</p><div className="flex flex-wrap gap-2">{services.slice(0,5).map(service => <span key={service.id} className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/90">{isRtl ? service.name : (service.name_en || service.name)}</span>)}</div></div>}
            </div>

            <section id="clinic-login" className="scroll-mt-28 rounded-3xl bg-white p-6 text-[#0b1c30] shadow-2xl shadow-black/20 sm:p-8 lg:col-span-5">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50" style={{ color: primary }}><Lock size={24} /></div>
                <h2 className="text-xl font-extrabold" style={{ color: primary }}>{sectionTitle("تسجيل الدخول", "Sign in")}</h2>
                <p className="mt-1 text-xs text-slate-500">{sectionTitle("الدخول الآمن إلى لوحة إدارة المركز", "Secure access to your clinic dashboard")}</p>
              </div>
              {loginError && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-medium text-rose-700">{loginError}</div>}
              <form onSubmit={handleLogin} className="space-y-4">
                <label className="block"><span className="mb-2 block text-xs font-bold text-slate-700">{sectionTitle("البريد الإلكتروني", "Email address")}</span><span className="relative block"><Mail size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" dir="ltr" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-11 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" /></span></label>
                <label className="block"><span className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700"><span>{sectionTitle("كلمة المرور", "Password")}</span><Link href="/forgot-password" className="font-semibold" style={{ color: primary }}>{sectionTitle("نسيت كلمة المرور؟", "Forgot password?")}</Link></span><span className="relative block"><Lock size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" dir="ltr" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm tracking-widest outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" /><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeClosed size={18}/> : <Eye size={18}/>}</button></span></label>
                <button type="submit" disabled={loginLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" style={{ background: `linear-gradient(110deg, ${primary}, #6366f1)` }}>{loginLoading ? <Loader size={18} color="white"/> : <>{sectionTitle("دخول إلى لوحة المركز", "Sign in to clinic")}<ArrowRight size={18}/></>}</button>
                <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-500"><Lock size={14} className="text-emerald-500"/>{sectionTitle("اتصال آمن وبيانات مستقلة لكل مركز", "Secure connection and isolated clinic data")}</div>
              </form>
            </section>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-5 max-w-6xl rounded-2xl border border-slate-100 bg-white p-4 shadow-xl sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {addressText && <div className="flex items-center gap-3 rounded-xl bg-[#f1f5ff] p-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100" style={{ color: primary }}><MapPin size={21}/></span><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{sectionTitle("عنوان المركز", "Clinic address")}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{addressText}</p></div></div>}
          {clinic.phone && <div className="flex items-center gap-3 rounded-xl bg-[#f1f5ff] p-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100" style={{ color: primary }}><Phone size={21}/></span><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{sectionTitle("التواصل المباشر", "Direct contact")}</p><a href={`tel:${clinic.phone}`} dir="ltr" className="mt-1 block text-sm font-bold" style={{ color: primary }}>{clinic.phone}</a></div></div>}
          {clinic.working_hours && <div id="hours" className="scroll-mt-24 flex items-center gap-3 rounded-xl bg-[#f1f5ff] p-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100" style={{ color: primary }}><Clock size={21}/></span><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{sectionTitle("مواعيد العمل", "Working hours")}</p><p className="mt-1 line-clamp-2 whitespace-pre-line text-xs leading-5 text-slate-500">{workingHoursRows.length ? workingHoursRows.filter((x:any)=>x.isOpen).map((x:any)=>`${isRtl?x.day:(weekdayLabels[x.day]||x.day)}: ${x.from} - ${x.to}`).join(" • ") : clinic.working_hours}</p></div></div>}
        </div>
      </div>

      {services.length > 0 && <section id="services" className="scroll-mt-24 mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><span className="mb-1 block text-xs font-extrabold" style={{ color: primary }}>{sectionTitle("الرعاية المتكاملة", "INTEGRATED CARE")}</span><h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{sectionTitle("خدمات المركز", "Our Services")}</h2></div><p className="max-w-lg text-sm leading-7 text-slate-500">{sectionTitle("تعرّف على الخدمات العلاجية والتأهيلية المتاحة في المركز.", "Explore the physiotherapy and rehabilitation services available at this clinic.")}</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{services.map((service,index)=><article key={service.id} className="group flex min-h-[190px] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"><div><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 transition group-hover:scale-110" style={{ color: primary }}><Building size={25}/></div><h3 className="text-base font-extrabold text-slate-800">{isRtl?service.name:(service.name_en||service.name)}</h3></div><div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">{service.duration_minutes ? <span className="rounded-lg bg-slate-50 px-3 py-2">{service.duration_minutes} {sectionTitle("دقيقة","min")}</span>:null}{service.is_package&&service.package_sessions?<span className="rounded-lg bg-slate-50 px-3 py-2">{service.package_sessions} {sectionTitle("جلسات","sessions")}</span>:null}{Number(service.price)>0?<span className="rounded-lg bg-indigo-50 px-3 py-2 font-bold" style={{color:primary}}>{Number(service.price).toLocaleString()} EGP</span>:null}</div></article>)}</div>
      </section>}

      {team.length > 0 && <section id="team" className="scroll-mt-24 bg-white py-14"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mb-7"><span className="text-xs font-extrabold" style={{color:primary}}>{sectionTitle("فريق الرعاية", "OUR CARE TEAM")}</span><h2 className="mt-1 text-2xl font-extrabold text-slate-900">{sectionTitle("الأطباء والخبراء", "Doctors & Specialists")}</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{team.map(member=><article key={member.id} className="rounded-2xl border border-slate-100 bg-[#f8f9ff] p-5 text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{background:primary}}><Building size={24}/></div><h3 className="font-extrabold text-slate-800">{member.name}</h3>{(member.specialty||member.role)&&<p className="mt-1 text-xs text-slate-500">{member.specialty||member.role}</p>}</article>)}</div></div></section>}

      <section id="contact" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl bg-[#eef2ff] p-6 sm:p-8"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white" style={{color:primary}}><MapPin size={23}/></span><h2 className="text-xl font-extrabold text-slate-900">{sectionTitle("موقع المركز", "Clinic location")}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{addressText || sectionTitle("تواصل مع المركز لمعرفة العنوان.", "Contact the clinic for its address.")}</p>{mapsHref&&<a href={mapsHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold" style={{color:primary}}>{sectionTitle("عرض الاتجاهات على الخريطة","Get directions")}<ArrowRight size={16}/></a>}</div>
          <div className="rounded-3xl bg-white p-6 shadow-md sm:p-8"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50" style={{color:primary}}><Phone size={23}/></span><h2 className="text-xl font-extrabold text-slate-900">{sectionTitle("تواصل معنا", "Contact us")}</h2><p className="mt-2 text-sm leading-7 text-slate-500">{sectionTitle("يسعد فريق الاستقبال بمساعدتك والإجابة عن استفساراتك.", "Our reception team is happy to help with your questions.")}</p><div className="mt-4 flex flex-wrap gap-2">{clinic.phone&&<a href={`tel:${clinic.phone}`} dir="ltr" className="rounded-xl px-4 py-3 text-sm font-bold text-white" style={{background:primary}}>{clinic.phone}</a>}{whatsappNumber&&<a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white">WhatsApp</a>}</div></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8"><div className="flex flex-col items-center justify-between gap-5 rounded-3xl bg-gradient-to-r from-[#241b70] via-[#4f46ba] to-[#3621b3] p-7 text-center text-white shadow-xl sm:flex-row sm:text-start sm:p-9"><div><h2 className="text-xl font-extrabold sm:text-2xl">{sectionTitle("هل أنت من فريق المركز الطبي أو الإداري؟", "Are you part of the clinic team?")}</h2><p className="mt-2 text-sm leading-6 text-violet-100">{sectionTitle("سجّل الدخول للوصول إلى لوحة الإدارة ومتابعة ملفات المرضى والجلسات.", "Sign in to manage the clinic, patient records, and sessions.")}</p></div><a href="#clinic-login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-extrabold shadow-lg transition hover:-translate-y-0.5" style={{color:primary}}>{sectionTitle("تسجيل الدخول", "Sign in")}<ArrowRight size={17}/></a></div></section>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-7 sm:flex-row sm:px-6 lg:px-8"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{background:primary}}><Building size={19}/></span><span className="flex flex-col"><strong className="text-sm font-extrabold" style={{color:primary}}>Prime Physio</strong><small className="text-[10px] text-slate-500">{displayName}</small></span></div><span className="text-xs text-slate-400">© {new Date().getFullYear()} Prime Physio. {sectionTitle("جميع الحقوق محفوظة.","All rights reserved.")}</span></div></footer>
    </main>
  );
}
