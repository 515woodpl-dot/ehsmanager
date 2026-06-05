#!/bin/bash

echo "🚀 EHS Studio Manager — Deploying..."

cd /var/www/ehsmanager

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
