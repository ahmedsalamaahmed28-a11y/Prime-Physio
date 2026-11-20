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

async function canReadPatient(token, patientId) {
  const url = new URL(`${projectUrl}/rest/v1/patients`);
  url.search = new URLSearchParams({
    select: "id",
    id: `eq.${patientId}`,
    limit: "2",
  }).toString();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Supabase test API returned HTTP ${response.status}; verify the test users, grants, and test project configuration.`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("Supabase returned an unexpected response shape during the isolation test.");
  }
  return rows.length > 0;
}

const [tokenA, tokenB] = await Promise.all([
  signIn(process.env.TENANT_A_TEST_EMAIL, process.env.TENANT_A_TEST_PASSWORD),
  signIn(process.env.TENANT_B_TEST_EMAIL, process.env.TENANT_B_TEST_PASSWORD),
]);

const checks = [
  ["Tenant A can read its own synthetic patient", tokenA, patientA, true],
  ["Tenant A cannot read Tenant B's synthetic patient", tokenA, patientB, false],
  ["Tenant B can read its own synthetic patient", tokenB, patientB, true],
  ["Tenant B cannot read Tenant A's synthetic patient", tokenB, patientA, false],
];

let failed = 0;
for (const [label, token, patientId, expected] of checks) {
  const actual = await canReadPatient(token, patientId);
  if (actual !== expected) {
    failed += 1;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`PASS: ${label}`);
  }
}

if (failed) {
  throw new Error(`${failed} tenant isolation assertion(s) failed. No records were changed.`);
}
console.log("Tenant isolation checks passed. The test used short-lived tokens and read-only requests; no patient details were returned.");
