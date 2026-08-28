#!/bin/bash
# Start vite dev server in a fully detached background process
cd /home/z/my-project/axia
pkill -f "vite --port 3000" 2>/dev/null
sleep 1
nohup bun run dev > /tmp/vite-dev.log 2>&1 &
VITE_PID=$!
echo "Started vite with PID $VITE_PID"
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    echo "Vite ready after ${i}s"
    break
  fi
done
disown $VITE_PID 2>/dev/null
ps -p $VITE_PID -o pid,cmd 2>/dev/null
