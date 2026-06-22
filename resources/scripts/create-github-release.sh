#!/usr/bin/env bash
# Create a GitHub release with the backup ZIP attached.
set -euo pipefail

PAT="[REDACTED:github_token]"
REPO="doongarshimamania-lab/AXIA"
IST_TIME="2026-06-22_17-19-26_IST"
TAG="backup-${IST_TIME}"
ZIP_NAME="AXIA-COMPLETE-BACKUP-${IST_TIME}.zip"
ZIP_PATH="/home/z/my-project/download/${ZIP_NAME}"
RELEASE_NAME="AXIA Complete Backup - ${IST_TIME}"
RELEASE_BODY="Complete project backup with auth flow + onboarding + dynamic profile data fixes.

Extract, npm install, npm run dev.

Changes in this release:
- Fixed Convex auth error on multi-account login
- Replaced NO-OP onboarding stub with real Convex mutation
- Added missing /onboarding-* routes to main.tsx
- AccountSettings now reads/writes Convex (no more hardcoded defaults)
- Removed all hardcoded sample data (Acme Corp, etc.)
- Landing page has real auth CTAs (Sign in / Get Started)
- Password security: scrypt + salt + constant-time verify + NFKC normalization
- Both axia/ and resources/timelock/ deployed to Convex veracious-zebra-519"

echo "Creating tag ${TAG}..."
cd /home/z/my-project
git tag "${TAG}" -m "Complete backup ${IST_TIME}" 2>&1 || echo "(tag may already exist)"
git push origin "${TAG}" 2>&1 || echo "(push may have failed, continuing)"

echo "Creating release..."
RELEASE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: token ${PAT}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${REPO}/releases" \
  -d "$(cat <<EOF
{
  "tag_name": "${TAG}",
  "name": "${RELEASE_NAME}",
  "body": "${RELEASE_BODY}",
  "draft": false,
  "prerelease": false
}
EOF
)")

RELEASE_ID=$(echo "${RELEASE_RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
echo "Release ID: ${RELEASE_ID}"

if [ -z "${RELEASE_ID}" ]; then
  echo "Failed to create release. Response:"
  echo "${RELEASE_RESPONSE}" | head -50
  exit 1
fi

echo "Uploading ZIP asset..."
UPLOAD_RESPONSE=$(curl -s -X POST \
  -H "Authorization: token ${PAT}" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/zip" \
  "https://uploads.github.com/repos/${REPO}/releases/${RELEASE_ID}/assets?name=${ZIP_NAME}" \
  --data-binary @"${ZIP_PATH}")

ASSET_URL=$(echo "${UPLOAD_RESPONSE}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('browser_download_url',''))" 2>/dev/null || echo "")
echo "Asset download URL: ${ASSET_URL}"

if [ -z "${ASSET_URL}" ]; then
  echo "Failed to upload asset. Response:"
  echo "${UPLOAD_RESPONSE}" | head -50
  exit 1
fi

echo ""
echo "=== RELEASE CREATED SUCCESSFULLY ==="
echo "Release: https://github.com/${REPO}/releases/tag/${TAG}"
echo "Asset:   ${ASSET_URL}"
