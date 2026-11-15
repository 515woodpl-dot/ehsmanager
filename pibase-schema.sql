-- ================================================================
-- EHS Studio Manager — PIBASE schema
-- Apply as a project owner migration in PIBASE.
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
  branding        jsonb not null default '{}'::jsonb,      -- business details + logo
  integrations    jsonb not null default '{}'::jsonb,      -- non-secret integration options
  updated_at      timestamptz default now(),
  unique (user_id)
);

-- ── Push notification devices (server-only, no RLS policies) ──
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

-- ── Studio secrets (encrypted API keys; server-only, no RLS policies) ──
create table if not exists studio_secrets (
  user_id    uuid primary key references profiles(id) on delete cascade,
  payload    text not null,
  updated_at timestamptz not null default now()
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
alter table studio_secrets     enable row level security;  -- no policies: server only
alter table push_subscriptions enable row level security;  -- no policies: server only

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
-- Apply once to an existing PIBASE project; a fresh project only needs pibase-schema.sql.

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
  -- A canceled booking stays canceled. Its time slot and discount were
  -- given back when it was canceled, so reopening it would let them be used
  -- twice. Book again instead.
  if tg_op='UPDATE' and old.status='canceled' and new.status<>'canceled' then
    new.status := 'canceled';
    return new;
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

-- From migration 006 (things several people can do at the same moment)

-- ── Invoice numbers ───────────────────────────────────────────────
-- Unique per business and handed out in order, even when several invoices
-- are created at once (clients accepting quotes, two open tabs). Earlier
-- duplicates are renumbered first, newest copies getting new numbers.
do $$
declare r record; v_next bigint;
begin
  for r in
    select id, user_id from (
      select id, user_id, row_number() over (partition by user_id, number order by created_at, id) as n
      from invoices where number is not null
    ) d where n > 1
  loop
    select coalesce(max(substring(number from 2)::bigint), 1000) + 1 into v_next
      from invoices where user_id = r.user_id and number ~ '^#1[0-9]{3,}$';
    update invoices set number = '#' || v_next where id = r.id;
  end loop;
end $$;
create unique index if not exists invoices_user_number_unique on invoices (user_id, number) where number is not null;

create or replace function public.assign_invoice_number() returns trigger language plpgsql as $$
declare v_next bigint;
begin
  -- One business's numbering at a time; the lock lasts until commit, so the
  -- next waiting insert sees this number as taken.
  perform pg_advisory_xact_lock(hashtext('invoice-number:' || new.user_id::text));
  if new.number ~ '^#1[0-9]{3,}$'
     and not exists (select 1 from invoices where user_id = new.user_id and number = new.number and id <> new.id) then
    return new;
  end if;
  if new.number is not null and new.number !~ '^#1[0-9]{3,}$'
     and not exists (select 1 from invoices where user_id = new.user_id and number = new.number and id <> new.id) then
    return new;  -- an older style number that is still unique
  end if;
  select coalesce(max(substring(number from 2)::bigint), 1000) + 1 into v_next
    from invoices where user_id = new.user_id and number ~ '^#1[0-9]{3,}$' and id <> new.id;
  new.number := '#' || v_next;
  return new;
end;
$$;
drop trigger if exists assign_invoice_number on invoices;
create trigger assign_invoice_number before insert or update of number on invoices
  for each row execute function public.assign_invoice_number();

-- ── Conversations ─────────────────────────────────────────────────
-- Adds one message to a client's conversation (creating it if needed) in a
-- single step, so messages sent at the same moment are all kept and only one
-- conversation is created. Entries with an id already in the thread are
-- skipped (retried webhooks). Returns {"id": ..., "duplicate": true|false}.
create or replace function public.append_conversation_entry(
  p_user_id uuid, p_client_id uuid, p_from_name text, p_entry jsonb, p_unread boolean
) returns jsonb language plpgsql as $$
declare v_id uuid; v_thread jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('conversation:' || p_user_id::text || ':' || p_client_id::text));
  select id, thread into v_id, v_thread from messages
    where user_id = p_user_id and client_id = p_client_id
    order by updated_at desc limit 1 for update;
  if v_id is null then
    insert into messages(user_id, client_id, from_name, thread, unread, updated_at)
      values (p_user_id, p_client_id, p_from_name, jsonb_build_array(p_entry), p_unread, now())
      returning id into v_id;
    return jsonb_build_object('id', v_id, 'duplicate', false);
  end if;
  if p_entry ? 'id' and exists (select 1 from jsonb_array_elements(coalesce(v_thread, '[]'::jsonb)) e where e->>'id' = p_entry->>'id') then
    return jsonb_build_object('id', v_id, 'duplicate', true);
  end if;
  update messages set thread = coalesce(thread, '[]'::jsonb) || jsonb_build_array(p_entry), unread = p_unread, updated_at = now()
    where id = v_id;
  return jsonb_build_object('id', v_id, 'duplicate', false);
end;
$$;
revoke all on function public.append_conversation_entry(uuid, uuid, text, jsonb, boolean) from public;
grant execute on function public.append_conversation_entry(uuid, uuid, text, jsonb, boolean) to service_role;

-- ── Contract signatures ───────────────────────────────────────────
-- The client's signature and the studio's are written as merges into the
-- contract's fields, so one never removes the other. Each returns the
-- contract's fields after the change, or null when the change didn't apply
-- (already signed).
create or replace function public.sign_contract(
  p_contract_id uuid, p_signed_by text, p_signed_at text, p_fields jsonb
) returns jsonb language plpgsql as $$
declare v_fields jsonb;
begin
  update contracts set status = 'signed', signed_by = p_signed_by, signed_at = p_signed_at,
      fields = coalesce(fields, '{}'::jsonb) || coalesce(p_fields, '{}'::jsonb)
    where id = p_contract_id and status = 'pending'
    returning fields into v_fields;
  return v_fields;
end;
$$;
revoke all on function public.sign_contract(uuid, text, text, jsonb) from public;
grant execute on function public.sign_contract(uuid, text, text, jsonb) to service_role;

create or replace function public.countersign_contract(
  p_contract_id uuid, p_user_id uuid, p_signature jsonb
) returns jsonb language plpgsql as $$
declare v_fields jsonb;
begin
  update contracts set fields = coalesce(fields, '{}'::jsonb) || jsonb_build_object('studioSignature', p_signature)
    where id = p_contract_id and user_id = p_user_id
      and coalesce(fields->'studioSignature'->>'name', '') = ''
    returning fields into v_fields;
  return v_fields;
end;
$$;
revoke all on function public.countersign_contract(uuid, uuid, jsonb) from public;
grant execute on function public.countersign_contract(uuid, uuid, jsonb) to service_role;

create or replace function public.merge_contract_fields(
  p_contract_id uuid, p_user_id uuid, p_patch jsonb
) returns jsonb language plpgsql as $$
declare v_fields jsonb;
begin
  update contracts set fields = coalesce(fields, '{}'::jsonb) || coalesce(p_patch, '{}'::jsonb)
    where id = p_contract_id and user_id = p_user_id
    returning fields into v_fields;
  return v_fields;
end;
$$;
revoke all on function public.merge_contract_fields(uuid, uuid, jsonb) from public;
grant execute on function public.merge_contract_fields(uuid, uuid, jsonb) to service_role;

-- ── Leads from the contact form ──────────────────────────────────
-- Finds the client with this email or creates one, one submission at a
-- time per email, so simultaneous submissions don't create duplicates.
-- Returns the client's id and whether it was created.
create or replace function public.find_or_create_client(
  p_user_id uuid, p_name text, p_email text, p_phone text, p_type text, p_status text, p_notes text
) returns jsonb language plpgsql as $$
declare v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('client-email:' || p_user_id::text || ':' || lower(p_email)));
  select id into v_id from clients where user_id = p_user_id and lower(email) = lower(p_email) order by created_at limit 1;
  if v_id is not null then return jsonb_build_object('id', v_id, 'created', false); end if;
  insert into clients(user_id, name, email, phone, type, status, notes)
    values (p_user_id, p_name, p_email, nullif(p_phone, ''), nullif(p_type, ''), coalesce(nullif(p_status, ''), 'inquiry'), nullif(p_notes, ''))
    returning id into v_id;
  return jsonb_build_object('id', v_id, 'created', true);
end;
$$;
revoke all on function public.find_or_create_client(uuid, text, text, text, text, text, text) from public;
grant execute on function public.find_or_create_client(uuid, text, text, text, text, text, text) to service_role;

-- ── Bookings ──────────────────────────────────────────────────────
-- Only the public booking transaction may take a discount (it marks itself
-- with app.booking_rpc). A booking row inserted any other way, for example a
-- stale copy written back by an open tab after it was deleted, can't give a
-- discount back a second time.
create or replace function public.guard_booking_discount() returns trigger language plpgsql as $$
begin
  if new.discount_code is not null and coalesce(current_setting('app.booking_rpc', true), '') <> 'on' then
    new.discount_reversed := true;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_booking_discount on bookings;
create trigger guard_booking_discount before insert on bookings
  for each row execute function public.guard_booking_discount();

-- A rescheduled online booking keeps its time reserved: the old 30-minute
-- slots are released and the new ones claimed. A slot someone else already
-- holds is left to them (the studio chose the overlap).
create or replace function public.move_booking_claims() returns trigger language plpgsql as $$
declare v_buffer integer; v_slots integer; v_slot timestamp without time zone;
begin
  if new.status = 'canceled' or new.date is null or new.time is null or new.time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then return new; end if;
  if (new.date, new.time, new.duration_minutes) is not distinct from (old.date, old.time, old.duration_minutes) then return new; end if;
  if not exists (select 1 from booking_slot_claims where booking_id = new.id) then return new; end if;
  delete from booking_slot_claims where booking_id = new.id;
  select coalesce((availability->>'bufferMinutes')::integer, 0) into v_buffer from studio_settings where user_id = new.user_id;
  v_slots := ceil((coalesce(new.duration_minutes, 60) + greatest(0, least(coalesce(v_buffer, 0), 120)))::numeric / 30)::integer;
  v_slot := new.date + new.time::time;
  for i in 0..v_slots - 1 loop
    insert into booking_slot_claims(booking_id, user_id, slot_start)
      values (new.id, new.user_id, v_slot + i * interval '30 minutes')
      on conflict do nothing;
  end loop;
  return new;
end;
$$;
drop trigger if exists move_booking_claims on bookings;
create trigger move_booking_claims after update of date, time, duration_minutes on bookings
  for each row execute function public.move_booking_claims();

-- The public booking transaction, unchanged except that it marks itself so
-- guard_booking_discount lets its discount through.
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
  perform set_config('app.booking_rpc', 'on', true);
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
  perform pg_advisory_xact_lock(hashtext('client-email:' || p_user_id::text || ':' || lower(p_email)));
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
  perform set_config('app.booking_rpc', '', true);
  return v_booking_id;
end;
$$;
revoke all on function public.create_public_booking(uuid,uuid,date,text,text,text,text,text) from public;
grant execute on function public.create_public_booking(uuid,uuid,date,text,text,text,text,text) to service_role;

-- ── Linked clients belong to the same business ───────────────────
-- A signed-in owner can only link documents to their own clients.
do $$
declare t text;
begin
  foreach t in array array['invoices','bookings','contracts','quotes','questionnaires','messages'] loop
    execute format('drop policy if exists %I on %I', t || '_own', t);
    execute format('create policy %I on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id and (client_id is null or exists (select 1 from clients c where c.id = client_id and c.user_id = auth.uid())))', t || '_own', t);
  end loop;
end $$;
