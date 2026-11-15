#!/usr/bin/env bash
# Installs Local Manager for one company on a server that runs PIBASE, with
# no questions asked. Run as root:
#
#   ./scripts/install.sh --name acme --domain manager.acme.com \
#       --pibase-url https://api.example.com \
#       --owner-email owner@acme.com --business-name "Acme Creative" \
#       [--business-type creative|webdesign|photography] [--owner-name "Ann Lee"] \
#       [--booking-domain book.acme.com] [--from-email hello@acme.com] \
#       [--port 3101] [--branch main] [--repo URL] [--auto-update] [--no-system]
#
# Set up PIBASE first with its scripts/setup-droplet.sh (Docker, HTTPS, daily
# backups). Several companies can share one server: give each its own --name
# and --domain; ports are picked automatically.
#
# What it does (safe to run again; finished steps are kept):
#   1. installs Node.js 22 if needed, and a separate account for this company
#   2. clones the app into /srv/manager/<name>
#   3. creates the company's own PIBASE project and stores its keys
#   4. writes the app's settings with fresh random secrets
#   5. builds the first version and applies the database schema
#   6. creates the owner's account, already confirmed, with a random password
#      saved in /srv/manager/<name>/shared/owner-login.txt (root only), and
#      fills in the business name, type, stages and lists
#   7. runs the app as a systemd service and puts it behind Caddy with HTTPS
#   8. with --auto-update, checks for a new version every night and updates
#      itself (backup, database updates, build, health check, roll back on
#      failure)
#
# --no-system skips the system parts (Node install, account, systemd, Caddy,
# timers) and runs the app as a background process: for containers and tests.
# PIBASE_BIN=/path/to/pibase uses a PIBASE binary instead of its Docker setup.
set -euo pipefail

name="" domain="" pibase_url="" owner_email="" business_name="" business_type="creative" owner_name=""
booking_domain="" from_email="" port="" branch="main" repo="" auto_update=0 system=1
while [ $# -gt 0 ]; do
  case "$1" in
    --name) name="${2:-}"; shift 2 ;;
    --domain) domain="${2:-}"; shift 2 ;;
    --pibase-url) pibase_url="${2:-}"; shift 2 ;;
    --owner-email) owner_email="${2:-}"; shift 2 ;;
    --owner-name) owner_name="${2:-}"; shift 2 ;;
    --business-name) business_name="${2:-}"; shift 2 ;;
    --business-type) business_type="${2:-}"; shift 2 ;;
    --booking-domain) booking_domain="${2:-}"; shift 2 ;;
    --from-email) from_email="${2:-}"; shift 2 ;;
    --port) port="${2:-}"; shift 2 ;;
    --branch) branch="${2:-}"; shift 2 ;;
    --repo) repo="${2:-}"; shift 2 ;;
    --auto-update) auto_update=1; shift ;;
    --no-system) system=0; shift ;;
    -h|--help) sed -n '2,36p' "$0"; exit 0 ;;
    *) echo "unknown option: $1 (see --help)" >&2; exit 2 ;;
  esac
done

say() { printf '\n==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }
host_ok() { printf '%s' "$1" | grep -Eq '^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'; }
here="$(cd "$(dirname "$0")/.." && pwd)"

printf '%s' "$name" | grep -Eq '^[a-z0-9][a-z0-9-]{0,30}$' || die "--name must be a short lowercase id such as acme"
host_ok "$domain" || [ "$system" -eq 0 -a -z "$domain" ] || die "--domain must be a host name such as manager.acme.com"
[ -z "$booking_domain" ] || host_ok "$booking_domain" || die "--booking-domain must be a host name"
printf '%s' "$pibase_url" | grep -Eq '^https?://[^ ]+$' || die "--pibase-url must be PIBASE's address, e.g. https://api.example.com"
printf '%s' "$owner_email" | grep -Eq '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' || die "--owner-email must be an email address"
[ -n "$business_name" ] || die "--business-name is required"
case "$business_type" in photography|webdesign|creative) ;; *) die "--business-type must be photography, webdesign or creative" ;; esac
[ -z "$from_email" ] || printf '%s' "$from_email" | grep -Eq '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' || die "--from-email must be an email address"
[ -z "$port" ] || printf '%s' "$port" | grep -Eq '^[0-9]{4,5}$' || die "--port must be a number"
[ "$system" -eq 0 ] || [ "$(id -u)" -eq 0 ] || die "run this as root (or use --no-system)"
[ -n "$repo" ] || repo="$(git -C "$here" remote get-url origin 2>/dev/null || true)"
[ -n "$repo" ] || die "--repo is required (the git address of the app)"

base="${MANAGER_BASE:-/srv/manager}"
dir="$base/$name"
# Unix account names have a practical 32-character limit on Ubuntu. Keep the
# readable name for short company ids and use a stable hash for longer ones.
app_user="manager-$name"
if [ "${#app_user}" -gt 31 ]; then app_user="manager-$(printf '%s' "$name" | sha256sum | cut -c1-16)"; fi
[ "$system" -eq 1 ] || app_user="$(id -un)"
url="https://$domain"; [ -n "$domain" ] || url=""

# 1. Node.js and the account that runs the apps.
if [ "$system" -eq 1 ]; then
  if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' 2>/dev/null; then
    say "Installing Node.js 22"
    apt-get update -q >/dev/null
    apt-get install -y -q ca-certificates curl gnupg >/dev/null
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
    apt-get install -y -q nodejs >/dev/null
  fi
  command -v git >/dev/null || apt-get install -y -q git >/dev/null
  id "$app_user" >/dev/null 2>&1 || useradd --system --create-home --home-dir "/home/$app_user" --shell /usr/sbin/nologin "$app_user"
  install -d -m 0755 -o root -g root "$base"
fi
as_app() { if [ "$(id -un)" = "$app_user" ]; then "$@"; else sudo -u "$app_user" -H "$@"; fi; }
if [ "$system" -eq 1 ]; then
  # Existing installs used one shared manager account. Move every file to this
  # company's account before starting it under the new service identity.
  if [ -d "$dir" ]; then
    if [ -f "/etc/systemd/system/manager-$name.service" ]; then systemctl stop "manager-$name.service"; fi
    chown -R "$app_user:$app_user" "$dir"
  fi
  install -d -m 0755 -o root -g root "$dir"
  install -d -m 0700 -o "$app_user" -g "$app_user" "$dir/shared"
  install -d -m 0750 -o "$app_user" -g "$app_user" "$dir/releases"
else
  as_app mkdir -p "$dir/shared" "$dir/releases"
  chmod 0700 "$dir/shared"
fi

# 2. The app's code.
if [ -d "$dir/repo/.git" ]; then
  say "Using the existing copy of the app"
  if [ "$system" -eq 1 ]; then chown -R root:root "$dir/repo"; fi
  git -C "$dir/repo" remote set-url origin "$repo"
else
  say "Getting the app from $repo"
  git clone -q --branch "$branch" "$repo" "$dir/repo"
fi

# Settings for this install, read by update.sh.
pibase_dir="${PIBASE_DIR:-/home/pibase/pibase}"; pibase_user="${PIBASE_USER:-pibase}"
if [ -f "$dir/shared/instance.env" ]; then
  # shellcheck disable=SC1091
  port="${port:-$(. "$dir/shared/instance.env"; echo "$PORT")}"
fi
if [ -z "$port" ]; then
  # The first free port from 3101, not used by another install.
  used="$(cat "$base"/*/shared/instance.env 2>/dev/null | sed -n 's/^PORT=//p' || true)"
  port=3101
  while printf '%s\n' "$used" | grep -qx "$port" || (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; do port=$((port + 1)); done
fi
export PIBASE_DIR="$pibase_dir" PIBASE_USER="$pibase_user" PIBASE_BIN="${PIBASE_BIN:-}"

# 3. The company's PIBASE project.
project_file="$dir/shared/pibase-project.json"
if [ ! -s "$project_file" ]; then
  say "Creating the PIBASE project"
  out="$("$dir/repo/scripts/pibase-cli.sh" project-create "$business_name")" || die "could not create the PIBASE project: $out"
  # project-create prints the project as JSON (Docker may print lines before it).
  printf '%s\n' "$out" | sed -n '/^{/,/^}/p' > "$project_file.tmp"
  node -e 'const p=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); if(!p.id||!p.anon_key||!p.service_key) process.exit(1)' "$project_file.tmp" \
    || die "PIBASE did not return the new project's keys"
  mv "$project_file.tmp" "$project_file"
fi
chmod 0600 "$project_file"
[ "$system" -eq 0 ] || chown root:root "$project_file"
field() { node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))[process.argv[2]])' "$project_file" "$1"; }
project_id="$(field id)"

cat > "$dir/shared/instance.env.tmp" <<EOF
NAME=$name
PORT=$port
BRANCH=$branch
APP_USER=$app_user
SYSTEMD=$system
DOMAIN=$domain
PIBASE_PROJECT_ID=$project_id
PIBASE_DIR=$pibase_dir
PIBASE_USER=$pibase_user
PIBASE_BIN=${PIBASE_BIN:-}
EOF
mv "$dir/shared/instance.env.tmp" "$dir/shared/instance.env"
chmod 0600 "$dir/shared/instance.env"
[ "$system" -eq 0 ] || chown root:root "$dir/shared/instance.env"

# 4. The app's settings. Secrets are made once and kept on later runs.
env_file="$dir/shared/.env.local"
touch "$env_file"; chmod 0600 "$env_file"; chown "$app_user:$app_user" "$env_file" 2>/dev/null || true
secret() { node -e 'console.log(require("crypto").randomBytes(32).toString("base64url"))'; }
setting() {  # setting KEY VALUE [keep]  — "keep" leaves an existing value alone
  if grep -q "^$1=" "$env_file"; then
    [ "${3:-}" = keep ] && return
    local tmp; tmp="$(mktemp)"; grep -v "^$1=" "$env_file" > "$tmp"; cat "$tmp" > "$env_file"; rm -f "$tmp"
  fi
  printf '%s=%s\n' "$1" "$2" >> "$env_file"
}
setting NEXT_PUBLIC_PIBASE_URL "${pibase_url%/}"
setting NEXT_PUBLIC_PIBASE_ANON_KEY "$(field anon_key)"
setting PIBASE_SERVICE_KEY "$(field service_key)"
setting PIBASE_PROJECT_ID "$project_id"
[ -z "$url" ] || setting NEXT_PUBLIC_APP_URL "$url"
booking_url="$url"; [ -z "$booking_domain" ] || booking_url="https://$booking_domain"
[ -z "$booking_url" ] || setting NEXT_PUBLIC_BOOKING_URL "$booking_url"
setting BOOKING_HOST "$booking_domain"
setting CONTRACT_SIGNING_SECRET "$(secret)" keep
setting SETTINGS_ENCRYPTION_KEY "$(secret)" keep
setting HEARTBEAT_SECRET "$(secret)" keep
[ -z "$from_email" ] || setting RESEND_FROM_EMAIL "$from_email"

# 5. First version: packages, database schema, build.
say "Building the app and setting up the database"
update_args=(--no-start --no-backup)
[ ! -e "$dir/current" ] || update_args=(--no-start --no-backup --force)
# Use the updater shipped with this installer. An existing checkout may still
# contain an older updater that cannot migrate the new deployment layout.
MANAGER_BASE="$base" "$here/scripts/update.sh" "$name" "${update_args[@]}"

# 6. The owner's account and business profile.
say "Setting up the owner's account"
owner="$(cd "$dir/current" && as_app node --no-warnings scripts/provision.mjs --env "$env_file" --email "$owner_email" \
  --business-name "$business_name" --business-type "$business_type" ${owner_name:+--owner-name "$owner_name"} \
  --password-file "$dir/shared/owner-login.txt")"
owner_id="$(printf '%s' "$owner" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).userId))')"
setting STUDIO_OWNER_USER_ID "$owner_id"
if [ -f "$dir/shared/owner-login.txt" ]; then
  chmod 0600 "$dir/shared/owner-login.txt"
  [ "$system" -eq 0 ] || chown root:root "$dir/shared/owner-login.txt"
fi

# 7. Run it.
if [ "$system" -eq 1 ]; then
  say "Starting the app (systemd service manager-$name)"
  cat > "/etc/systemd/system/manager-$name.service" <<EOF
[Unit]
Description=Local Manager ($name)
After=network-online.target docker.service
Wants=network-online.target

[Service]
User=$app_user
WorkingDirectory=$dir/current
Environment=NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
ExecStart=$(command -v node) node_modules/next/dist/bin/next start -p $port -H 127.0.0.1
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
  # Health check every 10 minutes; a failure shows in `systemctl status`.
  cat > "/etc/systemd/system/manager-$name-health.service" <<EOF
[Unit]
Description=Local Manager ($name) health check
[Service]
Type=oneshot
Environment=MANAGER_BASE=$base
ExecStart=$dir/repo/scripts/health.sh $name --restart
EOF
  cat > "/etc/systemd/system/manager-$name-health.timer" <<EOF
[Unit]
Description=Local Manager ($name) health check every 10 minutes
[Timer]
OnBootSec=5min
OnUnitActiveSec=10min
[Install]
WantedBy=timers.target
EOF
  if [ "$auto_update" -eq 1 ]; then
    cat > "/etc/systemd/system/manager-$name-update.service" <<EOF
[Unit]
Description=Local Manager ($name) automatic update
After=network-online.target
[Service]
Type=oneshot
Environment=MANAGER_BASE=$base
ExecStart=$dir/repo/scripts/update.sh $name
EOF
    cat > "/etc/systemd/system/manager-$name-update.timer" <<EOF
[Unit]
Description=Local Manager ($name) nightly update
[Timer]
OnCalendar=*-*-* 04:30
RandomizedDelaySec=45min
Persistent=true
[Install]
WantedBy=timers.target
EOF
  fi
  systemctl daemon-reload
  systemctl enable --now "manager-$name.service" "manager-$name-health.timer" >/dev/null
  [ "$auto_update" -eq 0 ] || systemctl enable --now "manager-$name-update.timer" >/dev/null
  systemctl restart "manager-$name.service"

  if [ -n "$domain" ] && command -v caddy >/dev/null && [ -d /etc/caddy ]; then
    say "HTTPS for $domain${booking_domain:+ and $booking_domain} (Caddy)"
    install -d -m 0755 /etc/caddy/pibase.d
    {
      echo "$domain${booking_domain:+, $booking_domain} {"
      echo "	encode zstd gzip"
      echo "	reverse_proxy 127.0.0.1:$port"
      echo "}"
    } > "/etc/caddy/pibase.d/manager-$name.caddy"
    # PIBASE's Caddyfile imports pibase.d; add the import if Caddy was set up otherwise.
    grep -q 'import /etc/caddy/pibase.d/\*.caddy' /etc/caddy/Caddyfile 2>/dev/null || echo 'import /etc/caddy/pibase.d/*.caddy' >> /etc/caddy/Caddyfile
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || die "Caddy rejected the new site; see /etc/caddy/pibase.d/manager-$name.caddy"
    systemctl reload caddy
  else
    echo "Caddy is not installed: put your own HTTPS proxy in front of 127.0.0.1:$port."
  fi
else
  say "Starting the app in the background (no systemd)"
  MANAGER_BASE="$base" "$here/scripts/update.sh" "$name" --no-backup --force >/dev/null
fi

# Check it answers.
MANAGER_BASE="$base" "$dir/repo/scripts/health.sh" "$name" --wait 90 >/dev/null || die "the app did not answer healthy on port $port; see journalctl -u manager-$name"

cat <<EOF

Local Manager is installed for $business_name.
  Address:        ${url:-http://127.0.0.1:$port}
  App port:       $port (service manager-$name)
  PIBASE project: $project_id
  Owner sign-in:  $dir/shared/owner-login.txt (root only)
  Updates:        $([ "$auto_update" -eq 1 ] && echo "automatic, nightly" || echo "run $dir/repo/scripts/update.sh $name")

Add email (Resend) and payment (Stripe) keys in the app under Settings
when you're ready.
EOF
[ -z "$domain" ] || echo "Point $domain${booking_domain:+ and $booking_domain} at this server (DNS A record) if you haven't yet; HTTPS starts working as soon as the name resolves."
