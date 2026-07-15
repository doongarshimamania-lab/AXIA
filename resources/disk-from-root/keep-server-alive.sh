#!/bin/bash
while true; do
  python3 /home/z/my-project/timelock/serve-preview.py
  echo "Server died, restarting in 2s..."
  sleep 2
done
