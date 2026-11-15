# Production readiness review: instructions for an AI reviewer

You are reviewing two systems before they go to production. Your job is to
decide **GO** or **NO-GO**, with evidence. You test, read code and report. You
do **not** fix code, merge, deploy, or touch any production server or real
customer data.

---

## 1. What you are reviewing

| System | Repository | Branch under review | Pull request |
|---|---|---|---|
| **PIBASE**: the backend (PostgreSQL, sign-in, data API, files), a Go gateway compatible with the Supabase client | `515woodpl-dot/pibase` | `claude/bold-johnson-ajedtz` | #30 |
| **Local Manager**: a Next.js (pages router) CRM for service businesses (photography, web design, digital creative studios): clients, projects, bookings, quotes, invoices with payment plans, contracts with e-signature, questionnaires, chat, booking page, contact form | `515woodpl-dot/ehsmanager` | `claude/bold-johnson-ajedtz` | #2 |

How it is meant to run in production: **one server runs PIBASE once, and one
Local Manager per company**. Each company gets its own PIBASE project, domain,
HTTPS certificate, systemd service and nightly automatic update. Clients of a
company use public pages with signed links (`/sign`, `/invoice`, `/quote`,
`/questionnaire`, `/chat`), plus `/booking` and `/contact`.

Read these first, in the Local Manager repository:

- `INSTALL.md`: the install procedure you will test
- `docs/DEPLOY.md`: how updates and rollbacks work
- `CHECKLIST.md`: every change made, with what was and was not verified.
  Rounds 10–18 are the ones under review. The "Open / follow-ups" list is the
  team's own list of known gaps.
- `SESSION-NOTES.md`: architecture notes
- `.claude/agents/bug-hunter.md`: an attack checklist you can reuse, including
  "Hard mode" (many clients at once) and "PIBASE mode"

In PIBASE: `README.md`, `docs/VPS.md`, `docs/PI-OPERATIONS.md`,
`REVIEW-PLAYBOOK.md` (its own audit method and severity scale) and `WORKLOG.md`.

---

## 2. Ground rules

1. **Never use production.** Work only on machines and PIBASE projects you
   create. Use fake people and `@example.com` emails. Use Stripe **test mode**
   only, and Resend with a test domain or none at all.
2. **Evidence or it didn't happen.** Tag every claim **VERIFIED** (you ran it,
   with the command and output or a screenshot), **READ** (you read the code,
   with file and line) or **UNVERIFIED**. Check results in the database, not
   only on screen.
3. **Don't change the code under review.** If you need a workaround to run
   something, write it down.
4. **Severity** (from PIBASE's `REVIEW-PLAYBOOK.md`):
   - **Critical:** data leak across companies, auth bypass, payment forgery, data loss.
   - **High:** exploitable denial of service on a 2–4 GB server, stored XSS, a broken core workflow, a false claim in the docs that would mislead an installer.
   - **Medium:** a security gap needing unusual conditions, or missing hardening.
   - **Low:** hygiene.
5. **Verdict rule:**
   - Any Critical → **NO-GO**.
   - Two or more High → **NO-GO**.
   - One High → **GO WITH FIXES** (it must be fixed before launch).
   - Only Medium or Low → **GO** or **GO WITH FIXES**, at your judgement.

---

## 3. Set up a test environment

Prefer the real production path: a **fresh Ubuntu 24.04 VM** (2 GB and 4 GB
RAM if you can test both) with two test DNS names, following `INSTALL.md`
exactly from step 0. This is the most important test. **The systemd units,
timers and Caddy HTTPS steps of `scripts/install.sh` have never been run on a
real server**; everything else was tested only on a machine without systemd.

If you can't get a VM with DNS:

- Use `--tls-internal` (PIBASE setup) and local hostnames, or
- Run PIBASE without Docker: `docs/cloud-development.md`, section "Without
  Docker". Then run `scripts/install.sh --no-system` with
  `PIBASE_BIN=/path/to/pibase` and `MANAGER_BASE=/some/dir`. Say clearly which
  parts this skipped.

Install **at least two companies** on the same server, with different business
types, for example `creative` and `photography`, so you can test isolation
between them.

---

## 4. What to check

Work through every section. For each item record **PASS**, **FAIL** or
**NOT TESTED**, with evidence.

### A. Build and dependencies
- [ ] `npm ci && npm run build` pass on the branch. `npm audit` shows no high or critical findings. Note the Node and Next.js versions.
- [ ] PIBASE: `go vet ./...` and `go test ./...` pass. Run the integration tests too if you can give them a disposable database (see the warning in PIBASE's `WORKLOG.md` about the shared `authenticator` password).
- [ ] No secrets, keys, `.env` files or real customer data are committed in either repository (`git log -p | grep -iE 'sk_live|whsec_|service_key|password='` and similar).

### B. Installation (INSTALL.md, end to end)
- [ ] Every command in `INSTALL.md` works as written on a fresh server, in order, with no step missing. Note every place a human had to guess.
- [ ] `setup-droplet.sh` (PIBASE) completes, and `https://api.<domain>/healthz` answers `{"status":"ok"}`.
- [ ] `install.sh` for company 1 completes, and the service `manager-<name>` is active.
- [ ] The timers `manager-<name>-health.timer` and `manager-<name>-update.timer` exist, and `systemctl list-timers` shows their next runs.
- [ ] The Caddy site file is written, `caddy validate` passes, and HTTPS works on the company's domain.
- [ ] The owner signs in with the password from `shared/owner-login.txt`. The dashboard shows the business name and the right stages for the business type.
- [ ] Re-running the same install command changes nothing harmful: same project, same secrets, same owner password.
- [ ] A second company on the same server gets its own port, project, service and certificate, and neither can see the other's data.
- [ ] File permissions: `shared/.env.local`, `pibase-project.json` and `owner-login.txt` are mode 600 and not readable by other accounts. The app runs as the unprivileged `manager` account.
- [ ] A reboot brings everything back on its own: PIBASE, every manager, and Caddy.
- [ ] `INSTALL.md` §10, moving an existing installation: try it with a copied old `.env.local` and an existing project. Existing signing links must keep working, and the owner's password must not change.

### C. Updates, migrations and rollback
- [ ] `scripts/update.sh <name>` with nothing new reports "Already running the latest version".
- [ ] With a new commit, it backs up the project, builds a new release, applies migrations, switches over, passes the health check, and keeps 3 releases.
- [ ] With a commit that fails to build, the running version is untouched and the version is recorded as failed. The next nightly run skips it; `--force` retries it.
- [ ] With a commit that builds but fails `/api/heartbeat`, it rolls back to the previous release, which is healthy again.
- [ ] Migrations on a **fresh** project: `pibase-schema.sql`, then 001–006. A second run changes nothing. The final functions and triggers are the newest versions, for example `create_public_booking` containing `app.booking_rpc`.
- [ ] Migrations on an **existing** project that was set up by hand at an older version, with data, including duplicate invoice numbers: 005 and 006 apply, duplicates are renumbered, and no data is lost.
- [ ] The nightly update timer actually fires. Check the timer's last trigger and `journalctl -u manager-<name>-update`.
- [ ] A PIBASE update (`sudo -u pibase scripts/update.sh`) with managers running: they keep working or recover by themselves.

### D. Security
Use the bug-hunter checklist (`.claude/agents/bug-hunter.md`, normal mode and
PIBASE mode). At minimum:

- [ ] **Isolation between companies:** company A's keys or user tokens against company B's project fail. Owner A can't read or write B's rows through the data API, RPC or the app's own APIs.
- [ ] **Row-level security:** an owner can't link their documents to another owner's clients (migration 006 policy).
- [ ] **Signed links:**
  - tampered, swapped (a quote token on `/invoice`) and expired-style tokens are rejected;
  - links don't leak other documents;
  - check what the plain-base64 token payload reveals (it contains the document id).
- [ ] **Stripe webhook:**
  - forged events, events signed with a made-up secret, and events naming another company's invoice must not change any invoice;
  - a real test-mode payment credits the right installment once, even if the webhook is delivered twice.
- [ ] **Payments:** the browser can't choose the amount paid (`/api/pay-invoice` only takes an option key).
- [ ] **PIBASE query strings:** a raw `;` or bad `%` escape in a data-API query string returns 400, while normal and encoded filters still work (PR #30).
- [ ] **Public forms:**
  - the contact form only files leads for the server's own company;
  - the rate limits (5 contact messages and 6 booking requests per 10 minutes) hold behind Caddy and can't be bypassed with `X-Forwarded-For`.
- [ ] **Links in emails** use `NEXT_PUBLIC_APP_URL`, or the address the owner uses, never a visitor's `Host` or `X-Forwarded-Host`.
- [ ] **XSS:** script in every text field (client names, messages, contract fields, questionnaire answers, business name) is inert in the app, on public pages and in emails.
- [ ] **Secrets:**
  - API keys saved in Settings are encrypted and never returned to the browser (only the last 4 characters);
  - the service key never reaches the browser (search the built `.next/static` for it);
  - `/api/heartbeat` needs its secret.
- [ ] **HTTP surface:** security headers (consider HSTS, CSP, X-Frame-Options on the manager), and that the service worker never caches private client pages or API responses.
- [ ] **Known, not fixed:** PIBASE `/metrics` answers without a key (counts only), and database error details reach clients. Decide whether either matters for launch.

### E. Concurrency and data integrity ("Hard mode")
Run the bug-hunter **Hard mode** against company 1: 10–15 clients at once,
the owner in two tabs and a phone-width tab. Then check the database after
each burst:

- [ ] Simultaneous quote acceptances give one invoice per quote, and invoice numbers stay unique and in order.
- [ ] The same slot booked by many clients gives exactly one booking. Coupons and gift cards are never over-used, and never refunded twice (cancel, delete, or restore from a stale tab).
- [ ] Simultaneous chat messages are all kept, in one conversation per client.
- [ ] A client signing while the owner countersigns keeps both signatures.
- [ ] An owner's stale tab never undoes newer changes: payments from another tab, accepted quotes, questionnaire answers, signatures, stage changes, a business-type switch, or deleted records.
- [ ] **Not yet verified by the team:** an owner records a payment on an invoice whose client was just deleted in another tab, and a stale tab saves after a business-type switch. Test both.
- [ ] A rescheduled online booking moves its reserved slots.
- [ ] Under a burst, clients see "busy, try again" rather than wrong "not found" errors. PIBASE allows about 100 requests a second per project; measure how many simultaneous clients one company handles before errors.

### F. Core workflows (each business type)
For `photography`, `webdesign` and `creative`, check the wording, stages and
lists, then run each workflow end to end:

- [ ] Contact form → client in the first stage.
- [ ] Booking page → request → the owner confirms → reminder.
- [ ] Quote → client accepts → invoice with a payment plan → partial payments → paid.
- [ ] All agreements:
  - photography, website design, the retired web + photography agreement (editing an existing one), and the **Creative Services Agreement** with each service mix;
  - section numbering is right and no `[bracket]` is left;
  - sign → countersign → signed copy.
- [ ] Questionnaire → answers.
- [ ] Chat both ways, plus the Inbox. **Note:** studio replies go through email (Resend); check what happens without Resend.
- [ ] Settings:
  - logo and name replace "Local Manager" on the sign-in page and in the sidebar;
  - switching the business type;
  - the Resend and Stripe "test connection" buttons;
  - push notifications on a real phone, if possible.
- [ ] CSV import with messy files (quoted commas, varied date formats, unknown stages, duplicate emails).

### G. Email and payments with real test accounts
- [ ] Resend with a verified test domain: invoice, quote, contract, signed copy, questionnaire, reminder, message emails, and the reply-to-app routing (`/api/inbound-email`, signature verified). Without a "send from" address, the error must be clear.
- [ ] Stripe test mode:
  - Checkout for a deposit and for the full balance;
  - the webhook at the URL shown in Settings;
  - the installment is credited once;
  - a failed payment changes nothing.

### H. Operations
- [ ] **Backups:** PIBASE's daily backup runs, and the pre-update backup runs. **Do a restore drill** into a new project (`docs/PI-OPERATIONS.md`) and confirm the restored data is complete.
- [ ] **Off-server backups:** check that the rclone and `PIBASE_BACKUP_REMOTE` instructions work, or report that they don't.
- [ ] **Monitoring:**
  - when the app process is killed, the 10-minute health timer restarts it;
  - when PIBASE is stopped, the heartbeat fails and the logs say why;
  - check what an operator would actually notice (there is no alerting beyond logs and systemd).
- [ ] **Resources:** memory and disk on a 2 GB server with PIBASE and two companies running. The build during an update must not exhaust memory and take the running app down.
- [ ] **Logs:** no secrets, tokens or full client data in `journalctl` or the build logs.

### I. Front end
- [ ] Every screen at 390 px, 768 px and 1400 px: nothing wider than the screen, modals can be closed, buttons reachable. Check the **Inbox at 390 px** in particular; that fix wasn't checked on a screenshot.
- [ ] No console errors on any screen in any business type.
- [ ] Basic accessibility: forms have labels, keyboard navigation works, contrast is acceptable.
- [ ] The installable app (PWA) installs, its name and icon follow the business brand, and it works offline as documented.

### J. Legal and content
- [ ] The **contract templates** (photography, website design, web + photography, Creative Services Agreement) were written or adapted by an AI. **They need a lawyer's review before production use.** Flag any clause that is obviously risky or inconsistent: deposit refundability, copyright and licence, liability cap, governing law, cancellation fees. Also flag any mismatch between what the form collects and what the agreement says.
- [ ] Client-facing wording makes sense for each business type, with no leftover photography wording for web design or creative studios.
- [ ] Privacy: what client data is stored and where, how long backups keep it, whether a client can be fully deleted (documents keep a null `client_id`), and whether that needs disclosure.

---

## 5. Report format

Deliver one Markdown report:

1. **Verdict:** GO / GO WITH FIXES / NO-GO, in one sentence.
2. **Blockers:** every Critical and High finding, numbered, each with:
   - severity and the area letter from section 4;
   - where it is (file and line, endpoint, or install step);
   - exact steps to reproduce;
   - what happened and what should happen;
   - evidence, tagged VERIFIED, READ or UNVERIFIED.
3. **Other findings:** Medium and Low, in the same format, shorter.
4. **Checklist results:** the section 4 table, with PASS, FAIL or NOT TESTED and a one-line note each.
5. **Not tested, and why.** Be explicit; untested areas count against readiness.
6. **Launch conditions:** what must be true before go-live (for example, PRs merged together, migrations applied, lawyer sign-off, off-server backups configured, monitoring in place).
7. **Clean-up:** the test servers, projects and accounts you created.

Keep it factual. A short list of verified problems is worth more than a long
list of guesses.
