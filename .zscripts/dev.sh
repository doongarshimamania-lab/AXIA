#!/bin/bash
echo "[DEV] Starting Axia Vite preview server..."
cd /home/z/my-project/timelock

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "[DEV] Installing dependencies..."
  npm install
fi

# Build the app
echo "[DEV] Building app..."
npx vite build

# Start the preview server on port 3000 with IPv6 support
echo "[DEV] Starting preview server on port 3000..."
npx vite preview --port 3000 --host "::"
