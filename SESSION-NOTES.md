# EHS Studio Manager — Session Handoff
> Archived handoff notes. The current app uses PIBASE only. Follow README.md
> and .env.local.example for setup; the legacy deployment details below are obsolete.
## Use this to start a new chat with Claude

## Current bug report — 2026-10-13

- Pull the latest code and rebuild before making fixes.
- Dashboard client cards are not clickable.
- The UI needs better mobile support.
- Some content flashes during loading/refresh.
- Contract cards are not opening correctly; the demo contract placeholder text is shown instead of the editable/final contract content.

---

## GitHub Repo

**https://github.com/515woodpl-dot/ehsmanager**

Username: `515woodpl-dot`
Token: `<GITHUB_TOKEN — see your password manager>`

---

## Live URL

**https://manager.elliesheartstrings.com**
Public contact form: **https://manager.elliesheartstrings.com/contact**
Main website (separate app): **https://elliesheartstrings.com**

---

## Server

- **Digital Ocean droplet:** 165.227.198.183
- **OS:** Ubuntu 24
- **Main site:** port 3000 (PM2 process: `ellies`)
- **Studio Manager:** port 3001 (PM2 process: `studio-manager`)
- **Nginx:** reverse proxy with SSL via Let's Encrypt
- **Deploy command:** `bash /var/www/ehsmanager/deploy.sh`

---

## Environment Variables

Live in `/var/www/ehsmanager/.env.local` on the server (not in git):

```
NEXT_PUBLIC_SUPABASE_URL=https://jniqpltbpqukpanvardt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<see /var/www/ehsmanager/.env.local on server>
SUPABASE_SERVICE_ROLE_KEY=<see /var/www/ehsmanager/.env.local on server>
RESEND_API_KEY=<RESEND_API_KEY — see .env.local on server>
HEARTBEAT_SECRET=<HEARTBEAT_SECRET — see .env.local on server>
```

---

## Tech Stack

- Next.js 14.2.3 (Pages Router)
- React 18
- Chart.js (analytics)
- Stripe (API routes ready, no keys connected yet)
- papaparse + xlsx (CSV/XLSX import)
- **Supabase** (Postgres + Auth) — Phase 1 complete
- **Resend** (transactional email) — Phase 3 complete
- PM2 + Nginx on Digital Ocean

---

## Supabase

- **Project URL:** https://jniqpltbpqukpanvardt.supabase.co
- **Schema:** already run — all tables created with RLS + auto-signup trigger
- **Free tier note:** Supabase pauses after 1 week of inactivity. Heartbeat cron keeps it alive.

---

## Resend

- **Sending from:** hello@elliesheartstrings.com
- **Domain:** already verified (used for receiving on main site)
- **2nd API key** used for studio manager (separate from main site key)

---

## File Structure

```
ehsmanager/
├── components/
│   ├── ActionModals.jsx
│   ├── Clients.jsx
│   ├── ContactForm.jsx
│   ├── ContractBuilder.jsx
│   ├── LineItemBuilder.jsx
│   ├── Pages.jsx             — Dashboard, Analytics, Calendar, Invoices, Contracts, Inbox
│   ├── Projects.jsx
│   └── UI.jsx
├── lib/
│   ├── contractTemplate.js
│   ├── data.js               — Seed data, localStorage helpers
│   ├── db.js                 — Supabase data layer (all CRUD, localStorage fallback)
│   ├── email.js              — Resend client + branded HTML email wrapper
│   ├── stripe.js
│   ├── supabase.js           — Supabase client singleton
│   └── tokens.js
├── pages/
│   ├── _app.js               — Auth-aware wrapper
│   ├── index.js              — Main app
│   ├── login.js              — Login/signup page
│   ├── contact.js            — Public contact form
│   └── api/
│       ├── create-payment-intent.js
│       ├── email-contract.js
│       ├── email-invoice.js
│       ├── email-lead.js
│       ├── email-reminder.js
│       ├── heartbeat.js
│       └── webhook.js
├── scripts/
│   └── heartbeat.sh
├── styles/
│   └── globals.css
├── supabase-schema.sql       — Run once in Supabase SQL editor
├── deploy.sh
└── SESSION-NOTES.md
```

---

## Features Built

| Version | Feature |
|---------|---------|
| 1.0–1.8 | Full CRM: projects, clients, calendar, invoices, contracts, inbox, contact form, mobile |
| 1.9 | Analytics real data, contract signature modal |
| 2.0 | Supabase auth + database (Phase 1) |
| 2.1 | Supabase heartbeat (API route + cron) |
| 2.2 | Resend email: invoices, contracts, reminders, lead notifications (Phase 3) |

---

## First-Time Server Setup (THIS SESSION's code not yet deployed)

```bash
# 1. Deploy
bash /var/www/ehsmanager/deploy.sh

# 2. Set env vars
nano /var/www/ehsmanager/.env.local
# Paste the env vars from the Environment Variables section above

# 3. Restart to pick up env vars
cd /var/www/ehsmanager && pm2 restart studio-manager

# 4. Heartbeat cron (one-time)
chmod +x /var/www/ehsmanager/scripts/heartbeat.sh
crontab -e
# Add: 0 8 */3 * * /var/www/ehsmanager/scripts/heartbeat.sh >> /var/log/ehs-heartbeat.log 2>&1

# 5. Run Supabase schema (one-time)
# supabase.com → SQL Editor → paste supabase-schema.sql → Run
```

---

## Known Issues

- Gallery is URL-only (no file upload)
- Contract signing stores typed name — no DocuSign-style service
- No PDF export for invoices or contracts
- Stripe not connected (routes exist, no keys)
- Tenant emails send from the verified elliesheartstrings.com address (display name is per-tenant); per-tenant domain verification is a future Phase 2/4 item
- SECURITY: old secrets exist in git history — rotate GitHub token, Supabase service role key, and Resend key (see below)

## v2.3 SaaS Hardening (this session)

- .env.local removed from git; secrets scrubbed from this doc
- Diff-sync engine: all CRUD (clients, invoices, bookings, contracts, quotes, questionnaires, messages) now persists to Supabase automatically (pages/index.js + lib/db.js syncCollections)
- Entity IDs are real UUIDs (crypto.randomUUID)
- Invoices: uuid primary key + per-tenant INV-xxx display number (run supabase-migration-001.sql if schema was already created)
- Public contact form is server-side: /api/public-form GET (settings) + POST (lead → DB + owner email). Requires STUDIO_OWNER_USER_ID env var (your Supabase user id, from Supabase → Authentication → Users after signup)
- Email routes (/api/email-invoice|contract|reminder) require a Supabase session token and use tenant branding from profiles (business_name, full_name, reply-to owner email)

---

## SaaS Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Done | Supabase auth + database |
| Phase 2 | Pending | Stripe Billing (subscriptions) + Stripe Connect (client payments) |
| Phase 3 | ✅ Done | Resend email (invoices, contracts, reminders, lead notifications) |
| Phase 4 | Pending | PDF export, onboarding flow, landing page |

**Pricing:** Free ($0, 5 clients) / Pro ($19/mo) / Business ($39/mo, team)

---

## How to Start Next Session

Paste this entire document and say:

> "Here's my project context. I'm building EHS Studio Manager. The GitHub repo is https://github.com/515woodpl-dot/ehsmanager. I want to work on [whatever you want next]."

## 2026-10-13 white-screen fix

- Root cause: production `NEXT_PUBLIC_PIBASE_URL` pointed to the standalone `pibase.elliesheartstrings.com` endpoint, whose TLS/DNS path was failing.
- Fix: switched the manager to the working same-origin proxy, `https://manager.elliesheartstrings.com/pibase`, rebuilt, and restarted PM2.
- Added a visible auth loading/error fallback in `pages/_app.js` so session failures cannot render a blank page.
- Verified proxy login, authenticated client REST access, production build, and live HTTP 200.
