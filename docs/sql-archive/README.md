# Historical SQL archive

This folder contains legacy SQL scripts that previously lived in the repository root.

## Source of truth

- **Approved, ordered database migrations:** `supabase/migrations/`
- **Permission review and rollback reference scripts:** `docs/security/`
- **Historical scripts in this folder:** archive only; do not apply them to production or a new environment.

The archived scripts were accumulated during earlier setup, schema repair, RLS troubleshooting, and AI-feature experiments. They are not a reliable sequential migration history. Some scripts may be incomplete, superseded, environment-specific, or destructive.

In particular, `supabase-reset-all-data.sql` is retained only for historical reference. Do not execute it.

Before any future database change:
1. Create a new migration through the Supabase CLI workflow.
2. Review the SQL and its rollback/impact.
3. Test it against a non-production project.
4. Apply it only after explicit approval.

Moving these files is a repository organization change only. It does not execute SQL, alter Supabase, or change production data.
