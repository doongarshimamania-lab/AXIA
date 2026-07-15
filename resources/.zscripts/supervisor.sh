#!/bin/bash
# Self-respawning supervisor for axia preview server
# Tries to keep the python server alive forever
LOG=/tmp/axia-preview.log
PIDFILE=/tmp/axia-preview.pid

while true; do
  echo "[$(date)] Starting preview server..." >> "$LOG"
  nohup python3 /home/z/my-project/resources/.zscripts/preview-server.py >> "$LOG" 2>&1 &
  SERVER_PID=$!
  echo $SERVER_PID > "$PIDFILE"
  wait $SERVER_PID
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 1s..." >> "$LOG"
  sleep 1
done
