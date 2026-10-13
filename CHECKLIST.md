# EHS Studio Manager — Change Checklist

A running log of what has been fixed or built, newest first. Add a section for
every round of changes, and keep the "Open / follow-ups" list current.

---

## 2026-10-13 (round 2) — Client documents: quotes, contracts, questionnaires, sessions, messages

### Client details on phones
- [x] Client details is now **one screen with three tabs** on phones:
      **Details · Create · Activity**. It's no longer two stacked panels with
      separate scroll areas. Desktop keeps the side-by-side layout.
      (`components/Projects.jsx`, `styles/globals.css`)

### Status colours (all client documents)
- [x] Cards are **light orange** while waiting (unpaid, awaiting
      acceptance or signature, not sent or not answered, upcoming) and
      **light green** once done (paid, accepted, signed, answered, session
      held). There's a small legend at the top of Activity.
      (`lib/documents.js` → `docTone`)
- [x] The same colours apply to the Invoices page cards and the Contracts
      page rows.
- [x] The Activity tab shows how many items are still waiting
      (e.g. "Activity · 3").

### Activity tab
- [x] Activity now lists **Invoices, Quotes, Contracts, Questionnaires,
      Sessions and Messages**, each with a "+ New" button. Every card opens
      the item to view, edit, send or delete it.
- [x] After creating anything, client details switches to Activity so the
      new item is visible right away.

### Contracts
- [x] Contracts were saving, but they couldn't be opened from client
      details. Now they open a viewer with the full contract, status,
      **Edit** (while unsigned), **Copy signing link**, **Email to client**
      and **Delete**.
- [x] After saving a new contract, an "Email it to [client] to sign?"
      step opens with an editable message and a "Review and sign contract"
      button. (`components/ActionModals.jsx` → `ContractModal`)
- [x] The contract builder can edit an existing contract.
      (`components/ContractBuilder.jsx`)
- [x] The contract email accepts the custom subject and message.
      (`pages/api/email-contract.js`)

### Questionnaires
- [x] Creating a questionnaire now goes to a **Send to client** step
      (email with an "Answer questionnaire" button). Skipping it leaves a
      **Draft** you can send later from Activity.
- [x] New public page `/questionnaire/[secure link]` where the client
      answers (short text, long text, yes/no) and submits.
      (`pages/questionnaire/[token].js`, `pages/api/submit-questionnaire.js`,
      `pages/api/email-questionnaire.js`)
- [x] Answered questionnaires turn green, and opening one shows the
      client's answers.

### Quotes
- [x] The quote editor is the same as the invoice editor: full-width items
      with descriptions, discount, tax and notes, plus a valid-until date.
      Quotes are numbered **Q-1001, Q-1002…**
- [x] **Saved items:** any item used before (session types, past quotes,
      past invoices) can be picked from "+ Add a saved item…" or by typing
      its name. Description and price fill in automatically. This works in
      invoices too. (`components/LineItemBuilder.jsx`, `buildItemCatalog`)
- [x] After creating a quote, an "Email it to [client]?" step opens with a
      **View & accept quote** button.
- [x] New public page `/quote/[secure link]` with an **Accept quote**
      button. When the client accepts, the quote turns green and an
      **unpaid invoice (#1xxx) is created automatically** with the same
      items. The client then sees a "View your invoice" link.
      (`pages/quote/[token].js`, `pages/api/accept-quote.js`)
- [x] Expired quotes (past valid-until) can't be accepted online.
- [x] In the app, "Accepted → create invoice" does the same by hand, for
      quotes accepted by phone or in person.

### Sessions
- [x] Scheduling a session shows a confirmation with the date ("Session
      scheduled · Saturday, December 5, 2026") and switches to Activity,
      where the new session appears.
- [x] Sessions in Activity open to **edit** (including the
      pending/confirmed/canceled status) or **delete**.

### Messages
- [x] **Bug:** "New message" in client details only saved a note in the
      app and never emailed the client. It now sends a real email through
      Resend (same as the Inbox) and shows an error if it can't, e.g. a
      missing email address.
- [x] Messages appear in Activity.

### Removed
- [x] **Client Gallery** removed from the app entirely (the button, the
      modal and its code).

### Behind the scenes
- [x] When you come back to the app tab, it reloads quotes, questionnaires,
      contracts and invoices, so client actions (accepting, answering,
      signing) show up. This only happens when there are no unsaved local
      changes. (`pages/index.js`)
- [x] Quote numbers, linked invoice and accepted date are stored inside the
      quote's `line_items` JSON, so **no database migration is needed**.
- [x] Each document type has its own link type, signed with
      `CONTRACT_SIGNING_SECRET`. A quote link can't open an invoice,
      questionnaire or contract. (`lib/signingTokens.js`)
- [x] `/quote` and `/questionnaire` added to the public routes.
      (`pages/_app.js`)
- [x] Shared layout for the public invoice, quote and questionnaire pages.
      (`components/PublicDocument.jsx`)

### Verified
- [x] `next build` passes.
- [x] Headless-browser click-through at phone (390px) and desktop widths:
      phone tabs; Activity colours; accepting quote Q-1001 created invoice
      #1005; a saved item auto-filled its description; the quote, contract
      and questionnaire send steps appear; an answered questionnaire shows
      its answers; sessions can be created, then edited and deleted;
      messages call the real email API; gallery gone.
- [x] Token check: each link type is rejected by every other type's check.
- [ ] Not tested against a live PIBASE or Resend setup (no backend in the
      test environment). Please try one real quote acceptance and one
      questionnaire.

---

## 2026-10-13 — Client details, invoices and invoice emails

### Bugs fixed
- [x] **Client details edits didn't show after Save.** The client details
      modal kept a copy of the client from the moment the card was clicked,
      so the save worked but the screen still showed the old values. It now
      always shows the latest saved data. (`components/Projects.jsx`)
- [x] Clicking a card on the **Clients** page now opens the full client
      details (with Get Started and Activity tabs). The pencil icon still
      opens quick edit. (`components/Clients.jsx`)
- [x] The client name can no longer be saved blank.

### New invoice screen
- [x] Each line item is now a full-width card with **Item name, Qty, Price,
      Amount and a Description** field. It no longer gets squeezed, and it
      stacks properly on phones. (`components/LineItemBuilder.jsx`,
      `styles/globals.css`)
- [x] **+ New invoice** on the Invoices page now uses the same full editor
      (pick a client and add line items) instead of a single amount box.
      (`components/InvoiceModals.jsx`, `components/Pages.jsx`)
- [x] The total shown in the editor uses the same math as the saved total.

### Email the client after creating an invoice
- [x] After **Create invoice**, a "Email it to [client]?" step opens with
      an editable template ("Hi [first name], … your invoice #1xxx for $X
      is ready … click the button below") and a live preview with a
      **View invoice** button.
- [x] **Send** on the Invoices page opens the same email step.
- [x] New public page `/invoice/[secure link]` that the client sees from the
      button. It shows the items, descriptions, totals, balance and notes,
      and has print or save as PDF. (`pages/invoice/[token].js`)
- [x] Invoice links are signed with `CONTRACT_SIGNING_SECRET` and can't be
      used as contract-signing links. (`lib/signingTokens.js`)
- [x] `/invoice` added to the public routes so clients aren't sent to the
      login page. (`pages/_app.js`)
- [x] The email API accepts the custom subject and message.
      (`pages/api/email-invoice.js`)

### Invoice numbers
- [x] Invoices are now numbered **#1001, #1002, …** instead of showing the
      long UUID. (`lib/invoices.js`)
- [x] Existing invoices (UUID only or `INV-001` style) get a #1xxx number
      automatically on the next load, oldest first, and it's saved.
      (`pages/index.js`)
- [x] Numbers are shown everywhere: invoice cards, the Activity tab,
      Analytics, the payment modal, global search and emails.

### Activity tab (client details)
- [x] Invoices in Activity are clickable and open the editor to **edit,
      delete, or save and email** them.
- [x] **+ New invoice** button added directly in Activity.
- [x] Invoices page cards also have **Edit**, and the invoice detail view
      has **Edit / Email client / Delete**.

### Verified
- [x] `next build` passes.
- [x] Click-through in a headless browser at desktop and phone widths:
      edit client → saved values show; Activity invoices open in the
      editor; create invoice → email step appears; numbering produces
      #1001…#1006 with the old UUID invoice renumbered.

---

## Open / follow-ups
- [ ] The public invoice page doesn't take card payments yet. Stripe payment
      intents exist (`/api/create-payment-intent`) but have no client-facing
      pay button.
- [ ] `NEXT_PUBLIC_APP_URL` must be set in production so email buttons
      point at the right domain.
- [ ] No notification email to the studio yet when a client accepts a
      quote or answers a questionnaire. It only shows up in the app.
- [ ] The Inbox doesn't receive client replies. Replies go to the studio's
      email address.
