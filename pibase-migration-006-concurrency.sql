-- Migration 006: things several people can do at the same moment.
-- Applied automatically by scripts/migrate.mjs; safe to run more than once.

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
