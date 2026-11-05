import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireRole } from "../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 1000;

// Only tenant-owned clinical and operational tables are exported.
// Authentication internals, platform-wide data, and prior backup blobs are excluded.
const CLINIC_TABLES = [
  "appointments",
  "assessments",
  "audit_logs",
  "balance_tests",
  "branches",
  "clinic_services",
  "clinic_settings",
  "clinical_protocols",
  "daily_reports",
  "discharges",
  "executive_reports",
  "exercises",
  "gait_tests",
  "hr_attendance",
  "insurance_claims",
  "invoices",
  "leads",
  "marketing_campaigns",
  "mmt_assessments",
  "notifications",
  "patient_evaluations",
  "patient_nutrition",
  "patient_programs",
  "patient_risks",
  "patients",
  "payroll_drafts",
  "peer_reviews",
  "progress_tracking",
  "protocol_licenses",
  "recovery_logs",
  "referrals",
  "rom_assessments",
  "sessions",
  "soap_notes",
  "special_tests",
  "staff",
  "subscriptions",
  "treatment_plans",
  "waitlist",
] as const;

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, private, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": 'attachment; filename="prime-physio-clinic-backup.json"',
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin"]);

    if (!user.clinicId) {
      return NextResponse.json(
        { error: "Clinic Admin access required." },
        { status: 403, headers: noStoreHeaders() },
      );
    }

    const admin = getAdminClient();

    const { data: clinic, error: clinicError } = await admin
      .from("clinics")
      .select("id, name, name_en, admin_email, phone, address, city, country, logo_url, status, is_active, slug, created_at, updated_at")
      .eq("id", user.clinicId)
      .maybeSingle();

    if (clinicError || !clinic) {
      return NextResponse.json(
        { error: "Unable to verify clinic for backup." },
        { status: 500, headers: noStoreHeaders() },
      );
    }

    const tables: Record<string, unknown[]> = {};
    const tableCounts: Record<string, number> = {};

    for (const tableName of CLINIC_TABLES) {
      const rows: unknown[] = [];
      let offset = 0;

      while (true) {
        const { data, error } = await admin
          .from(tableName)
          .select("*")
          .eq("clinic_id", user.clinicId)
          .order("id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          console.error("Clinic backup table export failed:", tableName, error.message);
          return NextResponse.json(
            { error: "Backup could not be completed. No partial backup was returned." },
            { status: 500, headers: noStoreHeaders() },
          );
        }

        const page = data ?? [];
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      tables[tableName] = rows;
      tableCounts[tableName] = rows.length;
    }

    const totalRows = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);
    const backup = {
      format: "prime-physio-clinic-backup",
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      clinicId: user.clinicId,
      scope: "clinic-owned public tables only; excludes Auth users, Storage objects, schema, and platform-wide records",
      clinic,
      tableCounts,
      totalRows,
      tables,
    };

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        ...noStoreHeaders(),
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="prime-physio-backup-${user.clinicId}-${date}.json"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backup failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json(
      { error: status === 500 ? "Backup could not be completed." : message },
      { status, headers: noStoreHeaders() },
    );
  }
}
