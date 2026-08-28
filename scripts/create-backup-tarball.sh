#!/bin/bash
# Create a complete backup tarball of the AXIA project.
# Includes the full file structure (axia/ + worklog.md + relevant root files).
# Excludes only regenerable/binary-heavy paths: node_modules, .git, dist, .convex, .next, cache.
set -euo pipefail

PROJECT_ROOT="/home/z/my-project"
AXIA_DIR="${PROJECT_ROOT}/axia"
DOWNLOAD_DIR="${PROJECT_ROOT}/download"
mkdir -p "${DOWNLOAD_DIR}"

TIMESTAMP=$(date -u +%Y%m%d-%H%M%S-UTC)
TARBALL="${DOWNLOAD_DIR}/axia-complete-backup-${TIMESTAMP}.tar.gz"

# Files/dirs to exclude (regenerable, sensitive, or unrelated to AXIA app code)
# ponytail: resources/ at PROJECT_ROOT contains stale backup JS files from
# unrelated projects (timelock, disk-from-root, etc.) — NOT AXIA code.
# Excluding it keeps the tarball focused on actual AXIA source.
EXCLUDES=(
  "--exclude=node_modules"
  "--exclude=.git"
  "--exclude=dist"
  "--exclude=.convex"
  "--exclude=.next"
  "--exclude=.turbo"
  "--exclude=.vercel"
  "--exclude=.cache"
  "--exclude=coverage"
  "--exclude=.DS_Store"
  "--exclude=*.log"
  "--exclude=tmp"
  "--exclude=.tmp"
  "--exclude=.env"
  "--exclude=.env.local"
  "--exclude=.env.production"
  "--exclude=.env.development"
)

echo "Creating backup tarball at: ${TARBALL}"
echo "Source: ${AXIA_DIR}"
echo ""

# Create the tarball from PROJECT_ROOT so the path inside the tar starts with axia/
# ponytail: only include axia/ + worklog.md — NOT resources/ (stale backup
# files from other projects bloat the tarball to 116MB and confuse users).
cd "${PROJECT_ROOT}"
tar -czf "${TARBALL}" "${EXCLUDES[@]}" \
  axia/ \
  worklog.md \
  2>&1 | tail -5

echo ""
echo "=== Backup created ==="
ls -lh "${TARBALL}"
echo ""
echo "=== Tarball contents (top-level) ==="
tar -tzf "${TARBALL}" 2>&1 | head -20
echo "..."
echo "=== Total file count ==="
tar -tzf "${TARBALL}" 2>&1 | wc -l
echo ""
echo "=== SHA256 ==="
sha256sum "${TARBALL}"
