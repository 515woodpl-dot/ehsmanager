-- ================================================================
-- EHS Studio Manager — PIBASE/Supabase-compatible Schema
-- Apply as a project owner migration in PIBASE, or in Supabase SQL Editor.
-- ================================================================

-- PostgreSQL's built-in gen_random_uuid() avoids extension DDL, which PIBASE
-- deliberately blocks for project owners.

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
  id              uuid primary key default gen_random_uuid(),
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
  id          uuid primary key default gen_random_uuid(),
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
  id                  uuid primary key default gen_random_uuid(),
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
  id          uuid primary key default gen_random_uuid(),
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
  id          uuid primary key default gen_random_uuid(),
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
  id          uuid primary key default gen_random_uuid(),
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
  id          uuid primary key default gen_random_uuid(),
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
  id          uuid primary key default gen_random_uuid(),
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
  id          uuid primary key default gen_random_uuid(),
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
-- EHS booking catalog, public reservations, availability and discounts.
-- Apply once to an existing PIBASE project; a fresh project only needs supabase-schema.sql.

alter table studio_settings add column if not exists availability jsonb not null default '{"timezone":"America/New_York","noticeDays":1,"horizonDays":90,"bufferMinutes":0,"weekdays":{"0":[],"1":[{"start":"09:00","end":"17:00"}],"2":[{"start":"09:00","end":"17:00"}],"3":[{"start":"09:00","end":"17:00"}],"4":[{"start":"09:00","end":"17:00"}],"5":[{"start":"09:00","end":"17:00"}],"6":[]},"blockedDates":[],"blockedTimes":[]}'::jsonb;

create table if not exists session_catalog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  category text not null default 'Portrait',
  description text not null default '',
  image_url text,
  duration_minutes integer not null default 60 check (duration_minutes between 30 and 480 and duration_minutes % 30 = 0),
  price numeric(10,2) not null default 0 check (price >= 0),
  location text not null default '',
  color text not null default '#17bda5',
  public boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, slug)
);
alter table session_catalog enable row level security;
drop policy if exists session_catalog_own on session_catalog;
create policy session_catalog_own on session_catalog for all using (auth.uid() = user_id);

create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  code text not null,
  kind text not null check (kind in ('coupon','gift_card')),
  mode text not null default 'fixed' check (mode in ('fixed','percent')),
  amount numeric(10,2) not null check (amount > 0),
  balance numeric(10,2),
  uses integer not null default 0 check (uses >= 0),
  max_uses integer,
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, code)
);
alter table discount_codes enable row level security;
drop policy if exists discount_codes_own on discount_codes;
create policy discount_codes_own on discount_codes for all using (auth.uid() = user_id);

alter table bookings add column if not exists session_type_id uuid references session_catalog(id) on delete set null;
alter table bookings add column if not exists duration_minutes integer not null default 60;
alter table bookings add column if not exists price numeric(10,2);
alter table bookings add column if not exists discount_code text;
alter table bookings add column if not exists discount_amount numeric(10,2) not null default 0;
alter table bookings add column if not exists final_price numeric(10,2);
alter table bookings add column if not exists source text not null default 'manual';
alter table bookings add column if not exists discount_reversed boolean not null default false;

create table if not exists booking_slot_claims (
  booking_id uuid not null references bookings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  slot_start timestamp without time zone not null,
  primary key (user_id, slot_start)
);
alter table booking_slot_claims enable row level security;
drop policy if exists booking_slot_claims_own on booking_slot_claims;
create policy booking_slot_claims_own on booking_slot_claims for all using (auth.uid() = user_id);

-- This runs with the server-only PIBASE service key. Claims, client creation,
-- discount redemption and booking insertion commit or roll back together.
create or replace function public.create_public_booking(
  p_user_id uuid, p_session_id uuid, p_date date, p_time text,
  p_name text, p_email text, p_phone text, p_discount_code text default null
) returns uuid language plpgsql as $$
declare
  v_type session_catalog%rowtype;
  v_discount discount_codes%rowtype;
  v_client_id uuid;
  v_booking_id uuid := gen_random_uuid();
  v_discount_amount numeric(10,2) := 0;
  v_slot timestamp without time zone;
  v_slots integer;
  v_buffer integer;
begin
  select * into v_type from session_catalog where id = p_session_id and user_id = p_user_id and public = true;
  if not found then raise exception 'Session type is unavailable'; end if;
  if p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or substring(p_time from 4 for 2)::integer % 30 <> 0 then
    raise exception 'Invalid booking time';
  end if;
  select coalesce((availability->>'bufferMinutes')::integer,0) into v_buffer from studio_settings where user_id=p_user_id;
  v_slots := ceil((v_type.duration_minutes + greatest(0,least(coalesce(v_buffer,0),120)))::numeric / 30)::integer;
  v_slot := p_date + p_time::time;
  if p_discount_code is not null and btrim(p_discount_code) <> '' then
    select * into v_discount from discount_codes
      where user_id=p_user_id and upper(code)=upper(btrim(p_discount_code)) and active=true
      and (starts_on is null or starts_on<=p_date) and (ends_on is null or ends_on>=p_date)
      for update;
    if not found then raise exception 'Discount code is invalid'; end if;
    if v_discount.max_uses is not null and v_discount.uses>=v_discount.max_uses then raise exception 'Discount code has reached its limit'; end if;
    if v_discount.kind='gift_card' then
      if coalesce(v_discount.balance,0)<=0 then raise exception 'Gift card has no balance'; end if;
      v_discount_amount := least(v_type.price,v_discount.balance);
      update discount_codes set balance=balance-v_discount_amount,uses=uses+1 where id=v_discount.id;
    else
      v_discount_amount := least(v_type.price,case when v_discount.mode='percent' then round(v_type.price*v_discount.amount/100,2) else v_discount.amount end);
      update discount_codes set uses=uses+1 where id=v_discount.id;
    end if;
  end if;
  select id into v_client_id from clients where user_id=p_user_id and lower(email)=lower(p_email) order by created_at limit 1;
  if v_client_id is null then
    insert into clients(user_id,name,email,phone,type,status,date,notes)
    values(p_user_id,p_name,p_email,p_phone,v_type.name,'inquiry',p_date,'Booked via public booking page') returning id into v_client_id;
  end if;
  insert into bookings(id,user_id,client_id,client_name,type,date,time,location,status,notes,session_type_id,duration_minutes,price,discount_code,discount_amount,final_price,source)
  values(v_booking_id,p_user_id,v_client_id,p_name,v_type.name,p_date,p_time,v_type.location,'pending','Public booking request',v_type.id,v_type.duration_minutes,v_type.price,nullif(upper(btrim(p_discount_code)),''),v_discount_amount,v_type.price-v_discount_amount,'public');
  for i in 0..v_slots-1 loop
    insert into booking_slot_claims(booking_id,user_id,slot_start) values(v_booking_id,p_user_id,v_slot+i*interval '30 minutes');
  end loop;
  return v_booking_id;
end;
$$;
revoke all on function public.create_public_booking(uuid,uuid,date,text,text,text,text,text) from public;
grant execute on function public.create_public_booking(uuid,uuid,date,text,text,text,text,text) to service_role;

-- Cancelled or deleted requests release their slot and return unused discounts.
create or replace function public.release_booking_resources() returns trigger language plpgsql as $$
begin
  if tg_op='DELETE' then
    delete from booking_slot_claims where booking_id=old.id;
    if old.discount_code is not null and not old.discount_reversed then
      update discount_codes set uses=greatest(0,uses-1),
        balance=case when kind='gift_card' then coalesce(balance,0)+old.discount_amount else balance end
        where user_id=old.user_id and upper(code)=upper(old.discount_code);
    end if;
    return old;
  end if;
  if new.status='canceled' and old.status<>'canceled' then
    delete from booking_slot_claims where booking_id=old.id;
    if old.discount_code is not null and not old.discount_reversed then
      update discount_codes set uses=greatest(0,uses-1),
        balance=case when kind='gift_card' then coalesce(balance,0)+old.discount_amount else balance end
        where user_id=old.user_id and upper(code)=upper(old.discount_code);
    end if;
    new.discount_reversed := true;
    return new;
  end if;
  return new;
end;
$$;
drop trigger if exists release_booking_resources on bookings;
create trigger release_booking_resources before update of status or delete on bookings
  for each row execute function public.release_booking_resources();

-- ================================================================
-- Migration 003 — encrypted integrations, Stripe Checkout, RLS hardening
-- Apply once to an existing PIBASE project (fresh projects get this from
-- supabase-schema.sql).
-- ================================================================

-- ── Encrypted per-studio Resend / Stripe credentials ─────────────
-- `secret` holds AES-256-GCM ciphertext produced by lib/secretBox.js with the
-- server-only INTEGRATIONS_ENCRYPTION_KEY. RLS is enabled with NO policies, so
-- the anon/authenticated roles cannot read or write it at all; only the
-- server's service key can.
create table if not exists integration_secrets (
  user_id     uuid not null references profiles(id) on delete cascade,
  provider    text not null check (provider in ('resend','stripe')),
  secret      text not null,
  settings    jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table integration_secrets enable row level security;
revoke all on integration_secrets from anon, authenticated;

-- ── Stripe Checkout session tracking ─────────────────────────────
alter table invoices add column if not exists stripe_checkout_session_id text;

-- ── Profiles: users may read and edit their own row, but not delete it or
-- change their plan. ────────────────────────────────────────────────────
drop policy if exists "profiles_own" on profiles;
drop policy if exists profiles_select_own on profiles;
drop policy if exists profiles_update_own on profiles;
create policy profiles_select_own on profiles for select using (auth.uid() = id);
create policy profiles_update_own on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
revoke update on profiles from anon, authenticated;
grant update (full_name, business_name) on profiles to authenticated;

-- ── Public booking RPC: service key only ─────────────────────────
-- Supabase-compatible stacks grant EXECUTE to anon/authenticated by default
-- privileges, which `revoke ... from public` does not remove.
revoke all on function public.create_public_booking(uuid,uuid,date,text,text,text,text,text) from anon, authenticated;
