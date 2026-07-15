#!/bin/bash
while true; do
  cd /home/z/my-project/timelock
  # Check if port 3000 is responding
  if ! curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null | grep -q "200"; then
    # Kill stale processes
    fuser -k 3000/tcp 2>/dev/null
    sleep 1
    # Start vite preview
    npx vite preview --port 3000 --host "::" > /dev/null 2>&1 &
    sleep 3
    echo "$(date): Restarted vite" >> /tmp/axia-restarts.log
  fi
  sleep 3
done
