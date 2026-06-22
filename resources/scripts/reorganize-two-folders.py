#!/usr/bin/env python3
"""
Reorganize the AXIA repo into exactly two top-level folders:
  - axia/        : production-ready, runnable project (frontend + convex backend)
  - resources/   : everything else (backups, snapshots, research, screenshots, scripts, docs)

Rules:
  - Use `git mv` for tracked files (preserves history)
  - Use plain `mv` for untracked files (build artifacts, gitignored items)
  - NEVER delete anything
  - NEVER modify file contents
  - Only ORGANIZE by moving

Run from /home/z/my-project/
"""
from __future__ import annotations
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project").resolve()
AXIA = ROOT / "axia"
RESOURCES = ROOT / "resources"


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

# Files at root that go into axia/ (the production project)
AXIA_TOP_FILES = {
    "package.json",
    "package-lock.json",
    "bun.lock",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "tailwind.config.ts",
    "postcss.config.mjs",
    "convex.json",
    "components.json",
    "eslint.config.js",
    "eslint.config.mjs",
    ".prettierrc",
    ".prettierignore",
    "index.html",
    "README.md",            # project README — moves into axia/
    "Caddyfile",            # deployment config for the app
    "Procfile",             # deployment config for the app
    "next.config.ts",       # Next.js config (kept for completeness)
    "next-env.d.ts",
}

# Directories at root that go into axia/ (production code)
AXIA_TOP_DIRS = {
    "src",       # frontend + convex backend (canonical build target)
    "public",    # static assets served by Vite
}

# Files at root that stay at root (do NOT move)
ROOT_KEEP_FILES = {
    ".gitignore",         # will be updated in place
    # .git, .env handled specially below
}

# Files at root that go to resources/archive/ (old/bak/misc binaries)
RESOURCES_ARCHIVE_FILES = {
    "vite.config.ts.bak",
    "httpd",
    "httpd.c",
    "generate_pdf.py",
}

# Files at root that go to resources/scripts/ (dev/preview server scripts, NOT part of app)
RESOURCES_SCRIPTS_FILES = {
    "preview-server.cjs",
    "launch-server.cjs",
    "persist-server.cjs",
    "convex-daemon.cjs",
    "server-manager.cjs",
    "server-manager-daemon.cjs",
    "static-server.cjs",
    "server.mjs",
    "vite-proxy.mjs",
    "axia-server.sh",
    "start-server.sh",
    "start-preview.sh",
}

# Files at root that go to resources/research/ (research JSON + MD files)
RESOURCES_RESEARCH_PATTERNS = (
    "research_",       # research_*.json, research_*.md
    "dashboard_search",
)

# Files at root that go to resources/screenshots/ (PNG images)
RESOURCES_SCREENSHOTS_PATTERNS = (
    ".png",
)

# Files at root that go to resources/docs/ (misc markdown docs)
RESOURCES_DOCS_FILES = {
    "PR_DESCRIPTION.md",
}

# Files at root that go to resources/worklog/
RESOURCES_WORKLOG_FILES = {
    "worklog.md",
}

# Files at root that go to resources/python-env/ (Python tooling, not part of app)
RESOURCES_PYTHON_FILES = {
    "pyproject.toml",
    "uv.lock",
}

# Directories at root that go to resources/ (everything else)
RESOURCES_TOP_DIRS = {
    "timelock",                   # canonical snapshot (parallel project)
    "timelock-messy-backup",      # older messy backup
    "src_backup_20260602_154431", # old src backups
    "src_backup_20260602_161626",
    "ecc",                        # Z.ai ECC reference repo
    "skills",                     # Z.ai skills (gitignored)
    "agent-ctx",                  # agent context docs
    "backups",                    # tar.gz backups
    "download",                   # user-facing deliverables
    "disk",                       # built dist mirror
    "tool-results",               # agent tool results
    "examples",
    "mini-services",
    "prisma",                     # unused Prisma schema (backend is Convex)
    "chrome-extension",           # companion extension (separate product)
    "scripts",                    # dev scripts (this folder)
    "upload",                     # upload dir
    ".zscripts",                  # zscripts dev config
    ".next",                      # Next.js build cache
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    """Run a command, capture output, raise on failure."""
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(f"  FAIL: {' '.join(cmd)}")
        print(f"  stdout: {r.stdout[:500]}")
        print(f"  stderr: {r.stderr[:500]}")
        raise SystemExit(1)
    return r


def is_tracked(path: Path) -> bool:
    """Return True if path is tracked by git."""
    rel = path.relative_to(ROOT).as_posix()
    r = subprocess.run(
        ["git", "ls-files", "--error-unmatch", rel],
        cwd=ROOT, capture_output=True, text=True,
    )
    return r.returncode == 0


def git_mv(src: Path, dst: Path) -> None:
    """git mv a file or directory (recursive)."""
    src_rel = src.relative_to(ROOT).as_posix()
    dst_rel = dst.relative_to(ROOT).as_posix()
    run(["git", "mv", src_rel, dst_rel])


def plain_mv(src: Path, dst: Path) -> None:
    """Plain mv for untracked files/dirs."""
    shutil.move(str(src), str(dst))


def move_entry(name: str, dst_dir: Path) -> None:
    """Move a top-level entry (file or dir) into dst_dir/ (preserving history if tracked)."""
    src = ROOT / name
    if not src.exists() and not src.is_symlink():
        print(f"  SKIP (missing): {name}")
        return
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / name
    if dst.exists():
        print(f"  SKIP (dst exists): {name} -> {dst}")
        return
    if is_tracked(src):
        print(f"  git mv: {name} -> {dst_dir.relative_to(ROOT)}/{name}")
        git_mv(src, dst)
    else:
        print(f"  mv (untracked): {name} -> {dst_dir.relative_to(ROOT)}/{name}")
        plain_mv(src, dst)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    os.chdir(ROOT)
    print(f"=== Reorganizing {ROOT} into axia/ + resources/ ===\n")

    # Sanity: refuse to run if axia/ or resources/ already exist
    if AXIA.exists():
        print(f"ERROR: {AXIA} already exists. Aborting to avoid clobbering.")
        sys.exit(1)
    if RESOURCES.exists():
        print(f"ERROR: {RESOURCES} already exists. Aborting to avoid clobbering.")
        sys.exit(1)

    AXIA.mkdir(parents=True)
    RESOURCES.mkdir(parents=True)

    # ---- Move AXIA production files ----
    print("--- Phase 1: move production code into axia/ ---")
    for name in sorted(AXIA_TOP_FILES):
        move_entry(name, AXIA)

    # ---- Move AXIA production directories ----
    print("\n--- Phase 2: move production directories into axia/ ---")
    for name in sorted(AXIA_TOP_DIRS):
        move_entry(name, AXIA)

    # ---- Create axia/.env.example from timelock/.env.example ----
    print("\n--- Phase 3: create axia/.env.example (template, NOT secrets) ---")
    src_env = ROOT / "timelock" / ".env.example"
    dst_env = AXIA / ".env.example"
    if src_env.exists() and not dst_env.exists():
        # Plain copy (not git mv, since this is a NEW file at this path)
        shutil.copy2(src_env, dst_env)
        # Stage it so it gets committed
        run(["git", "add", "axia/.env.example"])
        print(f"  copied timelock/.env.example -> axia/.env.example (staged as new file)")
    else:
        print(f"  SKIP: src={src_env.exists()} dst={dst_env.exists()}")

    # ---- Move resources/archive/ files ----
    print("\n--- Phase 4: move archive files into resources/archive/ ---")
    for name in sorted(RESOURCES_ARCHIVE_FILES):
        move_entry(name, RESOURCES / "archive")

    # ---- Move resources/scripts/ files ----
    print("\n--- Phase 5: move dev/preview server scripts into resources/scripts/ ---")
    for name in sorted(RESOURCES_SCRIPTS_FILES):
        move_entry(name, RESOURCES / "scripts")

    # ---- Move resources/research/ files (research_*, dashboard_search*) ----
    print("\n--- Phase 6: move research files into resources/research/ ---")
    for entry in sorted(ROOT.iterdir()):
        if not entry.is_file():
            continue
        name = entry.name
        if name in AXIA_TOP_FILES or name in ROOT_KEEP_FILES or name in RESOURCES_ARCHIVE_FILES \
                or name in RESOURCES_SCRIPTS_FILES or name in RESOURCES_DOCS_FILES \
                or name in RESOURCES_WORKLOG_FILES or name in RESOURCES_PYTHON_FILES:
            continue
        # Match research_*.json, research_*.md, dashboard_search*.json
        if any(name.startswith(p) for p in RESOURCES_RESEARCH_PATTERNS):
            move_entry(name, RESOURCES / "research")
            continue
        # Match *.png screenshots
        if name.lower().endswith(".png"):
            move_entry(name, RESOURCES / "screenshots")
            continue

    # ---- Move resources/docs/ files ----
    print("\n--- Phase 7: move misc docs into resources/docs/ ---")
    for name in sorted(RESOURCES_DOCS_FILES):
        move_entry(name, RESOURCES / "docs")

    # ---- Move resources/worklog/ files ----
    print("\n--- Phase 8: move worklog into resources/worklog/ ---")
    for name in sorted(RESOURCES_WORKLOG_FILES):
        move_entry(name, RESOURCES / "worklog")

    # ---- Move resources/python-env/ files ----
    print("\n--- Phase 9: move python env files into resources/python-env/ ---")
    for name in sorted(RESOURCES_PYTHON_FILES):
        move_entry(name, RESOURCES / "python-env")

    # ---- Move remaining top-level files (catch-all) into resources/misc/ ----
    print("\n--- Phase 10: move any remaining top-level files into resources/misc/ ---")
    known_files = (
        AXIA_TOP_FILES | ROOT_KEEP_FILES | RESOURCES_ARCHIVE_FILES
        | RESOURCES_SCRIPTS_FILES | RESOURCES_DOCS_FILES
        | RESOURCES_WORKLOG_FILES | RESOURCES_PYTHON_FILES
    )
    for entry in sorted(ROOT.iterdir()):
        if not entry.is_file():
            continue
        name = entry.name
        if name in known_files:
            continue
        if name.startswith(".env"):
            # Don't move .env files (gitignored secrets)
            continue
        if any(name.startswith(p) for p in RESOURCES_RESEARCH_PATTERNS):
            continue  # already moved in phase 6
        if name.lower().endswith(".png"):
            continue  # already moved in phase 6
        print(f"  misc file: {name}")
        move_entry(name, RESOURCES / "misc")

    # ---- Move resources/ directories ----
    print("\n--- Phase 11: move non-production directories into resources/ ---")
    for name in sorted(RESOURCES_TOP_DIRS):
        move_entry(name, RESOURCES)

    # ---- Final summary ----
    print("\n=== Reorganization complete ===")
    print(f"\nTop-level entries now in {ROOT}:")
    for entry in sorted(ROOT.iterdir()):
        rel = entry.relative_to(ROOT).as_posix()
        kind = "DIR " if entry.is_dir() else "FILE"
        print(f"  [{kind}] {rel}")


if __name__ == "__main__":
    main()
