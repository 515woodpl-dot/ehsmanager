# EHS Studio Manager notes

## Backend

PIBASE is the only backend for authentication, database access, public booking,
contact leads, contracts, invoices, and application settings.

The `@supabase/supabase-js` package is the only Supabase-related dependency and
is core: PIBASE implements the same API protocol, so the package is used as
PIBASE's JavaScript client. Import it only in `lib/pibase.js`; everything else
uses `pibase` / `createServiceClient` from there. No Supabase project or account
is used. Don't add new Supabase names to files, docs or code.

Required server configuration is documented in `.env.local.example`.
Business details, logo, and Resend/Stripe keys can be entered on the
authenticated **Settings** page. Keys entered there are encrypted with
`SETTINGS_ENCRYPTION_KEY` and stored in `studio_secrets`, a table with RLS on
and no policies (server-only). They are never returned to the browser (only
their last 4 characters). Never store secrets in browser storage or in
browser-readable tables. Environment variables remain the fallback.

Client replies: outgoing emails set `Reply-To` to
`reply+<client id><check>@<receiving domain>` (plus the studio email if
chosen). Resend's `email.received` webhook (`/api/inbound-email?studio=<id>`)
adds the reply to the client's conversation. Clients can also use their
private chat page at `/chat/<token>`.

## Local development

1. Run PIBASE on `http://localhost:18080`.
2. Create a PIBASE project and apply `pibase-schema.sql` (existing projects:
   apply the numbered `pibase-migration-*.sql` files in order).
3. Copy `.env.local.example` to `.env.local` and add the PIBASE project keys.
4. Run `npm ci` and `npm run dev`.

The manager runs at `http://localhost:3000`, public booking at `/booking`, the
contact form at `/contact`, and client signing pages at `/sign/[token]`.

## Production integrations

- Resend: contract, invoice, reminder, inquiry, and inbox email delivery.
- Stripe: payment intents and webhook payment confirmation.
- `booking.elliesheartstrings.com`: public booking host.

Integration secrets must be configured as server environment variables. The
Settings page reports whether each integration is ready without returning any
secret value to the browser.
