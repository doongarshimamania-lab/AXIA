#!/bin/bash
while true; do
  cd /home/z/my-project
  npx next dev -p 3000 &
  SERVER_PID=$!
  echo "$(date): Started Next.js with PID $SERVER_PID" >> /tmp/watchdog.log
  # Store PID for others to find
  echo $SERVER_PID > /home/z/my-project/.zscripts/dev.pid
  # Wait for the process to exit
  wait $SERVER_PID 2>/dev/null
  echo "$(date): Next.js exited, restarting in 3s..." >> /tmp/watchdog.log
  sleep 3
done
