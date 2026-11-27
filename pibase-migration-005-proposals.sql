-- Proposals: a branded proposal page the client reads, accepts and fills in
-- their details on (they become a lead). Apply once; safe to re-run.
-- Replace p_bcb1de3b with the project id when applying to another project.

create table if not exists proposals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  client_id     uuid references clients(id) on delete set null,
  number        text,
  title         text not null default 'Proposal',
  prospect      text,                       -- business the proposal is for
  contact_name  text,
  contact_email text,
  contact_phone text,
  language      text not null default 'es', -- es | en (page labels and form)
  body          text not null default '',   -- the proposal itself (simple Markdown)
  status        text not null default 'draft', -- draft | sent | viewed | accepted | declined
  sent_at       timestamptz,
  viewed_at     timestamptz,
  view_count    integer not null default 0,
  accepted_at   timestamptz,
  acceptance    jsonb not null default '{}'::jsonb, -- what the client filled in
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists proposals_user on proposals(user_id, created_at desc);
alter table proposals enable row level security;
drop policy if exists proposals_own on proposals;
create policy proposals_own on proposals for all using (auth.uid() = user_id);

-- Run as the superuser, the table would belong to postgres and the app's roles
-- couldn't use it. Match the other tables.
alter table proposals owner to p_bcb1de3b_admin;
grant select, insert, update, delete on proposals to p_bcb1de3b_anon, p_bcb1de3b_authenticated, p_bcb1de3b_service_role;
