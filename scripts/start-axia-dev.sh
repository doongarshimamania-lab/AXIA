#!/usr/bin/env bash
# Start AXIA dev server (vite on port 3000) in background, log to file.
set -euo pipefail
export PATH="/usr/lib/node_modules/corepack/shims:/home/z/.npm-global/bin:/home/z/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
cd /home/z/my-project/axia
LOG=/home/z/my-project/scripts/axia-dev.log
PIDFILE=/home/z/my-project/scripts/axia-dev.pid

# Kill any existing vite on port 3000
if [ -f "$PIDFILE" ] && kill -0 "$(cat $PIDFILE)" 2>/dev/null; then
  echo "Killing previous server (pid $(cat $PIDFILE))"
  kill -9 "$(cat $PIDFILE)" 2>/dev/null || true
fi
lsof -ti:3000 2>/dev/null | xargs -r kill -9 2>/dev/null || true

nohup pnpm dev > "$LOG" 2>&1 &
echo $! > "$PIDFILE"
echo "Started dev server, pid=$(cat $PIDFILE), log=$LOG"
sleep 2
echo "--- tail of log ---"
tail -20 "$LOG" 2>/dev/null || true
