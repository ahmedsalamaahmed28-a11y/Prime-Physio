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

function getWeeklyHours(workingHours: unknown, branches: unknown): any[] {
  // Newer settings store the weekly schedule under branches[0].hours.
  // Older deployments may store the schedule directly as JSON in working_hours.
  if (typeof workingHours === "string" && workingHours.trim()) {
    try {
      const parsed = JSON.parse(workingHours);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Legacy free-text working_hours is not a weekly schedule.
    }
  }
  if (Array.isArray(branches)) {
    const mainBranch = branches.find((branch: any) => branch?.id === "main") || branches[0];
    if (Array.isArray(mainBranch?.hours)) return mainBranch.hours;
  }
  return [];
}

function normalizeDay(value: unknown): string {
  return String(value || "").trim().replace(/[إأآ]/g, "ا").replace(/\\s+/g, "");
}

function getTodayHours(rows: any[]) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const today = new Intl.DateTimeFormat("ar-EG", { timeZone: CAIRO_TZ, weekday: "long" }).format(new Date());
  const row = rows.find((item: any) => normalizeDay(item?.day) === normalizeDay(today));
  if (!row || row.isOpen === false || !row.from || !row.to) return null;
  const from = normalizeTime(row.from);
  const to = normalizeTime(row.to);
  if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(from) || !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(to)) return null;
  return { from, to };
}

async function getClinic(slug: string) {
  const admin = getAdminClient();
  const { data: clinic, error } = await admin.from("clinics")
    .select("id,name,name_en,slug")
    .eq("slug", slug).eq("is_active", true).eq("status", "active").maybeSingle();
  if (error) throw error;
  if (!clinic) return null;
  const { data: settings, error: settingsError } = await admin.from("clinic_settings")
    .select("working_hours,branches,phone,whatsapp")
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
      .select("date,time,status,starts_at,ends_at,start_time,end_time,duration")
      .eq("clinic_id", clinic.id);
    if (error) throw error;

    const occupiedIntervals: Array<{ start: number; end: number }> = [];
    for (const appointment of appointments || []) {
      const status = String(appointment.status || "").toLowerCase();
      if (["cancelled", "canceled", "ملغي", "ملغى", "rejected", "منتهي", "completed"].includes(status)) continue;

      let appointmentDate = String(appointment.date || "");
      let startMinute = -1;
      let endMinute = -1;

      if (appointment.starts_at) {
        const starts = new Date(appointment.starts_at);
        appointmentDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: CAIRO_TZ, year: "numeric", month: "2-digit", day: "2-digit",
        }).format(starts);
        const localStart = new Intl.DateTimeFormat("en-GB", {
          timeZone: CAIRO_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
        }).format(starts);
        const parts = localStart.split(":").map(Number);
        startMinute = parts[0] * 60 + parts[1];

        if (appointment.ends_at) {
          const ends = new Date(appointment.ends_at);
          const localEnd = new Intl.DateTimeFormat("en-GB", {
            timeZone: CAIRO_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
          }).format(ends);
          const endParts = localEnd.split(":").map(Number);
          endMinute = endParts[0] * 60 + endParts[1];
          if (endMinute <= startMinute) endMinute += 24 * 60;
        } else {
          const duration = Number.parseInt(String(appointment.duration || "30"), 10);
          endMinute = startMinute + (Number.isFinite(duration) && duration > 0 ? Math.min(duration, 480) : 30);
        }
      } else {
        const normalized = normalizeTime(appointment.time);
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) continue;
        const parts = normalized.split(":").map(Number);
        startMinute = parts[0] * 60 + parts[1];
        const duration = Number.parseInt(String(appointment.duration || "30"), 10);
        endMinute = startMinute + (Number.isFinite(duration) && duration > 0 ? Math.min(duration, 480) : 30);
      }

      if (appointmentDate === today && startMinute >= 0 && endMinute > startMinute) {
        occupiedIntervals.push({ start: startMinute, end: endMinute });
      }
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
      const value = String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0");
      const overlaps = occupiedIntervals.some(interval => minute < interval.end && minute + 30 > interval.start);
      if (!overlaps) slots.push(value);
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
    const phone = String(body.phone || "").trim().slice(0, 20);
    const address = String(body.address || "").trim().slice(0, 300);
    const time = normalizeTime(body.time);

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80 ||
        name.length < 2 || !Number.isInteger(age) || age < 1 || age > 120 ||
        phone.length < 7 || phone.length > 20 || !/^[+0-9()\s.-]+$/.test(phone) ||
        address.length < 3 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return NextResponse.json({ error: "يرجى مراجعة البيانات واختيار موعد صحيح." }, { status: 400, headers: noStore });
    }

    const clinic = await getClinic(slug);
    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404, headers: noStore });

    const hours = getTodayHours(clinic.settings?.working_hours);
    if (!hours) {
      return NextResponse.json({ error: "مواعيد المركز غير محددة لهذا اليوم. يرجى التواصل مع المركز." }, { status: 409, headers: noStore });
    }

    const [openHour, openMinute] = hours.from.split(":").map(Number);
    const [closeHour, closeMinute] = hours.to.split(":").map(Number);
    const requestedMinute = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    const openingMinute = openHour * 60 + openMinute;
    const closingMinute = closeHour * 60 + closeMinute;
    const nowParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: CAIRO_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).format(new Date()).split(":").map(Number);
    const currentMinute = nowParts[0] * 60 + nowParts[1];

    if (requestedMinute < openingMinute || requestedMinute + 30 > closingMinute ||
        requestedMinute % 30 !== 0 || requestedMinute < Math.ceil((currentMinute + 15) / 30) * 30) {
      return NextResponse.json({ error: "اختر موعدًا متاحًا ضمن مواعيد العمل اليوم." }, { status: 409, headers: noStore });
    }

    const today = cairoDate();
    const admin = getAdminClient();
    const { data, error } = await admin.rpc("create_public_clinic_booking", {
      p_clinic_id: clinic.id,
      p_patient_name: name,
      p_age: age,
      p_phone: phone,
      p_address: address,
      p_local_date: today,
      p_local_time: time,
    });

    if (error) {
      console.error("Public clinic booking transaction failed:", {
        code: error.code,
        message: error.message,
        clinicId: clinic.id,
      });
      const isConflict = error.code === "23P01" || error.message?.includes("PUBLIC_BOOKING_TIME_CONFLICT");
      const status = isConflict ? 409 : error.code === "22023" ? 409 : 500;
      return NextResponse.json({
        error: isConflict
          ? "هذا الموعد تم حجزه للتو. حدّث المواعيد واختر وقتًا آخر."
          : status === 409
            ? "انتهت صلاحية الموعد المختار. حدّث المواعيد وحاول مرة أخرى."
            : "تعذر تأكيد الحجز حاليًا. حاول مرة أخرى.",
      }, { status, headers: noStore });
    }

    const booking = Array.isArray(data) ? data[0] : data;
    if (!booking?.patient_id || !booking?.appointment_id) {
      console.error("Public clinic booking RPC returned an incomplete result:", { clinicId: clinic.id });
      return NextResponse.json({ error: "تعذر تأكيد الحجز حاليًا. حاول مرة أخرى." }, { status: 500, headers: noStore });
    }

    return NextResponse.json({
      success: true,
      confirmed: true,
      patientId: booking.patient_id,
      appointmentId: booking.appointment_id,
      reusedPatient: Boolean(booking.reused_patient),
      category: age < 18 ? "children" : "adults",
      categoryAr: age < 18 ? "قسم الأطفال" : "قسم الكبار",
      clinicName: clinic.name,
      date: today,
      time,
    }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("Public appointment booking failed:", error);
    return NextResponse.json({ error: "تعذر تأكيد الحجز حاليًا. حاول مرة أخرى." }, { status: 500, headers: noStore });
  }
}
