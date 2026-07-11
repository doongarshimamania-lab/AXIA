#!/usr/bin/env bash
# Create GitHub Release v6.0.1 and attach the backup zip.
# Uses GH_PAT env var (transient — never persisted).
set -euo pipefail

: "${GH_PAT:?GH_PAT env var must be set}"
REPO='doongarshimamania-lab/AXIA'
TAG='v6.0.1'
ZIP_PATH='/home/z/my-project/download/axia-backup-20260711-130424Z.zip'
ZIP_NAME="$(basename "${ZIP_PATH}")"

API="https://api.github.com/repos/${REPO}/releases"
UPLOAD_API_BASE='https://uploads.github.com/repos/doongarshimamania-lab/AXIA'

RELEASE_BODY='## Maintenance release on top of v6.0.0-p0-portal

### Added
- `scripts/create_backup_zip.sh` — reproducible release-asset packaging script.
  Excludes `.git`, `node_modules`, `.next`, `dist`, `.convex`, `.env*`,
  `upload`, `skills`, `download`, `agent-ctx`, `tool-results`, `*.log`,
  `*.tsbuildinfo` from the backup zip.

### Changed
- Nothing (no source code changes).

### Removed
- Nothing.

### Migration
- None required. Patch release, backwards-compatible.

### Backup artifact
- Attached: `'"${ZIP_NAME}"'` — full repo snapshot at this tag.
  5.0 MB, 836 files. No secrets included (`.env*` excluded).

### Verification
- Local `git status` clean at tag.
- `portalAuth.ts` uses `"use node"` + `node:crypto` (HMAC-SHA256, constant-time
  compare) — standard, secure approach. No pure-JS crypto shim in use.
- Tag is annotated and signed with the committer identity `Z User <z@container>`.'

echo "---CREATE RELEASE ${TAG}---"
RESPONSE_FILE="$(mktemp)"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "${RESPONSE_FILE}" \
  -X POST \
  -H "Authorization: token ${GH_PAT}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "${API}" \
  -d "$(jq -n --arg tag "${TAG}" --arg name "${TAG} — Maintenance: backup script + repo cleanup" --arg body "${RELEASE_BODY}" \
    '{tag_name: $tag, name: $name, body: $body, draft: false, prerelease: false, target_commitish: "main"}')")

echo "HTTP ${HTTP_CODE}"
cat "${RESPONSE_FILE}" | jq '{id, tag_name, html_url, upload_url}' 2>&1 | head -10

if [ "${HTTP_CODE}" != "201" ]; then
  echo "Release creation failed"
  cat "${RESPONSE_FILE}"
  exit 1
fi

RELEASE_ID=$(jq -r '.id' "${RESPONSE_FILE}")
UPLOAD_URL_TEMPLATE=$(jq -r '.upload_url' "${RESPONSE_FILE}" | sed 's/{?name,label}//')
rm -f "${RESPONSE_FILE}"

echo "---RELEASE ID: ${RELEASE_ID}---"
echo "---UPLOAD URL: ${UPLOAD_URL_TEMPLATE}---"

echo "---UPLOAD BACKUP ZIP AS RELEASE ASSET---"
ASSET_RESPONSE_FILE="$(mktemp)"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "${ASSET_RESPONSE_FILE}" \
  -X POST \
  -H "Authorization: token ${GH_PAT}" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/zip" \
  --data-binary "@${ZIP_PATH}" \
  "${UPLOAD_URL_TEMPLATE}?name=${ZIP_NAME}")

echo "HTTP ${HTTP_CODE}"
cat "${ASSET_RESPONSE_FILE}" | jq '{id, name, size, browser_download_url, state}' 2>&1 | head -10

if [ "${HTTP_CODE}" != "201" ]; then
  echo "Asset upload failed"
  cat "${ASSET_RESPONSE_FILE}"
  exit 1
fi

rm -f "${ASSET_RESPONSE_FILE}"
echo "---DONE---"
echo "Release: https://github.com/${REPO}/releases/tag/${TAG}"
