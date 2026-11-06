# Prime Physio deployment environment

Configure these variables in the Vercel project settings. Never commit their values to Git.

## Required for the application build and browser client

| Variable | Environments | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | Public project URL: `https://crrhrjhftwostjomzmfj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Development | Supabase publishable key; safe for browser use when RLS is correctly configured. |

The application also accepts the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` name as a fallback.

## Required for server-side admin API routes

| Variable | Environments | Notes |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development | Secret/service-role key. Store as a sensitive Vercel variable; never expose it with a `NEXT_PUBLIC_` prefix. |

## Authentication and email

| Variable | Environments | Notes |
| --- | --- | --- |
| `NEXTAUTH_URL` | Production, Preview | Canonical URL for the corresponding deployment environment. |
| `NEXTAUTH_SECRET` | Production, Preview, Development | Unique random signing secret per environment. |
| `GOOGLE_CLIENT_ID` | Where Google OAuth is enabled | OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Where Google OAuth is enabled | OAuth client secret; sensitive. |
| `SMTP_USER` | Where OTP email is enabled | Sender mailbox. |
| `SMTP_PASS` | Where OTP email is enabled | SMTP app password; sensitive. |
| `SMTP_HOST` | Optional | Defaults to `smtp.gmail.com`. |
| `SMTP_PORT` | Optional | Defaults to `587`. |

A successful CI build does not prove that deployment secrets are present. Verify environment-variable presence (without printing secret values) and run an authenticated smoke test after deployment.
