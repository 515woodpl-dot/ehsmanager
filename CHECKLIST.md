# EHS Studio Manager — Change Checklist

A running log of what has been fixed or built, newest first. Add a section for
every round of changes, and keep the "Open / follow-ups" list current.

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
- [ ] Contracts and sessions in Activity are still read-only (same
      treatment as invoices if wanted).
- [ ] The public invoice page doesn't take card payments yet. Stripe payment
      intents exist (`/api/create-payment-intent`) but have no client-facing
      pay button.
- [ ] `NEXT_PUBLIC_APP_URL` must be set in production so email buttons
      point at the right domain.
