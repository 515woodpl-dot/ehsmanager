# EHS Studio Manager — Session Notes
## Changes built: 1.4 (Action Modals)

---

## What was built

### 1.4a — Invoice modal (full line-item builder)
- Item name, description, qty, price per line
- Add / remove unlimited items
- Subtotal → discount (% or $) → tax (%) → total
- Notes field ("Thank you for your business")
- Due date picker
- Shows previous invoices for same client
- Creates and links invoice to client on save

### 1.4b — Contract modal (auto-fill from your real template)
- Pre-fills: client name, email, session type, session date/time, location, total fee, retainer (50%), remaining amount, due date, effective date
- Edit / Preview tab toggle
- Editable before saving
- Saves linked to client

### 1.4c — Quote modal
- Same line-item builder as invoice
- Valid until date
- Shows previous quotes; click any to reload it as a starting point
- Saves to `quotes[]` linked to client

### 1.4d — Questionnaire modal
- Editable title
- Default questions pre-loaded (How did you hear about us? etc.)
- Add custom questions, set type: short text / long text / yes-no
- Remove any question
- Saves to `questionnaires[]` linked to client

### 1.4e — Session modal
- Session type (from your custom types)
- Date (required), time, location
- Notes for client
- Live preview of scheduled session
- Creates booking linked to client

### 1.4f — Message modal
- Shows last 3 messages in existing thread (if any)
- Compose new message
- Saves directly to Inbox thread for that client

### 1.4g — Gallery modal
- Paste gallery URL + optional label
- Multiple links per client
- Links saved to client record, open in new tab

---

## Deploy to server

```bash
# On your local machine
cd /path/to/project
git add -A
git commit -m "1.4 - Action modals: Invoice, Contract, Quote, Questionnaire, Session, Message, Gallery"
git push origin main

# On the server
ssh root@YOUR_DROPLET_IP
cd /var/www/ehsmanager
git fetch origin
git reset --hard origin/main
npm install
npm run build
pm2 restart studio-manager
```

---

## Pending changes (locked, not yet built)

| ID | Description | Status |
|----|-------------|--------|
| 1.2 | Projects rebuild | ✅ Built |
| 1.2.1 | Project modal tweaks, CSV import, icon sizing | ✅ Built |
| 1.3 | Contact form + public /contact page | ✅ Built |
| 1.4 | Action modals (Invoice, Contract, Quote, etc.) | ✅ Built |

---

## Next session ideas to consider

- **1.5** — Invoice PDF export (generate a printable/downloadable PDF from an invoice)
- **1.6** — Client portal (public page where clients can view their contract, invoice, pay, fill questionnaire)
- **1.7** — Email notifications (send invoice/contract to client email via SendGrid or Resend)
- **1.8** — Dashboard notifications / reminders (upcoming sessions, overdue invoices)
- **Stripe live keys** — swap test keys for live keys when ready to accept real payments

---

## File structure reference

```
ehsmanager/
├── components/
│   ├── ActionModals.jsx     ← NEW — all 7 action modals
│   ├── LineItemBuilder.jsx  ← NEW — shared invoice/quote line items
│   ├── Projects.jsx         ← UPDATED — wired up action modals
│   ├── Clients.jsx
│   ├── ContactForm.jsx
│   ├── Pages.jsx
│   └── UI.jsx
├── lib/
│   ├── contractTemplate.js  ← NEW — Ellie's contract with auto-fill
│   ├── data.js              ← UPDATED — added quotes, questionnaires
│   ├── stripe.js
│   └── tokens.js
├── pages/
│   ├── index.js
│   ├── contact.js
│   ├── _app.js
│   └── api/
│       ├── create-payment-intent.js
│       └── webhook.js
└── styles/
    └── globals.css
```

---

## Notes

- All data saved to `localStorage` under key `ehs-studio-v1`
- Contract template lives in `lib/contractTemplate.js` — edit it there to update the default text
- Stripe keys go in `.env.local` (copy from `.env.local.example`)
- App runs on port 3001 in production (`npm start`)
