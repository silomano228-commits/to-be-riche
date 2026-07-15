#!/bin/bash
trap 'echo "[SIGNAL] Received SIGTERM at $(date)"; exit 1' SIGTERM
trap 'echo "[SIGNAL] Received SIGINT at $(date)"; exit 1' SIGINT
trap 'echo "[SIGNAL] Received SIGHUP at $(date)"; exit 1' SIGHUP
trap 'echo "[SIGNAL] Received SIGUSR1 at $(date)"' SIGUSR1
trap 'echo "[SIGNAL] Received SIGUSR2 at $(date)"' SIGUSR2

echo "[START] $(date) - Starting Next.js dev server"
NODE_OPTIONS="--max-old-space-size=1024" npx next dev -p 3000 --webpack 2>&1
EXIT_CODE=$?
echo "[EXIT] $(date) - Exited with code $EXIT_CODE"
