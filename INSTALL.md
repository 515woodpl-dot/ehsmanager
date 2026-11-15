# Installing PIBASE and Local Manager

This guide sets up both systems on one server, from a fresh machine to a
company signing in:

- **PIBASE**: the backend (database, sign-in, files), in the
  `515woodpl-dot/pibase` repository. Installed **once per server**.
- **Local Manager**: the app the company and its clients use, in the
  `515woodpl-dot/ehsmanager` repository. Installed **once per company**. One
  server can run many companies; each gets its own PIBASE project (its own
  database and users), its own address and its own HTTPS certificate.

```
                 https://api.example.com           https://manager.acme.com
 browsers ──────▶ Caddy (HTTPS) ──▶ PIBASE gateway ◀── Local Manager "acme" (port 3101)
                                    PostgreSQL         Local Manager "bloom" (port 3102)
```

Everything runs without questions once started, so the same steps work from a
provisioning script. Plan about 30 minutes for the first company and 5 for each
one after.

---

## 0. Before you start

| You need | Notes |
|---|---|
| A server | Ubuntu 24.04 (or Debian 12/13), 64-bit, **2 GB RAM minimum, 4 GB recommended**, 25 GB+ disk. A DigitalOcean droplet works well. |
| Root access over SSH | All commands below run as root. |
| A domain | You must be able to add DNS records. |
| Ports 80 and 443 open | For HTTPS. The PIBASE setup configures the firewall itself. |
| Access to both repositories | They may be private: see step 3. |

**Use the right branch.** The installer takes the app from `main` by default.
Until the latest work is merged into `main` in both repositories, install from
the work branch:

- PIBASE: `claude/bold-johnson-ajedtz` (contains the query-string security fix)
- Local Manager: `--branch claude/bold-johnson-ajedtz` in step 5

---

## 1. DNS records

Create these A records pointing at the server's IP address (replace the names
with yours):

| Name | What it is |
|---|---|
| `api.example.com` | PIBASE, shared by every company on this server |
| `manager.acme.com` | the company's manager (one per company) |
| `book.acme.com` | optional: a separate public booking address for the company |

HTTPS certificates are issued automatically once the names resolve. Check with
`dig +short manager.acme.com` before step 5, or the certificate step will wait.

---

## 2. Prepare the server

```bash
apt-get update && apt-get -y upgrade && apt-get install -y git curl
```

---

## 3. Access to private repositories (skip if both are public)

The server pulls both repositories, at install and at every update, so give it
**read-only deploy keys**.

PIBASE runs as the `pibase` account and the managers as the `manager` account.
Create the accounts first, then a key for each:

```bash
useradd --create-home --shell /bin/bash pibase
```

```bash
useradd --system --create-home --home-dir /home/manager --shell /usr/sbin/nologin manager
```

```bash
for u in root pibase manager; do h=$(eval echo ~$u); install -d -m 700 -o $u -g $u $h/.ssh; sudo -u $u ssh-keygen -q -t ed25519 -N "" -f $h/.ssh/id_ed25519 -C "$u@$(hostname)"; done
```

```bash
for u in root pibase manager; do echo "== $u"; cat $(eval echo ~$u)/.ssh/id_ed25519.pub; done
```

In GitHub, open each repository's **Settings → Deploy keys → Add deploy key**:

- `515woodpl-dot/pibase`: add the **root** and **pibase** keys
- `515woodpl-dot/ehsmanager`: add the **root** and **manager** keys

Leave "Allow write access" off. Then accept GitHub's host key for each
account:

```bash
for u in root pibase manager; do sudo -u $u ssh -o StrictHostKeyChecking=accept-new -T git@github.com; done
```

Each line should say "successfully authenticated". From here on use the
`git@github.com:` addresses below. For public repositories use
`https://github.com/...` instead.

---

## 4. Install PIBASE (once per server)

```bash
git clone --branch claude/bold-johnson-ajedtz git@github.com:515woodpl-dot/pibase.git /root/pibase
```

```bash
/root/pibase/scripts/setup-droplet.sh --domain api.example.com --email you@example.com --no-account
```

(The setup copies the code to `/home/pibase/pibase`, which is where it runs
and updates from; `/root/pibase` can be deleted afterwards.)

This takes 5–15 minutes. It adds swap, installs Docker, Caddy, the firewall and
automatic security updates, keeps all data under `/srv/pibase`, generates
PIBASE's secrets, starts it behind HTTPS, and schedules a **daily encrypted
backup** of every project.

`--no-account` skips the dashboard account, which would otherwise ask for a
password. The managers don't need the dashboard. To use it later, run
`scripts/create-account.sh` and see PIBASE's `docs/VPS.md`.

**Check it:**

```bash
curl -s https://api.example.com/healthz
```

It should answer `{"status":"ok"}`.

**Save these two values somewhere safe off the server**, such as a password
manager. Without them the backups can't be restored:

```bash
grep -E '^(PIBASE_MASTER_KEY|PIBASE_BACKUP_KEY)=' /home/pibase/pibase/.env
```

---

## 5. Install a company

```bash
git clone --branch claude/bold-johnson-ajedtz git@github.com:515woodpl-dot/ehsmanager.git /root/ehsmanager
```

```bash
/root/ehsmanager/scripts/install.sh --name acme --domain manager.acme.com --pibase-url https://api.example.com --owner-email owner@acme.com --owner-name "Ann Lee" --business-name "Acme Creative" --business-type creative --branch claude/bold-johnson-ajedtz --auto-update
```

| Option | Meaning |
|---|---|
| `--name` | short id for this company (lowercase, used in folder and service names) |
| `--domain` | the company's manager address (from step 1) |
| `--pibase-url` | PIBASE's address from step 4 |
| `--owner-email`, `--owner-name` | the company owner's sign-in |
| `--business-name` | shown on the app, emails, booking page and contracts |
| `--business-type` | `creative` (digital creative studio), `webdesign` or `photography` |
| `--booking-domain` | optional separate booking address, e.g. `book.acme.com` |
| `--from-email` | optional sending address for emails, on a domain verified in Resend |
| `--branch` | which branch of the app to run (see step 0) |
| `--auto-update` | update automatically every night (recommended) |
| `--port` | optional; picked automatically from 3101 upward |

The installer:

1. installs Node.js 22 if needed;
2. copies the app into `/srv/manager/acme`;
3. creates the company's **own PIBASE project** and stores its keys;
4. writes the app's settings with fresh random secrets;
5. builds the app and applies the database schema;
6. creates the **owner's account, already confirmed**, with a random password,
   and fills in the business name, type, pipeline stages and lists;
7. runs it as the service `manager-acme`, adds the HTTPS site to Caddy, and
   checks it answers healthy.

At the end it prints a summary. **The owner's first password** is in:

```bash
cat /srv/manager/acme/shared/owner-login.txt
```

Send it to the owner securely; they can change it later. Running the same
install command again is safe: it keeps the project, the secrets and the owner.

**Another company on the same server:** repeat step 1 (its DNS) and step 5
with a different `--name`, `--domain`, owner and business.

---

## 6. Check the installation

```bash
/srv/manager/acme/repo/scripts/health.sh acme
```

```bash
systemctl status manager-acme --no-pager
```

```bash
systemctl list-timers 'manager-acme-*' 'pibase-*' --no-pager
```

Then open `https://manager.acme.com`. The sign-in page shows the business name,
or its logo once one is uploaded. Sign in with the owner's email and the
password from `owner-login.txt`. The dashboard should show the company's name
and the stages for its type of business.

---

## 7. What the owner sets up in the app

Under **Settings** (all optional, add them when ready):

- **Business profile**: logo, phone, address, email signature. The logo
  replaces the name on the sign-in page, sidebar and emails.
- **Email (Resend)**: API key and "Send emails from" (a domain verified in
  Resend). Needed for sending invoices, contracts, reminders and replies.
- **Client replies in the app**: Resend receiving domain plus webhook (the URL
  is shown there).
- **Payments (Stripe)**: publishable key, secret key, and the webhook URL shown
  there with the event `payment_intent.succeeded`.
- **Notifications**: turn on push notifications per device.

---

## 8. Updates

**Local Manager.** With `--auto-update`, each company checks every night
(04:30–05:15) for a new version of its branch. When there is one, it:

1. backs up the company's PIBASE project;
2. builds the new version in its own folder and applies new database updates;
3. switches over and checks it answers healthy;
4. if the build fails or the new version isn't healthy, keeps or restores the
   previous version, and skips that version until a newer one arrives.

To update now, or without `--auto-update`:

```bash
/srv/manager/acme/repo/scripts/update.sh acme
```

Add `--force` to rebuild the same version, or `--no-backup` to skip the
backup. A health check every 10 minutes restarts the app if it stops
answering. Log of the last update:

```bash
journalctl -u manager-acme-update --no-pager -n 50
```

**PIBASE.** Update it by hand when a new version is released. This backs up
every project first:

```bash
sudo -u pibase /home/pibase/pibase/scripts/update.sh
```

**Releasing app changes.** Push to the branch the companies run. Database
changes go in a **new** numbered file (`pibase-migration-007-....sql`) and
are applied automatically on the next update. Never edit a migration that has
already been released: PIBASE refuses a known migration whose contents
changed.

---

## 9. Backups and recovery

- PIBASE backs up every project daily, encrypted, to
  `/srv/pibase/backups` (kept 14 days). The manager's updater also backs up a
  company's project before each update.
- **Copy backups off the server.** Set up `rclone` and
  `PIBASE_BACKUP_REMOTE` as described in PIBASE's `docs/VPS.md`, section 7.
  A lost server loses its local backups too.
- **Keep off the server:** `PIBASE_MASTER_KEY` and `PIBASE_BACKUP_KEY` (step 4),
  and each company's `/srv/manager/<name>/shared/.env.local`. Its
  `SETTINGS_ENCRYPTION_KEY` unlocks the Resend and Stripe keys saved in
  Settings, and its `CONTRACT_SIGNING_SECRET` keeps the links already sent to
  clients working.
- Restoring a project is described in PIBASE's `docs/PI-OPERATIONS.md`.

---

## 10. Moving an existing installation to this layout

For a company already running the old way (for example `/var/www/ehsmanager`
with pm2), keep its PIBASE project, secrets and owner:

1. Create the folder and copy the old settings, which keeps the secrets so
   existing client links still work:

   ```bash
   install -d -m 0750 /srv/manager/ellie/shared && cp /var/www/ehsmanager/.env.local /srv/manager/ellie/shared/.env.local
   ```

2. Tell the installer which PIBASE project to use. Its id is in the project's
   URL in the PIBASE dashboard, and the keys are the ones in the old
   `.env.local`:

   ```bash
   cat > /srv/manager/ellie/shared/pibase-project.json <<'JSON'
   { "id": "PROJECT_ID", "anon_key": "OLD_NEXT_PUBLIC_PIBASE_ANON_KEY", "service_key": "OLD_PIBASE_SERVICE_KEY" }
   JSON
   ```

3. Stop the old app (`pm2 stop studio-manager`), then run step 5 with
   `--name ellie`, the **same owner email**, and the old domain. The installer
   finds the existing owner and leaves their password and profile alone, and
   applies only the database updates the project is missing.
4. Remove the old site from your web server configuration, if it had one.

---

## 11. Removing a company

```bash
systemctl disable --now manager-acme manager-acme-health.timer manager-acme-update.timer
```

```bash
rm -f /etc/systemd/system/manager-acme* /etc/caddy/pibase.d/manager-acme.caddy && systemctl daemon-reload && systemctl reload caddy
```

```bash
mv /srv/manager/acme /root/manager-acme-removed-$(date +%F)
```

Its PIBASE project (id in `pibase-project.json` in the moved folder) stays
until you delete it. Back it up first, then delete it:

```bash
/root/ehsmanager/scripts/pibase-cli.sh backup PROJECT_ID /data/backups
```

```bash
/root/ehsmanager/scripts/pibase-cli.sh project-delete PROJECT_ID
```

---

## 12. Troubleshooting

| Symptom | What to check |
|---|---|
| `setup-droplet.sh` stops at the certificate step | DNS for `api.example.com` isn't pointing at the server yet (`dig +short`), or ports 80/443 are blocked by the provider's firewall. |
| `install.sh`: "PIBASE was not found" | PIBASE isn't at `/home/pibase/pibase`. Set `PIBASE_DIR=/path` before the command. |
| `install.sh`: "could not create the PIBASE project" | `docker ps` should list the PIBASE containers; if not, `sudo -u pibase /home/pibase/pibase/scripts/update.sh`. |
| `install.sh`: "unknown option" or an old-looking installer | `/root/ehsmanager` is an old copy: `git -C /root/ehsmanager pull`. |
| `install.sh`: git clone fails | Deploy key missing for the `manager` account (step 3), or the wrong `--branch`. |
| "did not answer healthy" | `journalctl -u manager-acme -n 80`; `cat /srv/manager/acme/shared/build.log`; is `https://api.example.com/healthz` ok? |
| Site shows a certificate error | DNS for `manager.acme.com` isn't pointing here yet; Caddy retries on its own. `journalctl -u caddy -n 50`. |
| Owner can't sign in | Use the password in `owner-login.txt` exactly; run the install command again to recheck the account (it doesn't change an existing password). |
| Emails don't send | Settings → Email: Resend key and a "Send emails from" address on a verified domain. |
| Links in emails point to the wrong address | Settings shows the address links use; `NEXT_PUBLIC_APP_URL` in `shared/.env.local` sets it permanently (then `update.sh acme --force`). |
| An update was skipped | `cat /srv/manager/acme/shared/failed.release` shows the version that failed; fix it and push a newer one, or run `update.sh acme --force`. |

Where things are, per company:

| | |
|---|---|
| App versions | `/srv/manager/<name>/releases/`, the live one is `current` |
| Settings and secrets | `/srv/manager/<name>/shared/.env.local` |
| PIBASE project keys | `/srv/manager/<name>/shared/pibase-project.json` |
| Owner's first password | `/srv/manager/<name>/shared/owner-login.txt` |
| HTTPS site | `/etc/caddy/pibase.d/manager-<name>.caddy` |
| Services | `manager-<name>`, `manager-<name>-health.timer`, `manager-<name>-update.timer` |

More detail on the update process is in [docs/DEPLOY.md](docs/DEPLOY.md), and
on PIBASE itself in PIBASE's `docs/VPS.md` and `docs/PI-OPERATIONS.md`.
