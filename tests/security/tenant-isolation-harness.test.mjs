import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);

test("isolated tenant RLS harness covers cross-clinic CRUD and rolls back fixtures", async () => {
  const sql = await readFile(new URL("tests/security/tenant-isolation-rls.sql", root), "utf8");
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /CREATE POLICY patients_clinic_select/);
  assert.match(sql, /CREATE POLICY invoices_clinic_select/);
  assert.match(sql, /CREATE POLICY appointments_clinic_select/);
  assert.match(sql, /public\.get_my_clinic_id\(\)/);
  assert.match(sql, /public\.assert_tenant_crud/);
  assert.match(sql, /Cross-tenant insert was allowed/);
  assert.match(sql, /Cross-tenant update was allowed/);
  assert.match(sql, /Cross-tenant delete was allowed/);
  assert.match(sql, /ROLLBACK;/);
});
