#!/bin/bash
# Chien de garde du serveur dev Next.js — lancé lui aussi en double-fork.
# Toutes les 30 s :
#   - si aucun processus next-server n'existe → relance
#   - si HTTP localhost:3000 ne répond pas 3 fois de suite → kill + relance
# Journal : /home/z/my-project/watchdog.log (tronqué si > 200 Ko)

LOG=/home/z/my-project/watchdog.log
FAILS=0

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"
}

# Tronquer le journal si trop gros
if [ -f "$LOG" ] && [ "$(stat -c%s "$LOG" 2>/dev/null)" -gt 200000 ]; then
  tail -50 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

log "watchdog démarré (PID $$)"

while true; do
  sleep 30

  # Le serveur tourne-t-il ?
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    log "next-server absent → relance"
    bash /home/z/my-project/scripts/start-dev-persistent.sh >> "$LOG" 2>&1
    FAILS=0
    sleep 60  # laisser le temps à la compilation
    continue
  fi

  # Répond-il ?
  if curl -s --max-time 15 -o /dev/null http://localhost:3000/ 2>/dev/null; then
    FAILS=0
  else
    FAILS=$((FAILS + 1))
    log "HTTP sans réponse (échec $FAILS/3)"
    if [ "$FAILS" -ge 3 ]; then
      log "serveur bloqué → kill + relance complète"
      pkill -9 -f "next dev" 2>/dev/null
      pkill -9 -f "next-server" 2>/dev/null
      sleep 3
      rm -rf /home/z/my-project/.next
      bash /home/z/my-project/scripts/start-dev-persistent.sh >> "$LOG" 2>&1
      FAILS=0
      sleep 90  # compilation à froid
    fi
  fi
done
