import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.SUPABASE_URL || process.env.API_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || "";
if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error("Local Supabase URL, anon key, and service-role key are required.");
}
const parsedUrl = new URL(supabaseUrl);
if (!["127.0.0.1", "localhost"].includes(parsedUrl.hostname)) {
  throw new Error("Refusing to run local tenant tests against any non-local Supabase host.");
}
const baseUrl = supabaseUrl.replace(/\/$/, "");
const headers = (token, extra = {}) => ({
  apikey: anonKey,
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
  ...extra,
});

async function readBody(response) {
  const raw = await response.text();
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw; }
}

async function adminRequest(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: headers(serviceKey, body ? { "Content-Type": "application/json" } : {}),
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const payload = await readBody(response);
  if (!response.ok) {
    throw new Error(`Local Supabase admin request failed (${method} ${path}) with HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return payload;
}

async function restRequest(token, method, table, query, body) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?${query}`, {
    method,
    headers: headers(token, {
      ...(body ? { "Content-Type": "application/json" } : {}),
      Prefer: "return=representation",
    }),
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  return { response, payload: await readBody(response) };
}

function assert(label, condition) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`PASS: ${label}`);
}

async function createTestUser(label) {
  const suffix = randomUUID().slice(0, 10);
  const email = `prime-tenant-${label.toLowerCase()}-${suffix}@example.test`;
  const password = `PrimeTest!${randomUUID().slice(0, 12)}`;
  const user = await adminRequest("POST", "/auth/v1/admin/users", {
    email, password, email_confirm: true, app_metadata: {},
    user_metadata: { full_name: `Synthetic tenant ${label}` },
  });
  if (!user?.id) throw new Error(`Could not create synthetic Auth user ${label}.`);
  await adminRequest("POST", "/rest/v1/auth_accounts", {
    email, password_hash: "local-ci-only-not-a-real-password-hash",
    verified: true, name: `Synthetic tenant ${label}`, role: "admin", provider: "email",
  });
  return { id: user.id, email, password };
}

async function createCenter(user, label) {
  const slug = `ci-${label.toLowerCase()}-${randomUUID().slice(0, 8)}`;
  const result = await adminRequest("POST", "/rest/v1/rpc/create_independent_center", {
    p_email: user.email,
    p_plan_id: "free",
    p_short_name: `CI ${label}`,
    p_full_name: `Synthetic isolation center ${label}`,
    p_slug: slug,
    p_logo_url: null,
    p_specializations: [],
  });
  if (!result?.success || !result?.clinicId) {
    throw new Error(`Independent center provisioning failed for synthetic tenant ${label}: ${JSON.stringify(result)}`);
  }
  return result.clinicId;
}

async function setActiveClinic(user, clinicId) {
  await adminRequest("PUT", `/auth/v1/admin/users/${user.id}`, {
    app_metadata: { active_clinic_id: clinicId },
  });
}

async function signIn(user) {
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
    signal: AbortSignal.timeout(20000),
  });
  const payload = await readBody(response);
  if (!response.ok || !payload?.access_token) {
    throw new Error(`Synthetic tenant sign-in failed for ${user.email} with HTTP ${response.status}.`);
  }
  return payload.access_token;
}

const tableDefinitions = {
  patients: {
    select: "id,clinic_id,nameAr,phone",
    payload: ({ clinicId, patientId, label }) => ({
      id: patientId || `${clinicId.slice(0, 4).toUpperCase()}-PAT-${randomUUID().slice(0, 8).toUpperCase()}`,
      clinic_id: clinicId, nameAr: label, phone: "01000000000",
    }),
    patch: { nameAr: "Synthetic patient updated" },
    updatedField: "nameAr",
  },
  invoices: {
    select: "id,clinic_id,patient_id,amount,status",
    payload: ({ clinicId, patientId, label }) => ({
      id: `${clinicId.slice(0, 4).toUpperCase()}-INV-${randomUUID().slice(0, 8).toUpperCase()}`,
      clinic_id: clinicId, patient_id: patientId, patient_name: label,
      description: "Synthetic tenant isolation invoice", amount: "100",
      status: "انتظار", payment_method: "test", date: "2026-11-20",
    }),
    patch: { amount: "211" },
    updatedField: "amount",
  },
  appointments: {
    select: "id,clinic_id,patient_id,appointment_type,status",
    payload: ({ clinicId, patientId }) => ({
      id: `${clinicId.slice(0, 4).toUpperCase()}-APT-${randomUUID().slice(0, 8).toUpperCase()}`,
      clinic_id: clinicId, patient_id: patientId, appointment_type: "isolation-test",
      date: "2026-11-20", time: "10:00", start_time: "10:00", end_time: "11:00",
      status: "مؤكد",
    }),
    patch: { appointment_type: "isolation-updated" },
    updatedField: "appointment_type",
  },
  sessions: {
    select: "id,clinic_id,patient_id,diagnosis",
    payload: ({ clinicId, patientId }) => ({
      clinic_id: clinicId, patient_id: patientId,
      date: "2026-11-20", diagnosis: "Synthetic isolation session",
    }),
    patch: { diagnosis: "Synthetic session updated" },
    updatedField: "diagnosis",
  },
};

async function createRow(token, table, clinicId, patientId, label) {
  const definition = tableDefinitions[table];
  const body = definition.payload({ clinicId, patientId, label });
  const { response, payload } = await restRequest(token, "POST", table, `select=${encodeURIComponent(definition.select)}`, body);
  if (!response.ok || !Array.isArray(payload) || payload.length !== 1) {
    throw new Error(`Could not create own synthetic ${table} row (HTTP ${response.status}): ${JSON.stringify(payload).slice(0, 400)}`);
  }
  return payload[0];
}

async function attemptCreate(token, table, clinicId, patientId, label) {
  const definition = tableDefinitions[table];
  const body = definition.payload({ clinicId, patientId, label });
  const { response, payload } = await restRequest(token, "POST", table, `select=${encodeURIComponent(definition.select)}`, body);
  if (response.ok && Array.isArray(payload) && payload[0]?.id) {
    await adminRequest("DELETE", `/rest/v1/${table}?id=eq.${encodeURIComponent(payload[0].id)}`, undefined).catch(() => {});
    return false;
  }
  return response.status === 401 || response.status === 403;
}

async function getRow(token, table, id) {
  const { response, payload } = await restRequest(
    token, "GET", table,
    new URLSearchParams({ select: tableDefinitions[table].select, id: `eq.${id}`, limit: "1" }).toString(),
  );
  if (!response.ok || !Array.isArray(payload)) throw new Error(`Could not read synthetic ${table} fixture (HTTP ${response.status}).`);
  return payload[0] || null;
}

async function updateRow(token, table, id, patch) {
  const { response, payload } = await restRequest(
    token, "PATCH", table,
    new URLSearchParams({ id: `eq.${id}`, select: tableDefinitions[table].select }).toString(),
    patch,
  );
  if (!response.ok || !Array.isArray(payload)) throw new Error(`Update request for ${table} failed with HTTP ${response.status}.`);
  return payload;
}

async function deleteRow(token, table, id) {
  const { response, payload } = await restRequest(
    token, "DELETE", table,
    new URLSearchParams({ id: `eq.${id}`, select: "id" }).toString(),
  );
  if (!response.ok || !Array.isArray(payload)) throw new Error(`Delete request for ${table} failed with HTTP ${response.status}.`);
  return payload;
}

async function countClinicRows(table, clinicId) {
  const { response, payload } = await restRequest(
    serviceKey, "GET", table,
    new URLSearchParams({ select: "id", clinic_id: `eq.${clinicId}`, limit: "1000" }).toString(),
  );
  if (!response.ok || !Array.isArray(payload)) throw new Error(`Could not count synthetic ${table} rows for clinic.`);
  return payload.length;
}

async function uploadPatientFile(token, clinicId, patientId, label) {
  const path = `${clinicId}/${patientId}/${label}-${randomUUID().slice(0, 8)}.pdf`;
  const response = await fetch(`${baseUrl}/storage/v1/object/patient-files/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: headers(token, { "Content-Type": "application/pdf", "x-upsert": "false" }),
    body: Buffer.from("%PDF-1.4\n% Synthetic tenant isolation fixture\n%%EOF"),
    signal: AbortSignal.timeout(20000),
  });
  return { response, path };
}

async function downloadPatientFile(token, path) {
  return fetch(`${baseUrl}/storage/v1/object/authenticated/patient-files/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "GET",
    headers: headers(token),
    signal: AbortSignal.timeout(20000),
  });
}

async function main() {
  const userA = await createTestUser("A");
  const userB = await createTestUser("B");

  const clinicA = await createCenter(userA, "Balance-A");
  await setActiveClinic(userA, clinicA);
  let tokenA = await signIn(userA);

  const baseRowsA = {};
  baseRowsA.patients = await createRow(tokenA, "patients", clinicA, null, "Synthetic Balance patient A");
  for (const table of ["invoices", "appointments", "sessions"]) {
    baseRowsA[table] = await createRow(tokenA, table, clinicA, baseRowsA.patients.id, `Synthetic Balance ${table} A`);
  }

  const beforeCounts = {};
  for (const table of Object.keys(tableDefinitions)) beforeCounts[table] = await countClinicRows(table, clinicA);

  // Create the owner's second center after Balance already contains synthetic records.
  const clinicA2 = await createCenter(userA, "Balance-Second");
  assert("second center receives a different clinic_id", clinicA2 !== clinicA);
  const afterCounts = {};
  for (const table of Object.keys(tableDefinitions)) afterCounts[table] = await countClinicRows(table, clinicA);
  assert("creating center two does not change Balance row counts", JSON.stringify(beforeCounts) === JSON.stringify(afterCounts));
  for (const table of Object.keys(tableDefinitions)) {
    assert(`new center starts with zero ${table} rows`, (await countClinicRows(table, clinicA2)) === 0);
  }

  const clinicB = await createCenter(userB, "Tenant-B");
  await setActiveClinic(userB, clinicB);
  const tokenB = await signIn(userB);
  const baseRowsB = {};
  baseRowsB.patients = await createRow(tokenB, "patients", clinicB, null, "Synthetic tenant B patient");
  for (const table of ["invoices", "appointments", "sessions"]) {
    baseRowsB[table] = await createRow(tokenB, table, clinicB, baseRowsB.patients.id, `Synthetic tenant B ${table}`);
  }

  // Multiple memberships without an active claim must fail closed.
  await setActiveClinic(userA, null);
  const noActiveToken = await signIn(userA);
  assert("multi-center owner without active clinic sees no patient rows", !(await getRow(noActiveToken, "patients", baseRowsA.patients.id)));

  // A forged active claim for a clinic the owner does not belong to must also fail closed.
  await setActiveClinic(userA, clinicB);
  const invalidClaimToken = await signIn(userA);
  assert("non-member active clinic claim grants no access", !(await getRow(invalidClaimToken, "patients", baseRowsA.patients.id)));

  await setActiveClinic(userA, clinicA);
  tokenA = await signIn(userA);
  assert("Balance patient remains visible in its original clinic", Boolean(await getRow(tokenA, "patients", baseRowsA.patients.id)));

  for (const table of Object.keys(tableDefinitions)) {
    const aRow = baseRowsA[table];
    const bRow = baseRowsB[table];
    assert(`A reads own ${table}`, Boolean(await getRow(tokenA, table, aRow.id)));
    assert(`A cannot read B ${table}`, !(await getRow(tokenA, table, bRow.id)));
    assert(`B reads own ${table}`, Boolean(await getRow(tokenB, table, bRow.id)));
    assert(`B cannot read A ${table}`, !(await getRow(tokenB, table, aRow.id)));

    const newA = await createRow(tokenA, table, clinicA, baseRowsA.patients.id, `Synthetic A new ${table}`);
    const newB = await createRow(tokenB, table, clinicB, baseRowsB.patients.id, `Synthetic B new ${table}`);
    assert(`B cannot read newly created A ${table}`, !(await getRow(tokenB, table, newA.id)));
    assert(`A cannot read newly created B ${table}`, !(await getRow(tokenA, table, newB.id)));

    const updatedA = await updateRow(tokenA, table, newA.id, tableDefinitions[table].patch);
    const updatedB = await updateRow(tokenB, table, newB.id, tableDefinitions[table].patch);
    assert(`A can update own ${table}`, updatedA.length === 1);
    assert(`B can update own ${table}`, updatedB.length === 1);

    const crossInsertA = await attemptCreate(tokenA, table, clinicB, baseRowsB.patients.id, `Unauthorized A into B ${table}`);
    const crossInsertB = await attemptCreate(tokenB, table, clinicA, baseRowsA.patients.id, `Unauthorized B into A ${table}`);
    assert(`A cannot insert into B ${table}`, crossInsertA);
    assert(`B cannot insert into A ${table}`, crossInsertB);

    const crossUpdateA = await updateRow(tokenA, table, bRow.id, tableDefinitions[table].patch);
    const crossUpdateB = await updateRow(tokenB, table, aRow.id, tableDefinitions[table].patch);
    assert(`A cannot update B ${table}`, crossUpdateA.length === 0);
    assert(`B cannot update A ${table}`, crossUpdateB.length === 0);

    const crossDeleteA = await deleteRow(tokenA, table, bRow.id);
    const crossDeleteB = await deleteRow(tokenB, table, aRow.id);
    assert(`A cannot delete B ${table}`, crossDeleteA.length === 0);
    assert(`B cannot delete A ${table}`, crossDeleteB.length === 0);
    assert(`B fixture remains after A cross-delete attempt for ${table}`, Boolean(await getRow(tokenB, table, bRow.id)));
    assert(`A fixture remains after B cross-delete attempt for ${table}`, Boolean(await getRow(tokenA, table, aRow.id)));

    assert(`A can delete own ${table}`, (await deleteRow(tokenA, table, newA.id)).length === 1);
    assert(`B can delete own ${table}`, (await deleteRow(tokenB, table, newB.id)).length === 1);
  }

  const fileA = await uploadPatientFile(tokenA, clinicA, baseRowsA.patients.id, "tenant-a");
  const fileB = await uploadPatientFile(tokenB, clinicB, baseRowsB.patients.id, "tenant-b");
  assert("A can upload to its own private patient folder", fileA.response.ok);
  assert("B can upload to its own private patient folder", fileB.response.ok);
  assert("A can download its own private patient file", (await downloadPatientFile(tokenA, fileA.path)).ok);
  assert("B can download its own private patient file", (await downloadPatientFile(tokenB, fileB.path)).ok);
  assert("A cannot download B's private patient file", !(await downloadPatientFile(tokenA, fileB.path)).ok);
  assert("B cannot download A's private patient file", !(await downloadPatientFile(tokenB, fileA.path)).ok);
  const crossFileA = await uploadPatientFile(tokenA, clinicB, baseRowsB.patients.id, "tenant-a-cross");
  const crossFileB = await uploadPatientFile(tokenB, clinicA, baseRowsA.patients.id, "tenant-b-cross");
  assert("A cannot upload into B's private patient folder", !crossFileA.response.ok);
  assert("B cannot upload into A's private patient folder", !crossFileB.response.ok);

  console.log("All local Supabase A/B tenant-isolation CRUD and storage checks passed. Only synthetic data was created.");
}

await main();
