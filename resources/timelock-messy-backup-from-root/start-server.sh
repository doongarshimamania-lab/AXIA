#!/bin/bash
cd /home/z/my-project/timelock
node serve-dist.cjs &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
# Keep the script alive
while kill -0 $SERVER_PID 2>/dev/null; do
  sleep 1
done
echo "Server died"
