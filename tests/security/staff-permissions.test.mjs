import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../../src/lib/server/staff-permissions.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { hasStaffPermission, canViewPatientHistory } = await import(moduleUrl);

test("role defaults remain independently scoped", () => {
  const doctor = { role: "doctor", status: "active", permissions: null };
  assert.equal(hasStaffPermission(doctor, "view_patients"), true);
  assert.equal(hasStaffPermission(doctor, "view_appointments"), true);
  assert.equal(hasStaffPermission(doctor, "edit_emr"), true);
  assert.equal(hasStaffPermission(doctor, "view_invoices"), false);
  assert.equal(hasStaffPermission(doctor, "manage_staff"), false);

  const receptionist = { role: "receptionist", status: "active", permissions: null };
  assert.equal(hasStaffPermission(receptionist, "view_patients"), true);
  assert.equal(hasStaffPermission(receptionist, "view_appointments"), true);
  assert.equal(hasStaffPermission(receptionist, "view_invoices"), true);
  assert.equal(hasStaffPermission(receptionist, "create_invoice"), true);
  assert.equal(hasStaffPermission(receptionist, "edit_emr"), false);

  const admin = { role: "admin", status: "active", permissions: null };
  assert.equal(hasStaffPermission(admin, "manage_staff"), true);
  assert.equal(hasStaffPermission(admin, "manage_settings"), true);
});

test("explicit permission arrays override role defaults", () => {
  const restrictedAdmin = {
    role: "admin",
    status: "active",
    permissions: ["view_patients"],
  };
  assert.equal(hasStaffPermission(restrictedAdmin, "view_patients"), true);
  assert.equal(hasStaffPermission(restrictedAdmin, "view_invoices"), false);
  assert.equal(hasStaffPermission(restrictedAdmin, "manage_staff"), false);
});

test("an explicit empty permission list denies all permissions", () => {
  const staff = { role: "admin", status: "active", permissions: [] };
  assert.equal(hasStaffPermission(staff, "view_patients"), false);
  assert.equal(hasStaffPermission(staff, "manage_staff"), false);
});

test("malformed and non-string permission overrides fail closed", () => {
  assert.equal(
    hasStaffPermission({ role: "admin", status: "active", permissions: "{" }, "manage_staff"),
    false,
  );
  assert.equal(
    hasStaffPermission({ role: "admin", status: "active", permissions: '["view_patients", 7]' }, "view_patients"),
    false,
  );
  assert.equal(
    hasStaffPermission({ role: "admin", status: "active", permissions: ["view_patients", 7] }, "view_patients"),
    false,
  );
});

test("inactive and missing staff records cannot access permissions", () => {
  assert.equal(hasStaffPermission(null, "view_patients"), false);
  assert.equal(hasStaffPermission(undefined, "view_patients"), false);
  assert.equal(
    hasStaffPermission({ role: "admin", status: "inactive", permissions: null }, "manage_staff"),
    false,
  );
});

test("wildcard permissions and clinical-history rule are preserved", () => {
  assert.equal(
    hasStaffPermission({ role: "doctor", status: "active", permissions: ["*"] }, "manage_staff"),
    true,
  );
  assert.equal(
    canViewPatientHistory({ role: "doctor", status: "active", permissions: ["edit_emr"] }),
    true,
  );
  assert.equal(
    canViewPatientHistory({ role: "receptionist", status: "active", permissions: ["view_patients"] }),
    false,
  );
});
