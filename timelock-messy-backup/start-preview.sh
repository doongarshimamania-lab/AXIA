#!/bin/bash
cd /home/z/my-project/timelock
while true; do
  node serve-buf.cjs
  echo "Server crashed, restarting in 2s..."
  sleep 2
done
