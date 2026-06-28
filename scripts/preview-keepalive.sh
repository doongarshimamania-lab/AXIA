#!/bin/bash
# Keep the preview server running across bash sessions.
while true; do
  node /home/z/my-project/serve-preview.cjs
  echo "[keepalive] preview exited, restarting in 2s..."
  sleep 2
done
