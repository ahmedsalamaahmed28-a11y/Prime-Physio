import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { hasStaffPermission } from "@/lib/server/staff-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const headers = {
  "Cache-Control": "no-store, private, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(req: NextRequest) {
  try {
    const auth = await getClinicContext(req);
    if ("response" in auth) return auth.response;
    if (!hasStaffPermission(auth.staff, "export_data")) {
      return NextResponse.json({ error: "ليس لديك صلاحية تصدير مرفقات المرضى" }, { status: 403, headers });
    }
    const admin = auth.admin;
    const { data, error } = await admin
      .from("patient_attachments")
      .select("id, clinic_id, patient_id, file_path, file_name, mime_type, file_size, category, notes, created_at")
      .eq("clinic_id", auth.clinicId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Export attachment lookup failed:", error.message);
      return NextResponse.json({ error: "Unable to list clinic attachments." }, { status: 500, headers });
    }

    const attachments = [];
    for (const item of data || []) {
      const { data: signed, error: signError } = await admin.storage
        .from("patient-files")
        .createSignedUrl(item.file_path, 3600);

      if (signError || !signed?.signedUrl) {
        console.error("Export attachment signing failed:", item.id, signError?.message);
        return NextResponse.json({ error: "One or more patient files could not be prepared. No partial file list was returned." }, { status: 500, headers });
      }

      attachments.push({
        id: item.id,
        patientId: item.patient_id,
        fileName: item.file_name,
        mimeType: item.mime_type,
        fileSize: item.file_size,
        category: item.category,
        notes: item.notes,
        createdAt: item.created_at,
        url: signed.signedUrl,
      });
    }

    return NextResponse.json({ attachments, count: attachments.length }, { status: 200, headers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Export attachment preparation failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? "Unable to prepare patient attachments." : message }, { status, headers });
  }
}
