#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Axia - One Command Start
# ═══════════════════════════════════════════════════════════════
# Usage: ./start.sh
# This script:
#   1. Installs dependencies if node_modules missing
#   2. Builds the app if dist missing
#   3. Starts the preview server on port 3000
# ═══════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")"

echo "[Axia] Starting..."

# Step 1: Install dependencies
if [ ! -d "node_modules" ]; then
  echo "[Axia] Installing dependencies..."
  npm install --production=false 2>&1 | tail -3
fi

# Step 2: Build if dist missing
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
  echo "[Axia] Building production bundle..."
  npx vite build 2>&1 | tail -5
fi

# Step 3: Start server
echo "[Axia] Starting server on http://0.0.0.0:3000"

# Try the compiled C server first (most stable)
if [ -f "./preview_server" ]; then
  exec ./preview_server
elif [ -f "./serve-dist.cjs" ]; then
  exec node serve-dist.cjs
else
  # Fallback: use Python
  cd dist
  exec python3 -m http.server 3000 --bind 0.0.0.0
fi
