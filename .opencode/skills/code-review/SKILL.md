---
name: code-review
description: Use when the user asks for code review, PR review, مراجعة كود, or checking code quality. Provides guidelines for reviewing TypeScript/React/Next.js code.
---

# Code Review Guidelines

When reviewing code, check for:

## Security
- No hardcoded secrets, API keys, or tokens
- All API routes use `requireAuth()` / `requireRole()` from `src/app/api/utils/auth.ts`
- SQL queries use Supabase parameterized queries (not raw SQL concatenation)
- User input is validated before processing
- No exposure of internal IDs or sensitive data in client responses

## TypeScript & React
- Proper TypeScript types (no `any` unless absolutely necessary)
- Hooks follow Rules of Hooks (no conditional hooks)
- Components use proper React patterns (no direct DOM manipulation)
- Async operations have try/catch with proper error handling
- State updates use functional updates when depending on previous state

## Next.js (this project's version)
- Check `node_modules/next/dist/docs/` for API changes before writing code
- Server Components vs Client Components: use "use client" only when needed
- API routes use `NextRequest`/`NextResponse` from `next/server`

## Project Conventions
- Arabic-first UI: all user-facing strings in Arabic, English as fallback
- Supabase queries scoped by `clinic_id` (multi-tenant isolation)
- `email` field: always `.toLowerCase().trim()` before DB operations
- Error messages in Arabic with `isRtl ? "..." : "..."` pattern
- Build must pass with `npm run build` before considering done

## Performance
- No unnecessary re-renders (use `useMemo`/`useCallback` when beneficial)
- Large lists should be paginated or virtualized
- Bundle size: avoid heavy libraries for simple operations
- Images use proper sizing and lazy loading
