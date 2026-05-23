#!/bin/bash
# Start next-keeper
cd /home/z/my-project/mini-services/next-keeper
nohup bun run dev > /home/z/my-project/dev.log 2>&1 &
NEXT_KEEPER_PID=$!

# Start chat-service
cd /home/z/my-project/mini-services/chat-service
nohup bun run dev > /home/z/my-project/mini-services/chat-service/log.txt 2>&1 &
CHAT_PID=$!

# Wait for them to initialize
sleep 8

# Verify
echo "Next-keeper PID: $NEXT_KEEPER_PID"
echo "Chat service PID: $CHAT_PID"
ps aux | grep -E "bun|next" | grep -v grep
