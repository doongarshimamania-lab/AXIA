#!/bin/bash
# Supervisor: keeps the server alive, restarts on crash
while true; do
  node /home/z/my-project/timelock/serve.cjs 2>/tmp/serve-err.log
  echo "[$(date)] Server exited, restarting in 2s..." >> /tmp/supervisor.log
  sleep 2
done
