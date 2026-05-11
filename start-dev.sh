#!/bin/bash
export NODE_OPTIONS="--max-old-space-size=2048"
cd /home/z/my-project
exec node node_modules/.bin/next dev -p 3000
