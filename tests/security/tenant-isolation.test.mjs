import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("active clinic changes only through authenticated POST", async () => {
  const route = await source("src/app/api/auth/supabase-session/route.ts");
  const getBlock = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
  const postBlock = route.slice(route.indexOf("export async function POST"));
  assert.doesNotMatch(getBlock, /searchParams\.get\(["']clinic_id/);
  assert.match(postBlock, /body\?\.clinicId/);
  assert.match(route, /\.from\(["']clinic_owners["']\)[\s\S]*?\.eq\(["']clinic_id["'], requestedClinicId\)/);
  assert.match(route, /\.from\(["']staff["']\)[\s\S]*?\.eq\(["']clinic_id["'], requestedClinicId\)/);
  assert.match(route, /if \(!ownerMembership && !staffMembership\)/);
  assert.match(route, /active_clinic_id: requestedClinicId/);
});

test("browser tenant switch sends the selected clinic in POST body", async () => {
  const auth = await source("src/lib/auth.tsx");
  assert.match(auth, /method: preferredClinicId \? "POST" : "GET"/);
  assert.match(auth, /JSON\.stringify\(\{ clinicId: preferredClinicId \}\)/);
  assert.doesNotMatch(auth, /supabase-session\?clinic_id=/);
});

test("central overview is restricted to explicit clinic owners", async () => {
  const route = await source("src/app/api/overview/route.ts");
  assert.match(route, /central owner dashboard/);
  assert.match(route, /\.from\(["']clinic_owners["']\)/);
  assert.match(route, /if \(!clinicIds\.length\)/);
  assert.doesNotMatch(route, /\.from\(["']staff["']\)/);
  assert.match(route, /\.in\(["']id["'], clinicIds\)/);
  assert.match(route, /\.in\(["']clinic_id["'], clinicIds\)/);
});

test("tenant-facing APIs use a server-verified active clinic context", async () => {
  const paths = [
    "src/app/api/patients/route.ts",
    "src/app/api/patients/[id]/route.ts",
    "src/app/api/patients/[id]/clinical/route.ts",
    "src/app/api/patients/[id]/attachments/route.ts",
    "src/app/api/invoices/route.ts",
    "src/app/api/invoices/[id]/route.ts",
    "src/app/api/calendar/route.ts",
    "src/app/api/analytics/route.ts",
    "src/app/api/backup/route.ts",
    "src/app/api/backup/attachments/route.ts",
    "src/app/api/clinic-services/route.ts",
    "src/app/api/doctors/schedule/route.ts",
    "src/app/api/group-bookings/route.ts",
    "src/app/api/messages/route.ts",
    "src/app/api/messages/[conversationId]/route.ts",
    "src/app/api/report/route.ts",
    "src/app/api/upload/logo/route.ts",
    "src/app/api/staff/invite/route.ts",
    "src/app/api/subscription/usage/route.ts",
    "src/app/api/subscription/check-limit/route.ts",
  ];
  for (const path of paths) {
    const text = await source(path);
    assert.match(
      text,
      /getClinicContext\s*\(|requireRole\s*\(/,
      `${path} must authenticate and resolve a verified clinic membership`,
    );
    assert.match(
      text,
      /clinicId|clinic_id/,
      `${path} must use a clinic scope`,
    );
  }
});

test("independent center provisioning creates a fresh tenant without copying patient data", async () => {
  const migration = await source("supabase/migrations/20261109224434_create_independent_center_provisioning.sql");
  assert.match(migration, /insert into public\.clinics[\s\S]*?returning id into v_clinic_id/);
  assert.match(migration, /insert into public\.branches\s*\(\s*clinic_id/);
  assert.match(migration, /insert into public\.clinic_owners\s*\(clinic_id, owner_email\)/);
  assert.match(migration, /insert into public\.clinic_settings\s*\(user_id, clinic_id/);
  assert.doesNotMatch(migration, /insert into public\.(patients|appointments|invoices|sessions)\b/i);
});

test("private patient storage remains clinic-folder scoped", async () => {
  const migration = await source("supabase/migrations/20261120025936_independent_view_permissions_20261120.sql");
  assert.match(migration, /patient_files_clinic_read[\s\S]*?storage\.foldername\(name\)\)\[1\] = \(public\.get_my_clinic_id\(\)\)::text/);
  assert.match(migration, /patient_files_clinic_upload[\s\S]*?p\.clinic_id = get_my_clinic_id\(\)/);
});
