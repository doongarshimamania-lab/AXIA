#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# AXIA MANDATORY PRE-EDIT ENFORCEMENT
# ══════════════════════════════════════════════════════════════════════════════
# THIS SCRIPT MUST BE RUN BEFORE ANY CODE CHANGE. NO EXCEPTIONS. NO BYPASS.
#
# Usage: ./pre-edit.sh "description of what you're about to change" file1 [file2 ...]
#
# What it does:
#   1. Checks git status for uncommitted changes
#   2. Creates timestamped backup of files BEFORE editing
#   3. Records git commit hash BEFORE changes
#   4. Logs the intent to edit in CHANGELOG.md
#   5. Creates a .lock file that post-edit.sh checks for
#
# If this script fails, DO NOT PROCEED WITH EDITS.
# ══════════════════════════════════════════════════════════════════════════════

set -e

TIMESTAMP=$(date +%Y%m%dT%H%M%S)
DESCRIPTION="$1"
shift
FILES=("$@")

if [ -z "$DESCRIPTION" ] || [ ${#FILES[@]} -eq 0 ]; then
  echo "❌ USAGE: ./pre-edit.sh \"Description\" file1 [file2 ...]"
  echo ""
  echo "  Example: ./pre-edit.sh \"add scope page\" src/pages/Scope.tsx src/main.tsx"
  exit 1
fi

PROJECT_ROOT="/home/z/my-project/timelock"
BACKUP_DIR="${PROJECT_ROOT}/backups/pre-edit-${TIMESTAMP}"
LOCK_DIR="${PROJECT_ROOT}/.edit-locks"

echo "═══════════════════════════════════════════════════"
echo "  AXIA PRE-EDIT ENFORCEMENT"
echo "═══════════════════════════════════════════════════"
echo ""

# Step 1: Check for existing lock files (unfinished edits)
mkdir -p "$LOCK_DIR"
EXISTING_LOCKS=$(ls "$LOCK_DIR"/*.lock 2>/dev/null | wc -l)
if [ "$EXISTING_LOCKS" -gt 0 ]; then
  echo "⚠️  WARNING: There are $EXISTING_LOCKS unfinished edit(s):"
  ls -1 "$LOCK_DIR"/*.lock 2>/dev/null
  echo ""
  echo "  This means pre-edit.sh was run but post-edit.sh was NOT run."
  echo "  Either complete those edits first, or remove the locks manually."
  echo ""
  # Auto-continue for non-interactive (AI agent) usage
  # Set FORCE_CONTINUE=y to skip interactive prompts
  if [ "$FORCE_CONTINUE" != "y" ]; then
    echo "  Set FORCE_CONTINUE=y or resolve locks manually."
    echo "  Auto-continuing with warning..."
  fi
fi

# Step 2: Check git status
echo "📋 Step 1/5: Checking git status..."
cd "$PROJECT_ROOT"
GIT_STATUS=$(git status --porcelain 2>/dev/null || echo "NOT_A_GIT_REPO")
if [ "$GIT_STATUS" != "NOT_A_GIT_REPO" ] && [ -n "$GIT_STATUS" ]; then
  echo "⚠️  Uncommitted changes detected:"
  echo "$GIT_STATUS"
  echo ""
  # Auto-continue for non-interactive (AI agent) usage
  echo "  Note: You should commit or stash these BEFORE starting new edits."
  echo "  Auto-continuing..."
fi
echo "  ✅ Git status checked"

# Step 3: Record git commit hash BEFORE
COMMIT_BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
echo ""
echo "📋 Step 2/5: Git commit BEFORE: ${COMMIT_BEFORE:0:8}"

# Step 4: Create backup directory and copy files
echo ""
echo "📋 Step 3/5: Creating backup at ${BACKUP_DIR}/"
mkdir -p "$BACKUP_DIR"

BACKED_UP=0
for file in "${FILES[@]}"; do
  fullpath="${PROJECT_ROOT}/${file}"
  if [ -f "$fullpath" ]; then
    bp="$BACKUP_DIR/$file"
    mkdir -p "$(dirname "$bp")"
    cp "$fullpath" "$bp"
    echo "  ✅ Backed up: $file"
    BACKED_UP=$((BACKED_UP + 1))
  else
    echo "  ⚠️  File not found (will be new): $file"
    # Record that this is a new file
    mkdir -p "$(dirname "$BACKUP_DIR/$file")"
    echo "NEW_FILE" > "$BACKUP_DIR/$file.__new__"
    echo "  📝 Marked as new file: $file"
  fi
done

if [ "$BACKED_UP" -eq 0 ] && [ ${#FILES[@]} -gt 0 ]; then
  echo ""
  echo "❌ ERROR: No files were backed up. All files were not found."
  echo "  Are you in the right directory? Files should be relative to timelock/"
  exit 1
fi

# Step 5: Create metadata
cat > "$BACKUP_DIR/.change-meta" << EOF
timestamp: ${TIMESTAMP}
date: $(date -Iseconds)
description: ${DESCRIPTION}
type: PRE-EDIT-BACKUP
git_commit_before: ${COMMIT_BEFORE}
files:
$(printf '  - %s\n' "${FILES[@]}")
backed_up_count: ${BACKED_UP}
total_files: ${#FILES[@]}
EOF

# Step 6: Create lock file
LOCK_FILE="${LOCK_DIR}/edit-${TIMESTAMP}.lock"
cat > "$LOCK_FILE" << EOF
timestamp: ${TIMESTAMP}
description: ${DESCRIPTION}
backup_dir: ${BACKUP_DIR}
git_commit_before: ${COMMIT_BEFORE}
files:
$(printf '  - %s\n' "${FILES[@]}")
status: IN_PROGRESS
started_at: $(date -Iseconds)
EOF

echo ""
echo "📋 Step 4/5: Lock file created: ${LOCK_FILE}"

# Step 7: Log intent in CHANGELOG
CHANGELOG="${PROJECT_ROOT}/CHANGELOG.md"
cat >> "$CHANGELOG" << EOF

## [PRE-EDIT ${TIMESTAMP}] ${DESCRIPTION}

**Status:** 🟡 IN PROGRESS
**Backup:** \`${BACKUP_DIR}/\`
**Git commit before:** ${COMMIT_BEFORE}
**Files being modified:**
$(printf '- `%s`\n' "${FILES[@]}")
EOF

echo "📋 Step 5/5: Logged intent in CHANGELOG.md"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ PRE-EDIT COMPLETE — You may now edit files"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Backup:     ${BACKUP_DIR}/"
echo "  Lock file:  ${LOCK_FILE}"
echo "  Commit:     ${COMMIT_BEFORE:0:8}"
echo ""
echo "  ⚠️  After editing, run: ./post-edit.sh \"${TIMESTAMP}\""
echo ""
