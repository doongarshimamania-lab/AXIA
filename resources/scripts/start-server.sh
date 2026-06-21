#!/bin/bash
# Kill any existing server
pkill -f "serve-dist.cjs" 2>/dev/null
sleep 1

# Start the server
cd /home/z/my-project/timelock
exec node serve-dist.cjs
