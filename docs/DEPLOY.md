# Deploying Local Manager for a company

One server can run PIBASE and any number of companies' managers. Each company
gets its own PIBASE project (its own database, users and keys), its own copy
of the app, its own address and its own HTTPS certificate. Everything below
runs without questions, so it also works from a provisioning script.

## 1. PIBASE (once per server)

On a fresh Ubuntu 24.04 or Debian 12 server, as root, follow PIBASE's
`docs/VPS.md`, in short:

```bash
git clone https://github.com/515woodpl-dot/pibase.git /root/pibase
```

```bash
/root/pibase/scripts/setup-droplet.sh --domain api.example.com --email you@example.com --no-account
```

That installs Docker, Caddy (HTTPS), the firewall and daily encrypted
backups, and starts PIBASE at `https://api.example.com`. (`--no-account`
skips the dashboard account prompt; create one later with
`scripts/create-account.sh` if you want the dashboard.)

## 2. A company

Point the company's manager address (and booking address, if any) at the
server with a DNS A record. Then, as root:

```bash
git clone https://github.com/515woodpl-dot/ehsmanager.git /root/ehsmanager
```

```bash
/root/ehsmanager/scripts/install.sh --name acme --domain manager.acme.com --pibase-url https://api.example.com --owner-email owner@acme.com --owner-name "Ann Lee" --business-name "Acme Creative" --business-type creative --auto-update
```

Options: `--business-type creative|webdesign|photography`,
`--booking-domain book.acme.com`, `--from-email hello@acme.com` (on a domain
verified in Resend), `--port`, `--branch`, `--repo`.

It creates the company's PIBASE project, writes the app's settings with fresh
secrets, applies the database schema, creates the owner's account (already
confirmed) with the business name, type, stages and lists filled in, starts
the app as the systemd service `manager-acme`, adds the HTTPS site to Caddy,
and checks the app answers healthy.

The owner's first password is in `/srv/manager/acme/shared/owner-login.txt`
(readable by root only). Send it to the owner; they can change it later.
Email (Resend) and payments (Stripe) are added by the owner in the app under
Settings.

Running the same command again is safe: it keeps the project, the secrets and
the owner, and only fills in what is missing.

## 3. Updates

With `--auto-update`, every night between 04:30 and 05:15 the server runs
`/srv/manager/acme/repo/scripts/update.sh acme`, which:

1. stops at once if the company already runs the latest version;
2. backs up the company's PIBASE project;
3. builds the new version in its own folder (`releases/`), then applies new
   database updates (`scripts/migrate.mjs`);
4. switches to it, restarts, and checks `/api/heartbeat`;
5. if the build fails, leaves the database and live application untouched; if
   the new version doesn't answer healthy, puts back the previous application
   version and skips that version on later nights until a newer one arrives.

The database is **not** restored on an unhealthy-release rollback. Restoring a
pre-update backup could discard writes made while the previous application
continued running. Migrations must be compatible with both the previous and
new application versions; remove old schema only in a later release.

Run it by hand any time (`--force` to rebuild the same version, `--no-backup`
to skip the backup). A health check every 10 minutes restarts the app if it stops
answering (`manager-acme-health.timer`).

Database updates are the numbered `pibase-migration-*.sql` files. PIBASE
records each one by name and runs it once; never edit a released one, add a
new number instead. A new project gets `pibase-schema.sql` first.

## 4. Where things are

| | |
|---|---|
| App versions | `/srv/manager/<name>/releases/`, live one at `current` |
| Settings and secrets | `/srv/manager/<name>/shared/.env.local` (mode 600) |
| PIBASE project keys | `/srv/manager/<name>/shared/pibase-project.json` (root-owned, mode 600) |
| First owner password | `/srv/manager/<name>/shared/owner-login.txt` (root-owned, mode 600) |
| Install settings | `/srv/manager/<name>/shared/instance.env` |
| Logs | `journalctl -u manager-<name>`, build log in `shared/build.log` |
| HTTPS site | `/etc/caddy/pibase.d/manager-<name>.caddy` |
| Services | `manager-<name>`, `manager-<name>-health.timer`, `manager-<name>-update.timer` |

Back up `shared/.env.local` with PIBASE's backup key: without
`SETTINGS_ENCRYPTION_KEY` the API keys saved in Settings can't be read.

## Without Docker or systemd

`PIBASE_BIN=/path/to/pibase` makes the scripts use a PIBASE binary instead of
its Docker setup, and `--no-system` runs the app as a background process
without systemd, Caddy or timers (for containers and testing).
