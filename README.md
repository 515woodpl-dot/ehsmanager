# EHS Studio Manager

Photography CRM — v2.0

The app uses `@supabase/supabase-js`, so it can run against hosted Supabase or
PIBASE. For PIBASE, set `NEXT_PUBLIC_PIBASE_URL`, `NEXT_PUBLIC_PIBASE_ANON_KEY`,
and the server-only `PIBASE_SERVICE_KEY`; existing `NEXT_PUBLIC_SUPABASE_*`
variables remain supported.

## Setup

```bash
npm install
cp .env.local.example .env.local   # add Stripe keys when ready
npm run build
npm start                           # runs on port 3001
```

For a PIBASE project, apply `supabase-schema.sql` with the PIBASE owner SQL
tool or `migration-apply`, then use the project URL and keys shown in the
PIBASE dashboard. The SQL uses only the public schema plus PIBASE’s standard
`auth` helpers, so the app’s existing RLS policies continue to apply.

## Deploy update to server

```bash
# From your local machine
scp -r ehsmanager root@YOUR_IP:/var/www/

# On the server
cd /var/www/ehsmanager
npm install
npm run build
pm2 restart studio-manager
```
