#!/bin/bash
# Axia Supervisor - keeps the server alive no matter what
cd /home/z/my-project/timelock
while true; do
  node serve-dist.cjs 2>&1
  echo "[$(date)] Server exited, restarting in 2s..." >&2
  sleep 2
done
