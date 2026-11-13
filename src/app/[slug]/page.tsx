"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  ArrowLeft, ArrowRight, Activity, Award, Building2, CalendarDays, Check,
  ChevronDown, Clock3, Eye, EyeOff, Globe2, HeartPulse, LockKeyhole, Mail,
  MapPin, Menu, Phone, ShieldCheck, Sparkles, Stethoscope, Users, X,
} from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingService, setBookingService] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotice, setBookingNotice] = useState("");

  const primary = clinic?.primary_color || "#372ba2";
  const addressText = [clinic?.address, clinic?.city, clinic?.country].filter(Boolean).join("، ");
  const whatsappNumber = (clinic?.whatsapp || clinic?.phone || "").replace(/[^0-9]/g, "");
  const mapsHref = clinic?.maps_url || (addressText ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}` : "");
  const displayName = isRtl ? clinic?.name : (clinic?.name_en || clinic?.name);
  const workingHoursRows = useMemo(() => {
    if (!clinic?.working_hours) return [];
    try {
      const parsed = JSON.parse(clinic.working_hours);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [clinic?.working_hours]);
  const weekdayLabels: Record<string, string> = {
    "الأحد": "Sunday", "الاثنين": "Monday", "الثلاثاء": "Tuesday", "الأربعاء": "Wednesday",
    "الخميس": "Thursday", "الجمعة": "Friday", "السبت": "Saturday",
  };

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);
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
        email: email.trim().toLowerCase(), password, clinicSlug: slug, redirect: false,
      });
      if (!result || result.error) throw new Error(isRtl ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password");
      if (!clinic?.id) throw new Error(isRtl ? "بيانات المركز غير متاحة" : "Clinic information is unavailable");
      sessionStorage.setItem("preferred_clinic_id", clinic.id);
      const response = await fetch(`/api/auth/supabase-session?clinic_id=${encodeURIComponent(clinic.id)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.session?.access_token || !payload.session?.refresh_token) {
        throw new Error(payload.error || (isRtl ? "تعذر تفعيل جلسة هذا المركز" : "Could not activate this clinic session"));
      }
      const { error } = await supabase.auth.setSession({
        access_token: payload.session.access_token, refresh_token: payload.session.refresh_token,
      });
      if (error) throw error;
      window.location.replace("/dashboard");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : (isRtl ? "حدث خطأ في الاتصال. حاول مرة أخرى." : "Connection error. Please try again."));
      setLoginLoading(false);
    }
  };

  const handleBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBookingNotice("");
    if (!whatsappNumber) {
      setBookingNotice(isRtl ? "رقم التواصل غير متاح حاليًا. يُرجى الاتصال بالمركز مباشرة." : "The clinic contact number is unavailable. Please contact the clinic directly.");
      return;
    }
    const serviceLabel = services.find((service) => service.id === bookingService);
    const message = isRtl
      ? `مرحبًا، أرغب في طلب موعد في ${displayName}.\nالاسم: ${bookingName}\nرقم الهاتف: ${bookingPhone}\nالخدمة: ${serviceLabel?.name || "غير محدد"}\nالوقت المفضل: ${bookingTime || "مرن"}\nبرجاء تأكيد الموعد المتاح.`
      : `Hello, I would like to request an appointment at ${displayName}.\nName: ${bookingName}\nPhone: ${bookingPhone}\nService: ${serviceLabel?.name_en || serviceLabel?.name || "Not specified"}\nPreferred time: ${bookingTime || "Flexible"}\nPlease confirm availability.`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setBookingNotice(isRtl ? "تم تجهيز طلبك في واتساب. أرسل الرسالة للمركز لتأكيد الموعد." : "Your request is ready in WhatsApp. Send the message to the clinic to confirm your appointment.");
  };

  const sectionTitle = (ar: string, en: string) => isRtl ? ar : en;
  const navItems = [
    { href: "#home", label: sectionTitle("الرئيسية", "Home") },
    { href: "#services", label: sectionTitle("خدماتنا", "Services") },
    ...(team.length ? [{ href: "#team", label: sectionTitle("الأطباء والخبراء", "Our Team") }] : []),
    { href: "#booking", label: sectionTitle("مواعيد الحجز", "Appointments") },
    { href: "#contact", label: sectionTitle("تواصل معنا", "Contact") },
  ];

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f8f9ff]" dir={isRtl ? "rtl" : "ltr"}><Loader size={36} color="#372ba2" /></main>;
  }

  if (notFound || !clinic) {
    return (
      <main dir={isRtl ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center bg-[#f8f9ff] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-9 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-[#372ba2]"><Building2 size={30} /></div>
          <h1 className="text-2xl font-black text-slate-900">{sectionTitle("المركز غير موجود", "Clinic not found")}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">{sectionTitle("الرابط غير صحيح أو أن صفحة المركز لم تعد متاحة.", "This link is invalid or this clinic page is no longer available.")}</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#372ba2] px-5 py-3 text-sm font-bold text-white">{sectionTitle("العودة إلى Prime Physio", "Back to Prime Physio")} <ArrowRight size={16} /></Link>
        </div>
      </main>
    );
  }

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen overflow-x-hidden bg-[#f8f9ff] text-[#0b1c30]">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 shadow-[0_2px_16px_rgba(20,24,60,.06)] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
              {clinic.logo_url ? <img src={clinic.logo_url} alt="" className="h-full w-full object-contain p-1" /> : <Activity size={24} style={{ color: primary }} />}
            </span>
            <span className="flex min-w-0 flex-col leading-tight"><strong className="text-[17px] font-extrabold tracking-tight" style={{ color: primary }}>Prime Physio</strong><small className="mt-1 max-w-[175px] truncate text-[11px] font-semibold text-slate-500">{displayName}</small></span>
          </Link>
          <nav className="hidden items-center gap-1 xl:flex">
            {navItems.map((item, index) => <a key={item.href} href={item.href} className={`rounded-xl px-3 py-2.5 text-[13px] font-bold transition ${index === 0 ? "text-white shadow-sm" : "text-slate-600 hover:bg-indigo-50 hover:text-[#372ba2]"}`} style={index === 0 ? { backgroundColor: primary } : undefined}>{item.label}</a>)}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={toggleLanguage} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"><Globe2 size={16}/>{isRtl ? "English" : "العربية"}</button>
            <a href="#clinic-login" className="hidden items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:-translate-y-0.5 sm:inline-flex" style={{ backgroundColor: primary }}><LockKeyhole size={14}/>{sectionTitle("تسجيل الدخول", "Sign in")}</a>
            <button type="button" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Toggle menu" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 xl:hidden">{mobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}</button>
          </div>
        </div>
        {mobileMenuOpen && <nav className="border-t border-slate-100 bg-white px-4 py-3 shadow-lg xl:hidden">{navItems.map(item => <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-bold text-slate-700 hover:bg-indigo-50">{item.label}</a>)}<a href="#clinic-login" onClick={() => setMobileMenuOpen(false)} className="mt-2 block rounded-xl px-3 py-3 text-sm font-extrabold text-white" style={{backgroundColor:primary}}>{sectionTitle("تسجيل الدخول","Sign in")}</a></nav>}
      </header>

      <section id="home" className="relative isolate overflow-hidden bg-gradient-to-bl from-[#21175f] via-[#4f46ba] to-[#3621b3] pb-16 pt-8 text-white sm:pb-20 sm:pt-10">
        <div className="pointer-events-none absolute -right-24 -top-36 -z-10 h-[440px] w-[440px] rounded-full bg-indigo-400/30 blur-[110px]"/>
        <div className="pointer-events-none absolute -bottom-40 left-0 -z-10 h-[420px] w-[420px] rounded-full bg-violet-300/20 blur-[110px]"/>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-violet-50 backdrop-blur"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"/><ShieldCheck size={15}/>{sectionTitle("مركز موثّق على منصة Prime Physio","Verified clinic on Prime Physio")}</span>
            <span className="hidden items-center gap-2 text-[11px] font-semibold text-white/70 sm:inline-flex"><LockKeyhole size={14}/>{sectionTitle("بيانات مستقلة وآمنة لكل مركز","Secure, isolated clinic data")}</span>
          </div>
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col gap-5 lg:col-span-7">
              <div className="flex items-center gap-4">
                <div className="flex h-[78px] w-[78px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-white/40 bg-white p-2.5 shadow-2xl sm:h-[88px] sm:w-[88px]">
                  {clinic.logo_url ? <img src={clinic.logo_url} alt={displayName || ""} className="h-full w-full object-contain"/> : <Building2 size={38} style={{color:primary}}/>}
                </div>
                <div className="min-w-0"><p className="mb-1 text-[10px] font-extrabold tracking-[.2em] text-violet-200">PRIME PHYSIO CENTER</p><h1 className="text-3xl font-black leading-tight tracking-tight sm:text-[46px]">{displayName}</h1>{clinic.name_en && isRtl && <p className="mt-1 text-sm font-medium text-violet-100/80">{clinic.name_en}</p>}</div>
              </div>
              <h2 className="max-w-2xl text-xl font-extrabold leading-relaxed text-white sm:text-2xl">{sectionTitle("رعايتك الحركية تبدأ من هنا","Your journey to better movement starts here")}</h2>
              <p className="max-w-2xl text-sm leading-8 text-violet-50/90 sm:text-base">{clinic.public_description || sectionTitle("نرحب بكم في مركزنا للعلاج الطبيعي والتأهيل الحركي. تعرّف على خدماتنا وفريقنا، وتواصل معنا لحجز موعدك أو سجّل الدخول لإدارة المركز.","Welcome to our physiotherapy and rehabilitation center. Explore our services and team, contact us to request an appointment, or sign in to your clinic portal.")}</p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {clinic.phone && <a href={`tel:${clinic.phone}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold shadow-lg transition hover:-translate-y-0.5" style={{color:primary}}><Phone size={17}/>{sectionTitle("اتصل بنا","Call us")}</a>}
                {whatsappNumber && <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(sectionTitle("مرحبًا، أود الاستفسار عن خدمات المركز.","Hello, I would like to ask about your services."))}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-600"><Phone size={17}/>WhatsApp</a>}
                <a href="#services" className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/20"><Activity size={17}/>{sectionTitle("استكشف الخدمات","Explore services")}</a>
                <a href="#booking" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5" style={{backgroundColor:"#6366f1"}}><CalendarDays size={17}/>{clinic.cta_text || sectionTitle("اطلب موعدًا","Request an appointment")}</a>
              </div>
              {services.length > 0 && <div className="pt-2"><p className="mb-2 text-xs font-extrabold text-violet-200">{sectionTitle("خدماتنا المتخصصة","Our specialties")}</p><div className="flex flex-wrap gap-2">{services.slice(0,5).map(service => <span key={service.id} className="rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/95">{isRtl ? service.name : (service.name_en || service.name)}</span>)}</div></div>}
            </div>

            <section id="clinic-login" className="scroll-mt-28 rounded-[28px] border border-white/60 bg-white p-6 text-[#0b1c30] shadow-[0_24px_70px_rgba(9,8,45,.28)] sm:p-8 lg:col-span-5">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50" style={{color:primary}}><LockKeyhole size={25}/></div>
                <h2 className="text-xl font-black" style={{color:primary}}>{sectionTitle("تسجيل الدخول","Sign in")}</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">{sectionTitle("الدخول الآمن إلى لوحة إدارة المركز","Secure access to your clinic dashboard")}</p>
              </div>
              {loginError && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-700">{loginError}</div>}
              <form onSubmit={handleLogin} className="space-y-4">
                <label className="block"><span className="mb-2 block text-xs font-extrabold text-slate-700">{sectionTitle("البريد الإلكتروني","Email address")}</span><span className="relative block"><Mail size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/><input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" dir="ltr" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-11 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"/></span></label>
                <label className="block"><span className="mb-2 flex items-center justify-between text-xs font-extrabold text-slate-700"><span>{sectionTitle("كلمة المرور","Password")}</span><Link href="/forgot-password" className="font-bold" style={{color:primary}}>{sectionTitle("نسيت كلمة المرور؟","Forgot password?")}</Link></span><span className="relative block"><LockKeyhole size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/><input required type={showPassword?"text":"password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" dir="ltr" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm tracking-widest outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
                <button type="submit" disabled={loginLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" style={{background:`linear-gradient(110deg, ${primary}, #6366f1)`}}>{loginLoading?<Loader size={18} color="white"/>:<>{sectionTitle("دخول إلى لوحة المركز","Sign in to clinic")}<ArrowLeft size={18}/></>}</button>
                <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] font-semibold text-slate-500"><ShieldCheck size={14} className="text-emerald-500"/>{sectionTitle("اتصال آمن وبيانات مستقلة لكل مركز","Secure connection and isolated clinic data")}</div>
              </form>
            </section>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-7 max-w-[1180px] px-4 sm:px-6">
        <div className="grid overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_18px_55px_rgba(24,31,75,.10)] sm:grid-cols-3">
          <div className="flex items-center gap-4 border-b border-slate-100 p-5 sm:border-b-0 sm:border-e"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50" style={{color:primary}}><Activity size={23}/></span><div><strong className="block text-2xl font-black text-slate-900">{services.length}</strong><span className="text-xs font-semibold text-slate-500">{sectionTitle("خدمات متاحة","Available services")}</span></div></div>
          <div className="flex items-center gap-4 border-b border-slate-100 p-5 sm:border-b-0 sm:border-e"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50" style={{color:primary}}><Users size={23}/></span><div><strong className="block text-2xl font-black text-slate-900">{team.length}</strong><span className="text-xs font-semibold text-slate-500">{sectionTitle("أعضاء الفريق","Team members")}</span></div></div>
          <div className="flex items-center gap-4 p-5"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><ShieldCheck size={23}/></span><div><strong className="block text-base font-black text-slate-900">{sectionTitle("بيانات آمنة","Secure data")}</strong><span className="text-xs font-semibold text-slate-500">{sectionTitle("مساحة مستقلة للمركز","Dedicated clinic workspace")}</span></div></div>
        </div>
      </section>

      {services.length > 0 && <section id="services" className="scroll-mt-24 mx-auto max-w-[1280px] px-4 pb-14 pt-20 sm:px-6 sm:pt-24">
        <div className="mb-9 flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><span className="mb-2 inline-flex items-center gap-2 text-xs font-black tracking-widest" style={{color:primary}}><Sparkles size={15}/>{sectionTitle("رعاية متكاملة","INTEGRATED CARE")}</span><h2 className="text-2xl font-black text-slate-900 sm:text-3xl">{sectionTitle("خدمات المركز","Our Services")}</h2></div><p className="max-w-lg text-sm font-medium leading-7 text-slate-500">{sectionTitle("تعرّف على الخدمات العلاجية والتأهيلية المتاحة في المركز.","Explore the physiotherapy and rehabilitation services available at this clinic.")}</p></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{services.map((service,index)=><article key={service.id} className="group flex min-h-[220px] flex-col justify-between rounded-[22px] border border-slate-100 bg-white p-5 shadow-[0_5px_22px_rgba(25,35,80,.045)] transition duration-300 hover:-translate-y-1.5 hover:border-indigo-100 hover:shadow-[0_18px_40px_rgba(55,43,162,.12)]"><div><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 transition group-hover:scale-110" style={{color:primary}}>{index%4===0?<HeartPulse size={24}/>:index%4===1?<Activity size={24}/>:index%4===2?<Stethoscope size={24}/>:<Award size={24}/>}</div><h3 className="text-base font-black leading-7 text-slate-800">{isRtl?service.name:(service.name_en||service.name)}</h3></div><div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">{service.duration_minutes?<span className="rounded-lg bg-slate-50 px-3 py-2">{service.duration_minutes} {sectionTitle("دقيقة","min")}</span>:null}{service.is_package&&service.package_sessions?<span className="rounded-lg bg-slate-50 px-3 py-2">{service.package_sessions} {sectionTitle("جلسات","sessions")}</span>:null}{Number(service.price)>0?<span className="rounded-lg bg-indigo-50 px-3 py-2 font-extrabold" style={{color:primary}}>{Number(service.price).toLocaleString()} EGP</span>:null}</div></article>)}</div>
      </section>}

      {team.length > 0 && <section id="team" className="scroll-mt-24 bg-white py-16"><div className="mx-auto max-w-[1280px] px-4 sm:px-6"><div className="mb-8"><span className="text-xs font-black tracking-widest" style={{color:primary}}>{sectionTitle("فريق الرعاية","OUR CARE TEAM")}</span><h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{sectionTitle("الأطباء والخبراء","Doctors & Specialists")}</h2><p className="mt-2 text-sm font-medium text-slate-500">{sectionTitle("تعرّف على فريق العمل بالمركز.","Meet the clinic team.")}</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{team.map(member=><article key={member.id} className="rounded-[22px] border border-slate-100 bg-[#f8f9ff] p-6 text-center transition hover:-translate-y-1 hover:shadow-lg"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] text-white shadow-lg" style={{background:primary}}><Stethoscope size={26}/></div><h3 className="font-black text-slate-800">{member.name}</h3>{(member.specialty||member.role)&&<p className="mt-1 text-xs font-semibold text-slate-500">{member.specialty||member.role}</p>}</article>)}</div></div></section>}

      <section id="booking" className="scroll-mt-24 mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
        <div className="grid overflow-hidden rounded-[30px] bg-white shadow-[0_16px_55px_rgba(24,31,75,.09)] lg:grid-cols-2">
          <div className="relative flex min-h-[300px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#21175f] via-[#4f46ba] to-[#3621b3] p-7 text-white sm:p-10">
            {clinic.cover_url && <img src={clinic.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20"/>}
            <div className="relative"><span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10"><CalendarDays size={24}/></span><p className="mb-2 text-xs font-black tracking-widest text-violet-200">{sectionTitle("ابدأ رحلتك","START YOUR JOURNEY")}</p><h2 className="max-w-md text-3xl font-black leading-tight sm:text-4xl">{sectionTitle("احجز موعدك بسهولة","Request your appointment")}</h2><p className="mt-4 max-w-md text-sm font-medium leading-8 text-violet-100">{sectionTitle("املأ بياناتك وسنساعدك في التواصل مع المركز لتأكيد الموعد المناسب.","Share your details and contact the clinic to confirm a suitable appointment.")}</p></div>
            <div className="relative mt-10 flex flex-wrap gap-4 text-xs font-semibold text-white/80"><span className="inline-flex items-center gap-2"><Check size={15}/> {sectionTitle("تواصل مباشر","Direct contact")}</span><span className="inline-flex items-center gap-2"><Check size={15}/> {sectionTitle("تأكيد الموعد من المركز","Clinic confirmation")}</span></div>
          </div>
          <div className="p-6 sm:p-9">
            <div className="mb-6"><h3 className="text-xl font-black text-slate-900">{sectionTitle("طلب موعد مبدئي","Appointment request")}</h3><p className="mt-1 text-xs font-medium leading-6 text-slate-500">{sectionTitle("لن يتم تأكيد الحجز إلا بعد التواصل مع المركز.","Your appointment is not confirmed until the clinic contacts you.")}</p></div>
            <form onSubmit={handleBooking} className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-1"><span className="mb-2 block text-xs font-extrabold text-slate-700">{sectionTitle("الاسم بالكامل","Full name")}</span><input required value={bookingName} onChange={e=>setBookingName(e.target.value)} placeholder={sectionTitle("اكتب اسمك","Enter your name")} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"/></label>
              <label className="block sm:col-span-1"><span className="mb-2 block text-xs font-extrabold text-slate-700">{sectionTitle("رقم الهاتف","Phone number")}</span><input required type="tel" value={bookingPhone} onChange={e=>setBookingPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"/></label>
              <label className="block sm:col-span-1"><span className="mb-2 block text-xs font-extrabold text-slate-700">{sectionTitle("الخدمة المطلوبة","Service")}</span><span className="relative block"><select value={bookingService} onChange={e=>setBookingService(e.target.value)} className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"><option value="">{sectionTitle("اختر الخدمة","Choose a service")}</option>{services.map(service=><option key={service.id} value={service.id}>{isRtl?service.name:(service.name_en||service.name)}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-slate-400"/></span></label>
              <label className="block sm:col-span-1"><span className="mb-2 block text-xs font-extrabold text-slate-700">{sectionTitle("الوقت المفضل","Preferred time")}</span><input value={bookingTime} onChange={e=>setBookingTime(e.target.value)} placeholder={sectionTitle("مثال: صباحًا أو مساءً","e.g. Morning or evening")} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"/></label>
              <button type="submit" className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 sm:col-span-2" style={{background:primary}}><CalendarDays size={17}/>{sectionTitle("إرسال طلب الموعد عبر واتساب","Send request via WhatsApp")}<ArrowLeft size={17}/></button>
            </form>
            {bookingNotice && <p role="status" className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold leading-6 text-emerald-800">{bookingNotice}</p>}
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 bg-white py-16"><div className="mx-auto max-w-[1280px] px-4 sm:px-6"><div className="mb-8"><span className="text-xs font-black tracking-widest" style={{color:primary}}>{sectionTitle("نحن هنا لمساعدتك","WE ARE HERE TO HELP")}</span><h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{sectionTitle("تواصل مع المركز","Contact the clinic")}</h2></div><div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[22px] border border-slate-100 bg-[#f8f9ff] p-6"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm" style={{color:primary}}><MapPin size={23}/></span><h3 className="font-black text-slate-900">{sectionTitle("عنوان المركز","Clinic address")}</h3><p className="mt-2 text-sm font-medium leading-7 text-slate-500">{addressText || sectionTitle("تواصل مع المركز لمعرفة العنوان.","Contact the clinic for its address.")}</p>{mapsHref&&<a href={mapsHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold" style={{color:primary}}>{sectionTitle("عرض الموقع على الخريطة","View on map")}<ArrowLeft size={15}/></a>}</article>
        <article className="rounded-[22px] border border-slate-100 bg-[#f8f9ff] p-6"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm" style={{color:primary}}><Phone size={23}/></span><h3 className="font-black text-slate-900">{sectionTitle("التواصل المباشر","Direct contact")}</h3>{clinic.phone?<a href={`tel:${clinic.phone}`} dir="ltr" className="mt-3 block text-base font-black" style={{color:primary}}>{clinic.phone}</a>:<p className="mt-2 text-sm text-slate-500">{sectionTitle("رقم الهاتف غير متاح حاليًا.","Phone number unavailable.")}</p>}{whatsappNumber&&<a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-white">WhatsApp</a>}</article>
        <article id="hours" className="scroll-mt-24 rounded-[22px] border border-slate-100 bg-[#f8f9ff] p-6"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm" style={{color:primary}}><Clock3 size={23}/></span><h3 className="font-black text-slate-900">{sectionTitle("مواعيد العمل","Working hours")}</h3>{workingHoursRows.length?<ul className="mt-3 space-y-2">{workingHoursRows.filter((x:any)=>x.isOpen).map((x:any,i:number)=><li key={i} className="flex justify-between gap-3 text-xs font-semibold text-slate-600"><span>{isRtl?x.day:(weekdayLabels[x.day]||x.day)}</span><span dir="ltr">{x.from} – {x.to}</span></li>)}</ul>:<p className="mt-2 whitespace-pre-line text-sm font-medium leading-7 text-slate-500">{clinic.working_hours || sectionTitle("يرجى التواصل مع المركز لمعرفة المواعيد.","Please contact the clinic for opening hours.")}</p>}</article>
      </div></div></section>

      <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6"><div className="flex flex-col items-center justify-between gap-6 rounded-[28px] bg-gradient-to-r from-[#21175f] via-[#4f46ba] to-[#3621b3] p-7 text-center text-white shadow-xl sm:flex-row sm:text-start sm:p-10"><div><span className="mb-2 inline-flex items-center gap-2 text-xs font-black text-violet-200"><LockKeyhole size={14}/>{sectionTitle("بوابة المركز","CLINIC PORTAL")}</span><h2 className="text-xl font-black sm:text-2xl">{sectionTitle("هل أنت من فريق المركز الطبي أو الإداري؟","Are you part of the clinic team?")}</h2><p className="mt-2 text-sm font-medium leading-7 text-violet-100">{sectionTitle("سجّل الدخول للوصول إلى لوحة الإدارة ومتابعة ملفات المرضى والجلسات.","Sign in to manage the clinic, patient records, and sessions.")}</p></div><a href="#clinic-login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black shadow-lg transition hover:-translate-y-0.5" style={{color:primary}}>{sectionTitle("تسجيل الدخول","Sign in")}<ArrowLeft size={17}/></a></div></section>

      <footer className="border-t border-slate-200 bg-[#11152f] text-white"><div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-3"><div><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white"><Activity size={23} style={{color:primary}}/></span><span><strong className="block text-lg font-black">Prime Physio</strong><small className="text-xs font-semibold text-slate-400">{displayName}</small></span></div><p className="mt-4 max-w-sm text-xs font-medium leading-7 text-slate-400">{sectionTitle("منصة متخصصة لدعم مراكز العلاج الطبيعي وإدارة خدماتها.","A dedicated platform supporting physiotherapy clinics and their services.")}</p></div><div><h3 className="mb-4 text-sm font-black">{sectionTitle("روابط سريعة","Quick links")}</h3><div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-400">{navItems.map(item=><a key={item.href} href={item.href} className="transition hover:text-white">{item.label}</a>)}<Link href="/privacy" className="transition hover:text-white">{sectionTitle("سياسة الخصوصية","Privacy policy")}</Link><Link href="/terms" className="transition hover:text-white">{sectionTitle("الشروط والأحكام","Terms & conditions")}</Link></div></div><div><h3 className="mb-4 text-sm font-black">{sectionTitle("بيانات التواصل","Contact information")}</h3>{addressText&&<p className="mb-3 flex items-start gap-2 text-xs font-medium leading-6 text-slate-400"><MapPin size={15} className="mt-1 shrink-0"/>{addressText}</p>}{clinic.phone&&<a href={`tel:${clinic.phone}`} className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><Phone size={15}/>{clinic.phone}</a>}{clinic.website_url&&<a href={clinic.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"><Globe2 size={15}/>{sectionTitle("الموقع الإلكتروني","Website")}</a>}</div></div><div className="border-t border-white/10"><div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-2 px-4 py-5 text-[11px] font-medium text-slate-500 sm:flex-row sm:px-6"><span>© {new Date().getFullYear()} Prime Physio. {sectionTitle("جميع الحقوق محفوظة.","All rights reserved.")}</span><span>{sectionTitle("صُممت لتسهيل رحلة الرعاية والتأهيل.","Designed to support better care and rehabilitation.")}</span></div></div></footer>
    </main>
  );
}
