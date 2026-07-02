-- ================================================================
-- EHS Studio Manager — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ================================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────────
-- One row per user, created automatically on signup via trigger
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text,
  business_name text default 'My Studio',
  plan          text default 'free',  -- free | pro | business
  created_at    timestamptz default now()
);

-- ── Studio settings (stages, session types, form settings) ───────
create table if not exists studio_settings (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  stages          jsonb default '[
    {"id":"inquiry","label":"Inquiry"},
    {"id":"booked","label":"Booked"},
    {"id":"postpro","label":"Post-production"},
    {"id":"done","label":"Done"}
  ]'::jsonb,
  session_types   jsonb default '["Family","Maternity","Newborn","Portrait"]'::jsonb,
  form_settings   jsonb default '{
    "contactType":"Lead",
    "buttonLabel":"Submit",
    "formTitle":"",
    "afterSubmit":"message",
    "successMessage":"Thank you for contacting us!",
    "redirectUrl":"",
    "checkboxOptions":["Family Portraits","Maternity Photography","Newborn Photography","Personal Portraits","Kids Portraits","Engagement / Couples Session","Other"]
  }'::jsonb,
  updated_at      timestamptz default now(),
  unique (user_id)
);

-- ── Clients ──────────────────────────────────────────────────────
create table if not exists clients (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  type        text,
  status      text default 'inquiry',
  date        date,
  notes       text,
  archived    boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Invoices ─────────────────────────────────────────────────────
create table if not exists invoices (
  id                  uuid primary key default uuid_generate_v4(),
  number              text,              -- per-tenant display number, e.g. INV-001
  user_id             uuid not null references profiles(id) on delete cascade,
  client_id           uuid references clients(id) on delete set null,
  client_name         text,
  amount              numeric(10,2) default 0,
  paid                numeric(10,2) default 0,
  due                 date,
  status              text default 'unpaid',  -- unpaid | partial | paid
  note                text,
  line_items          jsonb default '[]'::jsonb,
  payment_method      text,
  paid_at             text,
  payment_intent_id   text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ── Bookings ─────────────────────────────────────────────────────
create table if not exists bookings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  client_name text,
  type        text,
  date        date,
  time        text,
  location    text,
  status      text default 'pending',
  notes       text,
  created_at  timestamptz default now()
);

-- ── Contracts ────────────────────────────────────────────────────
create table if not exists contracts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  client_name text,
  type        text,
  body        text,
  status      text default 'pending',  -- pending | signed
  sent        text,
  signed_by   text,
  signed_at   text,
  fields      jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

-- ── Quotes ───────────────────────────────────────────────────────
create table if not exists quotes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  client_name text,
  amount      numeric(10,2) default 0,
  status      text default 'draft',
  line_items  jsonb default '[]'::jsonb,
  note        text,
  created_at  timestamptz default now()
);

-- ── Questionnaires ───────────────────────────────────────────────
create table if not exists questionnaires (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  client_name text,
  questions   jsonb default '[]'::jsonb,
  answers     jsonb default '{}'::jsonb,
  status      text default 'sent',
  created_at  timestamptz default now()
);

-- ── Messages ─────────────────────────────────────────────────────
create table if not exists messages (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  client_id   uuid references clients(id) on delete set null,
  from_name   text,
  thread      jsonb default '[]'::jsonb,
  unread      boolean default true,
  updated_at  timestamptz default now(),
  created_at  timestamptz default now()
);

-- ── Leads (from public contact form) ─────────────────────────────
create table if not exists leads (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  name        text,
  email       text,
  phone       text,
  interest    text,
  message     text,
  source      text default 'contact_form',
  created_at  timestamptz default now()
);

-- ================================================================
-- Row Level Security (RLS) — users can only see their own data
-- ================================================================

alter table profiles           enable row level security;
alter table studio_settings    enable row level security;
alter table clients            enable row level security;
alter table invoices           enable row level security;
alter table bookings           enable row level security;
alter table contracts          enable row level security;
alter table quotes             enable row level security;
alter table questionnaires     enable row level security;
alter table messages           enable row level security;
alter table leads              enable row level security;

-- Profiles: own row only
create policy "profiles_own" on profiles
  for all using (auth.uid() = id);

-- Studio settings: own row only
create policy "settings_own" on studio_settings
  for all using (auth.uid() = user_id);

-- All other tables: own rows only
create policy "clients_own"         on clients         for all using (auth.uid() = user_id);
create policy "invoices_own"        on invoices        for all using (auth.uid() = user_id);
create policy "bookings_own"        on bookings        for all using (auth.uid() = user_id);
create policy "contracts_own"       on contracts       for all using (auth.uid() = user_id);
create policy "quotes_own"          on quotes          for all using (auth.uid() = user_id);
create policy "questionnaires_own"  on questionnaires  for all using (auth.uid() = user_id);
create policy "messages_own"        on messages        for all using (auth.uid() = user_id);
create policy "leads_own"           on leads           for all using (auth.uid() = user_id);

-- ================================================================
-- Trigger: auto-create profile + studio_settings on signup
-- ================================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );

  insert into studio_settings (user_id)
  values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
