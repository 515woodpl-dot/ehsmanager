#!/usr/bin/env bash
# Runs one PIBASE command-line command (project-create, migration-apply,
# backup, ...) for the deploy scripts, wherever PIBASE is installed:
#
#   PIBASE_BIN=/path/to/pibase   run that binary directly (it reads the
#                                PIBASE_* variables it needs from the environment)
#   otherwise                    run it in PIBASE's "ops" container, from
#                                PIBASE_DIR (default /home/pibase/pibase) as
#                                PIBASE_USER (default pibase), the layout made
#                                by PIBASE's scripts/setup-droplet.sh
#
# Standard input is passed through (migration-apply reads the SQL from it).
set -euo pipefail
if [ -n "${PIBASE_BIN:-}" ]; then exec "$PIBASE_BIN" "$@"; fi
dir="${PIBASE_DIR:-/home/pibase/pibase}"
user="${PIBASE_USER:-pibase}"
[ -f "$dir/compose.yaml" ] || { echo "PIBASE was not found in $dir. Set PIBASE_DIR, or PIBASE_BIN for a PIBASE binary." >&2; exit 1; }
# Same rule as PIBASE's own scripts: a server install keeps its data under
# PIBASE_DATA_ROOT, described by compose.pi.yaml.
layout=""
if ! grep -q '^COMPOSE_FILE=' "$dir/.env" 2>/dev/null; then layout="compose.yaml:compose.pi.yaml"; fi
run='cd "$0" && { [ -z "$1" ] || export COMPOSE_FILE="$1"; } && shift && exec docker compose --profile tools run --rm --no-deps -T ops "$@"'
if [ "$(id -un)" = "$user" ]; then exec bash -c "$run" "$dir" "$layout" "$@"; fi
exec sudo -u "$user" -H bash -c "$run" "$dir" "$layout" "$@"
