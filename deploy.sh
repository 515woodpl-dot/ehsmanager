#!/bin/bash

echo "🚀 EHS Studio Manager — Deploying..."

cd /var/www/ehsmanager

# Plain, non-interactive build: no Next.js telemetry, upgrade prompts or AI-agent hooks.
export NEXT_TELEMETRY_DISABLED=1
export CI=1

echo "📥 Pulling latest code..."
git fetch origin
git reset --hard origin/main

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔨 Building..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Check errors above. App not restarted."
  exit 1
fi

echo "♻️  Restarting app..."
pm2 restart studio-manager

echo "✅ Done! App is live at https://manager.elliesheartstrings.com"
