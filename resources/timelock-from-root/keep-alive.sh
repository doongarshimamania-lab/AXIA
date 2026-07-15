#!/bin/bash
while true; do
  if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
    cd /home/z/my-project/timelock
    nohup npx serve public -l 3000 -s > /tmp/axia-preview.log 2>&1 &
    echo "$(date): Restarted server" >> /tmp/axia-watchdog.log
  fi
  sleep 10
done
