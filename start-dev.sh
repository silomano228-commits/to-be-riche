#!/bin/bash
# Robust dev server starter with auto-restart loop
# Designed to run as a persistent process

cd /home/z/my-project

# Kill any existing next processes
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "app-server/index" 2>/dev/null
sleep 2

# Start app-server which manages Next.js and auto-restarts it
cd /home/z/my-project/mini-services/app-server
exec bun --hot index.ts > /home/z/my-project/dev.log 2>&1
