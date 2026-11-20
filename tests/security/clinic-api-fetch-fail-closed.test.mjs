import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("private same-origin API calls fail closed without a tab clinic token", async () => {
  const source = await readFile(path.join(root, "src", "lib", "clinic-api-fetch.ts"), "utf8");
  assert.match(source, /if \(!accessToken\)\s*\{[\s\S]*?return new Response\([\s\S]*?status: 401/);
  assert.match(source, /allowsSharedSessionBootstrap\(pathname\)/);
  assert.match(source, /pathname\.startsWith\("\/api\/admin\/"\)/);
  assert.match(source, /"\/api\/auth\/enrich"/);
  assert.match(source, /"\/api\/center-management\/centers"/);
  assert.match(source, /"\/api\/center-management\/export"/);
  assert.match(source, /"\/api\/overview"/);
});

test("private API requests cannot override the active tab's bearer token", async () => {
  const source = await readFile(path.join(root, "src", "lib", "clinic-api-fetch.ts"), "utf8");
  assert.match(source, /headers\.set\("Authorization", `Bearer \$\{accessToken\}`\)/);
  assert.doesNotMatch(source, /headers\.has\("Authorization"\)\) return nativeFetch/);
});

test("owner overview is restricted to the verified clinic selected in this tab", async () => {
  const source = await readFile(path.join(root, "src", "app", "api", "overview", "route.ts"), "utf8");
  assert.match(source, /if \(session\.clinicId\) ownershipQuery = ownershipQuery\.eq\("clinic_id", session\.clinicId\)/);
});
