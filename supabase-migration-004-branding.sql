-- ================================================================
-- Migration 004 — studio branding assets (logo, contract cover, signature)
-- Apply once to an existing PIBASE project with
--   gateway migration-apply PROJECT_ID 0004_branding < supabase-migration-004-branding.sql
-- (fresh projects get this from supabase-schema.sql).
-- ================================================================

-- Images uploaded under Admin → Branding, stored base64-encoded. Only the
-- server (service key) reads or writes them: logo and cover are served by
-- /api/brand/<user>/<kind>; the signature is embedded server-side in the
-- contracts it signs.
create table if not exists studio_assets (
  user_id       uuid not null references profiles(id) on delete cascade,
  kind          text not null check (kind in ('logo','cover','signature')),
  content_type  text not null check (content_type in ('image/png','image/jpeg','image/webp')),
  data          text not null,
  updated_at    timestamptz not null default now(),
  primary key (user_id, kind)
);
alter table studio_assets enable row level security;

-- PIBASE request roles are per project and get table privileges through
-- default privileges; revoke them so browsers can't reach this table at all.
do $$
declare
  prefix text := regexp_replace(current_user, '_admin$', '');
begin
  if current_user !~ '^p_.+_admin$' then
    raise exception 'Run this migration with PIBASE migration-apply (current role: %)', current_user;
  end if;
  execute format('revoke all on studio_assets from %I, %I', prefix || '_anon', prefix || '_authenticated');
end $$;
