#!/bin/bash
# Create a public GitHub release with the backup tarball attached as an asset.
# Uses the PAT stored in /tmp/.gh_pat (chmod 600) so the token never appears
# in process args / shell history / visible env vars.
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
  echo "ERROR: PAT too short"
  exit 1
fi

# Use the most recent tarball in download/
TARBALL=$(ls -t /home/z/my-project/download/axia-complete-backup-*.tar.gz 2>/dev/null | head -1)
if [ -z "$TARBALL" ]; then
  echo "ERROR: No backup tarball found in /home/z/my-project/download/"
  exit 1
fi
TARBALL_BASENAME=$(basename "$TARBALL")

# Get the latest commit hash for the release tag
COMMIT_SHA_FULL=$(cd "$AXIA_DIR" && git rev-parse HEAD)
COMMIT_SHA_SHORT=$(cd "$AXIA_DIR" && git rev-parse --short HEAD)
COMMIT_MSG=$(cd "$AXIA_DIR" && git log -1 --format="%s")
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
TAG="v7.5.0-responsive-${TIMESTAMP}"

echo "=== Creating GitHub release ==="
echo "Repo:       $REPO"
echo "Tag:        $TAG"
echo "Tarball:    $TARBALL_BASENAME"
echo "Commit:     $COMMIT_SHA_SHORT ($COMMIT_MSG)"
echo ""

# Step 1: Create the release (public — not draft)
RELEASE_BODY=$(cat <<EOF
## AXIA v7.5.0 — Mobile/Tablet Responsive Fixes + Full Code Backup

### What's in this release

**Responsive fixes** (commit ${COMMIT_SHA_SHORT}) — fixes 6 real mobile/tablet UI issues identified by systematic Playwright testing at 10 viewport sizes (320px → 1920px):

1. **Hero tabs row overflow** — the Slack/Notion/Trello/Docs/Bonsai strikethrough tabs were 429px wide on 320-375px viewports, clipped by hero's \`overflow-hidden\`. Fix: \`grid-cols-1\` + \`min-w-0\` + \`max-w-full\` so flex-wrap actually wraps.
2. **Hero floating badge clipping** — the "+\$3,800/mo recovered" badge used \`absolute -right-3\` which clipped past parent. Switched to static positioning on mobile, absolute on sm+.
3. **CookieConsentBanner too tall** — was 298px (35% of mobile viewport). Tightened padding + text sizes + button labels. Now 28%.
4. **Cookie banner ↔ MobileStickyCTA overlap** — both fixed at bottom:0, banner covered the CTA. MobileStickyCTA now tracks \`cookieBannerOpen\` state via \`hasConsented()\` + \`axia_consent_change\` event.
5. **Cookie banner ↔ Auth/Onboarding CTA overlap** — banner covered the "Sign Up" button on mobile. Cookie banner now sets \`--cookie-banner-h\` CSS var; Auth + Onboarding consume it via \`paddingBottom: calc(var(--cookie-banner-h, 0px) + 1rem)\`.
6. **\`overflow-x-hidden\` safety net** — added to \`.landing-page\` wrapper.

### Backup contents

This release includes a complete code backup tarball (\`$TARBALL_BASENAME\`, 1.6MB, 648 files) containing:
- Full AXIA source code (\`axia/\` directory)
- Convex backend (schema, mutations, queries)
- React frontend (Vite + React 19 + TypeScript + Tailwind 4 + shadcn/ui)
- Worklog (\`worklog.md\`)
- All config files (\`package.json\`, \`vite.config.ts\`, \`tsconfig.json\`, \`convex.json\`, etc.)

Excluded (regenerable or sensitive): \`node_modules/\`, \`.git/\`, \`dist/\`, \`.convex/\`, \`.env\` (only \`.env.example\` is included).

### How to restore from this backup

\`\`\`bash
# Download the tarball from this release
tar -xzf $TARBALL_BASENAME
cd axia
cp .env.example .env  # then fill in your Convex URL + secrets
bun install           # or npm install / pnpm install
bun run dev           # starts Vite dev server on http://localhost:3000
\`\`\`

### Verification

Zero horizontal overflow at 320 / 360 / 375 / 390 / 414 / 768 / 1024 / 1280 / 1536 / 1920px across all 10 public pages (landing, auth, onboarding, blog, privacy, terms, cookies, 2 blog posts).

Tested with Playwright + VLM (vision-language model) inspection.
EOF
)

RELEASE_PAYLOAD=$(jq -n \
  --arg tag "$TAG" \
  --arg name "AXIA v7.5.0 — Responsive Fixes + Full Code Backup ($TIMESTAMP UTC)" \
  --arg body "$RELEASE_BODY" \
  --arg target "$COMMIT_SHA_FULL" \
  '{
    tag_name: $tag,
    target_commitish: $target,
    name: $name,
    body: $body,
    draft: false,
    prerelease: false,
    make_latest: "true"
  }')

echo "Step 1: Creating release..."
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $PAT" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -d "$RELEASE_PAYLOAD" \
  "https://api.github.com/repos/$REPO/releases")

RELEASE_ID=$(echo "$RESPONSE" | jq -r '.id')
RELEASE_URL=$(echo "$RESPONSE" | jq -r '.html_url')
UPLOAD_URL=$(echo "$RESPONSE" | jq -r '.upload_url' | sed 's/{?name,label}//')

if [ -z "$RELEASE_ID" ] || [ "$RELEASE_ID" = "null" ]; then
  echo "ERROR: Failed to create release"
  echo "$RESPONSE" | jq . 2>&1 | head -30
  exit 1
fi

echo "  Release ID: $RELEASE_ID"
echo "  Release URL: $RELEASE_URL"
echo "  Upload URL: $UPLOAD_URL"
echo ""

# Step 2: Upload the tarball as a release asset
echo "Step 2: Uploading tarball as release asset..."
TARBALL_SIZE=$(stat -c%s "$TARBALL")
echo "  Tarball size: $TARBALL_SIZE bytes ($((TARBALL_SIZE / 1024 / 1024))MB)"

UPLOAD_RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $PAT" \
  -H "Content-Type: application/gzip" \
  --data-binary "@$TARBALL" \
  "${UPLOAD_URL}?name=$TARBALL_BASENAME")

ASSET_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.id')
ASSET_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.browser_download_url')
ASSET_SIZE=$(echo "$UPLOAD_RESPONSE" | jq -r '.size')

if [ -z "$ASSET_ID" ] || [ "$ASSET_ID" = "null" ]; then
  echo "ERROR: Failed to upload asset"
  echo "$UPLOAD_RESPONSE" | jq . 2>&1 | head -20
  exit 1
fi

echo "  Asset ID: $ASSET_ID"
echo "  Asset URL: $ASSET_URL"
echo "  Asset size: $ASSET_SIZE bytes"
echo ""

echo "=== Release published successfully ==="
echo "Release URL: $RELEASE_URL"
echo "Asset download: $ASSET_URL"
