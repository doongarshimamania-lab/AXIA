#!/bin/bash
# Axia Change Tracker — Creates timestamped backups before every change
# Usage: ./track-change.sh "Description of what's being changed" <file1> [file2] ...
#
# This script:
# 1. Creates a timestamped backup directory
# 2. Copies all specified files into it
# 3. Logs the change to CHANGELOG.md with timestamp and description
# 4. Stages everything in git

set -e

TIMESTAMP=$(date +%Y%m%dT%H%M%S)
DESCRIPTION="$1"
shift
FILES=("$@")

if [ -z "$DESCRIPTION" ] || [ ${#FILES[@]} -eq 0 ]; then
  echo "Usage: ./track-change.sh \"Description\" file1 [file2 ...]"
  exit 1
fi

# Create backup directory
BACKUP_DIR="backups/change-${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

# Copy files to backup
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Preserve directory structure in backup
    backup_path="$BACKUP_DIR/$file"
    mkdir -p "$(dirname "$backup_path")"
    cp "$file" "$backup_path"
    echo "  Backed up: $file"
  else
    echo "  WARNING: $file not found, skipping"
  fi
done

# Create a metadata file in the backup directory
cat > "$BACKUP_DIR/.change-meta" << EOF
timestamp: ${TIMESTAMP}
date: $(date -Iseconds)
description: ${DESCRIPTION}
files:
$(printf '  - %s\n' "${FILES[@]}")
git_commit_before: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
EOF

# Log to CHANGELOG.md
CHANGELOG="CHANGELOG.md"
if [ ! -f "$CHANGELOG" ]; then
  echo "# Axia Change Log" > "$CHANGELOG.md"
  echo "" >> "$CHANGELOG.md"
  echo "Every change to this codebase is tracked here with timestamped backups." >> "$CHANGELOG.md"
  echo "" >> "$CHANGELOG.md"
fi

cat >> "$CHANGELOG.md" << EOF

## [${TIMESTAMP}] ${DESCRIPTION}

**Backup:** \`${BACKUP_DIR}/\`
**Git commit before:** $(git rev-parse HEAD 2>/dev/null || echo "unknown")
**Files changed:**
$(printf '- \`%s\`\n' "${FILES[@]}")
EOF

echo ""
echo "✅ Change tracked: ${DESCRIPTION}"
echo "   Backup: ${BACKUP_DIR}/"
echo "   Logged to: CHANGELOG.md"
