# Local Manager

A studio CRM for service businesses — v2.0. Clients, projects, bookings,
quotes, invoices, contracts, questionnaires and messages in one place.

It is set up for one of two kinds of business, chosen at sign-up or in
**Settings → Business profile → Type of business**:

- **Photography** — sessions, session types, the photography agreement.
- **Web design** — meetings, services, project stages from Inquiry to
  Launched, the website design agreement.

The choice sets the wording across the app, emails and client pages, the
starting lists and the contract template. It all lives in
[`lib/businessTypes.js`](lib/businessTypes.js); add another kind of business
there.

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
your own domain. Optionally set `BOOKING_HOST` to a separate host whose root
shows the booking page. Email sending needs a Resend API key and a sending
address on a domain verified in Resend (Settings → Email, or
`RESEND_API_KEY` / `RESEND_FROM_EMAIL`); without them, use the contract's
copyable signing link.

Set `NEXT_PUBLIC_APP_URL` to the manager's public address in production. If it
is empty, links in emails and webhook addresses use the address the signed-in
owner opens the app on.

## Deploy

One command installs a company on a server running PIBASE, and updates then
run on their own every night (backup, database updates, build, health check,
automatic roll back). Step-by-step for both PIBASE and the app:
[INSTALL.md](INSTALL.md); how updates work: [docs/DEPLOY.md](docs/DEPLOY.md).
