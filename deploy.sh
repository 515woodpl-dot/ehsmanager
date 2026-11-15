#!/bin/bash
# Kept for old habits. Installs and updates are now done per company by
# scripts/install.sh and scripts/update.sh; see docs/DEPLOY.md.
#
#   ./deploy.sh <name>        same as scripts/update.sh <name>
set -euo pipefail
[ -n "${1:-}" ] || { echo "usage: $0 <name>   (see docs/DEPLOY.md)" >&2; exit 2; }
exec "$(dirname "$0")/scripts/update.sh" "$@"
