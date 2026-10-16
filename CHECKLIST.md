# EHS Studio Manager — Change Checklist

A running log of what has been fixed or built, newest first. Add a section for
every round of changes, and keep the "Open / follow-ups" list current.

---

## 2026-10-16 (round 9) — Payment plans, studio countersigning, contract highlights, live chat

### ⚠️ Before using
- [ ] No database migration needed. Payment plans and payments live with the
      invoice's line items; signatures live in the contract's fields.
- [ ] For online payments: in Stripe, add the webhook to
      `https://<your app>/api/webhook` with the event
      **`payment_intent.succeeded`**, and save the `whsec_…` secret in
      Settings → Payments. Stripe Checkout needs no extra events.

### Invoices — clients pay the installment, not the whole invoice
- [x] **Payment plan** on every invoice: *Pay in full*, *Deposit + balance*
      (50% today, the rest by the due date) or *3 payments*. Each payment
      has a name, amount and due date; add or remove payments, and the last
      one always takes whatever is left so it adds up to the total.
- [x] **"Let the client pay the whole balance at once"** switch per invoice
      (on by default). Turn it off and the client can only pay the
      installment that's due.
- [x] **Client invoice page** leads with **Due now** (e.g. *Deposit ·
      $600*) and its due date, then the plan with what's paid and what's
      left. The total is still on the invoice, but the pay button is for
      the installment.
- [x] **Pay online**: *Pay Deposit · $600* through secure Stripe Checkout,
      plus *Pay the full balance instead* when allowed. The amount is always
      worked out on the server from the invoice. The browser can't change it.
- [x] Stripe payments are added to what's already paid instead of marking
      the whole invoice paid. Each payment is counted once, even if Stripe
      sends it twice, and the app tells you which installment came in
      ("💰 Payment received · Deposit").
- [x] **Record payment** (replaces "Mark paid") takes any amount, with
      one-tap *Deposit · $600* / *Full balance* buttons, and adds Bank
      transfer (Zelle/Venmo/check) as a method. Partial payments leave the
      invoice orange ("partial") and record the date and method.
- [x] Invoice cards show the next payment ("Next: Balance $1,800 · due Dec
      1"); invoice details list the plan and every payment received.
- [x] The invoice email and its default message say what's due now ("your
      deposit of $600 is due by Oct 20") instead of the full total.
- [x] An open copy of the app can no longer overwrite an online payment
      that came in while it was open.

### Contracts — studio signs too, client gets the signed copy
- [x] **Your signature** panel on every contract you haven't signed. Draw
      it or use your typed name; the name is remembered on this device. You
      can sign before sending or after the client signs.
- [x] When **both** have signed, the client is **emailed their signed
      copy** automatically (with a link to view, print or save it as PDF).
      A copy goes to the studio email too. **Email copy again** resends it.
- [x] Contracts turn green only once both have signed. A client-signed
      contract shows **Add your signature** / "sign now" on its card.
- [x] **Sign in person** now uses the same drawn-or-typed signature pad
      and saves on the server, so it also triggers the signed copy.
- [x] The client's signing page shows the studio's signature, says "Signed
      by both", and offers Print / save as PDF. If the studio hasn't signed
      yet, it tells the client a copy will follow.
- [x] Typed-name signatures now show the name in the signature line instead
      of a blank line.
- [x] Signatures made from links can't be undone by an older copy of the
      app that was still open.

### Contracts — filled-in details highlighted
- [x] Everything filled in from the client, session and invoice shows with
      a **light pink** highlight: client name and email, effective date,
      session type, date and time, location, total fee, retainer, remaining
      amount and its due date. The highlight appears in the preview, in the
      app's contract view, and on the client's signing page. It's kept when
      printing or saving as PDF.
- [x] Contracts saved before this change highlight the client name, email,
      session type and location. Open and save one again to highlight its
      dates and amounts too.

### Chat — new messages appear without refreshing
- [x] Studio replies are saved on the server the moment they're sent, so the
      client's open chat shows them within a few seconds. Before, they only
      reached the chat after the app's background save.
- [x] The client chat checks for new messages every 4 seconds while it's on
      screen, and straight away when the client comes back to the tab or
      their phone reconnects.
- [x] While the Inbox is open, the studio app checks for client messages
      every 10 seconds (every minute elsewhere).
- [x] Tested: studio reply showed in the open client chat without a reload,
      the client's answer showed in the open Inbox about 7 seconds later,
      and there were no duplicate messages.

---

## 2026-10-14 (round 8) — Push notifications

### ⚠️ Before using
- [ ] Apply **`pibase-migration-004-push.sql`** in PIBASE (adds the
      server-only `push_subscriptions` table).
- [ ] `SETTINGS_ENCRYPTION_KEY` must be set (same as round 3). The push keys
      are created automatically and stored encrypted; nothing else to set up.

### What you get notified about
- [x] **Messages:** a client replies by email, or sends a chat message.
- [x] **Documents:** a client accepts a quote (and the invoice is created),
      answers a questionnaire, or signs a contract.
- [x] **Bookings:** a new online booking request, or a new contact-form
      inquiry.
- [x] **Payments:** an online (Stripe) payment comes in.
- [x] Each notification opens the right page when tapped (Inbox, Invoices,
      Contracts, Sessions, Clients). If the app is already open, it switches
      to that page without reloading.
- [x] Repeat notifications about the same conversation or document replace
      each other instead of piling up.

### Settings → Notifications
- [x] **🔔 Turn on notifications for this device**: asks permission once and
      registers the phone or computer. Each device is listed by name (e.g.
      "iPhone · Safari (app)") with Remove.
- [x] **Send test notification** and **Turn off here**.
- [x] **Notify me about** checkboxes for the four types above, saved with
      your settings.
- [x] Clear guidance when a device can't do it. iPhone/iPad must use the
      installed app (Share → Add to Home Screen, iOS 16.4+). The preview
      without a service worker and browsers without push support also
      explain why.

### Also
- [x] **Unread badge** on the installed app icon showing how many
      conversations are unread (where the device supports it).
- [x] Small white "EH" badge icon for the Android status bar.
- [x] Devices that uninstall or block notifications are removed
      automatically the next time a send fails.
- [x] Retried email webhooks never notify twice.
- [x] Notifications are sent after the action succeeds and never block or
      break it.
- [x] Code: `lib/push.js` (`notifyStudio`), `pages/api/push.js` (devices,
      test), `public/sw.js` (push + tap handling, cache `ehs-v3`),
      `lib/pwa.js` (subscribe helpers). Dependency: `web-push`.
      `.env.local.example` and SESSION-NOTES updated.

### Verified
- [x] `next build` passes.
- [x] **Server send** (production build, fake HTTPS push service): the
      request is VAPID-signed and `aes128gcm`-encrypted with TTL 24h and high
      urgency; the live device got it; a device answering "410 Gone" was
      deleted; a type switched off in Settings was skipped.
- [x] **Showing notifications** (full Chromium, production build): a push
      delivered to the service worker shows a notification with the right
      title, text, tag, icon and link.
- [x] **Settings:** the "Turn on" button shows, the "Notify me about"
      choices save, and errors show as readable messages.
- [ ] Subscribing a real device could not be tested here: the test browser
      can't reach Google's push service. After deploying, turn it on from
      your phone and press **Send test notification**.

---

## 2026-10-14 (round 7) — App icon made from your logo

- [x] The installed app's icon now comes from the **logo uploaded in Settings
      → Business profile**. The server builds every size (192, 512, Android
      maskable 512, Apple 180, favicon 32): it trims empty margins from the
      logo, fits it and centres it on a background colour.
      (`lib/appIcon.js`, `/api/app-icon/<name>`)
- [x] **Settings → App icon:** live preview at two sizes plus a
      **Background** colour picker (default white), saved with the business
      profile.
- [x] The manifest is now generated (`/api/manifest`): the app name and short
      name come from your business name, and icon links include a version
      that changes with the logo or colour, so updates aren't stuck in caches.
      The static `public/manifest.webmanifest` was removed.
- [x] With no logo uploaded, the built-in black "EH" icons are still used.
- [x] The install banner, favicon and Apple home-screen icon all use the
      logo icon.
- [x] Service worker caches versioned logo icons (cache version `ehs-v2`).
- [x] `sharp` (image processing) is now a direct dependency. It was already
      installed with Next.js.
- [x] Uses `STUDIO_OWNER_USER_ID` to know whose logo to show, since the
      install happens before sign-in. This is already required for the
      contact form and booking.

### Verified
- [x] `next build` passes.
- [x] Rendered all five sizes from a sample wide, transparent logo on a
      blush background: trimmed and centred, with the maskable version
      inside the safe zone. Without a logo, the "EH" icon is returned.
- [x] Production server + Chrome checks with the new `/api/manifest`: no
      manifest errors and no installability errors. Page head uses the logo
      favicon and Apple icon.

### Good to know
- [ ] **iPhone/iPad** keep the icon from when the app was installed. After
      changing the logo, remove the app and add it to the Home Screen again.
      Android and desktop Chrome update the icon on their own, usually
      within a day.
- [ ] Wide logos (text logos) come out small on a square icon. A square mark
      or monogram version of the logo looks best.

---

## 2026-10-14 (round 6) — Discounts on phones, installable app (PWA)

### Discounts and Session Types on phones
- [x] **Discounts** weren't phone-friendly: each coupon was a desktop table
      row squeezed into loose columns. On phones each one is now a card:
      name and value, Active/Inactive badge, the code in a chip, "Used 0 / 30",
      and Edit / Delete. The Coupons / Gift Cards tabs and the filter sit on
      one line. Buttons now read "+ New coupon" and "+ New gift card".
- [x] **Session Types:** tighter cards on phones (no tall empty space).
      "Availability settings" wording made consistent.

### Installable app (PWA)
- [x] **Manifest** (`public/manifest.webmanifest`): name, short name, colours,
      standalone display, and home-screen shortcuts to Inbox, Clients,
      Invoices and Calendar (long-press the icon).
- [x] **Icons** (`public/icons/`): 192 and 512 app icons, a 512 maskable
      icon for Android, a 180 Apple touch icon and a favicon (black "EH"
      monogram with a blush underline).
- [x] **Service worker** (`public/sw.js`):
      - App pages (`/`, `/login`) load from the network first and fall back to
        the last saved copy, or a friendly **offline page**
        (`public/offline.html`).
      - Build files, icons and fonts are cached, so the app opens fast.
      - **Client links (invoice, quote, chat, sign, questionnaire, booking,
        contact) and all API calls are never cached**, so private client
        data never stays on the device.
      - Old caches are cleared automatically when the version changes.
- [x] **Install offer:** on Android and desktop Chrome or Edge, an "Install EHS
      Studio" bar appears with Install / Not now (hidden for 30 days after
      "Not now"). On iPhone and iPad, a hint says "Tap Share → Add to Home
      Screen".
- [x] **Settings → App** shows whether you're using the installed app, with
      an Install button or instructions.
- [x] **Updates:** when a new version is deployed, a bar says "A new version
      of EHS Studio is ready" with a Reload button.
- [x] **Offline notice:** a bar appears when the connection drops ("Changes
      will save when you reconnect"). The existing save retry handles the
      rest. Opening the app offline says you're offline instead of a
      generic error.
- [x] **Phones with notches:** the top bar, the conversation view, modals and
      bottom bars respect the notch and home-indicator areas. In the
      installed app, the page no longer bounces when pulled down.
- [x] Only the manager (`/` and `/login`) offers the install. Client-facing
      pages don't show the manifest, so clients aren't asked to install
      your studio app.
- [x] Server headers: `sw.js` is never cached, so updates reach users, and
      the manifest is served with the correct type. (`next.config.js`)
- [x] The service worker runs only in production builds, so it never gets
      in the way during development.

### Verified
- [x] `next build` passes.
- [x] Production server + Chrome's own checks (`Page.getAppManifest`,
      `Page.getInstallabilityErrors`): **no manifest errors, no
      installability errors**.
- [x] Service worker registered for `/`. App shell, icons and build files
      cached.
- [x] Offline: `/?view=inbox` and `/login` load from the cache and the
      offline bar shows. Pages never visited aren't served, as intended.
- [x] Client page `/contact` has no manifest link.
- [x] Discounts and Session Types at 390px: nothing wider than the screen;
      checked by screenshot.
- [ ] Not tried on a physical iPhone or Android phone. After deploying,
      install it from Safari or Chrome and check the icon, shortcuts and
      notch spacing.

---

## 2026-10-14 (round 5) — Mobile-friendly pages, one colour theme, new Inbox

### One theme everywhere
- [x] Sessions, Session Types and Discounts used their own teal theme
      (`#19b99f` buttons, Arial, square corners). They now match the rest of
      the app: black primary buttons, white outline buttons, DM Sans,
      rounded cards and inputs, and black pill tabs.
      (`styles/BookingAdmin.module.css`)
- [x] Button labels are consistent ("+ New session", "+ New session type").

### Page headers (all pages, phones)
- [x] The title stays on the left with the main action on the right, and
      both drop to a second line only when they don't fit, instead of
      always stacking.

### Projects
- [x] "⚙ Stages" and "+ New project" moved into the page header.
- [x] On phones, filters are compact: Board/List/Archive, then search, then
      type and sort side by side.
- [x] **On phones, the board shows one stage at a time** with stage tabs and
      counts, instead of a sideways-scrolling board with half-hidden
      columns. Each card has a **stage picker** to move it (touch screens
      can't drag). Desktop keeps the drag-and-drop board.

### Clients
- [x] Cards are compact, with no big empty gap: name, email and phone (tap
      to email or call), stage badge, then session type and date with edit
      and delete buttons.
- [x] Tapping a card opens client details. This already worked.
- [x] The search bar no longer takes up a card slot on desktop, and the
      status filter lists your actual stages.
- [x] Fixed a long email or phone line making the list wider than the screen.

### Sessions
- [x] Dates read "Sat, Jul 4, 2026 · 7:00 PM" instead of "2026-07-04 at 19:00",
      on cards and in details.
- [x] Compact cards on phones with a › chevron. The tabs are scrollable pills.

### Invoices
- [x] New card layout: number and status, client, due date, amount on the
      right, a full-width progress bar, and big, even action buttons on
      phones (Mark paid · Edit · Send).
- [x] Filter tabs: **All · Waiting · Paid**, with counts.
- [x] The small "×" delete button was removed from cards. Delete is in the
      invoice details and editor.

### Contracts
- [x] Each contract is its own colour-coded card (green when signed, orange
      while waiting) instead of rows inside a box. Buttons: **View · Send to
      sign · Sign in person**.
- [x] "Send to sign" opens the editable email step directly. Copying the
      signing link and deleting are in the contract viewer.
- [x] Removed the old unused contract helper code from the page.

### Inbox (redesigned)
- [x] Messaging-app layout: a conversation list with avatars, last message,
      time, unread dots, and ✉/💬 icons for email or chat replies.
- [x] **Search** conversations and filter **All / Unread**. Newest
      conversations first.
- [x] Conversation view: header with client email, a **Chat link** button
      (copies their private chat link) and a **Client** button (opens client
      details). Chat bubbles show whether each reply came by email or chat.
- [x] **Quick replies:** one tap inserts common answers ("Your gallery is
      ready! 🎉", "Looking forward to your session!", …), in replies and in
      "+ New message".
- [x] **On phones the list and the conversation are separate screens**, with
      a ‹ back button, like a messaging app. Opening a conversation marks it
      read.
- [x] "+ New message" uses a proper client picker instead of type-to-match.

### Contact form
- [x] Fixed the page being wider than the screen. The settings and preview
      stack on phones, the shareable link wraps with full-width Copy/Open
      buttons, and the two technical info cards are hidden on phones.

### Verified
- [x] `next build` passes.
- [x] Screenshots at 390px (phone) for Projects, Clients, Sessions, Session
      Types, Discounts, Invoices, Contracts, Inbox and Contact form: nothing
      is wider than the screen.
- [x] Desktop screenshots of Projects, Clients, Sessions and Inbox look right.
- [x] Inbox on a phone: opening a conversation shows it full-screen, a quick
      reply fills the message box, back returns to the list, and the opened
      conversation is marked read.

---

## 2026-10-14 — Remove Supabase naming (keep only the core client)

- [x] Renamed the database files:
      `supabase-schema.sql` → **`pibase-schema.sql`**,
      `supabase-migration-001/002/003…sql` → **`pibase-migration-001/002/003…sql`**.
      The file contents are unchanged, apart from comments.
- [x] Removed the "Supabase Dashboard / SQL Editor" instructions and the
      "PIBASE/Supabase-compatible" wording from the SQL files.
- [x] Updated every reference to the new file names: README, SESSION-NOTES,
      docs/cloud-development, Settings page, settings API and this checklist.
- [x] **Kept (core):** the `@supabase/supabase-js` package. PIBASE speaks the
      same API protocol, so this package is how the app logs in and
      reads/writes PIBASE. It's imported in exactly one place,
      `lib/pibase.js`. SESSION-NOTES now says to keep it that way.
- [x] `next build` passes.

---

## 2026-10-13 (round 3) — Settings page, client replies in the app, client chat

### ⚠️ Before using this round
- [ ] Apply **`pibase-migration-003-settings-inbox.sql`** in PIBASE (adds
      `studio_settings.branding`, `studio_settings.integrations` and the
      server-only `studio_secrets` table). Settings shows a banner until
      this is done.
- [ ] Set **`SETTINGS_ENCRYPTION_KEY`** (a long random value) on the server.
      Without it, keys can't be saved in Settings.

### Settings page (new)
- [x] **Business profile:** logo upload (resized automatically), business
      name, your name, studio email, phone, website, address and email
      signature. These appear on every email and on the invoice, quote,
      questionnaire and chat pages. (`components/Settings.jsx`,
      `pages/api/settings.js`)
- [x] **Email (Resend):** API key, "send from" address, and a **Send test
      email** button.
- [x] **Payments (Stripe):** publishable key, secret key, webhook signing
      secret, a webhook URL to copy, and a **Test connection** button.
      (`pages/api/settings-test.js`)
- [x] Keys can only be entered or removed, never read back. After saving,
      only the last 4 characters show. They're encrypted (AES-256-GCM) in
      `studio_secrets`, which has RLS on and no policies, so only the server
      can read it. Server environment variables still work as a fallback.
      (`lib/studioConfig.js`)
- [x] Every email and Stripe route now uses the studio's saved settings:
      invoice, quote, contract, questionnaire, message, reminder and
      contact-form emails, plus payment intents and the Stripe webhook.
      `lib/stripe.js` and `/api/integration-status` were removed.
- [x] Logo is served for emails at `/api/logo/<studio id>`.

### Bug fixed
- [x] **Reply-To was never set on any email.** The code passed `reply_to`,
      but this Resend library version only reads `replyTo`. Client replies
      were going to the sending address instead of the studio. Fixed in the
      shared sender. (`lib/email.js` → `sendStudioEmail`)

### Client replies come into the app ("both")
- [x] Each client email's Reply-To is now `reply+<client code>@<your
      receiving domain>` plus, optionally, your studio email. Replies land
      in the **Inbox and in the client's Activity**, and still reach your
      own email if "Also send client replies to my studio email" is on
      (default).
- [x] New webhook `/api/inbound-email?studio=<id>` (Resend
      `email.received`). It checks Resend's signature, matches the client
      from the reply address (checked so it can't be guessed) or else by
      sender email, fetches the email text, strips the quoted history, and
      adds it to the conversation as unread. Retries never create
      duplicates. (`pages/api/inbound-email.js`, `lib/conversations.js`)
- [x] Settings has step-by-step setup for Resend receiving (domain or free
      `resend.app` address, webhook, signing secret).

### Client chat page (new)
- [x] Every client has a private chat link at `/chat/<secure link>`. The
      client sees the conversation and can send messages; it checks for new
      ones every 8 seconds. (`pages/chat/[token].js`, `pages/api/chat.js`)
- [x] Message emails include an **Open our chat** button. In client details
      there's **Copy chat link** under Messages and in the message window.
      (`pages/api/chat-link.js`)
- [x] New chat messages also **email the studio** (at most once per 10
      minutes of back-and-forth).
- [x] Inbox and message history show whether each reply came **via email**
      or **via chat**. Unread conversations show orange in Activity
      ("New reply").

### Behind the scenes
- [x] Replies are merged into conversations, never overwritten. When the
      app saves a conversation, it first adds any replies the server
      received that this tab hasn't seen yet. (`lib/db.js`)
- [x] The app now also refreshes every minute while open, not only when you
      switch back to the tab, so new replies appear on their own. It never
      refreshes over unsaved changes. (`pages/index.js`)
- [x] `.env.local.example` and `SESSION-NOTES.md` updated.

### Verified
- [x] `next build` passes.
- [x] Server self-test: keys stored encrypted and read back correctly, and
      removal works; reply address is 48 characters (under the 64 limit)
      and round-trips; a tampered address is rejected; quoted history is
      stripped; a Resend/Svix-signed payload is accepted and a tampered
      one is rejected.
- [x] Browser test with mocked API at phone and desktop sizes: Settings
      loads; logo upload resizes and saves; reply settings save only their
      own fields; saved keys show "Saved · ends in ab12"; chat page shows
      the conversation and sends a message.
- [ ] Not tested against live Resend, Stripe or PIBASE. After setup,
      please: send a test email, reply to a client email, send a chat
      message, and run Stripe "Test connection".

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
- [ ] Online payments were tested against a stand-in for Stripe (signed
      webhook events), not a real Stripe account. Make one test payment in
      Stripe test mode before going live.
- [ ] The signed-contract copy is a link to the signed page (print / save
      as PDF), not a PDF attachment.
- [ ] Payment reminders before each installment's due date aren't sent
      automatically yet.
- [ ] `NEXT_PUBLIC_APP_URL` must be set in production so email buttons
      and webhook URLs point at the right domain.
- [ ] No notification email to the studio yet when a client accepts a
      quote or answers a questionnaire. It only shows up in the app. (Chat
      messages do notify.)
- [ ] Email attachments sent by clients aren't brought into the app (text
      only). They still arrive in the studio email when copies are on.
