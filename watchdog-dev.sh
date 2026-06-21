#!/bin/bash
# Watchdog: start dev server ONLY if port 3000 is not listening
# Called periodically by cron

cd /home/z/my-project

# Check if next-server is already listening on port 3000
if ss -tlnp 2>/dev/null | grep -q ":3000.*next-server"; then
  echo "[$(date)] Dev server already running. No action."
  exit 0
fi

echo "[$(date)] Dev server NOT running. Starting..."

# Kill stale processes
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "app-server/index" 2>/dev/null
sleep 2

# Start app-server (manages Next.js + auto-restart) in background
cd /home/z/my-project/mini-services/app-server
setsid bun --hot index.ts >> /home/z/my-project/dev.log 2>&1 &
disown

echo "[$(date)] app-server started."
