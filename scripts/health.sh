#!/usr/bin/env bash
# Checks one installed company's manager: exits 0 when /api/heartbeat says it
# can reach its PIBASE project. With --restart, restarts the app when it
# doesn't (the systemd timer made by install.sh uses that).
#   scripts/health.sh <name> [--restart] [--wait SECONDS]
set -euo pipefail
name="${1:-}"; shift || true
restart=0 wait=0
while [ $# -gt 0 ]; do case "$1" in --restart) restart=1; shift ;; --wait) wait="${2:-0}"; shift 2 ;; *) echo "unknown option: $1" >&2; exit 2 ;; esac; done
dir="${MANAGER_BASE:-/srv/manager}/$name"
[ -n "$name" ] && [ -f "$dir/shared/instance.env" ] || { echo "usage: $0 <name>" >&2; exit 2; }
port="$(sed -n 's/^PORT=//p' "$dir/shared/instance.env")"
secret="$(sed -n 's/^HEARTBEAT_SECRET=//p' "$dir/shared/.env.local" | tail -1)"
check() { curl -fsS --max-time 10 "http://127.0.0.1:$port/api/heartbeat?secret=$secret" 2>/dev/null | grep -q '"ok":true'; }
deadline=$(( $(date +%s) + wait ))
until check; do
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "manager-$name is not healthy on port $port" >&2
    [ "$restart" -eq 0 ] || systemctl restart "manager-$name" || true
    exit 1
  fi
  sleep 2
done
echo "manager-$name is healthy"
