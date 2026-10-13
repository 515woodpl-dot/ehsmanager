# EHS Studio Manager

Photography CRM — v2.0

The app stores its data in PIBASE. It uses `@supabase/supabase-js` solely as
a client for PIBASE's compatible API protocol.

## Local setup

1. Start PIBASE and create a project using its dashboard or CLI.
2. Apply [`supabase-schema.sql`](supabase-schema.sql) to that project with PIBASE's owner SQL or `migration-apply` tool. The SQL filename is historical; it targets PIBASE.
3. Sign up the studio owner, verify their email, and set `STUDIO_OWNER_USER_ID` to that PIBASE user ID.
4. Copy `.env.local.example` to `.env.local` and set the PIBASE project URL, anonymous key, service key, and a random contract signing secret.
5. Install and run the app:

```bash
npm ci
npm run dev
```

The public booking page is at `/booking`; the production host is
`booking.elliesheartstrings.com`.

## Email (Resend) and payments (Stripe)

Set `INTEGRATIONS_ENCRYPTION_KEY` (`openssl rand -base64 32`), then apply
[`supabase-migration-003-integrations.sql`](supabase-migration-003-integrations.sql)
to the PIBASE project. Use `migration-apply`, not the owner SQL tab, because the
SQL tab rejects the GRANT/REVOKE statements:

```bash
docker compose run --rm -T gateway migration-apply PROJECT_ID 0003_integrations \
  < supabase-migration-003-integrations.sql
```

Then open **Integrations** in the app:

- **Resend**: API key, a from address on a domain verified in Resend, and an
  optional reply-to. Use **Test connection** to send yourself a test email.
- **Stripe**: a secret key (or a restricted key with write access to Checkout
  Sessions) and the webhook signing secret. In Stripe → Developers → Webhooks,
  add the endpoint URL shown on the page and subscribe to
  `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

Keys are encrypted with AES-256-GCM before they are stored in the
`integration_secrets` table. The migration enables RLS with no policies and
revokes the project's `p_<id>_anon` and `p_<id>_authenticated` grants, so only
the server's PIBASE service key can read it. Keys are never returned to the browser.

Once Stripe is connected, invoice emails include a **Pay** button and the
Invoices page has a **Pay link** button. Clients pay on Stripe Checkout, and the
webhook marks the invoice paid or partial.

Without Resend, use the contract's copyable signing link.

## Branding (logo, contract cover photo, signature)

Apply [`supabase-migration-004-branding.sql`](supabase-migration-004-branding.sql)
with `migration-apply`, then open **Branding** in the app to upload your logo
and contract cover photo and to draw your studio signature once. The signature
appears as the studio's signature on every contract, and clients draw (or type)
their own when they sign. Images are resized in the browser, checked on the
server, and kept in the server-only `studio_assets` table.

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
