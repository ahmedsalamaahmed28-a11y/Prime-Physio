import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_STATUSES = new Set(["انتظار", "مدفوع", "ملغي"]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getClinicContext(request);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "بيانات التعديل غير صالحة" }, { status: 400 });
    }

    const keys = Object.keys(body);
    if (keys.length !== 1 || !["status", "amount"].includes(keys[0])) {
      return NextResponse.json({ error: "يسمح بتعديل حالة الفاتورة أو قيمتها كلٌ على حدة" }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: "حالة الفاتورة غير صالحة" }, { status: 400 });
      }
      const requiredPermission = body.status === "ملغي" ? "refund_invoice" : "create_invoice";
      if (!hasStaffPermission(auth.staff, requiredPermission)) {
        return NextResponse.json({ error: "ليس لديك صلاحية تغيير حالة الفاتورة" }, { status: 403 });
      }
      updates.status = body.status;
    }

    if (Object.prototype.hasOwnProperty.call(body, "amount")) {
      if (!hasStaffPermission(auth.staff, "apply_discount")) {
        return NextResponse.json({ error: "ليس لديك صلاحية تعديل قيمة الفاتورة" }, { status: 403 });
      }
      if (typeof body.amount !== "string" || !body.amount.trim() || body.amount.length > 64) {
        return NextResponse.json({ error: "قيمة الفاتورة غير صالحة" }, { status: 400 });
      }
      const normalized = body.amount
        .replace(/[٠-٩]/g, (digit: string) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[٬,]/g, "")
        .replace(/[٫]/g, ".")
        .replace(/[^0-9.-]/g, "");
      const numericAmount = Number(normalized);
      if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        return NextResponse.json({ error: "يجب أن تكون قيمة الفاتورة رقمًا غير سالب" }, { status: 400 });
      }
      updates.amount = body.amount.trim();
    }

    const { data, error } = await auth.admin
      .from("invoices")
      .update(updates)
      .eq("clinic_id", auth.clinicId)
      .eq("id", id)
      .select("id,status,amount")
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "الفاتورة غير موجودة في العيادة الحالية" }, { status: 404 });

    return NextResponse.json({ success: true, invoice: data }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    console.error("[Invoices API] Update failed:", error);
    return NextResponse.json({ error: "تعذر حفظ بيانات الفاتورة" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getClinicContext(request);
  if ("response" in auth) return auth.response;

  if (!hasStaffPermission(auth.staff, "delete_invoice")) {
    return NextResponse.json({ error: "ليس لديك صلاحية حذف الفاتورة" }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const { data, error } = await auth.admin
      .from("invoices")
      .delete()
      .eq("clinic_id", auth.clinicId)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "الفاتورة غير موجودة في العيادة الحالية" }, { status: 404 });

    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    console.error("[Invoices API] Delete failed:", error);
    return NextResponse.json({ error: "تعذر حذف الفاتورة" }, { status: 500 });
  }
}
