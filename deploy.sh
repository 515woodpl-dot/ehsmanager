#!/bin/bash
# Zero-downtime deploy: the new version is built in .next-build while the
# live site keeps running from .next. Only a successful build is swapped in,
# so a failed build never takes the site down. The previous build is kept in
# .next-prev for a quick rollback:  bash deploy.sh --rollback

set -u

# Everything runs inside main(), so bash reads the whole file before the
# git reset below replaces it with the new version.
main() {
  APP=/var/www/ehsmanager
  cd "$APP" || exit 1

  # Plain, non-interactive build: no Next.js telemetry, upgrade prompts or AI-agent hooks.
  export NEXT_TELEMETRY_DISABLED=1
  export CI=1

  if [ "${1:-}" = "--rollback" ]; then
    [ -f .next-prev/BUILD_ID ] || { echo "❌ No previous build to roll back to."; exit 1; }
    echo "⏪ Rolling back to the previous build..."
    mv .next .next-failed && mv .next-prev .next && mv .next-failed .next-prev
    pm2 restart studio-manager
    echo "✅ Rolled back. (Run deploy.sh again to return to the newest version.)"
    exit 0
  fi

  echo "🚀 EHS Studio Manager — Deploying..."

  echo "📥 Pulling latest code..."
  git fetch origin || { echo "❌ Could not reach GitHub. Nothing changed."; exit 1; }
  git reset --hard origin/main

  echo "📦 Installing dependencies..."
  npm install --legacy-peer-deps || { echo "❌ npm install failed. The live site is unchanged."; exit 1; }

  echo "🔨 Building (the live site stays up meanwhile)..."
  rm -rf .next-build
  if ! NEXT_DIST_DIR=.next-build npm run build; then
    echo "❌ Build failed. The live site is unchanged — check the errors above."
    rm -rf .next-build
    exit 1
  fi
  [ -f .next-build/BUILD_ID ] || { echo "❌ Build produced no BUILD_ID. The live site is unchanged."; exit 1; }

  echo "🔁 Switching to the new build..."
  rm -rf .next-prev
  [ -d .next ] && mv .next .next-prev
  mv .next-build .next
  pm2 restart studio-manager

  echo "✅ Done! $(git log --oneline -1) is live at https://manager.elliesheartstrings.com"
}

main "$@"
exit $?
