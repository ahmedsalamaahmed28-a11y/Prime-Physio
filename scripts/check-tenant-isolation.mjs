const required = [
  "SUPABASE_TEST_PROJECT_REF",
  "SUPABASE_TEST_ANON_KEY",
  "TENANT_A_ACCESS_TOKEN",
  "TENANT_B_ACCESS_TOKEN",
  "TENANT_A_TEST_PATIENT_ID",
  "TENANT_B_TEST_PATIENT_ID",
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.log(
    `SKIPPED: tenant isolation integration test is not configured. Missing repository variables/secrets: ${missing.join(", ")}.`,
  );
  console.log("Configure a dedicated non-production Supabase test project and two synthetic patient fixtures before enabling this test.");
  process.exit(0);
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

const baseUrl = `https://${projectRef}.supabase.co/rest/v1/patients`;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;

async function canReadPatient(token, patientId) {
  const url = new URL(baseUrl);
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

const checks = [
  ["Tenant A can read its own synthetic patient", process.env.TENANT_A_ACCESS_TOKEN, patientA, true],
  ["Tenant A cannot read Tenant B's synthetic patient", process.env.TENANT_A_ACCESS_TOKEN, patientB, false],
  ["Tenant B can read its own synthetic patient", process.env.TENANT_B_ACCESS_TOKEN, patientB, true],
  ["Tenant B cannot read Tenant A's synthetic patient", process.env.TENANT_B_ACCESS_TOKEN, patientA, false],
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
console.log("Tenant isolation checks passed. The test performed read-only requests and returned no patient details.");
