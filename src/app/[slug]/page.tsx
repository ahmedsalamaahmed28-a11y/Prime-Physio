"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import {
  ArrowLeft, ArrowRight, Activity, Building, CalendarDays, Check, MessageSquare,
  Clock, Eye, EyeOff, Globe, Lock, Mail,
  MapPin, Menu, Phone, ShieldCheck, Sparkles, Stethoscope, Users, X,
} from "lucide-react";
import { activateClinicSession } from "@/lib/clinic-session";
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
type BookingChatMessage = { role: "assistant" | "user"; text: string };

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
  const [bookingAge, setBookingAge] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [bookingGroup, setBookingGroup] = useState<"A" | "B" | "">("");
  const [selectedGroupTimes, setSelectedGroupTimes] = useState<Record<string, string>>({});
  const [groupAvailability, setGroupAvailability] = useState<Record<string, Array<{key:string;dayAr:string;dayEn:string;date:string;configured:boolean;slots:string[]}>>>({});
  const [availabilityConfigured, setAvailabilityConfigured] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingNotice, setBookingNotice] = useState("");
  const [bookingStep, setBookingStep] = useState<"name" | "age" | "phone" | "address" | "time" | "confirm" | "done">("name");
  const [bookingInput, setBookingInput] = useState("");
  const [bookingMessages, setBookingMessages] = useState<BookingChatMessage[]>([{
    role: "assistant",
    text: language === "ar"
      ? "أهلًا بيك 👋 أنا مساعد الحجز. هساعدك تختار موعد مناسب وهنسجل بياناتك خطوة بخطوة. إيه اسم المريض بالكامل؟"
      : "Welcome 👋 I'm the booking assistant. I'll help you choose a time and collect your details step by step. What is the patient's full name?",
  }]);

  const primary = clinic?.primary_color || "#372ba2";
  const addressText = [clinic?.address, clinic?.city, clinic?.country].filter(Boolean).join("، ");
  const whatsappNumber = (clinic?.whatsapp || clinic?.phone || "").replace(/[^0-9]/g, "");
  const mapCoordinates = clinic?.maps_url?.match(/[?&]q=(-?[0-9]+(?:[.][0-9]+)?),[ ]*(-?[0-9]+(?:[.][0-9]+)?)/);
  const mapsHref = mapCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${mapCoordinates[1]},${mapCoordinates[2]}`
    : (clinic?.maps_url || (addressText ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}` : ""));
  const displayName = isRtl ? clinic?.name : (clinic?.name_en || clinic?.name);
  const workingHoursRows = useMemo(() => {
    if (!clinic?.working_hours) return [];
    try {
      const parsed = JSON.parse(clinic.working_hours);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [clinic]);
  const workingHoursSummary = useMemo(() => {
    const openRows = workingHoursRows.filter((row: any) => row.isOpen);
    if (!openRows.length) return "";
    const sameHours = openRows.every((row: any) => row.from === openRows[0].from && row.to === openRows[0].to);
    const dayOrder = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
    const days = openRows.map((row: any) => row.day);
    const englishDays: Record<string, string> = { "الأحد": "Sunday", "الاثنين": "Monday", "الثلاثاء": "Tuesday", "الأربعاء": "Wednesday", "الخميس": "Thursday", "الجمعة": "Friday", "السبت": "Saturday" };
    const dayText = sameHours && days.length === 6 && dayOrder.slice(0, 6).every(day => days.includes(day))
      ? (isRtl ? "السبت – الخميس" : "Saturday – Thursday")
      : openRows.map((row: any) => isRtl ? row.day : (englishDays[row.day] || row.day)).join(isRtl ? "، " : ", ");
    return { days: dayText, from: openRows[0].from, to: openRows[0].to, sameHours };
  }, [workingHoursRows, isRtl]);
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

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setAvailabilityLoading(true);
    fetch(`/api/public/booking-request?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Availability unavailable");
        if (!active) return;
        setGroupAvailability(payload.groups && typeof payload.groups === "object" ? payload.groups : {});
        setAvailabilityConfigured(Boolean(payload.configured));
      })
      .catch(() => {
        if (active) {
          setGroupAvailability({});
          setAvailabilityConfigured(false);
        }
      })
      .finally(() => { if (active) setAvailabilityLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      if (!clinic?.id) throw new Error(isRtl ? "بيانات المركز غير متاحة" : "Clinic information is unavailable");

      // Set the selected tenant BEFORE NextAuth establishes the session.
      // The global auth listener may enrich/route immediately after sign-in;
      // setting this afterward causes owner accounts to be briefly treated as
      // unscoped center managers and redirected to /overview.php/.
      sessionStorage.setItem("preferred_clinic_id", clinic.id);
      sessionStorage.removeItem("prime-physio:tab-logged-out");

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(), password, clinicSlug: slug, redirect: false,
      });
      if (!result || result.error) {
        sessionStorage.removeItem("preferred_clinic_id");
        throw new Error(isRtl ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password");
      }
      // signIn(resolve: false) can finish before the browser's session
      // endpoint exposes the newly issued JWT cookie. Confirm the fresh session
      // before exchanging it for a clinic-scoped Supabase identity.
      const expectedEmail = email.trim().toLowerCase();
      let verifiedSession: Awaited<ReturnType<typeof getSession>> = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = await getSession();
        const candidateEmail = candidate?.user?.email?.trim().toLowerCase();
        const candidateClinicId = (candidate?.user as (typeof candidate.user & { clinicId?: string | null }) | undefined)?.clinicId;
        const expiresAt = Date.parse(candidate?.expires || "");

        if (
          candidate &&
          candidateEmail === expectedEmail &&
          candidateClinicId === clinic.id &&
          Number.isFinite(expiresAt) &&
          expiresAt > Date.now()
        ) {
          verifiedSession = candidate;
          break;
        }

        if (attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      if (!verifiedSession) {
        throw new Error(
          isRtl
            ? "تم التحقق من كلمة المرور، لكن تعذر تأكيد جلسة الدخول أو المركز المختار. حاول تسجيل الدخول مرة أخرى."
            : "Your credentials were accepted, but the active login session could not be verified for this clinic. Please try again."
        );
      }

      await activateClinicSession(clinic.id, expectedEmail);
      window.location.replace("/dashboard");
    } catch (error) {
      if (clinic?.id && sessionStorage.getItem("preferred_clinic_id") === clinic.id) {
        sessionStorage.removeItem("preferred_clinic_id");
      }
      setLoginError(error instanceof Error ? error.message : (isRtl ? "حدث خطأ في الاتصال. حاول مرة أخرى." : "Connection error. Please try again."));
      setLoginLoading(false);
    }
  };

  const handleBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBookingNotice("");
    const age = Number(bookingAge);
    const requiredDays = bookingGroup === "A" ? ["saturday", "monday", "wednesday"] : ["sunday", "tuesday", "thursday"];
    if (!Number.isInteger(age) || age < 1 || age > 120 || !bookingGroup || requiredDays.some(day => !selectedGroupTimes[day])) {
      setBookingNotice(isRtl ? "يرجى مراجعة البيانات واختيار موعد لكل يوم من أيام المجموعة." : "Please check the details and choose a time for all three group days.");
      return;
    }
    setBookingSubmitting(true);
    try {
      const response = await fetch("/api/public/booking-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, name: bookingName.trim(), age, phone: bookingPhone.trim(), address: bookingAddress.trim(),
          groupCode: bookingGroup, selectedTimes: selectedGroupTimes,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 409) {
        const availabilityResponse = await fetch("/api/public/booking-request?slug=" + encodeURIComponent(slug), { cache: "no-store" });
        const availability = await availabilityResponse.json().catch(() => ({}));
        if (availabilityResponse.ok) setGroupAvailability(availability.groups || {});
        setSelectedGroupTimes({});
        setBookingStep("time");
        const conflictMessage = payload.error || (isRtl ? "أحد المواعيد لم يعد متاحًا. اختر وقتًا آخر." : "One of the selected times is no longer available.");
        setBookingNotice(conflictMessage);
        setBookingMessages(current => [...current, { role: "assistant", text: conflictMessage }]);
        return;
      }
      if (!response.ok || !payload.success || !payload.pending) {
        throw new Error(payload.error || (isRtl ? "تعذر إرسال طلب المجموعة." : "Could not submit the group request."));
      }
      const successMessage = isRtl
        ? "تم إرسال طلب الانضمام للمجموعة بنجاح. رقم الطلب: " + payload.requestId + "، ورقم ملف المريض: " + payload.patientId + ". سيقوم الأخصائي بتقييم الحالة داخل المنصة ثم تحديد عدد الجلسات واعتماد الجدول."
        : "Your group request was submitted. Request: " + payload.requestId + ", patient record: " + payload.patientId + ". A specialist will evaluate the patient and set the number of sessions before approving the schedule.";
      setBookingNotice(successMessage);
      setBookingMessages(current => [...current, { role: "assistant", text: successMessage }]);
      setBookingStep("done");
      setBookingInput("");
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRtl ? "حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى." : "An error occurred while submitting the request.");
      setBookingNotice(message);
      setBookingMessages(current => [...current, { role: "assistant", text: message }]);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleChatInput = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = bookingInput.trim();
    if (!value || bookingSubmitting) return;
    const reply = (userText: string, assistantText: string) => setBookingMessages(current => [
      ...current,
      { role: "user", text: userText },
      { role: "assistant", text: assistantText },
    ]);

    if (bookingStep === "name") {
      if (value.length < 2 || value.length > 120) {
        setBookingNotice(isRtl ? "اكتب الاسم بشكل صحيح من فضلك." : "Please enter a valid name.");
        return;
      }
      setBookingName(value);
      reply(value, isRtl ? "تشرفنا بيك. كم سنة عمر المريض؟" : "Nice to meet you. How old is the patient?");
      setBookingStep("age");
    } else if (bookingStep === "age") {
      // Accept Western, Arabic-Indic, and Eastern Arabic-Indic numerals.
      const normalizedAge = value
        .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
      const age = Number(normalizedAge);
      if (!/^\d{1,3}$/.test(normalizedAge) || !Number.isInteger(age) || age < 1 || age > 120) {
        setBookingNotice(isRtl ? "اكتب السن بالأرقام من 1 إلى 120." : "Enter an age between 1 and 120.");
        return;
      }
      setBookingAge(String(age));
      reply(value, isRtl ? "تمام. ما رقم الهاتف الذي يمكن للمركز التواصل معك عليه؟" : "Great. What phone number can the clinic use to contact you?");
      setBookingStep("phone");
    } else if (bookingStep === "phone") {
      if (value.length < 7 || value.length > 20 || !/^[+0-9()\\s.-]+$/.test(value)) {
        setBookingNotice(isRtl ? "راجع رقم الهاتف واكتبه بشكل صحيح." : "Please enter a valid phone number.");
        return;
      }
      setBookingPhone(value);
      reply(value, isRtl ? "ما عنوان المريض أو المنطقة التي يسكن فيها؟" : "What is the patient's address or area?");
      setBookingStep("address");
    } else if (bookingStep === "address") {
      if (value.length < 3 || value.length > 300) {
        setBookingNotice(isRtl ? "اكتب العنوان بشكل أوضح من فضلك." : "Please enter a more complete address.");
        return;
      }
      setBookingAddress(value);
      setBookingGroup("");
      setSelectedGroupTimes({});
      reply(value, availabilityLoading
        ? (isRtl ? "لحظة واحدة، بفحص مواعيد المجموعات..." : "One moment, checking group availability...")
        : !availabilityConfigured
          ? (isRtl ? "المركز لم يسجل ساعات العمل الأسبوعية بعد. من فضلك تواصل مع المركز." : "The clinic has not configured its weekly working hours yet.")
          : (isRtl ? "اختار المجموعة المناسبة أولًا، ثم اختار وقتًا مستقلًا لكل يوم من أيامها الثلاثة." : "Choose a group, then select a separate time for each of its three weekdays."));
      setBookingStep("time");
    }
    setBookingInput("");
    setBookingNotice("");
  };

  const handleGroupChoice = (group: "A" | "B") => {
    if (bookingStep !== "time" || bookingSubmitting) return;
    setBookingGroup(group);
    setSelectedGroupTimes({});
    setBookingNotice("");
  };

  const handleGroupTimeChoice = (dayKey: string, slot: string) => {
    if (bookingStep !== "time" || bookingSubmitting || !bookingGroup) return;
    const nextTimes = { ...selectedGroupTimes, [dayKey]: slot };
    setSelectedGroupTimes(nextTimes);
    const requiredDays = bookingGroup === "A" ? ["saturday", "monday", "wednesday"] : ["sunday", "tuesday", "thursday"];
    if (requiredDays.every(day => Boolean(nextTimes[day]))) {
      const days = groupAvailability[bookingGroup] || [];
      const summary = requiredDays.map(key => {
        const day = days.find(item => item.key === key);
        const time = nextTimes[key];
        const label = time ? new Date("2000-01-01T" + time + ":00").toLocaleTimeString(isRtl ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit" }) : "";
        return (isRtl ? day?.dayAr : day?.dayEn) + ": " + label;
      }).join("\n");
      setBookingMessages(current => [...current,
        { role: "user", text: isRtl ? "تم اختيار أوقات المجموعة" : "Group times selected" },
        { role: "assistant", text: isRtl
          ? "راجع طلب الانضمام للمجموعة " + bookingGroup + ":\n" + summary + "\n\nسيتم إرسال الطلب للأخصائي لتقييم الحالة وتحديد عدد الجلسات قبل اعتماد الجدول."
          : "Review group " + bookingGroup + ":\n" + summary + "\n\nThe specialist will evaluate the patient and determine the session count before approving the schedule." },
      ]);
      setBookingStep("confirm");
    }
  };

  const restartBookingChat = () => {
    setBookingStep("name");
    setBookingInput("");
    setBookingName("");
    setBookingAge("");
    setBookingPhone("");
    setBookingAddress("");
    setBookingGroup("");
    setSelectedGroupTimes({});
    setBookingNotice("");
    setBookingMessages([{
      role: "assistant",
      text: isRtl ? "نبدأ طلب جديد 😊 إيه اسم المريض بالكامل؟" : "Let's start a new request 😊 What is the patient's full name?",
    }]);
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
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-[#372ba2]"><Building size={30} /></div>
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
            <button type="button" onClick={toggleLanguage} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"><Globe size={16}/>{isRtl ? "English" : "العربية"}</button>
            <a href="#clinic-login" className="hidden items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:-translate-y-0.5 sm:inline-flex" style={{ backgroundColor: primary }}><Lock size={14}/>{sectionTitle("تسجيل الدخول", "Sign in")}</a>
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
            <span className="hidden items-center gap-2 text-[11px] font-semibold text-white/70 sm:inline-flex"><Lock size={14}/>{sectionTitle("بيانات مستقلة وآمنة لكل مركز","Secure, isolated clinic data")}</span>
          </div>
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col gap-5 lg:col-span-7">
              <div className="flex items-center gap-4">
                <div className="flex h-[78px] w-[78px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-white/40 bg-white p-2.5 shadow-2xl sm:h-[88px] sm:w-[88px]">
                  {clinic.logo_url ? <img src={clinic.logo_url} alt={displayName || ""} className="h-full w-full object-contain"/> : <Building size={38} style={{color:primary}}/>}
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
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50" style={{color:primary}}><Lock size={25}/></div>
                <h2 className="text-xl font-black" style={{color:primary}}>{sectionTitle("تسجيل الدخول","Sign in")}</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">{sectionTitle("الدخول الآمن إلى لوحة إدارة المركز","Secure access to your clinic dashboard")}</p>
              </div>
              {loginError && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-700">{loginError}</div>}
              <form onSubmit={handleLogin} className="space-y-4">
                <label className="block"><span className="mb-2 block text-xs font-extrabold text-slate-700">{sectionTitle("البريد الإلكتروني","Email address")}</span><span className="relative block"><Mail size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/><input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" dir="ltr" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-11 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"/></span></label>
                <label className="block"><span className="mb-2 flex items-center justify-between text-xs font-extrabold text-slate-700"><span>{sectionTitle("كلمة المرور","Password")}</span><Link href="/forgot-password" className="font-bold" style={{color:primary}}>{sectionTitle("نسيت كلمة المرور؟","Forgot password?")}</Link></span><span className="relative block"><Lock size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/><input required type={showPassword?"text":"password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" dir="ltr" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm tracking-widest outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
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

      {services.length > 0 && <section id="services" className="scroll-mt-24 mx-auto max-w-[1280px] px-4 pb-9 pt-11 sm:px-6 sm:pt-14">
        <div className="mb-5 flex items-end justify-between gap-3"><div><span className="mb-1 inline-flex items-center gap-2 text-[10px] font-black tracking-widest" style={{color:primary}}><Sparkles size={13}/>{sectionTitle("رعاية متكاملة","INTEGRATED CARE")}</span><h2 className="text-xl font-black text-slate-900 sm:text-2xl">{sectionTitle("خدمات المركز","Our Services")}</h2></div><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold" style={{color:primary}}>{services.length} {sectionTitle("خدمات","services")}</span></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{services.map((service,index)=><article key={service.id} className="flex min-h-[104px] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_3px_14px_rgba(25,35,80,.035)] transition hover:border-indigo-100 hover:shadow-md"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50" style={{color:primary}}>{index%3===0?<Activity size={20}/>:index%3===1?<Stethoscope size={20}/>:<Sparkles size={20}/>}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-extrabold leading-6 text-slate-800">{isRtl?service.name:(service.name_en||service.name)}</h3><div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-500">{service.duration_minutes?<span className="rounded-md bg-slate-50 px-2 py-1">{service.duration_minutes} {sectionTitle("دقيقة","min")}</span>:null}{service.is_package&&service.package_sessions?<span className="rounded-md bg-slate-50 px-2 py-1">{service.package_sessions} {sectionTitle("جلسات","sessions")}</span>:null}{Number(service.price)>0?<span className="rounded-md bg-indigo-50 px-2 py-1 font-extrabold" style={{color:primary}}>{Number(service.price).toLocaleString()} EGP</span>:null}</div></div></article>)}</div>
      </section>}

      {team.length > 0 && <section id="team" className="scroll-mt-24 bg-white py-16"><div className="mx-auto max-w-[1280px] px-4 sm:px-6"><div className="mb-8"><span className="text-xs font-black tracking-widest" style={{color:primary}}>{sectionTitle("فريق الرعاية","OUR CARE TEAM")}</span><h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{sectionTitle("الأطباء والخبراء","Doctors & Specialists")}</h2><p className="mt-2 text-sm font-medium text-slate-500">{sectionTitle("تعرّف على فريق العمل بالمركز.","Meet the clinic team.")}</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{team.map(member=><article key={member.id} className="rounded-[22px] border border-slate-100 bg-[#f8f9ff] p-6 text-center transition hover:-translate-y-1 hover:shadow-lg"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] text-white shadow-lg" style={{background:primary}}><Stethoscope size={26}/></div><h3 className="font-black text-slate-800">{member.name}</h3>{(member.specialty||member.role)&&<p className="mt-1 text-xs font-semibold text-slate-500">{member.specialty||member.role}</p>}</article>)}</div></div></section>}

      <section id="booking" className="scroll-mt-24 mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
        <div className="grid overflow-hidden rounded-[30px] bg-white shadow-[0_16px_55px_rgba(24,31,75,.09)] lg:grid-cols-2">
          <div className="relative flex min-h-[300px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#21175f] via-[#4f46ba] to-[#3621b3] p-7 text-white sm:p-10">
            {clinic.cover_url && <img src={clinic.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20"/>}
            <div className="relative">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10"><MessageSquare size={24}/></span>
              <p className="mb-2 text-xs font-black tracking-widest text-violet-200">{sectionTitle("مساعد الحجز","BOOKING ASSISTANT")}</p>
              <h2 className="max-w-md text-3xl font-black leading-tight sm:text-4xl">{sectionTitle("احجز موعدك بالمحادثة","Book through a conversation")}</h2>
              <p className="mt-4 max-w-md text-sm font-medium leading-8 text-violet-100">{sectionTitle("جاوب على أسئلة بسيطة، واختار من المواعيد المتاحة، وسنرسل طلبك للمركز.","Answer a few simple questions, choose an available time, and send your request to the clinic.")}</p>
            </div>
            <div className="relative mt-10 flex flex-wrap gap-4 text-xs font-semibold text-white/80">
              <span className="inline-flex items-center gap-2"><Check size={15}/> {sectionTitle("خطوات بسيطة وواضحة","Simple guided steps")}</span>
              <span className="inline-flex items-center gap-2"><Check size={15}/> {sectionTitle("اختيار من المواعيد المتاحة","Choose from available times")}</span>
            </div>
          </div>
          <div className="flex min-h-[580px] flex-col p-4 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm" style={{backgroundColor:primary}}><Sparkles size={22}/></span>
                <div>
                  <h3 className="text-base font-black text-slate-900">{sectionTitle("مساعد المواعيد","Appointment assistant")}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>{sectionTitle("متاح لمساعدتك","Here to help")}</p>
                </div>
              </div>
              <button type="button" onClick={restartBookingChat} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50"><ArrowRight size={14}/>{sectionTitle("طلب جديد","New request")}</button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3 sm:p-4" aria-live="polite">
              {bookingMessages.map((message, index) => (
                <div key={index} className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white" style={{backgroundColor:primary}}><Sparkles size={15}/></span>}
                  <div className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "rounded-ee-sm bg-indigo-600 text-white" : "rounded-es-sm border border-slate-100 bg-white text-slate-700"}`}>{message.text}</div>
                  {message.role === "user" && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600"><Users size={14}/></span>}
                </div>
              ))}
              {bookingStep === "time" && (
                <div className="ms-9 space-y-3 rounded-2xl border border-slate-100 bg-white p-3">
                  {availabilityLoading ? <p className="text-xs font-semibold text-slate-500">{sectionTitle("جاري فحص المواعيد...","Checking group availability...")}</p> : (
                    <>
                      <p className="text-xs font-extrabold text-slate-700">{sectionTitle("1. اختر المجموعة","1. Choose a group")}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => handleGroupChoice("A")} className="rounded-xl border p-3 text-start text-xs font-extrabold" style={{borderColor:bookingGroup === "A" ? primary : "#e2e8f0",background:bookingGroup === "A" ? "#eef2ff" : "#fff",color:primary}}>
                          {sectionTitle("المجموعة A","Group A")}<span className="mt-1 block text-[10px] font-semibold text-slate-500">{sectionTitle("السبت • الاثنين • الأربعاء","Sat • Mon • Wed")}</span>
                        </button>
                        <button type="button" onClick={() => handleGroupChoice("B")} className="rounded-xl border p-3 text-start text-xs font-extrabold" style={{borderColor:bookingGroup === "B" ? primary : "#e2e8f0",background:bookingGroup === "B" ? "#eef2ff" : "#fff",color:primary}}>
                          {sectionTitle("المجموعة B","Group B")}<span className="mt-1 block text-[10px] font-semibold text-slate-500">{sectionTitle("الأحد • الثلاثاء • الخميس","Sun • Tue • Thu")}</span>
                        </button>
                      </div>
                      {bookingGroup && <div className="space-y-3">
                        <p className="text-xs font-extrabold text-slate-700">{sectionTitle("2. اختر وقتًا لكل يوم","2. Select a time for each weekday")}</p>
                        {(groupAvailability[bookingGroup] || []).map(day => (
                          <div key={day.key} className="rounded-xl bg-slate-50 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-xs font-extrabold text-slate-700">{isRtl ? day.dayAr : day.dayEn}</span>
                              <span className="text-[10px] text-slate-400">{day.date}</span>
                            </div>
                            {day.slots.length ? <div className="flex flex-wrap gap-2">
                              {day.slots.map(slot => <button key={slot} type="button" onClick={() => handleGroupTimeChoice(day.key,slot)} className="rounded-lg border px-2.5 py-2 text-[11px] font-bold" style={{borderColor:selectedGroupTimes[day.key] === slot ? primary : "#dbe2ea",background:selectedGroupTimes[day.key] === slot ? primary : "#fff",color:selectedGroupTimes[day.key] === slot ? "#fff" : "#334155"}}>
                                {new Date("2000-01-01T" + slot + ":00").toLocaleTimeString(isRtl ? "ar-EG" : "en-US",{hour:"numeric",minute:"2-digit"})}
                              </button>)}
                            </div> : <p className="text-[11px] font-semibold text-rose-600">{day.configured ? sectionTitle("لا توجد أوقات متاحة في هذا اليوم.","No available times on this day.") : sectionTitle("المركز لا يعمل في هذا اليوم أو لم يحدد ساعاته.","The clinic is closed or has no hours configured for this day.")}</p>}
                          </div>
                        ))}
                      </div>}
                    </>
                  )}
                </div>
              )}
            </div>

            {bookingNotice && <p role="status" className={`mt-3 rounded-xl border p-3 text-xs font-semibold leading-6 ${bookingStep === "done" ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-rose-100 bg-rose-50 text-rose-700"}`}>{bookingNotice}</p>}

            {bookingStep === "confirm" ? (
              <form onSubmit={handleBooking} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="submit" disabled={bookingSubmitting} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60" style={{backgroundColor:primary}}>
                  {bookingSubmitting ? <Loader size={18} color="white"/> : <><Check size={17}/>{sectionTitle("تأكيد وإرسال الطلب","Confirm and send request")}</>}
                </button>
                <button type="button" onClick={restartBookingChat} disabled={bookingSubmitting} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">
                  {sectionTitle("إعادة إدخال البيانات","Start over")}
                </button>
              </form>
            ) : bookingStep === "done" ? (
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center text-xs font-bold leading-6 text-emerald-800">
                {sectionTitle("تم إرسال طلبك بنجاح. سيقيّم الأخصائي الحالة ويحدد عدد الجلسات قبل اعتماد الجدول.","Your request was sent. A specialist will evaluate the patient and set the session count before approving the schedule.")}
              </div>
            ) : bookingStep === "time" ? (
              <div className="mt-4 rounded-xl border border-slate-100 bg-white p-3 text-center text-xs font-semibold leading-6 text-slate-500">
                {sectionTitle("اختار أحد الأوقات الظاهرة في المحادثة للمتابعة.","Choose one of the times shown above to continue.")}
              </div>
            ) : (
              <form onSubmit={handleChatInput} className="mt-4 flex items-center gap-2">
                <input
                  value={bookingInput}
                  onChange={event => {setBookingInput(event.target.value);setBookingNotice("");}}
                  disabled={bookingSubmitting}
                  autoComplete="off"
                  inputMode={bookingStep === "age" ? "numeric" : bookingStep === "phone" ? "tel" : "text"}
                  type={bookingStep === "phone" ? "tel" : "text"}
                  placeholder={
                    bookingStep === "name" ? sectionTitle("اكتب اسم المريض...","Enter patient name...")
                    : bookingStep === "age" ? sectionTitle("اكتب السن...","Enter age...")
                    : bookingStep === "phone" ? sectionTitle("اكتب رقم الهاتف...","Enter phone number...")
                    : sectionTitle("اكتب العنوان أو المنطقة...","Enter address or area...")
                  }
                  className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  dir={bookingStep === "phone" || bookingStep === "age" ? "ltr" : undefined}
                />
                <button type="submit" disabled={!bookingInput.trim() || bookingSubmitting} aria-label={sectionTitle("إرسال","Send")} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50" style={{backgroundColor:primary}}>
                  <ArrowRight size={18}/>
                </button>
              </form>
            )}
            <p className="mt-3 text-center text-[10px] font-medium leading-5 text-slate-400">
              {sectionTitle("بعد إرسال الطلب يُنشأ ملف المريض، ويعتمد الأخصائي الجدول وعدد الجلسات بعد التقييم.","Submitting creates the patient record; the specialist approves the schedule and session count after evaluation.")}
            </p>
          </div>
        </div>
      </section>

<section id="contact" className="scroll-mt-24 bg-white py-16"><div className="mx-auto max-w-[1280px] px-4 sm:px-6"><div className="mb-8"><span className="text-xs font-black tracking-widest" style={{color:primary}}>{sectionTitle("نحن هنا لمساعدتك","WE ARE HERE TO HELP")}</span><h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{sectionTitle("تواصل مع المركز","Contact the clinic")}</h2></div><div className="grid gap-3 md:grid-cols-3">
        <article className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50" style={{color:primary}}><MapPin size={19}/></span><div className="min-w-0 flex-1"><h3 className="text-xs font-black text-slate-900">{sectionTitle("عنوان المركز","Clinic address")}</h3><p className="mt-1 truncate text-xs font-medium text-slate-500">{addressText || sectionTitle("تواصل مع المركز لمعرفة العنوان.","Contact the clinic for its address.")}</p>{mapsHref&&<a href={mapsHref} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-extrabold" style={{color:primary}}>{sectionTitle("عرض الموقع على الخريطة","View on map")}<ArrowLeft size={12}/></a>}</div></article>
        <article className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50" style={{color:primary}}><Phone size={19}/></span><div className="min-w-0 flex-1"><h3 className="text-xs font-black text-slate-900">{sectionTitle("التواصل المباشر","Direct contact")}</h3>{clinic.phone?<a href={`tel:${clinic.phone}`} dir="ltr" className="mt-1 block text-sm font-black" style={{color:primary}}>{clinic.phone}</a>:<p className="mt-1 text-xs text-slate-500">{sectionTitle("رقم الهاتف غير متاح حاليًا.","Phone number unavailable.")}</p>}{whatsappNumber&&<a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex text-[11px] font-extrabold text-emerald-600">WhatsApp</a>}</div></article>
        <article id="hours" className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50" style={{color:primary}}><Clock size={19}/></span><div className="min-w-0 flex-1"><h3 className="text-xs font-black text-slate-900">{sectionTitle("مواعيد العمل","Working hours")}</h3>{workingHoursSummary ? <><p className="mt-1 text-xs font-bold text-slate-700">{workingHoursSummary.days}</p><p className="mt-0.5 text-xs font-semibold text-slate-500" dir="ltr">{workingHoursSummary.from} – {workingHoursSummary.to}</p></> : <p className="mt-1 whitespace-pre-line text-xs font-medium text-slate-500">{clinic.working_hours || sectionTitle("يرجى التواصل مع المركز لمعرفة المواعيد.","Please contact the clinic for opening hours.")}</p>}</div></article>
      </div>
        {(addressText || clinic.maps_url) && <div className="mt-7 overflow-hidden rounded-2xl bg-white p-2 shadow-lg">
          <div className="relative overflow-hidden rounded-xl bg-slate-100">
            <iframe
              title={sectionTitle("موقع المركز على خرائط Google","Clinic location on Google Maps")}
              src={clinic.maps_url || `https://www.google.com/maps?q=${encodeURIComponent(addressText || displayName || clinic.slug)}&output=embed`}
              className="h-56 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-start sm:inset-x-5 sm:top-5">
              <div className="max-w-sm rounded-xl bg-white/95 p-3 shadow-md backdrop-blur-md">
                <span className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-black tracking-wider" style={{color:primary}}><MapPin size={13}/>{sectionTitle("موقعنا على الخريطة","FIND OUR CLINIC")}</span>
                <h3 className="text-sm font-black leading-6 text-slate-900 sm:text-base">{displayName}</h3>
                <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-5 text-slate-500 sm:text-xs">{addressText || sectionTitle("افتح الخريطة لمعرفة موقع المركز.","Open the map to explore the clinic location.")}</p>
              </div>
            </div>
            {mapsHref && <a href={mapsHref} target="_blank" rel="noreferrer" className="absolute bottom-3 end-3 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:-translate-y-0.5" style={{backgroundColor:primary}}><MapPin size={15}/>{sectionTitle("الاتجاهات إلى المركز","Get directions")}<ArrowLeft size={14}/></a>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-1 pt-3 sm:px-4">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-500"><ShieldCheck size={14} style={{color:primary}}/>{sectionTitle("الموقع المعروض وفق بيانات المركز المسجلة","Location based on the clinic's registered details")}</span>
            {mapsHref && <a href={mapsHref} target="_blank" rel="noreferrer" className="text-[11px] font-extrabold transition hover:underline" style={{color:primary}}>{sectionTitle("فتح في Google Maps","Open in Google Maps")}</a>}
          </div>
        </div>}
      </div></section>

      <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6"><div className="flex flex-col items-center justify-between gap-6 rounded-[28px] bg-gradient-to-r from-[#21175f] via-[#4f46ba] to-[#3621b3] p-7 text-center text-white shadow-xl sm:flex-row sm:text-start sm:p-10"><div><span className="mb-2 inline-flex items-center gap-2 text-xs font-black text-violet-200"><Lock size={14}/>{sectionTitle("بوابة المركز","CLINIC PORTAL")}</span><h2 className="text-xl font-black sm:text-2xl">{sectionTitle("هل أنت من فريق المركز الطبي أو الإداري؟","Are you part of the clinic team?")}</h2><p className="mt-2 text-sm font-medium leading-7 text-violet-100">{sectionTitle("سجّل الدخول للوصول إلى لوحة الإدارة ومتابعة ملفات المرضى والجلسات.","Sign in to manage the clinic, patient records, and sessions.")}</p></div><a href="#clinic-login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black shadow-lg transition hover:-translate-y-0.5" style={{color:primary}}>{sectionTitle("تسجيل الدخول","Sign in")}<ArrowLeft size={17}/></a></div></section>

      <footer className="mt-8 w-full bg-[#eff4ff] text-[#0b1c30]">
        <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-12 sm:px-6 lg:px-10">
          <div className="mb-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#372ba2] text-white"><Activity size={20}/></span>
                <span className="flex flex-col"><strong className="text-lg font-bold leading-tight text-[#372ba2]">Prime Physio</strong><small className="text-[11px] font-semibold text-[#5b569c]">{displayName}</small></span>
              </div>
              <p className="mb-4 text-sm leading-6 text-[#474553]">{clinic.public_description || sectionTitle("مركز متخصص في العلاج الطبيعي والتأهيل الحركي، يقدّم خدماته وفق احتياجات كل مريض.","A clinic focused on physiotherapy and rehabilitation, with care tailored to each patient's needs.")}</p>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#dce9ff] px-3 py-2 text-[11px] font-semibold text-[#0b1c30]"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"/><ShieldCheck size={15} className="text-[#372ba2]"/>{sectionTitle("مركز موثّق على منصة Prime Physio","Verified on Prime Physio")}</span>
            </div>
            <div>
              <h4 className="mb-4 text-base font-bold text-[#0b1c30]">{sectionTitle("روابط سريعة","Quick links")}</h4>
              <ul className="space-y-2.5 text-sm text-[#474553]">
                {navItems.map(item=><li key={item.href}><a href={item.href} className="transition-colors hover:text-[#0b1c30]">{item.label}</a></li>)}
                <li><Link href="/privacy" className="transition-colors hover:text-[#0b1c30]">{sectionTitle("سياسة الخصوصية","Privacy policy")}</Link></li>
                <li><Link href="/terms" className="transition-colors hover:text-[#0b1c30]">{sectionTitle("شروط الخدمة والزيارة","Terms of service")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-base font-bold text-[#0b1c30]">{sectionTitle("الفروع والموقع","Locations & hours")}</h4>
              {addressText && <div className="mb-3 flex items-start gap-2 text-sm leading-6 text-[#474553]"><MapPin size={19} className="mt-0.5 shrink-0 text-[#372ba2]"/><div><p className="font-semibold text-[#0b1c30]">{clinic.country || sectionTitle("موقع المركز","Clinic location")}</p><p>{addressText}</p></div></div>}
              <div className="flex items-start gap-2 text-sm leading-6 text-[#474553]"><Clock size={18} className="mt-1 shrink-0 text-[#372ba2]"/><div>{workingHoursSummary ? <p>{workingHoursSummary.days}: <span dir="ltr">{workingHoursSummary.from} – {workingHoursSummary.to}</span></p> : <p className="whitespace-pre-line">{clinic.working_hours || sectionTitle("يرجى التواصل مع المركز لمعرفة مواعيد العمل.","Contact the clinic for opening hours.")}</p>}</div></div>
            </div>
            <div>
              <h4 className="mb-4 text-base font-bold text-[#0b1c30]">{sectionTitle("التواصل والدعم الفوري","Contact & support")}</h4>
              <p className="mb-3 text-sm leading-6 text-[#474553]">{sectionTitle("فريق المركز متاح للرد على استفساراتكم ومساعدتكم في طلب المواعيد.","The clinic team is available to answer questions and help with appointment requests.")}</p>
              <div className="mb-3 space-y-2">
                {clinic.phone && <a href={`tel:${clinic.phone}`} dir="ltr" className="flex items-center justify-end gap-2 rounded-xl bg-[#d3e4fe] px-4 py-2.5 text-sm font-semibold text-[#0b1c30] transition hover:bg-[#e5eeff]"><Phone size={17} className="text-[#372ba2]"/><span>{clinic.phone}</span></a>}
                {whatsappNumber && <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" dir="ltr" className="flex items-center justify-end gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-[#0b1c30] transition hover:bg-emerald-500/20"><Phone size={17} className="text-emerald-600"/><span>WhatsApp: {clinic.phone || whatsappNumber}</span></a>}
              </div>
              {clinic.website_url && <a href={clinic.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#474553] hover:text-[#372ba2]"><Globe size={16}/>{sectionTitle("الموقع الإلكتروني","Website")}</a>}
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#c8c4d5]/60 pt-4 text-center text-xs text-[#474553] md:flex-row md:text-start">
            <p>© {new Date().getFullYear()} Prime Physio | {displayName}. {sectionTitle("جميع الحقوق محفوظة.","All rights reserved.")}</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/privacy" className="transition-colors hover:text-[#0b1c30]">{sectionTitle("سياسة الخصوصية","Privacy policy")}</Link>
              <Link href="/terms" className="transition-colors hover:text-[#0b1c30]">{sectionTitle("شروط الخدمة والزيارة","Terms of service")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
