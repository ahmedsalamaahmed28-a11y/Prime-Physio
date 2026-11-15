import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store, private" };
const TZ = "Africa/Cairo";
const GROUP_DAYS: Record<string, Array<{ key: string; ar: string; en: string; dow: number }>> = {
  A: [{ key: "saturday", ar: "السبت", en: "Saturday", dow: 6 }, { key: "monday", ar: "الاثنين", en: "Monday", dow: 1 }, { key: "wednesday", ar: "الأربعاء", en: "Wednesday", dow: 3 }],
  B: [{ key: "sunday", ar: "الأحد", en: "Sunday", dow: 0 }, { key: "tuesday", ar: "الثلاثاء", en: "Tuesday", dow: 2 }, { key: "thursday", ar: "الخميس", en: "Thursday", dow: 4 }],
};
async function allowPublicBookingFromIp(clientIp: string, clinicSlug: string): Promise<boolean> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BOOKING_RATE_LIMIT_UNAVAILABLE");
  const normalizedIp = (clientIp || "unknown").trim().slice(0, 128);
  const ipHash = createHmac("sha256", secret)
    .update(`public-booking:${clinicSlug}:${normalizedIp}`)
    .digest("hex");
  const admin = getAdminClient();
  const { data, error } = await admin.rpc("check_auth_login_attempt", {
    p_email: `public-booking-${clinicSlug}@prime-physio.internal`,
    p_ip_hash: ipHash,
  });
  if (error) throw error;
  return data === true;
}
function cairoDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function normalizeTime(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{1,3}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return "";
  let hour = Number(match[1]); const minute = Number(match[2]);
  if (minute > 59 || hour > 23) return "";
  if (match[3]?.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (match[3]?.toUpperCase() === "AM" && hour === 12) hour = 0;
  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}
function minutes(value: string) {
  const normalized = normalizeTime(value);
  if (!normalized) return -1;
  const parts = normalized.split(":").map(Number);
  return parts[0] * 60 + parts[1];
}
function dayKey(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[إأآ]/g, "ا").replace(/\s+/g, "");
}
function getWeeklyHours(workingHours: unknown, branches: unknown): any[] {
  if (typeof workingHours === "string" && workingHours.trim()) {
    try { const parsed = JSON.parse(workingHours); if (Array.isArray(parsed)) return parsed; } catch {}
  }
  if (Array.isArray(branches)) {
    const branch = branches.find((item: any) => item?.id === "main") || branches[0];
    if (Array.isArray(branch?.hours)) return branch.hours;
  }
  return [];
}
function dateForGroupDay(groupCode: string, key: string) {
  const days = GROUP_DAYS[groupCode];
  const anchorDow = days[0].dow;
  const [y, m, d] = cairoDate().split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  let delta = (anchorDow - date.getUTCDay() + 7) % 7;
  if (delta === 0) delta = 7;
  const dayIndex = days.findIndex(item => item.key === key);
  date.setUTCDate(date.getUTCDate() + delta + Math.max(0, dayIndex) * 2);
  return date.toISOString().slice(0, 10);
}
function cairoNowMinute() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).split(":").map(Number);
  return parts[0] * 60 + parts[1];
}
async function getClinic(slug: string) {
  const admin = getAdminClient();
  const { data: clinic, error } = await admin.from("clinics").select("id,name,name_en,slug").eq("slug", slug).eq("is_active", true).eq("status", "active").maybeSingle();
  if (error) throw error;
  if (!clinic) return null;
  const { data: settings, error: settingsError } = await admin.from("clinic_settings").select("working_hours,branches,phone,whatsapp").eq("clinic_id", clinic.id).maybeSingle();
  if (settingsError) throw settingsError;
  return { ...clinic, settings };
}
function hoursForDay(rows: any[], day: { ar: string; en: string }) {
  const row = rows.find((item: any) => [day.ar, day.en].some(label => dayKey(item?.day) === dayKey(label)));
  if (!row || row.isOpen === false || !row.from || !row.to) return null;
  const from = normalizeTime(row.from), to = normalizeTime(row.to);
  if (!from || !to || minutes(to) <= minutes(from)) return null;
  return { from, to };
}
async function legacyTodayAvailability(clinic: any) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long" }).format(new Date());
  const labels: Record<string, {ar:string;en:string}> = {
    Sunday:{ar:"الأحد",en:"Sunday"}, Monday:{ar:"الاثنين",en:"Monday"}, Tuesday:{ar:"الثلاثاء",en:"Tuesday"},
    Wednesday:{ar:"الأربعاء",en:"Wednesday"}, Thursday:{ar:"الخميس",en:"Thursday"},
    Friday:{ar:"الجمعة",en:"Friday"}, Saturday:{ar:"السبت",en:"Saturday"},
  };
  const rows = getWeeklyHours(clinic.settings?.working_hours, clinic.settings?.branches);
  const hours = hoursForDay(rows, labels[weekday]);
  if (!hours) return { slots: [], configured: rows.length > 0, closed: rows.length > 0 };
  const admin = getAdminClient();
  const { data: appointments, error } = await admin.from("appointments")
    .select("date,time,status,starts_at,ends_at,duration,is_group_session").eq("clinic_id", clinic.id);
  if (error) throw error;
  const today = cairoDate();
  const occupied: Array<{start:number;end:number}> = [];
  for (const appointment of appointments || []) {
    if (appointment.is_group_session) continue;
    const status = String(appointment.status || "").toLowerCase();
    if (["cancelled","canceled","ملغي","ملغى","rejected","منتهي","completed"].includes(status)) continue;
    let date = String(appointment.date || "");
    let start = -1, end = -1;
    if (appointment.starts_at) {
      const starts = new Date(appointment.starts_at);
      date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year:"numeric", month:"2-digit", day:"2-digit" }).format(starts);
      const localStart = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).format(starts);
      start = minutes(localStart);
      if (appointment.ends_at) {
        const localEnd = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).format(new Date(appointment.ends_at));
        end = minutes(localEnd);
        if (end <= start) end += 1440;
      }
    } else start = minutes(String(appointment.time || ""));
    if (end <= start) {
      const duration = Number.parseInt(String(appointment.duration || "30"),10);
      end = start + (Number.isFinite(duration) && duration > 0 ? Math.min(duration,480) : 30);
    }
    if (date === today && start >= 0 && end > start) occupied.push({start,end});
  }
  const now = cairoNowMinute();
  const startAt = Math.max(Math.ceil(minutes(hours.from)/60)*60,Math.ceil((now+15)/60)*60);
  const closeAt = minutes(hours.to);
  const slots: string[] = [];
  for(let minute=startAt;minute+60<=closeAt;minute+=60) {
    if(!occupied.some(item=>minute<item.end && minute+60>item.start)) {
      slots.push(String(Math.floor(minute/60)).padStart(2,"0")+":"+String(minute%60).padStart(2,"0"));
    }
  }
  return { slots, configured:true, closed:slots.length===0 };
}

async function availabilityForClinic(clinic: any) {
  const rows = getWeeklyHours(clinic.settings?.working_hours, clinic.settings?.branches);
  const admin = getAdminClient();
  const { data: appointments, error } = await admin.from("appointments").select("date,time,status,starts_at,ends_at,start_time,end_time,duration,is_group_session").eq("clinic_id", clinic.id);
  if (error) throw error;
  const groups: Record<string, any[]> = { A: [], B: [] };
  for (const [groupCode, days] of Object.entries(GROUP_DAYS)) {
    for (const day of days) {
      const date = dateForGroupDay(groupCode, day.key);
      const hours = hoursForDay(rows, day);
      const occupied: Array<{ start: number; end: number }> = [];
      for (const appointment of appointments || []) {
        const status = String(appointment.status || "").toLowerCase();
        if (appointment.is_group_session) continue;
        if (["cancelled", "canceled", "ملغي", "ملغى", "rejected", "منتهي", "completed"].includes(status)) continue;
        let appointmentDate = String(appointment.date || ""), start = -1, end = -1;
        if (appointment.starts_at) {
          const starts = new Date(appointment.starts_at);
          appointmentDate = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(starts);
          const local = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(starts);
          start = minutes(local);
          if (appointment.ends_at) {
            const endLocal = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(appointment.ends_at));
            end = minutes(endLocal); if (end <= start) end += 1440;
          }
        } else start = minutes(String(appointment.time || appointment.start_time || ""));
        if (end <= start) {
          const duration = Number.parseInt(String(appointment.duration || "30"), 10);
          end = start + (Number.isFinite(duration) && duration > 0 ? Math.min(duration, 480) : 30);
        }
        if (appointmentDate === date && start >= 0 && end > start) occupied.push({ start, end });
      }
      const slots: string[] = [];
      if (hours) {
        const first = Math.max(Math.ceil(minutes(hours.from) / 60) * 60, date === cairoDate() ? Math.ceil((cairoNowMinute() + 15) / 60) * 60 : Math.ceil(minutes(hours.from) / 60) * 60);
        const close = minutes(hours.to);
        for (let minute = first; minute + 60 <= close; minute += 60) {
          if (!occupied.some(item => minute < item.end && minute + 60 > item.start)) {
            slots.push(String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0"));
          }
        }
      }
      groups[groupCode].push({ key: day.key, dayAr: day.ar, dayEn: day.en, date, configured: Boolean(hours), slots });
    }
  }
  return { groups, configured: rows.length > 0 };
}
export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get("slug") || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return NextResponse.json({ error: "Invalid clinic slug" }, { status: 400, headers: noStore });
  try {
    const clinic = await getClinic(slug);
    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404, headers: noStore });
    const availability = await availabilityForClinic(clinic);
    const legacy = await legacyTodayAvailability(clinic);
    return NextResponse.json({ ...availability, ...legacy }, { headers: noStore });
  } catch (error) {
    console.error("Public group availability failed:", error);
    return NextResponse.json({ error: "تعذر تحميل مواعيد المجموعات حاليًا." }, { status: 503, headers: noStore });
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = String(body?.slug || "").trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
      return NextResponse.json({ error: "Invalid clinic slug" }, { status: 400, headers: noStore });
    }

    const clientIp = request.headers.get("x-real-ip")
      || request.headers.get("x-forwarded-for")?.split(",").pop()?.trim()
      || "unknown";
    let allowed: boolean;
    try {
      allowed = await allowPublicBookingFromIp(clientIp, slug);
    } catch (rateLimitError) {
      console.error("Public booking rate-limit check failed:", rateLimitError);
      return NextResponse.json({ error: "خدمة الحجز غير متاحة مؤقتًا. حاول لاحقًا." }, { status: 503, headers: noStore });
    }
    if (!allowed) {
      return NextResponse.json({ error: "تم تجاوز عدد محاولات الحجز من هذا الاتصال. حاول مرة أخرى بعد 15 دقيقة." }, { status: 429, headers: noStore });
    }

    const name = String(body?.name || "").trim().slice(0, 120);
    const age = Number(body?.age);
    const phone = String(body?.phone || "").trim().slice(0, 20);
    const address = String(body?.address || "").trim().slice(0, 300);
    if (!body?.groupCode && body?.time) {
      const legacyTime = normalizeTime(body?.time);
      if (name.length < 2 || !Number.isInteger(age) || age < 1 || age > 120 ||
          phone.length < 7 || phone.length > 20 || !/^[+0-9()\s.-]+$/.test(phone) ||
          address.length < 3 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(legacyTime)) {
        return NextResponse.json({ error: "يرجى مراجعة البيانات واختيار موعد صحيح." }, { status: 400, headers: noStore });
      }
      const legacyClinic = await getClinic(slug);
      if (!legacyClinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404, headers: noStore });
      const legacy = await legacyTodayAvailability(legacyClinic);
      if (!legacy.slots.includes(legacyTime)) {
        return NextResponse.json({ error: "الموعد لم يعد متاحًا. حدّث المواعيد واختر وقتًا آخر." }, { status: 409, headers: noStore });
      }
      const admin = getAdminClient();
      const { data, error } = await admin.rpc("create_public_clinic_booking", {
        p_clinic_id: legacyClinic.id, p_patient_name: name, p_age: age, p_phone: phone,
        p_address: address, p_local_date: cairoDate(), p_local_time: legacyTime,
      });
      if (error) {
        const conflict = error.code === "23P01" || error.message?.includes("PUBLIC_BOOKING_TIME_CONFLICT");
        return NextResponse.json({ error: conflict ? "هذا الموعد تم حجزه للتو. اختر وقتًا آخر." : "تعذر تأكيد الحجز حاليًا." }, { status: conflict ? 409 : 500, headers: noStore });
      }
      const booking = Array.isArray(data) ? data[0] : data;
      if (!booking?.patient_id || !booking?.appointment_id) return NextResponse.json({ error: "تعذر تأكيد الحجز حاليًا." }, { status: 500, headers: noStore });
      return NextResponse.json({ success:true, confirmed:true, patientId:booking.patient_id, appointmentId:booking.appointment_id, reusedPatient:Boolean(booking.reused_patient), date:cairoDate(), time:legacyTime }, { status:201, headers:noStore });
    }
    const groupCode = String(body?.groupCode || "");
    const selectedTimes = body?.selectedTimes && typeof body.selectedTimes === "object" && !Array.isArray(body.selectedTimes) ? body.selectedTimes : {};
    const days = GROUP_DAYS[groupCode];
    if (name.length < 2 || !Number.isInteger(age) || age < 1 || age > 120 ||
      phone.length < 7 || phone.length > 20 || !/^[+0-9()\s.-]+$/.test(phone) || address.length < 3 || !days ||
      days.some(day => !normalizeTime(selectedTimes[day.key]))) {
      return NextResponse.json({ error: "يرجى مراجعة البيانات واختيار وقت لكل يوم من أيام المجموعة." }, { status: 400, headers: noStore });
    }
    const normalizedTimes: Record<string, string> = {};
    for (const day of days) normalizedTimes[day.key] = normalizeTime(selectedTimes[day.key]);
    const clinic = await getClinic(slug);
    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404, headers: noStore });
    const availability = await availabilityForClinic(clinic);
    for (const day of availability.groups[groupCode]) {
      if (!day.slots.includes(normalizedTimes[day.key])) {
        return NextResponse.json({ error: "الوقت المختار يوم " + day.dayAr + " لم يعد متاحًا. حدّث المواعيد واختر وقتًا آخر." }, { status: 409, headers: noStore });
      }
    }
    const admin = getAdminClient();
    const selectedDates: Record<string, string> = {};
    for (const day of availability.groups[groupCode]) selectedDates[day.key] = day.date;
    const { data, error } = await admin.rpc("create_public_group_booking_request", {
      p_clinic_id: clinic.id, p_patient_name: name, p_age: age, p_phone: phone, p_address: address,
      p_group_code: groupCode, p_selected_times: normalizedTimes,
    });
    if (error) {
      console.error("Public group booking request failed:", { code: error.code, message: error.message, clinicId: clinic.id });
      const conflict = error.code === "23P01";
      return NextResponse.json({ error: conflict ? "يوجد تعارض في أحد المواعيد. حدّث المواعيد وحاول مرة أخرى." : "تعذر إرسال طلب المجموعة حاليًا. حاول مرة أخرى." }, { status: conflict ? 409 : 500, headers: noStore });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.request_id || !result?.patient_id) throw new Error("Group request RPC returned incomplete data");
    const { error: dateError } = await admin.from("group_booking_requests")
      .update({ selected_dates: selectedDates })
      .eq("id", result.request_id).eq("clinic_id", clinic.id);
    if (dateError) throw dateError;
    return NextResponse.json({ success: true, pending: true, requestId: result.request_id, patientId: result.patient_id, reusedPatient: Boolean(result.reused_patient), clinicName: clinic.name, groupCode }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("Public group booking submission failed:", error);
    return NextResponse.json({ error: "تعذر إرسال طلب المجموعة حاليًا. حاول مرة أخرى." }, { status: 500, headers: noStore });
  }
}
