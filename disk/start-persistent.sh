#!/bin/bash
while true; do
  node /home/z/my-project/server-manager.cjs
  echo "Server died, restarting in 2 seconds..." >> /tmp/server-manager.log
  sleep 2
done
