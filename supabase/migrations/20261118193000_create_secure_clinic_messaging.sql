-- Secure internal clinic messaging with participant-scoped reads.
-- All writes are performed by authenticated server API routes after clinic membership checks.

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  kind text not null check (kind in ('team','patient')),
  title text not null,
  patient_id text null,
  created_by_email text not null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.chat_participants (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'member',
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (conversation_id, email),
  constraint chat_participants_email_lower check (email = lower(btrim(email)))
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  sender_email text not null,
  sender_name text not null,
  body text not null check (length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists chat_conversations_clinic_last_message_idx
  on public.chat_conversations (clinic_id, last_message_at desc);
create index if not exists chat_participants_email_clinic_idx
  on public.chat_participants (clinic_id, email);
create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at desc);
create index if not exists chat_messages_clinic_created_idx
  on public.chat_messages (clinic_id, created_at desc);

alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

revoke all on public.chat_conversations, public.chat_participants, public.chat_messages from anon;
revoke all on public.chat_conversations, public.chat_participants, public.chat_messages from authenticated;
grant select on public.chat_conversations, public.chat_participants, public.chat_messages to authenticated;
grant all on public.chat_conversations, public.chat_participants, public.chat_messages to service_role;

drop policy if exists chat_conversations_participant_read on public.chat_conversations;
create policy chat_conversations_participant_read on public.chat_conversations
for select to authenticated
using (
  clinic_id = (select public.get_my_clinic_id())
  and exists (
    select 1 from public.chat_participants p
    where p.conversation_id = chat_conversations.id
      and p.clinic_id = chat_conversations.clinic_id
      and p.email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
);

drop policy if exists chat_participants_self_read on public.chat_participants;
create policy chat_participants_self_read on public.chat_participants
for select to authenticated
using (
  clinic_id = (select public.get_my_clinic_id())
  and email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
);

drop policy if exists chat_messages_participant_read on public.chat_messages;
create policy chat_messages_participant_read on public.chat_messages
for select to authenticated
using (
  clinic_id = (select public.get_my_clinic_id())
  and exists (
    select 1 from public.chat_participants p
    where p.conversation_id = chat_messages.conversation_id
      and p.clinic_id = chat_messages.clinic_id
      and p.email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'chat_messages'
     ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
