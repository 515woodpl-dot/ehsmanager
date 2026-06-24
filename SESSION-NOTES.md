# EHS Studio Manager — Session Handoff
## Use this to start a new chat with Claude

---

## GitHub Repo

**https://github.com/515woodpl-dot/ehsmanager**

Username: `515woodpl-dot`
Token: `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`

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaXFwbHRicHF1a3BhbnZhcmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzM5NzMsImV4cCI6MjA5Nzg0OTk3M30.EkanvQ0Xed9e62VS5rxHsjTOPSoE8tYjg8wGydkpnz8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaXFwbHRicHF1a3BhbnZhcmR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI3Mzk3MywiZXhwIjoyMDk3ODQ5OTczfQ.m-qNwy2W9rNTCS7ljA3S2SRUFUSw7XgBJhapFDIGRzA
RESEND_API_KEY=re_YkAAkb6T_6QCNDm47NCrprB4yQ74WQY3V
HEARTBEAT_SECRET=ehs-heartbeat-2026
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
