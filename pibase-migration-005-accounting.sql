-- Accounting: expenses ledger + accounting settings (sales tax rate, filings).
-- Apply once to the existing PIBASE project; safe to re-run.

create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  date        date not null,
  vendor      text,
  category    text not null default 'Other',
  amount      numeric(10,2) not null default 0,
  method      text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists expenses_user_date on expenses(user_id, date);
alter table expenses enable row level security;
drop policy if exists expenses_own on expenses;
create policy expenses_own on expenses for all using (auth.uid() = user_id);

-- { "taxRate": 6.625, "taxName": "NJ Sales Tax", "filing": "quarterly", "filings": { "2026-Q1": { "filedOn": "2026-04-18", "amount": 123.45, "note": "" } } }
alter table studio_settings add column if not exists accounting jsonb not null default '{}'::jsonb;
