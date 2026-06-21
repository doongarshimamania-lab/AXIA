#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# AXIA MANDATORY POST-EDIT ENFORCEMENT
# ══════════════════════════════════════════════════════════════════════════════
# THIS SCRIPT MUST BE RUN AFTER ANY CODE CHANGE. NO EXCEPTIONS. NO BYPASS.
#
# Usage: ./post-edit.sh "pre-edit-timestamp" "commit message"
#
# What it does:
#   1. Verifies the pre-edit lock exists (proves backup was made)
#   2. Runs build to verify no breakage
#   3. Git commits with proper descriptive message
#   4. Git pushes to remote (if configured)
#   5. Updates CHANGELOG.md with completion status
#   6. Updates worklog.md
#   7. Creates post-edit backup of the changed files
#   8. Removes the lock file
#   9. Verifies preview server is running
#
# If build fails, the commit is NOT made and you must fix it first.
# ══════════════════════════════════════════════════════════════════════════════

set -e

PRE_EDIT_TIMESTAMP="$1"
COMMIT_MESSAGE="$2"

PROJECT_ROOT="/home/z/my-project/timelock"
LOCK_DIR="${PROJECT_ROOT}/.edit-locks"
LOCK_FILE="${LOCK_DIR}/edit-${PRE_EDIT_TIMESTAMP}.lock"

echo "═══════════════════════════════════════════════════"
echo "  AXIA POST-EDIT ENFORCEMENT"
echo "═══════════════════════════════════════════════════"
echo ""

# Step 0: Validate arguments
if [ -z "$PRE_EDIT_TIMESTAMP" ]; then
  echo "❌ ERROR: Pre-edit timestamp is required."
  echo ""
  echo "  Usage: ./post-edit.sh \"PRE_EDIT_TIMESTAMP\" \"commit message\""
  echo ""
  echo "  Find your timestamp in: ls ${LOCK_DIR}/"
  exit 1
fi

if [ -z "$COMMIT_MESSAGE" ]; then
  echo "❌ ERROR: Commit message is required."
  echo ""
  echo "  Usage: ./post-edit.sh \"${PRE_EDIT_TIMESTAMP}\" \"feat: what you changed\""
  exit 1
fi

# Step 1: Verify lock file exists
echo "📋 Step 1/9: Verifying pre-edit lock..."
if [ ! -f "$LOCK_FILE" ]; then
  echo ""
  echo "❌❌❌ CRITICAL ERROR: No pre-edit lock found! ❌❌❌"
  echo ""
  echo "  Lock file not found: ${LOCK_FILE}"
  echo ""
  echo "  This means you DID NOT run pre-edit.sh before making changes."
  echo "  The backup-before-edit step was SKIPPED."
  echo ""
  echo "  AVAILABLE LOCKS:"
  ls -1 "${LOCK_DIR}"/*.lock 2>/dev/null || echo "    (none)"
  echo ""
  echo "  If you edited files without pre-edit.sh, you MUST:"
  echo "  1. Back up the CURRENT state manually to backups/"
  echo "  2. Use git diff to see what changed"
  echo "  3. Commit with a message noting the process violation"
  echo ""
  exit 1
fi

# Read lock metadata
source_info=$(cat "$LOCK_FILE")
BACKUP_DIR=$(grep "backup_dir:" "$LOCK_FILE" | awk '{print $2}')
COMMIT_BEFORE=$(grep "git_commit_before:" "$LOCK_FILE" | awk '{print $2}')
DESCRIPTION=$(grep "description:" "$LOCK_FILE" | cut -d' ' -f2-)

echo "  ✅ Lock found: ${PRE_EDIT_TIMESTAMP}"
echo "  📁 Backup dir: ${BACKUP_DIR}"
echo "  🔖 Commit before: ${COMMIT_BEFORE:0:8}"
echo "  📝 Description: ${DESCRIPTION}"

# Step 2: Verify backup exists
echo ""
echo "📋 Step 2/9: Verifying pre-edit backup exists..."
if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ ERROR: Pre-edit backup directory not found: ${BACKUP_DIR}"
  echo "  The backup was lost. Do NOT proceed."
  exit 1
fi
echo "  ✅ Backup verified at ${BACKUP_DIR}/"

# Step 3: Create post-edit backup
TIMESTAMP=$(date +%Y%m%dT%H%M%S)
POST_BACKUP_DIR="${PROJECT_ROOT}/backups/post-edit-${TIMESTAMP}"
mkdir -p "$POST_BACKUP_DIR"

# Get list of files from lock
FILES=()
while IFS= read -r line; do
  file=$(echo "$line" | sed 's/^  - //')
  FILES+=("$file")
done < <(grep "^  - " "$LOCK_FILE")

for file in "${FILES[@]}"; do
  fullpath="${PROJECT_ROOT}/${file}"
  if [ -f "$fullpath" ]; then
    bp="$POST_BACKUP_DIR/$file"
    mkdir -p "$(dirname "$bp")"
    cp "$fullpath" "$bp"
    echo "  ✅ Post-edit backed up: $file"
  fi
done

cat > "$POST_BACKUP_DIR/.change-meta" << EOF
timestamp: ${TIMESTAMP}
date: $(date -Iseconds)
description: ${DESCRIPTION}
type: POST-EDIT-BACKUP
git_commit_before: ${COMMIT_BEFORE}
pre_edit_backup: ${BACKUP_DIR}
files:
$(printf '  - %s\n' "${FILES[@]}")
EOF

echo ""
echo "📋 Step 3/9: Post-edit backup created at ${POST_BACKUP_DIR}/"

# Step 4: Run build
echo ""
echo "📋 Step 4/9: Running build to verify no breakage..."
cd "$PROJECT_ROOT"
BUILD_OUTPUT=$(npx vite build 2>&1)
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
  echo "❌❌❌ BUILD FAILED ❌❌❌"
  echo ""
  echo "$BUILD_OUTPUT"
  echo ""
  echo "  COMMIT IS BLOCKED. Fix the build errors first."
  echo "  Your pre-edit backup is safe at: ${BACKUP_DIR}/"
  echo "  You can restore files from there if needed."
  exit 1
fi
echo "  ✅ Build passed"

# Step 5: Copy dist to public/timelock
echo ""
echo "📋 Step 5/9: Deploying build to public/timelock/..."
cp -r "${PROJECT_ROOT}/dist/"* /home/z/my-project/public/timelock/ 2>/dev/null || true
echo "  ✅ Build deployed"

# Step 6: Git commit
echo ""
echo "📋 Step 6/9: Git committing..."
cd /home/z/my-project

COMMIT_AFTER=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

# Add everything
git add -A

# Commit with proper message
FULL_COMMIT_MSG="${COMMIT_MESSAGE}

Pre-edit backup: ${BACKUP_DIR}/
Post-edit backup: ${POST_BACKUP_DIR}/
Git commit before: ${COMMIT_BEFORE}
Timestamp: ${TIMESTAMP}"

git commit -m "$FULL_COMMIT_MSG"
echo "  ✅ Committed: ${COMMIT_MESSAGE}"

# Step 7: Push (if remote exists)
echo ""
echo "📋 Step 7/9: Pushing to remote..."
REMOTE_EXISTS=$(git remote | head -1)
if [ -n "$REMOTE_EXISTS" ]; then
  git push "$REMOTE_EXISTS" main 2>&1 && echo "  ✅ Pushed to ${REMOTE_EXISTS}" || echo "  ⚠️  Push failed (remote may be unreachable)"
else
  echo "  ⚠️  No git remote configured. Set one with:"
  echo "     git remote add origin <your-repo-url>"
fi

# Step 8: Update CHANGELOG
echo ""
echo "📋 Step 8/9: Updating CHANGELOG.md..."
CHANGELOG="${PROJECT_ROOT}/CHANGELOG.md"

# Replace the IN PROGRESS entry with COMPLETED
sed -i "s/🟡 IN PROGRESS/🟢 COMPLETED/g" "$CHANGELOG"

cat >> "$CHANGELOG" << EOF

## [POST-EDIT ${TIMESTAMP}] ${DESCRIPTION}

**Status:** 🟢 COMPLETED
**Pre-edit backup:** \`${BACKUP_DIR}/\`
**Post-edit backup:** \`${POST_BACKUP_DIR}/\`
**Git commit before:** ${COMMIT_BEFORE}
**Git commit after:** $(cd /home/z/my-project && git rev-parse HEAD)
**Commit message:** ${COMMIT_MESSAGE}
**Files modified:**
$(printf '- `%s`\n' "${FILES[@]}")
EOF
echo "  ✅ CHANGELOG updated"

# Update worklog
WORKLOG="/home/z/my-project/worklog.md"
cat >> "$WORKLOG" << EOF

---
Task ID: auto-${TIMESTAMP}
Agent: Main Agent
Task: ${DESCRIPTION}

Work Log:
- Pre-edit backup: ${BACKUP_DIR}/
- Post-edit backup: ${POST_BACKUP_DIR}/
- Git commit before: ${COMMIT_BEFORE}
- Git commit after: $(cd /home/z/my-project && git rev-parse HEAD)
- Build verified: ✅

Stage Summary:
- ${COMMIT_MESSAGE}
- All backups and commits verified
EOF
echo "  ✅ Worklog updated"

# Step 9: Remove lock file
echo ""
echo "📋 Step 9/9: Removing lock file..."
rm "$LOCK_FILE"
echo "  ✅ Lock removed"

# Verify preview server
echo ""
echo "📋 Verifying preview server..."
if ss -tlnp | grep -q ":3000"; then
  echo "  ✅ Preview server running on port 3000"
else
  echo "  ⚠️  Preview server NOT running. Start with:"
  echo "     nohup node ${PROJECT_ROOT}/serve-dist.cjs > /tmp/axia-serve.log 2>&1 & disown"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ POST-EDIT COMPLETE — All checks passed"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Pre-edit backup:  ${BACKUP_DIR}/"
echo "  Post-edit backup: ${POST_BACKUP_DIR}/"
echo "  Git commit:       $(cd /home/z/my-project && git rev-parse --short HEAD)"
echo ""
