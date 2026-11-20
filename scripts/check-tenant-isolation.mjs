import { randomUUID } from "node:crypto";

const required = [
  "SUPABASE_TEST_PROJECT_REF",
  "SUPABASE_TEST_ANON_KEY",
  "TENANT_A_TEST_EMAIL",
  "TENANT_A_TEST_PASSWORD",
  "TENANT_B_TEST_EMAIL",
  "TENANT_B_TEST_PASSWORD",
  "TENANT_A_TEST_PATIENT_ID",
  "TENANT_B_TEST_PATIENT_ID",
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(
    `Tenant isolation test cannot run. Missing configuration: ${missing.join(", ")}. The GitHub Actions workflow must mark this test as Skipped when fixtures are unavailable.`,
  );
}

const projectRef = process.env.SUPABASE_TEST_PROJECT_REF.trim();
const productionProjectRef = "crrhrjhftwostjomzmfj";

if (!/^[a-z0-9]{20}$/.test(projectRef)) {
  throw new Error("SUPABASE_TEST_PROJECT_REF must be a valid Supabase project reference.");
}
if (projectRef === productionProjectRef) {
  throw new Error("Refusing to run tenant fixtures against the production Prime Physio Supabase project.");
}

const patientA = process.env.TENANT_A_TEST_PATIENT_ID.trim();
const patientB = process.env.TENANT_B_TEST_PATIENT_ID.trim();
if (!patientA || !patientB || patientA === patientB) {
  throw new Error("Tenant A and Tenant B must use two different synthetic patient IDs.");
}

const projectUrl = `https://${projectRef}.supabase.co`;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const createdFixtures = [];

async function signIn(email, password) {
  const response = await fetch(`${projectUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Supabase test sign-in failed with HTTP ${response.status}; verify the synthetic test account and project Auth settings.`);
  }

  const payload = await response.json();
  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw new Error("Supabase did not return a test access token.");
  }
  return payload.access_token;
}

async function rest(token, method, query, body) {
  const response = await fetch(`${projectUrl}/rest/v1/patients?${query}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      Prefer: "return=representation",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  let payload = [];
  if (raw) {
    try { payload = JSON.parse(raw); } catch { payload = raw; }
  }
  return { response, payload };
}

async function getPatient(token, patientId) {
  const { response, payload } = await rest(
    token,
    "GET",
    new URLSearchParams({ select: "id,clinic_id,nameAr", id: `eq.${patientId}`, limit: "1" }).toString(),
  );
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(`Supabase patient read failed with HTTP ${response.status}.`);
  }
  return payload[0] || null;
}

async function createPatient(token, clinicId, prefix, label) {
  const id = `${prefix}-ISOLATION-${randomUUID().slice(0, 8).toUpperCase()}`;
  const { response, payload } = await rest(
    token,
    "POST",
    "select=id,clinic_id,nameAr",
    { id, clinic_id: clinicId, nameAr: label },
  );
  if (!response.ok || !Array.isArray(payload) || payload.length !== 1) {
    throw new Error(`Synthetic patient insert failed with HTTP ${response.status}; verify owner test permissions and the test schema.`);
  }
  createdFixtures.push({ token, id });
  return id;
}

async function updatePatient(token, patientId, name) {
  const { response, payload } = await rest(
    token,
    "PATCH",
    new URLSearchParams({ id: `eq.${patientId}`, select: "id,clinic_id,nameAr" }).toString(),
    { nameAr: name },
  );
  if (!response.ok) throw new Error(`Patient update request failed with HTTP ${response.status}.`);
  return Array.isArray(payload) ? payload : [];
}

async function deletePatient(token, patientId) {
  const { response, payload } = await rest(
    token,
    "DELETE",
    new URLSearchParams({ id: `eq.${patientId}`, select: "id" }).toString(),
  );
  if (!response.ok) throw new Error(`Patient delete request failed with HTTP ${response.status}.`);
  return Array.isArray(payload) ? payload : [];
}

const checks = [];
function check(label, passed) {
  checks.push({ label, passed: Boolean(passed) });
  console.log(`${passed ? "PASS" : "FAIL"}: ${label}`);
}

let tokenA;
let tokenB;
try {
  [tokenA, tokenB] = await Promise.all([
    signIn(process.env.TENANT_A_TEST_EMAIL, process.env.TENANT_A_TEST_PASSWORD),
    signIn(process.env.TENANT_B_TEST_EMAIL, process.env.TENANT_B_TEST_PASSWORD),
  ]);

  const [fixtureA, fixtureB] = await Promise.all([
    getPatient(tokenA, patientA),
    getPatient(tokenB, patientB),
  ]);
  if (!fixtureA?.clinic_id || !fixtureB?.clinic_id || fixtureA.clinic_id === fixtureB.clinic_id) {
    throw new Error("Tenant A and Tenant B fixtures must belong to two different clinics.");
  }

  const [aOwn, aCross, bOwn, bCross] = await Promise.all([
    getPatient(tokenA, patientA),
    getPatient(tokenA, patientB),
    getPatient(tokenB, patientB),
    getPatient(tokenB, patientA),
  ]);
  check("Tenant A can read its own synthetic patient", Boolean(aOwn));
  check("Tenant A cannot read Tenant B's synthetic patient", !aCross);
  check("Tenant B can read its own synthetic patient", Boolean(bOwn));
  check("Tenant B cannot read Tenant A's synthetic patient", !bCross);

  const prefixA = fixtureA.clinic_id.replace(/-/g, "").slice(0, 4).toUpperCase();
  const prefixB = fixtureB.clinic_id.replace(/-/g, "").slice(0, 4).toUpperCase();

  // Each tenant must be able to create, read, update, and delete its own synthetic row.
  const newA = await createPatient(tokenA, fixtureA.clinic_id, prefixA, "Synthetic tenant A isolation test");
  const newB = await createPatient(tokenB, fixtureB.clinic_id, prefixB, "Synthetic tenant B isolation test");
  check("Tenant A can read its newly created patient", Boolean(await getPatient(tokenA, newA)));
  check("Tenant B cannot read Tenant A's newly created patient", !(await getPatient(tokenB, newA)));
  check("Tenant B can read its newly created patient", Boolean(await getPatient(tokenB, newB)));
  check("Tenant A cannot read Tenant B's newly created patient", !(await getPatient(tokenA, newB)));

  const updatedA = await updatePatient(tokenA, newA, "Synthetic tenant A updated");
  const updatedB = await updatePatient(tokenB, newB, "Synthetic tenant B updated");
  check("Tenant A can update its own patient", updatedA.length === 1 && updatedA[0].nameAr === "Synthetic tenant A updated");
  check("Tenant B can update its own patient", updatedB.length === 1 && updatedB[0].nameAr === "Synthetic tenant B updated");

  const crossUpdateA = await updatePatient(tokenA, patientB, "Unauthorized cross-tenant update");
  const crossUpdateB = await updatePatient(tokenB, patientA, "Unauthorized cross-tenant update");
  check("Tenant A cannot update Tenant B's patient", crossUpdateA.length === 0);
  check("Tenant B cannot update Tenant A's patient", crossUpdateB.length === 0);
  check("Tenant B's patient remains unchanged after Tenant A's update attempt", (await getPatient(tokenB, patientB))?.nameAr === fixtureB.nameAr);
  check("Tenant A's patient remains unchanged after Tenant B's update attempt", (await getPatient(tokenA, patientA))?.nameAr === fixtureA.nameAr);

  const crossInsertId = `${prefixB}-CROSS-${randomUUID().slice(0, 8).toUpperCase()}`;
  const crossInsert = await rest(tokenA, "POST", "select=id", {
    id: crossInsertId,
    clinic_id: fixtureB.clinic_id,
    nameAr: "Must never be inserted across tenants",
  });
  if (crossInsert.response.ok && Array.isArray(crossInsert.payload) && crossInsert.payload.length) {
    createdFixtures.push({ token: tokenB, id: crossInsertId });
  }
  check("Tenant A cannot insert a patient into Tenant B", !crossInsert.response.ok || !crossInsert.payload?.length);
  check("Tenant B cannot insert a patient into Tenant A", await (async () => {
    const id = `${prefixA}-CROSS-${randomUUID().slice(0, 8).toUpperCase()}`;
    const result = await rest(tokenB, "POST", "select=id", {
      id,
      clinic_id: fixtureA.clinic_id,
      nameAr: "Must never be inserted across tenants",
    });
    if (result.response.ok && Array.isArray(result.payload) && result.payload.length) {
      createdFixtures.push({ token: tokenA, id });
    }
    return !result.response.ok || !result.payload?.length;
  })());

  const crossDeleteA = await deletePatient(tokenA, patientB);
  const crossDeleteB = await deletePatient(tokenB, patientA);
  check("Tenant A cannot delete Tenant B's patient", crossDeleteA.length === 0);
  check("Tenant B cannot delete Tenant A's patient", crossDeleteB.length === 0);
  check("Tenant A's patient still exists after Tenant B's delete attempt", Boolean(await getPatient(tokenA, patientA)));
  check("Tenant B's patient still exists after Tenant A's delete attempt", Boolean(await getPatient(tokenB, patientB)));

  const ownDeleteA = await deletePatient(tokenA, newA);
  const ownDeleteB = await deletePatient(tokenB, newB);
  check("Tenant A can delete its own synthetic patient", ownDeleteA.length === 1);
  check("Tenant B can delete its own synthetic patient", ownDeleteB.length === 1);
  createdFixtures.length = 0;
} finally {
  // Cleanup only synthetic rows created by this run, and only in the dedicated test project.
  for (const fixture of createdFixtures) {
    try { await deletePatient(fixture.token, fixture.id); } catch {}
  }
}

const failed = checks.filter((item) => !item.passed);
if (failed.length) {
  throw new Error(`${failed.length} tenant isolation assertion(s) failed. Only disposable synthetic patient rows were used.`);
}
console.log(`All ${checks.length} tenant isolation CRUD checks passed. No patient details were logged.`);
