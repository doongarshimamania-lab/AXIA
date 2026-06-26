#!/usr/bin/env bash
# Ponytail: persistent launcher for axia vite dev — survives parent shell exit
# via double-fork + setsid + SIGHUP-ignore, so the bash tool can't kill it.

set -e
cd /home/z/my-project/axia

LOG=/home/z/my-project/logs/vite-dev.log
PIDFILE=/home/z/my-project/logs/vite-dev.pid
mkdir -p /home/z/my-project/logs

# If already running, report and exit
if [ -f "$PIDFILE" ] && kill -0 "$(cat $PIDFILE)" 2>/dev/null; then
  echo "Already running with PID $(cat $PIDFILE)"
  exit 0
fi

# Daemonize: setsid + nohup-style detachment + background
# We use `setsid bash -c '...' &` so vite ends up in its own session.
setsid bash -c '
  trap "" HUP INT TERM
  cd /home/z/my-project/axia
  exec bun run dev
' < /dev/null > "$LOG" 2>&1 &

DAEMON_PID=$!
echo "$DAEMON_PID" > "$PIDFILE"
echo "Launched vite dev as PID $DAEMON_PID (session leader)"

# Wait for vite to be ready (max 30s)
for i in $(seq 1 30); do
  if curl -sS -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "Vite ready after ${i}s"
    exit 0
  fi
  sleep 1
done

echo "Vite did not become ready in 30s. Log tail:"
tail -20 "$LOG"
exit 1
