#!/usr/bin/env bash
# Create a clean backup zip of the AXIA repo for GitHub Release asset.
# Excludes: .git, node_modules, .next, dist, .convex, upload, skills, download
# Output: /home/z/my-project/download/axia-backup-<timestamp>.zip
set -euo pipefail

REPO_ROOT="/home/z/my-project"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%SZ)"
ZIP_NAME="axia-backup-${TIMESTAMP}.zip"
ZIP_PATH="${REPO_ROOT}/download/${ZIP_NAME}"

cd "${REPO_ROOT}"

# Clean any prior partial zip
rm -f "${ZIP_PATH}"

# Build exclude list (relative to repo root)
EXCLUDES=(
  ".git"
  "axia/node_modules"
  "axia/.next"
  "axia/dist"
  "axia/.convex"
  "axia/convex_local_backend.sqlite3"
  "upload"
  "skills"
  "download"
  "agent-ctx"
  "resources/tool-results"
  "tool-results"
  "*.log"
  "*.tsbuildinfo"
  ".env"
  ".env.local"
  ".env.*.local"
)

# Build zip arg list
ZIP_ARGS=()
for ex in "${EXCLUDES[@]}"; do
  ZIP_ARGS+=( -x "${ex}/*" "${ex}" )
done
# Also exclude any *.log / .env anywhere
ZIP_ARGS+=( -x "*/.env" "*/.env.local" "*/.env.*.local" "*/.DS_Store" "*/node_modules/*" "*/.next/*" "*/dist/*" "*/.convex/*" "*/convex_local_backend.sqlite3" )

echo "Creating backup zip at: ${ZIP_PATH}"
zip -r -q "${ZIP_PATH}" . \
  -x ".git/*" "axia/node_modules/*" "axia/.next/*" "axia/dist/*" "axia/.convex/*" \
     "upload/*" "skills/*" "download/*" "agent-ctx/*" \
     "resources/tool-results/*" "tool-results/*" \
     "*.log" "*.tsbuildinfo" \
     "*/.env" "*/.env.local" "*/.env.*.local" \
     "*/.DS_Store" "*/node_modules/*" "*/.next/*" "*/dist/*" "*/.convex/*" \
     "*/convex_local_backend.sqlite3" \
  || { echo "zip failed"; exit 1; }

echo "---ZIP INFO---"
ls -lh "${ZIP_PATH}"
echo "---FILE COUNT---"
unzip -l "${ZIP_PATH}" 2>&1 | tail -1
echo "---TOP-LEVEL ENTRIES IN ZIP---"
unzip -l "${ZIP_PATH}" 2>&1 | awk 'NR>3 && !/-----/ {print $4}' | awk -F/ '{print $1}' | sort -u | head -20
echo "---DONE---"
echo "ZIP_PATH=${ZIP_PATH}"
