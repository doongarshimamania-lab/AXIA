#!/usr/bin/env python3
"""
Swap @convex-dev/auth/server imports to ./lib/auth (relative path).

For each file in src/convex/ that imports from "@convex-dev/auth/server":
- Skip if it's lib/auth.ts itself (the shim).
- Skip if it's accountSettings.ts (handled separately — uses retrieveAccount etc).
- Skip if it's auth.ts (already replaced — uses betterAuth not getAuthUserId).
- Compute relative path from this file to src/convex/lib/auth.ts.
- Replace `from "@convex-dev/auth/server"` with `from "<relative-path>"`.
"""
import os
import re
from pathlib import Path

CONVEX_DIR = Path("/home/z/my-project/axia/src/convex")
TARGET_FILE = CONVEX_DIR / "lib" / "auth.ts"

SKIP_FILES = {
    "lib/auth.ts",       # the shim itself
    "accountSettings.ts", # special-case — uses retrieveAccount etc
    "auth.ts",           # already replaced
}

def compute_relative_path(from_file: Path, to_file: Path) -> str:
    """Compute the relative import path (without extension, with leading ./ or ../)."""
    from_dir = from_file.parent
    rel = os.path.relpath(to_file, from_dir)
    # Strip .ts extension
    rel = rel[:-3] if rel.endswith(".ts") else rel
    # Ensure starts with ./ or ../
    if not rel.startswith("."):
        rel = "./" + rel
    return rel

def process_file(filepath: Path) -> tuple[bool, str]:
    """Returns (was_modified, message)."""
    rel_to_root = filepath.relative_to(CONVEX_DIR).as_posix()
    if rel_to_root in SKIP_FILES:
        return (False, f"skip (in skip list): {rel_to_root}")

    content = filepath.read_text()
    if '"@convex-dev/auth/server"' not in content:
        return (False, f"skip (no match): {rel_to_root}")

    rel_path = compute_relative_path(filepath, TARGET_FILE)

    # Replace the import path. We do NOT change what's imported — the shim
    # exports getAuthUserId with the same signature.
    new_content = content.replace(
        'from "@convex-dev/auth/server"',
        f'from "{rel_path}"',
    )

    if new_content == content:
        return (False, f"skip (replacement failed): {rel_to_root}")

    filepath.write_text(new_content)
    return (True, f"swapped: {rel_to_root} → {rel_path}")

def main():
    swapped = 0
    skipped = 0
    errors = []

    for ts_file in CONVEX_DIR.rglob("*.ts"):
        if not ts_file.is_file():
            continue
        ok, msg = process_file(ts_file)
        if ok:
            swapped += 1
            print(f"  ✓ {msg}")
        else:
            skipped += 1

    print(f"\n--- SUMMARY ---")
    print(f"  swapped: {swapped}")
    print(f"  skipped: {skipped}")

if __name__ == "__main__":
    main()
