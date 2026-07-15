#!/bin/bash
# Build a self-contained full backup zip of AXIA at the current commit.
# Includes all source, build output, package manifest, env config, and Convex deploy keys.
# Excludes node_modules, .git internals, large generated files.

set -e

PROJECT_DIR="/home/z/my-project"
cd "$PROJECT_DIR"

VERSION="v3.7.0-phase1-jun18-base"
TIMESTAMP=$(date -u +%Y%m%d-%H%M%SZ)
ZIP_NAME="AXIA-${VERSION}-${TIMESTAMP}.zip"
ZIP_PATH_DOWNLOAD="$PROJECT_DIR/download/$ZIP_NAME"
ZIP_PATH_BACKUPS="$PROJECT_DIR/backups/$ZIP_NAME"

mkdir -p "$PROJECT_DIR/download" "$PROJECT_DIR/backups"

# Stage to a temp dir for clean zipping
STAGE_DIR="/tmp/axia-export-${TIMESTAMP}"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/AXIA-${VERSION}"

echo "Staging files to $STAGE_DIR/AXIA-${VERSION}/ ..."

# Copy source, build output, and config — exclude node_modules, .git, tool-results, etc.
rsync -a \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='tool-results' \
  --exclude='agent-ctx' \
  --exclude='.next' \
  --exclude='backups' \
  --exclude='download' \
  --exclude='.zscripts' \
  --exclude='.initial_snapshot.json' \
  --exclude='*.log' \
  ./ "$STAGE_DIR/AXIA-${VERSION}/"

# Add a VERSION marker
echo "$VERSION" > "$STAGE_DIR/AXIA-${VERSION}/VERSION"
echo "Built: $TIMESTAMP" >> "$STAGE_DIR/AXIA-${VERSION}/VERSION"
echo "Commit: $(git rev-parse HEAD)" >> "$STAGE_DIR/AXIA-${VERSION}/VERSION"

# Write a README in the zip
cat > "$STAGE_DIR/AXIA-${VERSION}/BACKUP_README.md" <<EOF
# AXIA $VERSION — Full Backup

**Build time (UTC):** $TIMESTAMP
**Git commit:** $(git rev-parse HEAD)
**GitHub:** https://github.com/doongarshimamania-lab/AXIA/releases/tag/$VERSION

## What's in this zip
- \`src/\` — Full React 19 + Vite 6 + Convex source code
- \`disk/\` — Production Vite build output (already built, can be served statically)
- \`timelock/\` — Mirror of source + dist (preview server serves from here)
- \`package.json\`, \`bun.lock\` — Dependency manifest
- \`vite.config.ts\`, \`tsconfig.json\`, \`tailwind.config.ts\` — Build config
- \`convex.json\` — Convex config (functions dir: \`src/convex/\`)
- \`timelock/DEPLOY_KEYS.md\` — Convex deploy key (dev environment)

## How to restore
1. Unzip: \`unzip $ZIP_NAME\`
2. \`cd AXIA-$VERSION\`
3. \`bun install\`  (or \`npm install\`)
4. To run the preview server:
   - \`bunx vite build\` (rebuilds dist/)
   - Serve \`disk/\` or \`timelock/dist/\` with any static file server on port 3000
5. To deploy Convex:
   - \`CONVEX_DEPLOY_KEY=<from timelock/DEPLOY_KEYS.md> bunx convex deploy --typecheck=disable\`

## Phase 1 — Manual send workflow + in-app notifications
This release adds:
- **notifications** + **manualSendLogs** tables (in-app feed + audit trail)
- **NotificationBell** in sidebar with red unread badge, popover panel, mark-all-read, dismiss
- **ManualSendDialog** with 9-channel dropdown (email/WhatsApp/SMS/Slack/Telegram/in-person/phone/courier/other)
- **DownloadPDFButton** — generates branded print-optimized HTML, opens print dialog for "Save as PDF"
- 3-way card actions on Proposals + Invoices pages (Mark as sent / Share link / Download PDF)
- Fixed the fake-send cron bug — \`processDueFollowUps\` / \`processDueReminders\` no longer silently
  flip "sent" status; instead they create real in-app notifications prompting the user
- Daily 9am UTC cron: \`remindAboutStaleDrafts\` — nudges user about drafts older than 7 days

## Test users
- priya@axia.dev / Axia2026!
- marcus@axia.dev / Axia2026!
- aisha@axia.dev / Axia2026!
- carlos@axia.dev / Axia2026!
EOF

# Build the zip
cd "$STAGE_DIR"
zip -qr "$ZIP_PATH_DOWNLOAD" "AXIA-${VERSION}/"
cp "$ZIP_PATH_DOWNLOAD" "$ZIP_PATH_BACKUPS"

# Clean up stage
rm -rf "$STAGE_DIR"

# Show sizes
echo ""
echo "=== Backup complete ==="
echo "download/:  $(du -h "$ZIP_PATH_DOWNLOAD" | cut -f1)  $ZIP_PATH_DOWNLOAD"
echo "backups/:   $(du -h "$ZIP_PATH_BACKUPS"  | cut -f1)  $ZIP_PATH_BACKUPS"
echo ""
echo "Contents: $(unzip -l "$ZIP_PATH_DOWNLOAD" | tail -1 | awk '{print $2" files"}')"
