-- Proposals: expiry date and client decline. Apply once; safe to re-run.
alter table proposals add column if not exists valid_until date;          -- last day it can be accepted
alter table proposals add column if not exists declined_at timestamptz;
alter table proposals add column if not exists decline_reason text;
