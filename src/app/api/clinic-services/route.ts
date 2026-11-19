import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStore = { "Cache-Control": "no-store, private" };

const DEFAULT_SERVICES = [
  { name: "تقييم", name_en: "Initial Assessment", duration_minutes: 30 },
  { name: "إعادة تقييم", name_en: "Reassessment", duration_minutes: 30 },
  { name: "جلسة علاج طبيعي", name_en: "Physiotherapy Session", duration_minutes: 60 },
  { name: "علاج يدوي", name_en: "Manual Therapy", duration_minutes: 30 },
  { name: "علاج وظيفي", name_en: "Occupational Therapy", duration_minutes: 60 },
];

function validService(body: any) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const nameEn = typeof body?.name_en === "string" ? body.name_en.trim() : "";
  const duration = Number(body?.duration_minutes);
  const price = body?.price === null || body?.price === undefined || body?.price === "" ? null : Number(body.price);
  if (!name || name.length > 120 || nameEn.length > 120) return null;
  if (!Number.isInteger(duration) || duration < 5 || duration > 600) return null;
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 10000000)) return null;
  return { name, name_en: nameEn || null, duration_minutes: duration, price, is_active: true };
}

async function authorizedClinic(req: NextRequest, permission: string) {
  const auth = await getClinicContext(req);
  if ("response" in auth) return { response: auth.response } as const;
  if (!hasStaffPermission(auth.staff, permission)) {
    return { response: NextResponse.json({ error: "ليس لديك الصلاحية المطلوبة" }, { status: 403, headers: noStore }) } as const;
  }
  return { clinicId: auth.clinicId, admin: auth.admin } as const;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizedClinic(req, "view_invoices");
    if ("response" in auth) return auth.response;
    if (!auth.clinicId) return NextResponse.json({ error: "Clinic not selected" }, { status: 403, headers: noStore });
    const admin = auth.admin;
    const { data, error } = await admin.from("clinic_services")
      .select("id, name, name_en, duration_minutes, price, is_active")
      .eq("clinic_id", auth.clinicId).order("name", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ services: data || [] }, { headers: noStore });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : 403;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Forbidden" }, { status, headers: noStore });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizedClinic(req, "manage_settings");
    if ("response" in auth) return auth.response;
    if (!auth.clinicId) return NextResponse.json({ error: "Clinic not selected" }, { status: 403, headers: noStore });
    const body = await req.json().catch(() => null);
    const admin = auth.admin;

    if (body?.seedDefaults === true) {
      const { data: existing, error: lookupError } = await admin.from("clinic_services")
        .select("id").eq("clinic_id", auth.clinicId).limit(1);
      if (lookupError) throw lookupError;
      if ((existing || []).length > 0) {
        const { data, error } = await admin.from("clinic_services")
          .select("id, name, name_en, duration_minutes, price, is_active")
          .eq("clinic_id", auth.clinicId).order("name", { ascending: true });
        if (error) throw error;
        return NextResponse.json({ services: data || [], seeded: false }, { headers: noStore });
      }
      const { data, error } = await admin.from("clinic_services")
        .insert(DEFAULT_SERVICES.map((service) => ({ ...service, clinic_id: auth.clinicId, price: null, is_active: true })))
        .select("id, name, name_en, duration_minutes, price, is_active");
      if (error) throw error;
      return NextResponse.json({ services: data || [], seeded: true }, { status: 201, headers: noStore });
    }

    const service = validService(body);
    if (!service) return NextResponse.json({ error: "Invalid service details" }, { status: 400, headers: noStore });
    const { data, error } = await admin.from("clinic_services")
      .insert({ ...service, clinic_id: auth.clinicId })
      .select("id, name, name_en, duration_minutes, price, is_active").single();
    if (error) throw error;
    return NextResponse.json({ service: data }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("[Clinic Services POST] Failed:", error);
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : /forbidden|permission|صلاحية/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Unable to save clinic service" }, { status, headers: noStore });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizedClinic(req, "manage_settings");
    if ("response" in auth) return auth.response;
    if (!auth.clinicId) return NextResponse.json({ error: "Clinic not selected" }, { status: 403, headers: noStore });
    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : "";
    const service = validService(body);
    if (!id || !service) return NextResponse.json({ error: "Invalid service details" }, { status: 400, headers: noStore });
    const { data, error } = await auth.admin.from("clinic_services")
      .update(service).eq("id", id).eq("clinic_id", auth.clinicId)
      .select("id, name, name_en, duration_minutes, price, is_active").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Service not found" }, { status: 404, headers: noStore });
    return NextResponse.json({ service: data }, { headers: noStore });
  } catch (error) {
    console.error("[Clinic Services PATCH] Failed:", error);
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : /forbidden|permission|صلاحية/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Unable to update clinic service" }, { status, headers: noStore });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizedClinic(req, "manage_settings");
    if ("response" in auth) return auth.response;
    if (!auth.clinicId) return NextResponse.json({ error: "Clinic not selected" }, { status: 403, headers: noStore });
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) return NextResponse.json({ error: "Service ID is required" }, { status: 400, headers: noStore });
    const { data, error } = await auth.admin.from("clinic_services")
      .delete().eq("id", id).eq("clinic_id", auth.clinicId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Service not found" }, { status: 404, headers: noStore });
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    console.error("[Clinic Services DELETE] Failed:", error);
    const message = error instanceof Error ? error.message : "";
    const status = /unauthorized/i.test(message) ? 401 : /forbidden|permission|صلاحية/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Unable to delete clinic service" }, { status, headers: noStore });
  }
}
