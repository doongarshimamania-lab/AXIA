#!/bin/bash
cd /home/z/my-project
while true; do
  node server-manager.cjs &
  NODE_PID=$!
  echo "Started node server with PID $NODE_PID at $(date)" >> /tmp/axia-watchdog.log
  wait $NODE_PID
  echo "Node server died at $(date), restarting..." >> /tmp/axia-watchdog.log
  sleep 2
done
