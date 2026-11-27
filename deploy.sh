#!/bin/bash
# 515 Studio Manager — zero-downtime deploy (https://manager.515studio.net).
# Pulls the `515studio` branch, builds the new version in .next-build while the
# live site keeps running from .next, and swaps it in only if the build
# succeeds. The previous build is kept for:  bash deploy.sh --rollback
#
# This is NOT Ellie's app: that one deploys from /var/www/ehsmanager.

set -u

# Everything runs inside main(), so bash reads the whole file before the
# git reset below replaces it with the new version.
main() {
  APP=/var/www/515manager
  BRANCH=515studio
  PM2_NAME=515manager
  URL=https://manager.515studio.net
  cd "$APP" || exit 1

  # Plain, non-interactive build: no Next.js telemetry, upgrade prompts or AI-agent hooks.
  export NEXT_TELEMETRY_DISABLED=1
  export CI=1

  if [ "${1:-}" = "--rollback" ]; then
    [ -f .next-prev/BUILD_ID ] || { echo "❌ No previous build to roll back to."; exit 1; }
    echo "⏪ Rolling back 515 Studio Manager to the previous build..."
    mv .next .next-failed && mv .next-prev .next && mv .next-failed .next-prev
    pm2 restart "$PM2_NAME"
    echo "✅ Rolled back. (Run deploy.sh again to return to the newest version.)"
    exit 0
  fi

  echo "🚀 515 Studio Manager — Deploying..."

  echo "📥 Pulling the $BRANCH branch..."
  git fetch origin "$BRANCH" || { echo "❌ Could not reach GitHub. Nothing changed."; exit 1; }
  git checkout -q "$BRANCH" || { echo "❌ Could not switch to $BRANCH. Nothing changed."; exit 1; }
  git reset --hard "origin/$BRANCH"

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
  pm2 restart "$PM2_NAME"

  echo "✅ Done! $(git log --oneline -1) is live at $URL"
}

main "$@"
exit $?
