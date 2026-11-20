import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const apiRoot = path.join(root, "src", "app", "api");

async function collectRouteFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(absolute);
    return entry.isFile() && /^route\.(ts|tsx|js|mjs)$/.test(entry.name)
      ? [absolute]
      : [];
  }));
  return nested.flat();
}

// Public routes are deliberately unauthenticated. Keep this allowlist small and
// explicit; new public endpoints must be reviewed and added here intentionally.
const publicRouteAllowlist = new Set([
  "auth/",
  "public/",
  "branches/all/route.ts",
  "branches/by-slug/route.ts",
  "public-chat/route.ts",
  "signup/route.ts",
  "slug-check/route.ts",
  "sw/route.ts",
  "test/route.ts",
]);

function isPublicRoute(relativePath) {
  return [...publicRouteAllowlist].some((entry) =>
    entry.endsWith("/") ? relativePath.startsWith(entry) : relativePath === entry,
  );
}

const authGuardPattern =
  /\b(?:requireAuth(?:Only)?|requireRole|getClinicContext|getServerSession)\s*\(|\.auth\.getUser\s*\(|N8N_SECURE_TOKEN|timingSafeEqual\s*\(/;

test("every API route is either explicitly public or performs server-side authentication", async () => {
  const files = await collectRouteFiles(apiRoot);
  assert.ok(files.length > 0, "API route inventory must not be empty");

  const missingGuards = [];
  for (const file of files) {
    const relativePath = path.relative(apiRoot, file).split(path.sep).join("/");
    if (isPublicRoute(relativePath)) continue;
    const source = await readFile(file, "utf8");
    if (!authGuardPattern.test(source)) missingGuards.push(relativePath);
  }

  assert.deepEqual(
    missingGuards,
    [],
    `Protected API routes without a visible server-side auth guard: ${missingGuards.join(", ")}`,
  );
});

test("platform-admin API routes verify platform-admin membership, not just login", async () => {
  const files = (await collectRouteFiles(apiRoot)).filter((file) =>
    path.relative(apiRoot, file).split(path.sep).join("/").startsWith("admin/"),
  );
  assert.ok(files.length > 0, "Platform-admin API inventory must not be empty");

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const hasPlatformRoleGuard =
      /requireRole\s*\([^\n]*platform_admin/.test(source) ||
      /from\(["']platform_admins["']\)/.test(source);
    assert.ok(
      hasPlatformRoleGuard,
      `${path.relative(apiRoot, file)} must verify platform-admin membership`,
    );
  }
});

test("API access is not granted by the proxy's cookie-presence check", async () => {
  const [proxySource, authSource] = await Promise.all([
    readFile(path.join(root, "src", "proxy.ts"), "utf8"),
    readFile(path.join(root, "src", "app", "api", "utils", "auth.ts"), "utf8"),
  ]);

  const publicApiBypass = proxySource.indexOf(
    'pathname.startsWith("/api/") && !pathname.startsWith("/api/admin/")',
  );
  const cookiePresenceGate = proxySource.indexOf("if (!hasAuthCookie(request))");
  assert.ok(publicApiBypass >= 0 && cookiePresenceGate > publicApiBypass,
    "API routes bypass the page proxy and therefore must authenticate inside each handler");

  assert.match(authSource, /getServerSession\(authOptions\)/,
    "NextAuth sessions must be cryptographically verified by getServerSession");
  assert.match(authSource, /admin\.auth\.getUser\(cookieToken\)/,
    "Supabase cookies must be validated with Supabase Auth, not trusted by presence");
  assert.match(authSource, /admin\.auth\.getUser\(token\)/,
    "Bearer tokens must be validated with Supabase Auth");
});


test("clinic-scoped bearer identity takes precedence over the shared NextAuth cookie", async () => {
  const authSource = await readFile(
    path.join(root, "src", "app", "api", "utils", "auth.ts"),
    "utf8",
  );
  const bearerLookup = authSource.indexOf('req.headers.get("authorization")');
  const nextAuthLookup = authSource.indexOf("getServerSession(authOptions)");
  assert.ok(bearerLookup >= 0 && nextAuthLookup > bearerLookup,
    "tab-scoped bearer identity must be evaluated before the shared NextAuth cookie");
  assert.match(authSource, /metadata\.auth_source === "clinic-scoped-shadow"/,
    "clinic-scoped tokens must use an explicit, separately provisioned identity type");
  assert.match(authSource, /metadata\.canonical_email/,
    "the canonical account email must come from verified server-issued token metadata");
  assert.match(authSource, /metadata\.clinic_id/,
    "the clinic scope must come from verified server-issued token metadata");
  assert.match(authSource, /if \(!canonicalEmail \|\| !clinicId\) throw/,
    "incomplete clinic-scoped claims must fail closed");
});


test("shared Supabase cookies cannot override a verified tab clinic scope", async () => {
  const authSource = await readFile(
    path.join(root, "src", "app", "api", "utils", "auth.ts"),
    "utf8",
  );
  assert.match(authSource,
    /if \(authed\.clinicId\) return authed\.clinicId;[\s\S]*?const token = parseAuthCookie\(req\);/,
    "the verified bearer clinic must be returned before inspecting the shared Supabase cookie");
});
