# EHS Studio Manager

Photography CRM — v2.0

The app stores its data in PIBASE. The only third-party database code is the
`@supabase/supabase-js` package, used in `lib/pibase.js` as the client for
PIBASE's API protocol (PIBASE speaks the same protocol). Nothing else in the
app depends on Supabase, and no Supabase account or project is needed.

## Local setup

1. Start PIBASE and create a project using its dashboard or CLI.
2. Apply [`pibase-schema.sql`](pibase-schema.sql) to that project with PIBASE's owner SQL or `migration-apply` tool. Existing projects apply the numbered `pibase-migration-*.sql` files in order instead.
3. Sign up the studio owner, verify their email, and set `STUDIO_OWNER_USER_ID` to that PIBASE user ID.
4. Copy `.env.local.example` to `.env.local` and set the PIBASE project URL, anonymous key, service key, and a random contract signing secret.
5. Install and run the app:

```bash
npm ci
npm run dev
```

The public booking page is at `/booking`; the production host is
`booking.elliesheartstrings.com`. Email sending requires `RESEND_API_KEY`;
without it, use the contract's copyable signing link.

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
