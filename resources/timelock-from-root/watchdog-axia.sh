#!/bin/bash
while true; do
  if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    # Server is down, restart it
    fuser -k 3000/tcp 2>/dev/null
    sleep 2
    nohup node /home/z/my-project/timelock/serve-axia.mjs > /tmp/axia-serve.log 2>&1 &
    disown
    sleep 3
    echo "$(date): Restarted server" >> /tmp/axia-watchdog.log
  fi
  sleep 30
done
