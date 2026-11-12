"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import {
  ArrowRight, Building, Check, Clock, Eye, EyeClosed, Lock, Mail, MapPin, Phone,
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
  const { language } = useLanguage();
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
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen overflow-x-hidden bg-[#f8f9fd] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/logo.png" alt="Prime Physio" className="h-9 w-9 object-contain" />
            <span className="text-sm font-black tracking-tight text-[#4F46BA]">PRIME PHYSIO</span>
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {clinic.logo_url && <img src={clinic.logo_url} alt="" className="h-9 w-9 rounded-xl border border-slate-100 bg-white object-contain p-1" />}
            <span className="max-w-[42vw] truncate text-sm font-bold text-slate-700">{displayName}</span>
          </div>
          <a href="#clinic-login" className="hidden shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 sm:inline-flex" style={{ backgroundColor: primary }}>
            {sectionTitle("تسجيل دخول المركز", "Clinic Login")}
          </a>
        </div>
      </header>

      <section className="relative isolate">
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#21195f] via-[#4F46BA] to-[#8065df]" />
        {clinic.cover_url && <img src={clinic.cover_url} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#171342]/90 via-[#302477]/75 to-[#4F46BA]/50" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_390px] lg:px-8 lg:py-24">
          <div className="max-w-3xl text-white">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur">
              <Check size={15} /> {sectionTitle("مركز موثّق على منصة Prime Physio", "Clinic profile on Prime Physio")}
            </div>
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white p-2 shadow-xl sm:h-24 sm:w-24">
                {clinic.logo_url ? <img src={clinic.logo_url} alt={displayName || ""} className="h-full w-full object-contain" /> : <Building size={38} className="text-[#4F46BA]" />}
              </div>
              <div>
                <p className="text-xs font-bold tracking-[0.22em] text-violet-200">PRIME PHYSIO CENTER</p>
                <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{displayName}</h1>
                {clinic.name_en && isRtl && <p className="mt-1 text-sm text-white/75">{clinic.name_en}</p>}
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-8 text-white/85 sm:text-base">
              {clinic.public_description || sectionTitle("نرحب بكم في مركزنا للعلاج الطبيعي والتأهيل. تعرف على خدماتنا وفريقنا وتواصل معنا أو سجّل الدخول إلى حساب المركز.", "Welcome to our physiotherapy and rehabilitation center. Explore our services, meet our team, contact us, or sign in to your clinic account.")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {clinic.phone && <a href={`tel:${clinic.phone}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#342b82] shadow-lg transition hover:-translate-y-0.5"><Phone size={17} /> {sectionTitle("اتصل بنا", "Call us")}</a>}
              {whatsappNumber && <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"><Phone size={17} /> WhatsApp</a>}
              <a href="#services" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"><Building size={17} /> {sectionTitle("استكشف الخدمات", "Explore services")}</a>
            </div>
          </div>

          <section id="clinic-login" className="scroll-mt-28 rounded-3xl border border-white/60 bg-white p-6 shadow-2xl shadow-[#171342]/25 sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-[#4F46BA]"><Lock size={22} /></div>
              <h2 className="text-xl font-black text-slate-900">{sectionTitle("تسجيل الدخول", "Sign in")}</h2>
              <p className="mt-1 text-xs leading-6 text-slate-500">{sectionTitle("الدخول الآمن إلى لوحة إدارة المركز", "Secure access to your clinic dashboard")}</p>
            </div>
            {loginError && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-medium text-rose-700">{loginError}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">{sectionTitle("البريد الإلكتروني", "Email address")}</span>
                <span className="relative block">
                  <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-[#4F46BA] focus:bg-white focus:ring-4 focus:ring-[#4F46BA]/10" dir="ltr" />
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">{sectionTitle("كلمة المرور", "Password")}</span>
                <span className="relative block">
                  <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm outline-none transition focus:border-[#4F46BA] focus:bg-white focus:ring-4 focus:ring-[#4F46BA]/10" dir="ltr" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeClosed size={17} /> : <Eye size={17} />}</button>
                </span>
              </label>
              <button type="submit" disabled={loginLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" style={{ background: `linear-gradient(110deg, ${primary}, #8065df)` }}>
                {loginLoading ? <Loader size={18} color="white" /> : <>{sectionTitle("دخول إلى لوحة المركز", "Sign in to clinic")} <ArrowRight size={17} /></>}
              </button>
            </form>
            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400"><Lock size={12} /> {sectionTitle("اتصال آمن وبيانات مستقلة لكل مركز", "Secure access with isolated clinic data")}</div>
          </section>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {addressText && <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><span className="rounded-xl bg-violet-50 p-3 text-[#4F46BA]"><MapPin size={20} /></span><div className="min-w-0"><h3 className="text-sm font-extrabold">{sectionTitle("عنوان المركز", "Clinic address")}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{addressText}</p>{mapsHref && <a href={mapsHref} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-[#4F46BA]">{sectionTitle("عرض الاتجاهات", "Get directions")} ↗</a>}</div></div>}
          {clinic.phone && <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><span className="rounded-xl bg-violet-50 p-3 text-[#4F46BA]"><Phone size={20} /></span><div><h3 className="text-sm font-extrabold">{sectionTitle("التواصل", "Contact")}</h3><a href={`tel:${clinic.phone}`} className="mt-1 block text-sm text-slate-500" dir="ltr">{clinic.phone}</a>{clinic.whatsapp && <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-[#4F46BA]">WhatsApp ↗</a>}</div></div>}
          {clinic.working_hours && <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><span className="rounded-xl bg-violet-50 p-3 text-[#4F46BA]"><Clock size={20} /></span><div><h3 className="text-sm font-extrabold">{sectionTitle("ساعات العمل", "Working hours")}</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-500">{clinic.working_hours}</p></div></div>}
        </div>

        {services.length > 0 && <section id="services" className="scroll-mt-24 py-14">
          <div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[0.18em] text-[#4F46BA]">WHAT WE OFFER</p><h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{sectionTitle("خدمات المركز", "Our Services")}</h2></div><span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-[#4F46BA]">{services.length} {sectionTitle("خدمات", "services")}</span></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{services.map((service) => <article key={service.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-[#4F46BA]"><Building size={21} /></div><h3 className="font-extrabold text-slate-800">{isRtl ? service.name : (service.name_en || service.name)}</h3><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">{service.duration_minutes ? <span className="rounded-lg bg-slate-50 px-2.5 py-1.5">{service.duration_minutes} {sectionTitle("دقيقة", "min")}</span> : null}{service.is_package && service.package_sessions ? <span className="rounded-lg bg-slate-50 px-2.5 py-1.5">{service.package_sessions} {sectionTitle("جلسات", "sessions")}</span> : null}{Number(service.price) > 0 ? <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 font-bold text-[#4F46BA]">{Number(service.price).toLocaleString()} EGP</span> : null}</div></article>)}</div>
        </section>}

        {team.length > 0 && <section className="border-t border-slate-200 py-14">
          <div className="mb-7"><p className="text-xs font-black tracking-[0.18em] text-[#4F46BA]">OUR SPECIALISTS</p><h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{sectionTitle("فريق العمل", "Meet Our Team")}</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{team.map((member) => <article key={member.id} className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F46BA] to-[#8b70e8] text-white"><Building size={23} /></div><h3 className="font-extrabold text-slate-800">{member.name}</h3>{(member.specialty || member.role) && <p className="mt-1 text-xs text-slate-500">{member.specialty || member.role}</p>}</article>)}</div>
        </section>}

        <section className="rounded-3xl bg-gradient-to-r from-[#282064] to-[#5b4bc1] px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><div><h2 className="text-xl font-black sm:text-2xl">{sectionTitle("هل أنت من فريق المركز؟", "Are you part of this clinic?")}</h2><p className="mt-2 text-sm text-white/75">{sectionTitle("سجّل الدخول للوصول إلى لوحة الإدارة.", "Sign in to access your clinic dashboard.")}</p></div><a href="#clinic-login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#40358f] transition hover:-translate-y-0.5">{sectionTitle("تسجيل الدخول", "Clinic Login")} <ArrowRight size={17} /></a></div>
        </section>
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-7 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2"><img src="/logo.png" alt="" className="h-7 w-7 object-contain" /><span className="text-xs font-black tracking-wide text-[#4F46BA]">POWERED BY PRIME PHYSIO</span></div>
          <div className="flex items-center gap-4 text-slate-400">{clinic.website_url && <a href={clinic.website_url} target="_blank" rel="noreferrer" aria-label="Website" className="hover:text-[#4F46BA]"><span className="text-[10px] font-black">WWW</span></a>}{clinic.instagram_url && <a href={clinic.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-[#4F46BA]"><span className="text-[10px] font-black">IG</span></a>}{clinic.facebook_url && <a href={clinic.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-[#4F46BA]"><span className="text-sm font-black">f</span></a>}<span className="text-xs">{sectionTitle("مدعوم من Prime Physio", "Powered by Prime Physio")}</span></div>
        </div>
      </footer>
    </main>
  );
}
