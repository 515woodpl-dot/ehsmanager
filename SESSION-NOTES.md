# EHS Studio Manager notes

## Backend

PIBASE is the only backend for authentication, database access, public booking,
contact leads, contracts, invoices, and application settings.

The app uses the `@supabase/supabase-js` package only as a protocol compatible
JavaScript client for PIBASE. It does not connect to or require a Supabase
project.

Required server configuration is documented in `.env.local.example` and can be
checked from the authenticated **Settings** page. Never store Resend, Stripe,
or PIBASE service secrets in browser storage or tenant records.

## Local development

1. Run PIBASE on `http://localhost:18080`.
2. Create a PIBASE project and apply `supabase-schema.sql`. The filename is
   historical; the schema targets PIBASE.
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
