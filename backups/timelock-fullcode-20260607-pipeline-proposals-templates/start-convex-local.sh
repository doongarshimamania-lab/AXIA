#!/bin/bash
# Start the local Convex backend and keep it running
CONVEX_BIN="/home/z/.cache/convex/binaries/precompiled-2026-05-27-e85ff37/convex-local-backend"
DB_PATH="/home/z/my-project/.convex/local/default/convex_local_backend.sqlite3"
STORAGE="/home/z/my-project/.convex/local/default/convex_local_storage"

while true; do
  echo "[$(date)] Starting Convex local backend..."
  "$CONVEX_BIN" \
    "$DB_PATH" \
    --port 3210 \
    --site-proxy-port 3211 \
    --instance-name "anonymous-my-project" \
    --instance-secret "7bcbb0ae096e5945b3851c7468ddfd42f3bc817f2fc42423bebd04de1223b305" \
    --local-storage "$STORAGE" \
    --disable-beacon \
    2>&1 | tee -a /tmp/convex-backend.log
  EXIT_CODE=$?
  echo "[$(date)] Convex backend exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
