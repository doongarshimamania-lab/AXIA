#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# AXIA SAFE EDIT — ONE COMMAND FOR THE FULL MANDATORY FLOW
# ══════════════════════════════════════════════════════════════════════════════
#
# This is the ONLY way to make code changes. No exceptions.
#
# Usage:
#   ./edit.sh start "description" file1 file2 ...   — Lock & backup BEFORE editing
#   ./edit.sh done "commit message"                  — Build, commit, push AFTER editing
#   ./edit.sh status                                 — Check active locks
#   ./edit.sh list                                   — List all backups
#   ./edit.sh rollback TIMESTAMP                     — Restore files from a pre-edit backup
#
# ══════════════════════════════════════════════════════════════════════════════

PROJECT_ROOT="/home/z/my-project/timelock"
LOCK_DIR="${PROJECT_ROOT}/.edit-locks"

case "$1" in
  start)
    shift
    bash "${PROJECT_ROOT}/pre-edit.sh" "$@"
    ;;

  done)
    shift
    # Find the latest lock file
    LATEST_LOCK=$(ls -t "${LOCK_DIR}"/*.lock 2>/dev/null | head -1)
    if [ -z "$LATEST_LOCK" ]; then
      echo "❌ No active edit lock found. Did you run ./edit.sh start first?"
      exit 1
    fi
    TIMESTAMP=$(basename "$LATEST_LOCK" .lock | sed 's/edit-//')
    bash "${PROJECT_ROOT}/post-edit.sh" "$TIMESTAMP" "$@"
    ;;

  status)
    echo "═══════════════════════════════════════════════════"
    echo "  AXIA EDIT STATUS"
    echo "═══════════════════════════════════════════════════"
    echo ""

    LOCKS=$(ls "${LOCK_DIR}"/*.lock 2>/dev/null | wc -l)
    if [ "$LOCKS" -eq 0 ]; then
      echo "  ✅ No active edit locks. All clear."
    else
      echo "  ⚠️  ${LOCKS} active edit lock(s):"
      for lock in "${LOCK_DIR}"/*.lock; do
        TIMESTAMP=$(basename "$lock" .lock | sed 's/edit-//')
        DESCRIPTION=$(grep "description:" "$lock" | cut -d' ' -f2-)
        STARTED=$(grep "started_at:" "$lock" | cut -d' ' -f2-)
        echo ""
        echo "  🔒 ${TIMESTAMP}"
        echo "     Description: ${DESCRIPTION}"
        echo "     Started: ${STARTED}"
      done
    fi

    echo ""
    echo "  Git status:"
    cd "$PROJECT_ROOT"
    git status --short 2>/dev/null | head -10 || echo "    (not a git repo)"
    echo ""

    echo "  Preview server:"
    if ss -tlnp | grep -q ":3000"; then
      echo "    ✅ Running on port 3000"
    else
      echo "    ❌ NOT running"
    fi
    ;;

  list)
    echo "═══════════════════════════════════════════════════"
    echo "  AXIA BACKUPS"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "  Pre-edit backups:"
    for dir in "${PROJECT_ROOT}/backups"/pre-edit-*; do
      if [ -d "$dir" ]; then
        META="$dir/.change-meta"
        DESC=$(grep "description:" "$META" 2>/dev/null | cut -d' ' -f2- || echo "unknown")
        TIMESTAMP=$(basename "$dir" | sed 's/pre-edit-//')
        echo "    📁 ${TIMESTAMP} — ${DESC}"
      fi
    done
    echo ""
    echo "  Post-edit backups:"
    for dir in "${PROJECT_ROOT}/backups"/post-edit-*; do
      if [ -d "$dir" ]; then
        META="$dir/.change-meta"
        DESC=$(grep "description:" "$META" 2>/dev/null | cut -d' ' -f2- || echo "unknown")
        TIMESTAMP=$(basename "$dir" | sed 's/post-edit-//')
        echo "    📁 ${TIMESTAMP} — ${DESC}"
      fi
    done
    echo ""
    echo "  Legacy backups:"
    for file in "${PROJECT_ROOT}/backups"/*.bak.*; do
      if [ -f "$file" ]; then
        echo "    📄 $(basename "$file")"
      fi
    done
    ;;

  rollback)
    TIMESTAMP="$2"
    if [ -z "$TIMESTAMP" ]; then
      echo "❌ Usage: ./edit.sh rollback TIMESTAMP"
      echo ""
      echo "  Available pre-edit backups:"
      for dir in "${PROJECT_ROOT}/backups"/pre-edit-*; do
        [ -d "$dir" ] && echo "    $(basename "$dir" | sed 's/pre-edit-//')"
      done
      exit 1
    fi

    BACKUP_DIR="${PROJECT_ROOT}/backups/pre-edit-${TIMESTAMP}"
    if [ ! -d "$BACKUP_DIR" ]; then
      echo "❌ Backup not found: ${BACKUP_DIR}"
      exit 1
    fi

    echo "⚠️  ROLLBACK: Restoring files from ${BACKUP_DIR}/"
    echo ""
    # Auto-confirm for non-interactive (AI agent) usage

    # First, create a backup of current state
    NOW=$(date +%Y%m%dT%H%M%S)
    ROLLBACK_BACKUP="${PROJECT_ROOT}/backups/pre-rollback-${NOW}"
    mkdir -p "$ROLLBACK_BACKUP"

    for file in "${BACKUP_DIR}"/*; do
      [ "$(basename "$file")" = ".change-meta" ] && continue
      [ "$(basename "$file")" = "__new__" ] && continue
      REL_PATH="${file#${BACKUP_DIR}/}"
      SRC="${PROJECT_ROOT}/${REL_PATH}"
      if [ -f "$SRC" ]; then
        mkdir -p "$(dirname "$ROLLBACK_BACKUP/$REL_PATH")"
        cp "$SRC" "$ROLLBACK_BACKUP/$REL_PATH"
      fi
    done

    echo "  Current state backed up to: ${ROLLBACK_BACKUP}/"

    # Now restore
    for file in "${BACKUP_DIR}"/*; do
      [ "$(basename "$file")" = ".change-meta" ] && continue
      REL_PATH="${file#${BACKUP_DIR}/}"
      # Skip __new__ marker files
      if [[ "$REL_PATH" == *.__new__ ]]; then
        echo "  ⏭️  Skipping new file marker: ${REL_PATH%.__new__}"
        continue
      fi
      DEST="${PROJECT_ROOT}/${REL_PATH}"
      mkdir -p "$(dirname "$DEST")"
      cp "$file" "$DEST"
      echo "  ✅ Restored: ${REL_PATH}"
    done

    echo ""
    echo "  ✅ Rollback complete. Files restored to pre-edit state."
    echo "  Current state was backed up to: ${ROLLBACK_BACKUP}/"
    ;;

  *)
    echo "═══════════════════════════════════════════════════"
    echo "  AXIA SAFE EDIT — MANDATORY CODE CHANGE FLOW"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "  Usage:"
    echo "    ./edit.sh start \"description\" file1 file2 ...  — BEFORE editing"
    echo "    ./edit.sh done  \"commit message\"               — AFTER editing"
    echo "    ./edit.sh status                                — Check active locks"
    echo "    ./edit.sh list                                  — List all backups"
    echo "    ./edit.sh rollback TIMESTAMP                    — Restore from backup"
    echo ""
    echo "  ⚠️  NEVER edit files without running 'start' first."
    echo "  ⚠️  NEVER skip 'done' after editing."
    echo ""
    ;;
esac
