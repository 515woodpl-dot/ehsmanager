-- ================================================================
-- Migration 003 — encrypted integrations, Stripe Checkout, RLS hardening
-- Apply once to an existing PIBASE project with
--   gateway migration-apply PROJECT_ID 0003_integrations < supabase-migration-003-integrations.sql
-- (fresh projects get this from supabase-schema.sql).
-- ================================================================

-- ── Encrypted per-studio Resend / Stripe credentials ─────────────
-- `secret` holds AES-256-GCM ciphertext produced by lib/secretBox.js with the
-- server-only INTEGRATIONS_ENCRYPTION_KEY. RLS is enabled with NO policies and
-- client grants are revoked below, so only the server's service key (whose
-- PIBASE role bypasses RLS) can read or write it.
create table if not exists integration_secrets (
  user_id     uuid not null references profiles(id) on delete cascade,
  provider    text not null check (provider in ('resend','stripe')),
  secret      text not null,
  settings    jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table integration_secrets enable row level security;

-- ── Stripe Checkout session tracking ─────────────────────────────
alter table invoices add column if not exists stripe_checkout_session_id text;

-- ── Profiles: users may read and edit their own row, but not delete it or
-- change their plan. ────────────────────────────────────────────────────
drop policy if exists "profiles_own" on profiles;
drop policy if exists profiles_select_own on profiles;
drop policy if exists profiles_update_own on profiles;
create policy profiles_select_own on profiles for select using (auth.uid() = id);
create policy profiles_update_own on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── PIBASE role hardening ──────────────────────────────────────────
-- PIBASE request roles are per project (p_<id>_anon, p_<id>_authenticated)
-- and receive table privileges directly through default privileges, so
-- revoking from the shared `anon`/`authenticated` roles would not remove them.
-- Migrations run as p_<id>_admin, which derives the project prefix.
-- Apply with `gateway migration-apply`; the owner SQL tab rejects GRANT/REVOKE.
do $$
declare
  prefix text := regexp_replace(current_user, '_admin$', '');
  anon_role text := prefix || '_anon';
  auth_role text := prefix || '_authenticated';
begin
  if current_user !~ '^p_.+_admin$' then
    raise exception 'Run this migration with PIBASE migration-apply (current role: %)', current_user;
  end if;
  -- integration_secrets: no client access at all; the service role bypasses RLS.
  execute format('revoke all on integration_secrets from %I, %I', anon_role, auth_role);
  -- profiles: signed-in users may only rename themselves / their business.
  execute format('revoke insert, update, delete on profiles from %I, %I', anon_role, auth_role);
  execute format('grant update (full_name, business_name) on profiles to %I', auth_role);
end $$;
