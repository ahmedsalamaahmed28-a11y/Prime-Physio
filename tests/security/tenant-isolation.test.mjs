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
  assert.doesNotMatch(route, /staffQuery|\.ilike\(["\']email["\'], email\)/);
  assert.match(route, /\.in\(["']id["'], clinicIds\)/);
  assert.match(route, /\.in\(["']clinic_id["'], clinicIds\)/);
});

test("RLS clinic resolver validates the active claim against a real membership", async () => {
  const migration = await source("supabase/migrations/20261109224321_multi_center_ownership_and_tenant_context.sql");
  const start = migration.indexOf("create or replace function public.get_my_clinic_id()");
  const end = migration.indexOf("$function$;", start);
  const resolver = migration.slice(start, end);
  assert.match(resolver, /auth\.jwt\(\) -> 'app_metadata' ->> 'active_clinic_id'/);
  assert.match(resolver, /where o\.clinic_id = v_active_id/);
  assert.match(resolver, /where s\.clinic_id = v_active_id/);
  assert.match(resolver, /if v_count = 1 then return v_only_id/);
  assert.match(resolver, /return null/);
});

test("active clinic broadcasts update the browser's tenant context", async () => {
  const auth = await source("src/lib/auth.tsx");
  assert.match(auth, /auth_source === "nextauth-shadow"/);
  assert.match(auth, /active_clinic_id/);
  assert.match(auth, /sessionStorage\.setItem\("preferred_clinic_id", activeClinicId\)/);
  assert.match(auth, /sync active clinic across tabs/);
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

test("core clinic read policies remain scoped to the active clinic", async () => {
  const migration = await source("supabase/migrations/20261120025936_independent_view_permissions_20261120.sql");
  for (const policy of ["patients_clinic_select", "appointments_clinic_select", "invoices_clinic_select", "sessions_clinic_select"]) {
    const start = migration.indexOf(`create policy ${policy}`);
    assert.notEqual(start, -1, `${policy} must remain present in the permissions migration`);
    const block = migration.slice(start, start + 900);
    assert.match(block, /clinic_id = public\.get_my_clinic_id\(\)/, `${policy} must scope by the trusted active clinic`);
  }
});

test("isolated PostgreSQL harness tests real tenant RLS semantics and rolls back", async () => {
  const sql = await source("tests/security/tenant-isolation-rls.sql");
  assert.match(sql, /CREATE POLICY auth_session_expiry_guard ON public\.patients\s+AS RESTRICTIVE/);
  assert.match(sql, /public\.get_my_clinic_id\(\)/);
  assert.match(sql, /public\.assert_tenant_crud/);
  assert.match(sql, /Cross-tenant insert was allowed/);
  assert.match(sql, /Cross-tenant update was allowed/);
  assert.match(sql, /Cross-tenant delete was allowed/);
  assert.match(sql, /Creating the second center changed the original Balance fixture counts/);
  assert.match(sql, /ROLLBACK;/);
});

test("service-role attachment signing and deletion validate clinic/patient storage paths", async () => {
  const patientAttachments = await source("src/app/api/patients/[id]/attachments/route.ts");
  const backupAttachments = await source("src/app/api/backup/attachments/route.ts");
  assert.match(patientAttachments, /item\.file_path\.startsWith\(expectedPrefix\)/);
  assert.match(patientAttachments, /attachment\.file_path\.startsWith\(\`\$\{auth\.clinicId\}\/\$\{id\}\/\`\)/);
  assert.match(backupAttachments, /validPatientIds\.has\(item\.patient_id\)/);
  assert.match(backupAttachments, /item\.file_path\.startsWith\(expectedPrefix\)/);
});

test("A/B integration runner exercises disposable patient CRUD and refuses production", async () => {
  const script = await source("scripts/check-tenant-isolation.mjs");
  assert.match(script, /productionProjectRef/);
  assert.match(script, /projectRef === productionProjectRef/);
  assert.match(script, /createPatient\(tokenA/);
  assert.match(script, /updatePatient\(tokenA/);
  assert.match(script, /deletePatient\(tokenA/);
  assert.match(script, /cross-tenant update/);
  assert.match(script, /Tenant A cannot delete Tenant B/);
  assert.match(script, /Tenant B cannot delete Tenant A/);
  assert.match(script, /createdFixtures/);
});

test("private patient storage remains clinic-folder scoped", async () => {
  const migration = await source("supabase/migrations/20261120025936_independent_view_permissions_20261120.sql");
  assert.match(migration, /patient_files_clinic_read[\s\S]*?storage\.foldername\(name\)\)\[1\] = \(public\.get_my_clinic_id\(\)\)::text/);
  assert.match(migration, /patient_files_clinic_upload[\s\S]*?p\.clinic_id = public\.get_my_clinic_id\(\)/);
});
