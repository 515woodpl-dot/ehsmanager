#!/bin/bash
# /var/www/ehsmanager/scripts/heartbeat.sh
#
# Pings the /api/heartbeat endpoint to keep Supabase alive.
# Runs every 3 days via cron (see crontab entry below).
#
# Install:
#   chmod +x /var/www/ehsmanager/scripts/heartbeat.sh
#   crontab -e
#   # Add this line (fires at 08:00 every 3 days):
#   0 8 */3 * * /var/www/ehsmanager/scripts/heartbeat.sh >> /var/log/ehs-heartbeat.log 2>&1

ENDPOINT="https://manager.elliesheartstrings.com/api/heartbeat"
SECRET="${HEARTBEAT_SECRET:-}"  # optional — set in environment or hardcode here
LOG_DATE=$(date '+%Y-%m-%d %H:%M:%S')

if [ -n "$SECRET" ]; then
  URL="${ENDPOINT}?secret=${SECRET}"
else
  URL="$ENDPOINT"
fi

RESPONSE=$(curl -s -o /tmp/heartbeat_body.txt -w "%{http_code}" "$URL")
BODY=$(cat /tmp/heartbeat_body.txt)

if [ "$RESPONSE" = "200" ]; then
  echo "[$LOG_DATE] OK ($RESPONSE) — $BODY"
else
  echo "[$LOG_DATE] WARN ($RESPONSE) — $BODY"
fi
