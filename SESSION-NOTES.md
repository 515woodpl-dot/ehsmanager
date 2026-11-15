# Local Manager notes

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

## Business types

The manager works for photography and web design businesses. The type is
saved as `studio_settings.branding.businessType` (no migration; missing means
`photography`) and set from Settings → Business profile, or at sign-up
(`user_metadata.business_type`, applied on first load in `pages/index.js`).

`lib/businessTypes.js` holds everything that differs: wording (`session` /
`meeting`, `Session Types` / `Services`…), starting project types, stages,
contact form options, sample services, booking page copy, reminder text and
questionnaire questions. Components read it with `useTerms()`; server code
uses `config.terms` from `loadStudioConfig`; public pages get the type from
their API (`/api/public-booking`, `/api/public-form`). Don't hard-code
"session", "photography" or a business name in new UI or emails. Add it to
the presets instead.

Contracts: `AGREEMENTS` in `lib/contractTemplate.js` lists the agreements
(`photography`, `webdesign`, `webphoto`); `contractTemplateFor(key)` returns the
text. A new contract starts with the one for the business type and the builder
lets you pick another. A saved contract remembers its agreement in
`fields.agreement` (older ones: `fields.template`) and keeps it when reopened.
The combined agreement lives in `lib/webPhotoContract.js`: the template, its
field list (`WEB_PHOTO_SECTIONS`, rendered generically by the builder) and
`webPhotoValues()` (fees, optional clauses, highlights, missing details). To
change the wording or add a detail, edit that one file.

The Creative Services Agreement (`creative`, default for the Digital creative
studio type) is generated, not a fixed template: `lib/creativeContract.js`
builds the text from the ticked services (`fields.services`), numbering
sections as it goes. Fields carry a `service` so the builder shows and
requires only the ones that apply. `webphoto` is `retired`: not offered for
new contracts, still editable. The business name in the
agreement is the `{{businessName}}` field, filled from the business profile.

Internal names stay as they were (`bookings`, `session_catalog`,
`sessionTypes`, the `sessions` / `sessiontypes` view ids), only labels change.

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
- Optional `BOOKING_HOST`: a separate public booking host.
- Links: `appUrl(path, reqOrConfig)` uses `NEXT_PUBLIC_APP_URL`, else the request's host. Pass `req` (or a config loaded with `loadStudioConfig(db, id, req)`); don't hard-code a domain.

Integration secrets must be configured as server environment variables. The
Settings page reports whether each integration is ready without returning any
secret value to the browser.

Push notifications: `lib/push.js` → `notifyStudio(db, userId, { type, title,
body, url, tag })` sends to every device in `push_subscriptions` (migration
004). Types are `messages`, `documents`, `bookings`, `payments`, and each can be
switched off in Settings. VAPID keys are generated on first use and stored
encrypted in `studio_secrets`. The service worker (`public/sw.js`) shows the
notification and opens `url` when tapped. Call `notifyStudio` after the action
succeeds; it never throws.
