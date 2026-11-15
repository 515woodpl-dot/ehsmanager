#!/usr/bin/env bash
# Updates one installed company's manager to the latest version, with no
# questions asked. Made by scripts/install.sh, which also schedules it daily
# when installed with --auto-update. Run it as root:
#
#   /srv/manager/<name>/repo/scripts/update.sh <name> [--force] [--no-backup]
#
# Steps, any failure stops before the live app is touched (or puts it back):
#   1. fetch the branch; stop here if the running version is already the latest
#   2. back up the company's PIBASE project
#   3. unpack the new version into its own folder under releases/
#   4. install packages, apply database updates (scripts/migrate.mjs), build
#   5. switch "current" to the new folder and restart the app
#   6. check /api/heartbeat; if it doesn't answer healthy, switch back to the
#      previous version and restart it
#   7. keep the last 3 versions
set -euo pipefail

# This script moves the checkout it lives in to the new version (step 1), so
# it runs from a copy: bash reads a script as it goes, and the file must not
# change underneath it.
if [ -z "${MANAGER_UPDATE_COPY:-}" ]; then
  copy="$(mktemp /tmp/manager-update.XXXXXX)"; cp "$0" "$copy"; chmod 0755 "$copy"
  MANAGER_UPDATE_COPY="$copy" exec "$copy" "$@"
fi
trap 'rm -f "$MANAGER_UPDATE_COPY"' EXIT

name="${1:-}"; shift || true
force=0 backup=1 start=1
for arg in "$@"; do
  case "$arg" in
    --force) force=1 ;;
    --no-backup) backup=0 ;;
    --no-start) start=0 ;;   # used by install.sh for the first version
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done
base="${MANAGER_BASE:-/srv/manager}"
dir="$base/$name"
[ -n "$name" ] && [ -f "$dir/shared/instance.env" ] || { echo "usage: $0 <name> (no install found at $dir)" >&2; exit 2; }
# shellcheck disable=SC1091
. "$dir/shared/instance.env"   # PORT BRANCH APP_USER SYSTEMD PIBASE_DIR PIBASE_USER PIBASE_BIN ...
export PIBASE_DIR PIBASE_USER PIBASE_BIN
log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
as_app() { if [ "$(id -un)" = "$APP_USER" ]; then "$@"; else sudo -u "$APP_USER" -H "$@"; fi; }

# One update at a time.
exec 9>"$dir/shared/update.lock"
flock -n 9 || { log "another update is running"; exit 0; }

log "Checking $BRANCH for a new version"
as_app git -C "$dir/repo" fetch -q origin "$BRANCH"
sha="$(as_app git -C "$dir/repo" rev-parse "origin/$BRANCH")"
# Keep the checkout on the version being deployed, so the next run uses
# this version's scripts (including this one).
as_app git -C "$dir/repo" checkout -q -f --detach "$sha"
current="$(readlink -f "$dir/current" 2>/dev/null || true)"
if [ "$force" -eq 0 ] && [ -n "$current" ] && [ -f "$current/.release" ] && [ "$(cat "$current/.release")" = "$sha" ]; then
  log "Already running the latest version (${sha:0:7})."
  exit 0
fi

# A version that failed before is skipped until a newer one arrives (or --force).
if [ "$force" -eq 0 ] && [ "$(cat "$dir/shared/failed.release" 2>/dev/null)" = "$sha" ]; then
  log "Version ${sha:0:7} failed before; waiting for a newer version (use --force to try it again)."
  exit 0
fi
mark_failed() { echo "$sha" > "$dir/shared/failed.release"; }

if [ "$backup" -eq 1 ] && [ -n "$current" ]; then
  log "Backing up PIBASE project $PIBASE_PROJECT_ID"
  "$dir/repo/scripts/pibase-cli.sh" backup "$PIBASE_PROJECT_ID" "${PIBASE_BACKUP_DEST:-/data/backups}" >/dev/null \
    || { log "Backup failed, so nothing was changed. Fix the backup or run with --no-backup."; exit 1; }
fi

release="$dir/releases/$(date +%Y%m%d%H%M%S)-${sha:0:7}"
log "Preparing ${sha:0:7} in $release"
as_app mkdir -p "$release"
as_app git -C "$dir/repo" archive "$sha" | as_app tar -x -C "$release"
echo "$sha" | as_app tee "$release/.release" >/dev/null
as_app ln -s "$dir/shared/.env.local" "$release/.env.local"
cleanup_failed() { log "Update failed; the running version was not changed."; rm -rf "$release"; mark_failed; }
trap cleanup_failed ERR

# Reuse the running version's packages when the lock file is unchanged.
if [ -n "$current" ] && cmp -s "$current/package-lock.json" "$release/package-lock.json" && [ -d "$current/node_modules" ]; then
  as_app cp -al "$current/node_modules" "$release/node_modules"
else
  log "Installing packages"
  (cd "$release" && as_app npm ci --no-audit --no-fund --loglevel=error)
fi

log "Applying database updates"
(cd "$release" && as_app env PIBASE_DIR="$PIBASE_DIR" PIBASE_USER="$PIBASE_USER" PIBASE_BIN="$PIBASE_BIN" node scripts/migrate.mjs "$dir/shared/.env.local")

log "Building"
(cd "$release" && as_app env NEXT_TELEMETRY_DISABLED=1 npm run build --silent >"$dir/shared/build.log" 2>&1) \
  || { tail -30 "$dir/shared/build.log" >&2; false; }
trap - ERR

switch_to() { as_app ln -sfn "$1" "$dir/current.next" && as_app mv -T "$dir/current.next" "$dir/current"; }
restart() {
  if [ "$SYSTEMD" = 1 ]; then systemctl restart "manager-$name"; return; fi
  # Without systemd (containers, test machines): keep the app as a background process.
  if [ -f "$dir/shared/app.pid" ]; then kill "$(cat "$dir/shared/app.pid")" 2>/dev/null || true; sleep 2; fi
  local cmd=(env NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next start -p "$PORT" -H 127.0.0.1)
  [ "$(id -un)" = "$APP_USER" ] || cmd=(sudo -u "$APP_USER" -H "${cmd[@]}")
  # Detached from this script's output and its update lock (fd 9), so callers
  # piping it don't wait on the app and the next update isn't blocked.
  (cd "$dir/current" || exit 1; nohup "${cmd[@]}" >>"$dir/shared/app.log" 2>&1 </dev/null 9>&- & echo $! >"$dir/shared/app.pid")
}
healthy() { MANAGER_BASE="$base" "$dir/current/scripts/health.sh" "$name" --wait 90 >/dev/null; }

switch_to "$release"
if [ "$start" -eq 0 ]; then log "Version ${sha:0:7} is ready (not started)."; exit 0; fi
log "Restarting"
restart
if healthy; then
  log "Healthy on ${sha:0:7}."
  rm -f "$dir/shared/failed.release"
else
  log "The new version did not answer healthy."
  mark_failed
  if [ -n "$current" ] && [ -d "$current" ]; then
    log "Rolling back to $(basename "$current")"
    switch_to "$current"; restart
    if healthy; then log "Rolled back; the previous version is running."; else log "The previous version is not healthy either. Check $dir/shared/app.log and journalctl -u manager-$name."; fi
  fi
  exit 1
fi

# Keep the three newest versions (never the running one).
ls -1dt "$dir"/releases/*/ 2>/dev/null | tail -n +4 | while read -r old; do
  [ "$(readlink -f "$old")" = "$(readlink -f "$dir/current")" ] || rm -rf "$old"
done
log "Done."
