#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log_step_start() {
        local step_name="$1"
        echo "=========================================="
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting: $step_name"
        echo "=========================================="
        export STEP_START_TIME
        STEP_START_TIME=$(date +%s)
}

log_step_end() {
        local step_name="${1:-Unknown step}"
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - STEP_START_TIME))
        echo "=========================================="
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Completed: $step_name"
        echo "[LOG] Step: $step_name | Duration: ${duration}s"
        echo "=========================================="
        echo ""
}

wait_for_service() {
        local host="$1"
        local port="$2"
        local service_name="$3"
        local max_attempts="${4:-60}"
        local attempt=1

        echo "Waiting for $service_name to be ready on $host:$port..."

        while [ "$attempt" -le "$max_attempts" ]; do
                if curl -s --connect-timeout 2 --max-time 5 "http://$host:$port" >/dev/null 2>&1; then
                        echo "$service_name is ready!"
                        return 0
                fi

                echo "Attempt $attempt/$max_attempts: $service_name not ready yet, waiting..."
                sleep 1
                attempt=$((attempt + 1))
        done

        echo "ERROR: $service_name failed to start within $max_attempts seconds"
        return 1
}

cd "$PROJECT_DIR"

if ! command -v bun >/dev/null 2>&1; then
        echo "ERROR: bun is not installed or not in PATH"
        exit 1
fi

log_step_start "bun install"
echo "[BUN] Installing dependencies..."
bun install
log_step_end "bun install"

# Build the Vite app first
log_step_start "Building Vite app"
echo "[TIMELock] Building Vite+Convex TIMELock app..."
cd "$PROJECT_DIR/timelock" && npx vite build 2>&1
cd "$PROJECT_DIR"
# Copy build to public/timelock/
rm -rf "$PROJECT_DIR/public/timelock/assets"
cp -r "$PROJECT_DIR/timelock/dist/"* "$PROJECT_DIR/public/timelock/"
log_step_end "Building Vite app"

log_step_start "Starting TIMELock dev server"
echo "[TIMELock] Starting server (serves Vite+Convex TIMELock app at /timelock/)..."
# Use the detached launcher to start a persistent server process
node /home/z/my-project/launch-server.cjs
log_step_end "Starting TIMELock dev server"

log_step_start "Waiting for TIMELock server"
wait_for_service "localhost" "3000" "TIMELock server"
log_step_end "Waiting for TIMELock server"

log_step_start "Health check"
echo "[TIMELock] Performing health check..."
curl -fsS localhost:3000 >/dev/null
echo "[TIMELock] Health check passed"
log_step_end "Health check"

echo "TIMELock server is running as a detached process."
echo "The original Vite+Convex app is served at /timelock/"
