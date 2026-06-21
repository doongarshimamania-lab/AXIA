#!/bin/bash
# Check if port 3000 is responding
if ! curl -s --connect-timeout 2 http://127.0.0.1:3000/ >/dev/null 2>&1; then
  echo "$(date): Port 3000 not responding, starting server..." >> /tmp/ensure-server.log
  # Kill any stale process
  kill $(lsof -t -i :3000) 2>/dev/null
  sleep 1
  # Start Next.js
  cd /home/z/my-project
  nohup npx next dev -p 3000 >> /tmp/next-server.log 2>&1 &
  echo "$(date): Started Next.js, PID: $!" >> /tmp/ensure-server.log
else
  echo "$(date): Server is running" >> /tmp/ensure-server.log
fi
