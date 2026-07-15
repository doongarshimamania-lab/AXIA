#!/bin/bash

# Start Convex local backend
cd /home/z/my-project/timelock
npx convex dev --typecheck=disable > /tmp/convex-dev.log 2>&1 &
CONVEX_PID=$!
echo "Convex started with PID $CONVEX_PID"

# Wait for Convex to be ready
for i in $(seq 1 30); do
    if curl -s http://127.0.0.1:3210/api/query -X POST -H "Content-Type: application/json" -d '{"path":"auth:isAuthenticated","args":{}}' > /dev/null 2>&1; then
        echo "Convex is ready"
        break
    fi
    sleep 1
done

# Start Caddy proxy on port 3000
caddy run --config /home/z/my-project/Caddyfile --adapter caddyfile > /tmp/caddy-proxy.log 2>&1 &
CADDY_PID=$!
echo "Caddy proxy started with PID $CADDY_PID"

# Wait for Caddy to be ready
sleep 2

# Verify everything is running
ss -tlnp | grep -E "3210|3000"
echo "All services started"

# Keep the script running
wait
