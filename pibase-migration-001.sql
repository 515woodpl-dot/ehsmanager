-- ================================================================
-- Migration 001 — run this if you already ran the original schema
-- Apply in PIBASE with the owner SQL or migration-apply tool
-- ================================================================

-- Invoices: switch from text PK ("INV-001") to uuid PK + display number.
-- Old text IDs would collide across tenants.
alter table invoices add column if not exists number text;

-- Migrate: copy old text ids into number, replace pk with uuid
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'invoices' and column_name = 'id' and data_type = 'text'
  ) then
    update invoices set number = id where number is null;
    alter table invoices drop constraint invoices_pkey;
    alter table invoices add column id_new uuid default gen_random_uuid();
    update invoices set id_new = gen_random_uuid() where id_new is null;
    alter table invoices drop column id;
    alter table invoices rename column id_new to id;
    alter table invoices add primary key (id);
  end if;
end $$;
