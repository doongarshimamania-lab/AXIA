#!/bin/bash
set -e
cd /home/z/my-project/timelock

echo "=== Building Vite frontend ==="
npx vite build 2>&1

echo "=== Build complete, checking dist ==="
ls -la dist/ 2>/dev/null || echo "No dist directory found"

echo "=== Starting preview server ==="
# Kill any existing preview server
pkill -f "serve-dist.cjs" 2>/dev/null || true
pkill -f "preview_server" 2>/dev/null || true

# Start the preview server
node serve-dist.cjs &
sleep 2

echo "=== Preview server started ==="
echo "Preview URL: https://preview-1936221977589032.space.chatglm.site/"
