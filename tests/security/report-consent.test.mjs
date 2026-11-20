import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);

test("AI report API requires explicit external processing consent", async () => {
  const route = await readFile(new URL("src/app/api/report/route.ts", root), "utf8");
  assert.match(route, /body\.consentToExternalProcessing !== true/);
  assert.match(route, /patientInfo/);
  assert.match(route, /\.eq\("clinic_id", auth\.clinicId\)/);
  assert.match(route, /\.select\("id, diagnosis"\)/);
  assert.match(route, /cleanClinicalText\(patientRecord\.diagnosis/);
  assert.match(route, /do not read or forward patientInfo/i);
  assert.match(route, /Cache-Control.*no-store, private/);
});

test("AI report API sends only bounded clinical fields and rejects identifying contact patterns", async () => {
  const route = await readFile(new URL("src/app/api/report/route.ts", root), "utf8");
  assert.match(route, /cleanClinicalText\(clinicalData\.diagnosis/);
  assert.match(route, /cleanClinicalText\(clinicalData\.rom/);
  assert.match(route, /cleanClinicalText\(clinicalData\.notes/);
  assert.match(route, /REDACTED CONTACT/);
  assert.match(route, /REDACTED NUMBER/);
  assert.match(route, /patient names, file IDs, phone numbers, DOB, or gender/i);
});

test("report UI requires a patient consent confirmation before sending clinical data", async () => {
  const component = await readFile(new URL("src/components/patients/SmartReportsTab.tsx", root), "utf8");
  assert.match(component, /externalConsent/);
  assert.match(component, /setExternalConsent\(event\.target\.checked\)/);
  assert.match(component, /disabled=\{isGenerating \|\| !externalConsent\}/);
  assert.match(component, /consentToExternalProcessing: true/);
  assert.match(component, /patient\.diagnosis/);
  assert.match(component, /patientId: patient\.id/);
  assert.doesNotMatch(component, /patientInfo:/);
  assert.doesNotMatch(component, /patient\.phone,/);
});
