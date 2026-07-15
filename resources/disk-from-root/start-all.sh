#!/bin/bash
# Kill old processes
pkill -f "serve-dist" 2>/dev/null
pkill -f "server-manager" 2>/dev/null
sleep 1

# Start server on port 3000 (Caddy likely proxies to this)
cd /home/z/my-project/timelock
node /home/z/my-project/server-manager.cjs &
SM_PID=$!
echo "Server-manager PID: $SM_PID on port 3000"

# Start server on port 5173 (fallback)
node serve-dist.cjs &
SD_PID=$!
echo "Serve-dist PID: $SD_PID on port 5173"

# Wait for servers to start
sleep 3

# Verify they're running
if ps -p $SM_PID > /dev/null 2>&1; then echo "Port 3000: OK"; else echo "Port 3000: FAILED"; fi
if ps -p $SD_PID > /dev/null 2>&1; then echo "Port 5173: OK"; else echo "Port 5173: FAILED"; fi

# Test direct access
curl -s -m 3 -o /dev/null -w "Port 3000 direct: HTTP %{http_code}\n" http://127.0.0.1:3000/
curl -s -m 3 -o /dev/null -w "Port 5173 direct: HTTP %{http_code}\n" http://127.0.0.1:5173/

# Keep the script running so processes don't get killed
echo "Servers running. Keeping alive..."
wait
