#!/bin/bash
cd /home/z/my-project
rm -f /home/z/my-project/keeper.log
while true; do
  echo "[$(date)] Starting Next.js..." >> /home/z/my-project/keeper.log
  node --max-old-space-size=4096 node_modules/.bin/next dev -p 3000 >> /home/z/my-project/keeper.log 2>&1
  echo "[$(date)] Next.js exited, restarting in 3s..." >> /home/z/my-project/keeper.log
  sleep 3
done
