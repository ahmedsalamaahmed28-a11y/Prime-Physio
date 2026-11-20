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
  assert.match(authSource, /Never fall back to the shared NextAuth cookie/,
    "an invalid bearer token must not fall back to a different tab's NextAuth cookie");
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
  assert.match(authSource, /Invalid or expired clinic-scoped session/);
  assert.match(authSource, /Unable to verify clinic-scoped membership/);
  assert.match(authSource, /Forbidden: Clinic membership is inactive/,
    "missing or inactive membership must fail closed");
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


test("clinic-session exchange issues a distinct, membership-verified identity per clinic", async () => {
  const routeSource = await readFile(
    path.join(root, "src", "app", "api", "auth", "clinic-session", "route.ts"),
    "utf8",
  );
  assert.match(routeSource, /export async function POST/);
  assert.match(routeSource, /getServerSession\(authOptions\)/);
  assert.match(routeSource, /clinic_owners/);
  assert.match(routeSource, /from\("staff"\)/);
  assert.match(routeSource, /\.eq\("clinic_id", clinicId\)/);
  assert.match(routeSource, /auth_source: "clinic-scoped-shadow"/);
  assert.match(routeSource, /canonical_email: canonicalEmail/);
  assert.match(routeSource, /clinic_id: clinicId/);
  assert.match(routeSource, /createHmac\("sha256", secret\)/);
  assert.match(routeSource, /email_confirm: true/);
  assert.match(routeSource, /The login session has expired/);
  assert.doesNotMatch(routeSource, /nowSeconds \+ 8 \* 60 \* 60/);
  assert.doesNotMatch(routeSource, /active_clinic_id/,
    "the new identity exchange must not mutate a shared active-clinic claim");
  assert.match(routeSource, /isSameOrigin\(req\)/,
    "the cookie-authenticated exchange must reject cross-origin POST requests");
});


test("clinic-scoped RLS resolves canonical identity and immutable clinic claims", async () => {
  const migration = await readFile(
    path.join(root, "supabase", "migrations", "20261120191500_clinic_scoped_shadow_identity_rls.sql"),
    "utf8",
  );
  assert.match(migration, /create table if not exists public\.clinic_auth_identities/);
  assert.match(migration, /revoke all on public\.clinic_auth_identities from public, anon, authenticated/);
  assert.match(migration, /create or replace function public\.get_auth_email\(\)/);
  assert.match(migration, /create or replace function public\.create_center/);
  assert.match(migration, /create or replace function public\.setup_clinic_transaction/);
  assert.match(migration, /public\.get_auth_email\(\) is distinct from/);
  assert.match(migration, /auth_source' = 'clinic-scoped-shadow'/);
  assert.match(migration, /app_metadata' ->> 'canonical_email'/);
  assert.match(migration, /app_metadata' ->> 'clinic_id'/);
  assert.match(migration, /clinic-scoped-shadow/);
  assert.match(migration, /and coalesce\(auth\.jwt\(\) -> 'app_metadata' ->> 'auth_source', ''\) <> 'clinic-scoped-shadow'/);
  assert.match(migration, /create policy chat_participants_self_read/);
  assert.match(migration, /create policy hr_attendance_clinic_update/);
});


test("clinic-scoped bearer identities cannot enter platform administration", async () => {
  const authSource = await readFile(
    path.join(root, "src", "app", "api", "utils", "auth.ts"),
    "utf8",
  );
  const migration = await readFile(
    path.join(root, "supabase", "migrations", "20261120191500_clinic_scoped_shadow_identity_rls.sql"),
    "utf8",
  );
  assert.match(authSource, /allowedRoles\.includes\("platform_admin"\) && authed\.authSource !== "clinic-scoped-shadow"/);
  assert.match(migration, /auth_source', ''\) <> 'clinic-scoped-shadow'/);
});

test("tab-scoped API bridge never forwards tokens to external or public endpoints", async () => {
  const bridge = await readFile(path.join(root, "src", "lib", "clinic-api-fetch.ts"), "utf8");
  assert.match(bridge, /requestUrl\.origin !== window\.location\.origin/);
  assert.match(bridge, /requestUrl\.pathname\.startsWith\("\/api\/public\/"\)/);
  assert.match(bridge, /requestUrl\.pathname\.startsWith\("\/api\/auth\/"\) && requestUrl\.pathname !== "\/api\/auth\/enrich"/);
  assert.match(bridge, /activeClinicAccessToken/);
  assert.doesNotMatch(bridge, /supabase\.auth\.getSession\(/);
  assert.match(bridge, /setClinicApiAccessToken/);
  assert.match(bridge, /headers\.set\("Authorization"/);
  assert.match(bridge, /headers\.has\("Authorization"\)/);
  assert.match(bridge, /requestUrl\.pathname === "\/api\/n8n"/);
});

test("auth provider preserves a scoped tab identity and signs out locally", async () => {
  const authSource = await readFile(path.join(root, "src", "lib", "auth.tsx"), "utf8");
  assert.match(authSource, /tabMetadata\.auth_source === "clinic-scoped-shadow"/);
  assert.match(authSource, /setClinicApiAccessToken\(/);
  assert.match(authSource, /if \(isClinicScoped && !scopedSessionValid\)/);
  assert.match(authSource, /prime-physio:tab-logged-out/);
  assert.doesNotMatch(authSource, /onAuthStateChange\(async/);
  assert.match(authSource, /tabEmail !== sessionEmail/);
  assert.match(authSource, /activateClinicSession\(enriched\.clinicId\)/);
  assert.match(authSource, /supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.doesNotMatch(authSource, /signOut\(\{ callbackUrl/);
  assert.match(authSource, /prime-physio:tab-logged-out/);
});

test("clinic enrichment trusts verified bearer claims instead of the shared cookie", async () => {
  const source = await readFile(path.join(root, "src", "app", "api", "auth", "enrich", "route.ts"), "utf8");
  assert.match(source, /admin\.auth\.getUser\(bearer\)/);
  assert.match(source, /metadata\.canonical_email/);
  assert.match(source, /metadata\.clinic_id/);
  assert.match(source, /Clinic scope mismatch/);
  assert.match(source, /platformAdmin && !scopedClinicId/);
  assert.match(source, /expiresAt <= Math\.floor\(Date\.now\(\) \/ 1000\)/);
  assert.match(source, /staffProfileQuery\.eq\("clinic_id", scopedClinicId\)/);
});

test("RLS migration removes legacy staff email policy and scopes owner rows", async () => {
  const migration = await readFile(path.join(root, "supabase", "migrations", "20261120191500_clinic_scoped_shadow_identity_rls.sql"), "utf8");
  assert.match(migration, /drop policy if exists staff_self_read on public\.staff/);
  assert.match(migration, /clinic_id = public\.get_my_clinic_id\(\)/);
  assert.match(migration, /array_agg\(distinct membership\.clinic_id\)/);
  assert.doesNotMatch(migration, /min\(membership\.clinic_id\)/);
});
test("legacy shared Supabase session endpoint is authenticated but disabled", async () => {
  const legacyRoute = await readFile(path.join(root, "src", "app", "api", "auth", "supabase-session", "route.ts"), "utf8");
  assert.match(legacyRoute, /getServerSession\(authOptions\)/);
  assert.match(legacyRoute, /status: 410/);
  assert.doesNotMatch(legacyRoute, /active_clinic_id/);
});