-- Push notifications to the studio's phones and computers.
-- Apply once to an existing PIBASE project; pibase-schema.sql already
-- includes this for fresh projects.

-- One row per device that turned on notifications. RLS is on with no
-- policies: only the server (service key) can read or write it.
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  keys        jsonb not null,
  device      text,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists push_subscriptions_user on push_subscriptions(user_id);
alter table push_subscriptions enable row level security;
