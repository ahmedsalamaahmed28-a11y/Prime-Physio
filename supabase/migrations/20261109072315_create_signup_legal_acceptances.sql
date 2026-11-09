-- Records affirmative acceptance of the current Terms of Use and Privacy Policy.
-- Access is restricted to the server-side service role; browser roles cannot read or write these records.
create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  accepted_terms boolean not null default false check (accepted_terms = true),
  accepted_privacy boolean not null default false check (accepted_privacy = true),
  terms_version text not null,
  privacy_policy_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists legal_acceptances_email_idx
  on public.legal_acceptances (lower(email));

alter table public.legal_acceptances enable row level security;
revoke all on table public.legal_acceptances from public, anon, authenticated;
grant select, insert, update, delete on table public.legal_acceptances to service_role;
