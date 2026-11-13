import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store, private" };
const CAIRO_TZ = "Africa/Cairo";

function cairoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function normalizeTime(value: unknown): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return raw;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getTodayHours(workingHours: unknown) {
  if (typeof workingHours !== "string" || !workingHours.trim()) return null;
  try {
    const rows = JSON.parse(workingHours);
    if (!Array.isArray(rows)) return null;
    const today = new Intl.DateTimeFormat("ar-EG", { timeZone: CAIRO_TZ, weekday: "long" }).format(new Date());
    const row = rows.find((item: any) => item?.day === today);
    if (!row || row.isOpen === false || !row.from || !row.to) return null;
    return { from: normalizeTime(row.from), to: normalizeTime(row.to) };
  } catch {
    return null;
  }
}

async function getClinic(slug: string) {
  const admin = getAdminClient();
  const { data: clinic, error } = await admin.from("clinics")
    .select("id,name,name_en,slug")
    .eq("slug", slug).eq("is_active", true).eq("status", "active").maybeSingle();
  if (error) throw error;
  if (!clinic) return null;
  const { data: settings, error: settingsError } = await admin.from("clinic_settings")
    .select("working_hours,phone,whatsapp")
    .eq("clinic_id", clinic.id).maybeSingle();
  if (settingsError) throw settingsError;
  return { ...clinic, settings };
}

export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get("slug") || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    return NextResponse.json({ error: "Invalid clinic slug" }, { status: 400, headers: noStore });
  }
  try {
    const clinic = await getClinic(slug);
    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404, headers: noStore });
    const hours = getTodayHours(clinic.settings?.working_hours);
    if (!hours) return NextResponse.json({ slots: [], configured: false }, { headers: noStore });

    const today = cairoDate();
    const admin = getAdminClient();
    const { data: appointments, error } = await admin.from("appointments")
      .select("date,time,status,starts_at")
      .eq("clinic_id", clinic.id);
    if (error) throw error;

    const occupied = new Set<string>();
    for (const appointment of appointments || []) {
      const status = String(appointment.status || "").toLowerCase();
      if (["cancelled", "canceled", "ملغي", "ملغى", "rejected"].includes(status)) continue;
      let appointmentDate = String(appointment.date || "");
      let appointmentTime = normalizeTime(appointment.time);
      if (appointment.starts_at) {
        const starts = new Date(appointment.starts_at);
        appointmentDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: CAIRO_TZ, year: "numeric", month: "2-digit", day: "2-digit",
        }).format(starts);
        appointmentTime = new Intl.DateTimeFormat("en-GB", {
          timeZone: CAIRO_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
        }).format(starts);
      }
      if (appointmentDate === today && appointmentTime) occupied.add(appointmentTime);
    }

    const [fromHour, fromMinute] = hours.from.split(":").map(Number);
    const [toHour, toMinute] = hours.to.split(":").map(Number);
    let start = fromHour * 60 + fromMinute;
    const end = toHour * 60 + toMinute;
    const nowParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: CAIRO_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).format(new Date()).split(":").map(Number);
    const current = nowParts[0] * 60 + nowParts[1];
    start = Math.max(start, Math.ceil((current + 15) / 30) * 30);

    const slots: string[] = [];
    for (let minute = start; minute + 30 <= end; minute += 30) {
      const value = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      if (!occupied.has(value)) slots.push(value);
    }
    return NextResponse.json({ slots, configured: true }, { headers: noStore });
  } catch (error) {
    console.error("Public appointment availability failed:", error);
    return NextResponse.json({ error: "Could not load today's availability" }, { status: 503, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = String(body.slug || "").trim().toLowerCase();
    const name = String(body.name || "").trim().slice(0, 120);
    const age = Number(body.age);
    const address = String(body.address || "").trim().slice(0, 300);
    const time = normalizeTime(body.time);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80 ||
        name.length < 2 || !Number.isInteger(age) || age < 1 || age > 120 ||
        address.length < 3 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return NextResponse.json({ error: "يرجى مراجعة البيانات واختيار موعد صحيح." }, { status: 400, headers: noStore });
    }

    const clinic = await getClinic(slug);
    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404, headers: noStore });

    const hours = getTodayHours(clinic.settings?.working_hours);
    if (!hours) {
      return NextResponse.json({ error: "مواعيد المركز غير محددة لهذا اليوم. يرجى التواصل مع المركز." }, { status: 409, headers: noStore });
    }

    const today = cairoDate();
    const admin = getAdminClient();
    const { data: appointments, error: appointmentsError } = await admin.from("appointments")
      .select("date,time,status,starts_at")
      .eq("clinic_id", clinic.id);
    if (appointmentsError) throw appointmentsError;

    const isOccupied = (appointments || []).some((appointment: any) => {
      const status = String(appointment.status || "").toLowerCase();
      if (["cancelled", "canceled", "ملغي", "ملغى", "rejected"].includes(status)) return false;
      let date = String(appointment.date || "");
      let bookedTime = normalizeTime(appointment.time);
      if (appointment.starts_at) {
        const starts = new Date(appointment.starts_at);
        date = new Intl.DateTimeFormat("en-CA", { timeZone: CAIRO_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(starts);
        bookedTime = new Intl.DateTimeFormat("en-GB", { timeZone: CAIRO_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(starts);
      }
      return date === today && bookedTime === time;
    });
    if (isOccupied) return NextResponse.json({ error: "هذا الموعد لم يعد متاحًا. اختر موعدًا آخر." }, { status: 409, headers: noStore });

    const isChild = age < 18;
    const categoryAr = isChild ? "قسم الأطفال" : "قسم الكبار";
    const categoryEn = isChild ? "Pediatrics" : "Adults";
    const detailsAr = `المريض: ${name} • السن: ${age} سنة • القسم: ${categoryAr} • العنوان: ${address} • الموعد المطلوب اليوم: ${time}. الطلب بانتظار تأكيد المركز عبر واتساب.`;
    const detailsEn = `Patient: ${name} • Age: ${age} • Department: ${categoryEn} • Address: ${address} • Requested time today: ${time}. Awaiting clinic confirmation via WhatsApp.`;

    const { error: notificationError } = await admin.from("notifications").insert({
      clinic_id: clinic.id,
      user_id: null,
      title_ar: "طلب حجز جلسة جديد",
      title_en: "New session booking request",
      body_ar: detailsAr,
      body_en: detailsEn,
      type: "appointment",
      action_url: "/notifications",
    });
    if (notificationError) throw notificationError;

    return NextResponse.json({
      success: true,
      category: isChild ? "children" : "adults",
      categoryAr,
      detailsAr,
      detailsEn,
      clinicName: clinic.name,
      phone: clinic.settings?.whatsapp || clinic.settings?.phone || "",
    }, { headers: noStore });
  } catch (error) {
    console.error("Public appointment request failed:", error);
    return NextResponse.json({ error: "تعذر إرسال طلب الموعد حاليًا. حاول مرة أخرى." }, { status: 500, headers: noStore });
  }
}
