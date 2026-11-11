import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuthOnly } from "../../utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthOnly(req);
    const email = session.email.toLowerCase().trim();
    const admin = getAdminClient();

    const { data: ownerships, error: ownershipError } = await admin
      .from("clinic_owners")
      .select("clinic_id, created_at")
      .eq("owner_email", email)
      .order("created_at", { ascending: true });

    if (ownershipError) throw ownershipError;
    const clinicIds = [...new Set((ownerships || []).map((item) => item.clinic_id).filter(Boolean))];

    if (clinicIds.length === 0) {
      return NextResponse.json({ centers: [] }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const [{ data: clinics, error: clinicsError }, { data: branches, error: branchesError }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
      admin.from("clinics").select("id, name, slug, status, created_at, phone, address, logo_url").in("id", clinicIds),
      admin.from("branches").select("id, clinic_id, short_name, full_name, slug, logo_url, status").in("clinic_id", clinicIds),
      admin.from("subscriptions").select("clinic_id, plan_name, status, end_date, created_at").in("clinic_id", clinicIds).order("created_at", { ascending: false }),
    ]);

    if (clinicsError || branchesError || subscriptionsError) {
      throw clinicsError || branchesError || subscriptionsError;
    }

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const tomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const [appointmentRows, staffRows, serviceRows] = await Promise.all([
      admin.from("appointments").select("clinic_id, starts_at").in("clinic_id", clinicIds).gte("starts_at", monthStart).lt("starts_at", tomorrowStart),
      admin.from("staff").select("clinic_id, status").in("clinic_id", clinicIds),
      admin.from("clinic_services").select("clinic_id").in("clinic_id", clinicIds).eq("is_active", true),
    ]);
    if (appointmentRows.error || staffRows.error || serviceRows.error) {
      throw appointmentRows.error || staffRows.error || serviceRows.error;
    }

    const centers = (clinics || []).map((clinic) => {
      const branch = (branches || []).find((item) => item.clinic_id === clinic.id) || null;
      const subscription = (subscriptions || []).find((item) => item.clinic_id === clinic.id) || null;
      return {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        publicUrl: clinic.slug ? `/clinic/${clinic.slug}` : null,
        loginUrl: "/dashboard",
        phone: clinic.phone || "",
        address: clinic.address || "",
        todayAppointments: (appointmentRows.data || []).filter((row) => row.clinic_id === clinic.id && row.starts_at >= todayStart && row.starts_at < tomorrowStart).length,
        monthAppointments: (appointmentRows.data || []).filter((row) => row.clinic_id === clinic.id).length,
        activeUsers: (staffRows.data || []).filter((row) => row.clinic_id === clinic.id && ["active", "نشط", "نشطة"].includes((row.status || "").toLowerCase())).length,
        setupProgress: (() => {
          const branch = (branches || []).find((item) => item.clinic_id === clinic.id) || null;
          const subscription = (subscriptions || []).find((item) => item.clinic_id === clinic.id) || null;
          const checks = [!!clinic.name, !!clinic.slug, !!(branch?.logo_url || clinic.logo_url), !!clinic.phone, !!clinic.address, subscription?.status === "active", (serviceRows.data || []).some((row) => row.clinic_id === clinic.id)];
          return { completed: checks.filter(Boolean).length, total: checks.length };
        })(),
        status: clinic.status,
        createdAt: clinic.created_at,
        logoUrl: branch?.logo_url || null,
        planName: subscription?.plan_name || null,
        subscriptionStatus: subscription?.status || "pending",
        subscriptionEndDate: subscription?.end_date || null,
      };
    });

    return NextResponse.json({ centers }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unauthorized/i.test(message)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[CenterManagement] Center list failed:", error);
    return NextResponse.json({ error: "تعذر تحميل المراكز حاليًا." }, { status: 500 });
  }
}


export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuthOnly(req);
    const body = await req.json();
    const clinicId = String(body.clinicId || "");
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();
    if (!clinicId || !name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
      return NextResponse.json({ error: "يرجى إدخال اسم ورابط صحيحين للمركز." }, { status: 400 });
    }
    const admin = getAdminClient();
    const { data: owner, error: ownerError } = await admin.from("clinic_owners").select("clinic_id").eq("clinic_id", clinicId).eq("owner_email", session.email.toLowerCase().trim()).maybeSingle();
    if (ownerError) throw ownerError;
    if (!owner) return NextResponse.json({ error: "غير مصرح لك بتعديل هذا المركز." }, { status: 403 });
    const { data, error } = await admin.from("clinics").update({ name, slug, phone, address, updated_at: new Date().toISOString() }).eq("id", clinicId).select("id,name,slug,phone,address").single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "هذا الرابط مستخدم بالفعل. اختر رابطًا آخر." }, { status: 409 });
      throw error;
    }

    return NextResponse.json({ center: { id: data.id, name: data.name, slug: data.slug, phone: data.phone, address: data.address, publicUrl: `/clinic/${data.slug}` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unauthorized/i.test(message)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[CenterManagement] Center update failed:", error);
    return NextResponse.json({ error: "تعذر حفظ بيانات المركز حاليًا." }, { status: 500 });
  }
}
