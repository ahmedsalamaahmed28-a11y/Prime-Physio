import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const noStore = { "Cache-Control": "no-store, private" };
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function canManage(auth: any) {
  return hasStaffPermission(auth.staff, "manage_staff");
}

export async function GET(request: NextRequest) {
  const auth = await getClinicContext(request);
  if ("response" in auth) return auth.response;
  if (!canManage(auth)) return NextResponse.json({ error: "إدارة جداول الأطباء متاحة لمدير المركز فقط." }, { status: 403, headers: noStore });

  const staffId = request.nextUrl.searchParams.get("staffId") || "";
  if (!/^[0-9a-f-]{36}$/i.test(staffId)) return NextResponse.json({ error: "معرّف الطبيب غير صحيح." }, { status: 400, headers: noStore });
  try {
    const { data: staff, error: staffError } = await auth.admin.from("staff")
      .select("id").eq("id", staffId).eq("clinic_id", auth.clinicId).maybeSingle();
    if (staffError) throw staffError;
    if (!staff) return NextResponse.json({ error: "الطبيب غير موجود في هذا المركز." }, { status: 404, headers: noStore });

    const { data, error } = await auth.admin.from("doctor_working_hours")
      .select("weekday,start_time,end_time,is_working")
      .eq("clinic_id", auth.clinicId).eq("staff_id", staffId).order("weekday");
    if (error) throw error;
    return NextResponse.json({ schedule: data || [] }, { headers: noStore });
  } catch (error) {
    console.error("[Doctor schedule GET] Failed:", error);
    return NextResponse.json({ error: "تعذر تحميل جدول الطبيب." }, { status: 500, headers: noStore });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await getClinicContext(request);
  if ("response" in auth) return auth.response;
  if (!canManage(auth)) return NextResponse.json({ error: "تعديل جداول الأطباء متاح لمدير المركز فقط." }, { status: 403, headers: noStore });

  try {
    const body = await request.json();
    const staffId = String(body?.staffId || "");
    const schedule = body?.schedule;
    if (!/^[0-9a-f-]{36}$/i.test(staffId) || !Array.isArray(schedule) || schedule.length !== 7) {
      return NextResponse.json({ error: "بيانات جدول العمل غير مكتملة." }, { status: 400, headers: noStore });
    }
    const { data: staff, error: staffError } = await auth.admin.from("staff")
      .select("id").eq("id", staffId).eq("clinic_id", auth.clinicId).maybeSingle();
    if (staffError) throw staffError;
    if (!staff) return NextResponse.json({ error: "الطبيب غير موجود في هذا المركز." }, { status: 404, headers: noStore });

    const seen = new Set<number>();
    const rows = [];
    for (const item of schedule) {
      const weekday = Number(item?.weekday);
      const start = String(item?.start_time || "");
      const end = String(item?.end_time || "");
      const isWorking = item?.is_working === true;
      if (!WEEKDAYS.includes(weekday) || seen.has(weekday) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end <= start) {
        return NextResponse.json({ error: "راجع أيام العمل وساعات البداية والنهاية. يجب أن تكون النهاية بعد البداية." }, { status: 400, headers: noStore });
      }
      seen.add(weekday);
      rows.push({ clinic_id: auth.clinicId, staff_id: staffId, weekday, start_time: start, end_time: end, is_working: isWorking, updated_at: new Date().toISOString() });
    }
    if (seen.size !== 7) return NextResponse.json({ error: "يجب تحديد أيام الأسبوع السبعة." }, { status: 400, headers: noStore });

    const { error } = await auth.admin.from("doctor_working_hours")
      .upsert(rows, { onConflict: "staff_id,weekday" });
    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    console.error("[Doctor schedule PUT] Failed:", error);
    return NextResponse.json({ error: "تعذر حفظ جدول الطبيب حاليًا." }, { status: 500, headers: noStore });
  }
}
