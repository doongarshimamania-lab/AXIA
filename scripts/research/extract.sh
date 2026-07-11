#!/usr/bin/env bash
# Extract first 3 search results per file, concise format.
set -uo pipefail
cd /home/z/my-project/scripts/research

for f in "$@"; do
  base="${f%.json}"
  echo "============================================"
  echo "=== ${base} ==="
  echo "============================================"
  jq -r '.[0:5] | .[] | "• [\(.host_name)] \(.name)\n   \(.snippet[0:300])\n   \(.url)\n"' "${f}.json" 2>&1
done
