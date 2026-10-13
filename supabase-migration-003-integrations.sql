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
