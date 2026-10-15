-- Studio settings page (business details, logo, integration keys) and
-- client replies (email + chat). Apply once to an existing PIBASE project;
-- pibase-schema.sql already includes this for fresh projects.

-- Business details and logo shown on emails and client pages.
alter table studio_settings add column if not exists branding jsonb not null default '{}'::jsonb;
-- Non-secret integration options (sending address, reply domain, toggles).
alter table studio_settings add column if not exists integrations jsonb not null default '{}'::jsonb;

-- API keys (Resend, Stripe), encrypted by the server. RLS is on with no
-- policies, so browsers can never read this table — only the server's
-- service key can.
create table if not exists studio_secrets (
  user_id    uuid primary key references profiles(id) on delete cascade,
  payload    text not null,
  updated_at timestamptz not null default now()
);
alter table studio_secrets enable row level security;
