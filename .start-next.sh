#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=4096" npx next dev -p 3000 --turbopack
  echo "Server crashed, restarting in 3s..."
  sleep 3
done
