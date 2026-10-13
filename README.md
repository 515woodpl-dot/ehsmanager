# EHS Studio Manager

Photography studio CRM. The beta uses [PIBASE](https://github.com/515woodpl-dot/pibase) for accounts and data. A browser-only demo mode is available when PIBASE is not configured; its data stays in that browser and must not be used for real clients.

## Local setup

Requires Node.js 20.9 or newer.

```bash
npm ci
cp .env.local.example .env.local
npm run dev
```

Fill `.env.local` with a PIBASE project URL, anon key, and service key before testing real data. The `NEXT_PUBLIC_SUPABASE_*` variable names are retained because the app uses `@supabase/supabase-js` with PIBASE's compatible API. Only the anon key belongs in the browser. Keep `SUPABASE_SERVICE_ROLE_KEY` and `CONTRACT_SIGNING_SECRET` on the server.

## Create the PIBASE beta project

1. Deploy PIBASE behind HTTPS following its `docs/VPS.md` (or use an existing PIBASE server). Configure its SMTP settings so users can confirm accounts and recover passwords.
2. On the PIBASE host, run `./scripts/create-project.sh "EHS Studio Manager Beta"`. Store the project URL and keys shown once in a secret manager.
3. Apply [supabase-schema.sql](supabase-schema.sql) as the first project migration, using the project ID returned above:

   ```bash
   docker compose run --rm -T gateway migration-apply PROJECT_ID 0001_ehsmanager < /path/to/ehsmanager/supabase-schema.sql
   ```

4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CONTRACT_SIGNING_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BOOKING_URL=https://booking.elliesheartstrings.com`, and `BOOKING_HOST=booking.elliesheartstrings.com` in the app environment. Build and deploy the app with HTTPS.
5. Sign up the studio owner, confirm the signup email, and copy that PIBASE user ID to `STUDIO_OWNER_USER_ID` for the public contact form and booking page. Set `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` to send invoices, contracts, reminders, and lead notifications.
6. Create a client project, booking, invoice, and contract. Reload and verify they persist. Archive, restore, and delete a test project; verify the linked documents remain accessible with their client link cleared. Submit `/contact` and sign a test contract link. Check that a second account cannot read the first account's records.
7. Configure offsite PIBASE backups and perform a restore test before inviting beta users.

The schema uses built-in `gen_random_uuid()` and can be installed through PIBASE's project migration tool. If a project already has the PIBASE-compatible beta schema, apply [supabase-migration-002-booking.sql](supabase-migration-002-booking.sql) once as the next migration. The legacy `supabase-migration-001.sql` is only for older installations that used text invoice IDs. Do not apply it to a fresh project.

## Public booking site

Point `booking.elliesheartstrings.com` at the app deployment and provision HTTPS for that hostname. The app serves the pricing page at `/booking`; a host-specific rewrite also serves it at the booking hostname's root. The page uses **Session Types** in the admin sidebar. Create packages, review their prices and descriptions, then enable **Publish on booking page**. An empty catalog can load the nine reference packages as private drafts. Add HTTPS photo URLs to replace the built-in category artwork.

**Availability Settings** controls timezone, weekly hours, advance notice, booking window, buffer, and blocked dates. The **Calendar** page can block full dates or time ranges, filter sessions, and export an `.ics` file for import into another calendar; this is a one-way export, with no external calendar account connection. **Sessions** shows requests and lets the studio confirm or cancel them. **Discounts** manages coupons and gift cards. The booking page records a request and its estimated total; it does not collect payment or send a booking confirmation email. Gift cards created here are credit codes, not gift card purchases.

Public requests create or match a client, reserve time, and redeem any discount in one PIBASE transaction. Canceling or deleting a public booking frees the time and returns the discount. The dashboard loads new public requests on refresh. Set `STUDIO_OWNER_USER_ID` to the same account that manages Session Types; other accounts' packages remain private to their own admin view.

## Beta scope

Client projects, bookings, invoices, contracts, analytics, and the contact form are available with PIBASE. Invoices can be marked paid after an external payment is received. The Stripe payment intent and webhook routes are groundwork for a later checkout flow; the current UI does not collect card payments. The supplied contract PDF's legal clauses are transcribed into the template, with client and session fields filled from the app. The contract wording and signing process should be approved by the studio owner before sending to real clients.

## Production checks

```bash
npm ci
npm run build
npm audit --omit=dev
npm start
```

`npm start` serves port 3001. Configure a reverse proxy with HTTPS and set the same environment variables in the production runtime. PIBASE itself must have a stable HTTPS API URL, working SMTP, and monitored backups.
