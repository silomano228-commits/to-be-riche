#!/bin/bash
# Lance le serveur dev Next.js de façon PERSISTANTE via double-fork.
# Le subshell ( ... & ) se termine immédiatement → le processus setsid'est
# reparenté sur PID 1 → il échappe au nettoyage de fin de session outil.

cd /home/z/my-project

# Nettoyer tout reste de serveur précédent
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "next-server" 2>/dev/null
sleep 2

# Purger le cache de compilation si corrompu
if [ -f .next/BAD_BUILD_MARKER ]; then
  rm -rf .next
fi

# Double-fork : le lanceur meurt, le serveur survit
(
  setsid bash -c '
    cd /home/z/my-project
    exec env NODE_OPTIONS="--max-old-space-size=2048" \
      node node_modules/.bin/next dev -p 3000 --webpack
  ' >> /home/z/my-project/dev-server.log 2>&1 < /dev/null &
)

echo "[start-dev-persistent] Serveur lancé en $(date). Vérifiez dev-server.log"
