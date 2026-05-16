#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[keeper] Starting Next.js at $(date)"
  NODE_OPTIONS="--max-old-space-size=4096" node node_modules/.bin/next dev -p 3000 --turbopack 2>&1
  EXIT_CODE=$?
  echo "[keeper] Next.js exited with code=$EXIT_CODE at $(date). Restarting in 5s..."
  sleep 5
done
