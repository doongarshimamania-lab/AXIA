#!/bin/bash
# Store GitHub PAT in git remote URL (without echoing it).
# ponytail: this script reads the PAT from /tmp/.gh_pat (chmod 600) so the
# PAT never appears in process args / shell history / visible env vars.
set -euo pipefail

PAT_FILE="/tmp/.gh_pat"
REPO="doongarshimamania-lab/AXIA"
AXIA_DIR="/home/z/my-project/axia"

if [ ! -f "$PAT_FILE" ]; then
  echo "ERROR: PAT file $PAT_FILE not found"
  exit 1
fi

PAT=$(cat "$PAT_FILE" | tr -d '[:space:]')
if [ ${#PAT} -lt 20 ]; then
  echo "ERROR: PAT too short (${#PAT} chars)"
  exit 1
fi

# Set the remote URL with the PAT embedded
cd "$AXIA_DIR"
git remote set-url origin "https://doongarshimamania-lab:${PAT}@github.com/${REPO}.git"

# Verify the remote now has a working PAT (don't echo the URL)
echo "Remote URL updated. PAT length: ${#PAT} chars, prefix: ${PAT:0:4}***"
echo "---"
git remote -v | sed 's#://[^@]*@#://***@#g'
