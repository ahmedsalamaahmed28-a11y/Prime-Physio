# API authentication boundaries

## Core rule

The Next.js proxy is a page-navigation convenience, not the API authorization boundary. The proxy intentionally allows API requests to reach their route handlers; a cookie's presence is never sufficient proof of identity or permission.

Every protected API route must validate the signed NextAuth session or validate a Supabase access token with `auth.getUser`, then enforce the relevant clinic membership, active-clinic state, tenant scope, and staff permission. Routes that use the Supabase service-role client must enforce these checks themselves because service-role access bypasses RLS.

## Explicit public API allowlist

The route-auth contract test maintains a small allowlist for intentionally public endpoints:
- Authentication and account recovery routes under `/api/auth/`.
- Public clinic and booking routes under `/api/public/`.
- Public clinic chat, public branch discovery/profile, signup, slug availability, service-worker, and basic health-check endpoints.

Any new public endpoint must be reviewed for data minimization, input validation, abuse controls, and whether it performs writes. Do not add a route to the allowlist merely to make CI pass.

## Platform administration

Routes under `/api/admin/` must check server-managed platform-admin membership (or use `requireRole(..., ["platform_admin"])`). A logged-in clinic owner or clinic staff member is not automatically a platform administrator.

## Automated checks and their limits

- `npm test` checks the protected/public route inventory, platform-admin guards, authentication helper contracts, and the staff permission matrix.
- These are source-level contract tests. They do not replace HTTP integration tests with real signed sessions or cross-clinic test identities.
- Clinic A/B integration checks require a dedicated non-production Supabase project and synthetic accounts. If those fixtures are unavailable, GitHub Actions must display the integration step as **Skipped**, not report a passing test.
- Public chat currently uses an in-memory per-instance rate limit. That is best-effort on serverless deployments and is not a durable, globally shared abuse-control mechanism; it should be replaced by a shared limiter if abuse becomes a concern, without introducing a paid dependency.
