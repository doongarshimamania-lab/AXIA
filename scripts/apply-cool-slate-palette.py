#!/usr/bin/env python3
"""
Apply Cool Slate palette across the AXIA frontend.

Cool Slate spec:
  - Background: #F8FAFC (ice) — already set in index.css, no change needed
  - Foreground: #0F172A (deep slate)
  - Accent/Primary: #475569 (slate-600)
  - Accent hover: #334155 (slate-700)

Replacements:
  1. index.css: #0D9488 (teal primary) → #475569 (slate)
  2. index.css: foreground #1E293B → #0F172A
  3. All .tsx/.ts: hardcoded #8B5CF6 (purple) → #475569 (slate)
  4. All .tsx/.ts: hardcoded #7C3AED (purple-hover) → #334155 (slate-700)
  5. Messaging components: violet-400/indigo-500 gradients → slate-500/slate-600

Idempotent — safe to re-run. Skips node_modules, dist, .convex, _generated.
"""
import os
import re
import sys

ROOT = "/home/z/my-project/axia/src"
SKIP_DIRS = {"node_modules", "dist", ".convex", "_generated", ".git"}

# Direct hex replacements (case-insensitive)
HEX_REPLACEMENTS = {
    "#8B5CF6": "#475569",  # purple-500 → slate-600
    "#8b5cf6": "#475569",
    "#7C3AED": "#334155",  # violet-600 → slate-700
    "#7c3aed": "#334155",
    "#7c3AED": "#334155",
    "#7C3aed": "#334155",
}

# Tailwind class replacements (for messaging components)
CLASS_REPLACEMENTS = {
    "from-violet-400": "from-slate-400",
    "to-indigo-500": "to-slate-600",
    "from-violet-500": "from-slate-500",
    "to-purple-600": "to-slate-700",
    "bg-violet-100": "bg-slate-100",
    "text-violet-700": "text-slate-700",
    "bg-purple-100": "bg-slate-100",
    "text-purple-700": "text-slate-700",
    "bg-indigo-500": "bg-slate-600",
    "bg-violet-500": "bg-slate-600",
    "bg-purple-500": "bg-slate-600",
}

# index.css-specific replacements (teal primary → slate)
CSS_REPLACEMENTS = {
    "#0D9488": "#475569",  # teal-600 → slate-600 (primary)
    "#0d9488": "#475569",
    "#14B8A6": "#64748B",  # teal-500 → slate-500 (accent-hover, success)
    "#14b8a6": "#64748B",
    "#0F766E": "#334155",  # teal-700 → slate-700
    "#0f766e": "#334155",
    "#1E293B": "#0F172A",  # slate-800 → slate-900 (foreground, deeper per Cool Slate spec)
    "#1e293b": "#0F172A",
}

stats = {"files_scanned": 0, "files_changed": 0, "replacements": 0}


def apply_replacements(content: str, replacements: dict) -> tuple[str, int]:
    """Apply all replacements to content. Returns (new_content, count)."""
    count = 0
    for old, new in replacements.items():
        n = content.count(old)
        if n > 0:
            content = content.replace(old, new)
            count += n
    return content, count


def process_file(filepath: str) -> int:
    """Process a single file. Returns number of replacements made."""
    stats["files_scanned"] += 1
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            original = f.read()
    except (UnicodeDecodeError, PermissionError):
        return 0

    new_content = original
    total_replacements = 0

    if filepath.endswith(".css"):
        new_content, n1 = apply_replacements(new_content, CSS_REPLACEMENTS)
        new_content, n2 = apply_replacements(new_content, HEX_REPLACEMENTS)
        total_replacements = n1 + n2
    elif filepath.endswith((".tsx", ".ts")):
        new_content, n1 = apply_replacements(new_content, HEX_REPLACEMENTS)
        new_content, n2 = apply_replacements(new_content, CLASS_REPLACEMENTS)
        total_replacements = n1 + n2

    if total_replacements > 0 and new_content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        stats["files_changed"] += 1
        stats["replacements"] += total_replacements
        print(f"  {filepath}: {total_replacements} replacements")
        return total_replacements
    return 0


def walk(root: str):
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip excluded dirs in-place
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for filename in filenames:
            if filename.endswith((".tsx", ".ts", ".css")):
                yield os.path.join(dirpath, filename)


if __name__ == "__main__":
    print(f"Applying Cool Slate palette to {ROOT} ...")
    for filepath in walk(ROOT):
        process_file(filepath)
    print(f"\nDone. Files scanned: {stats['files_scanned']}, "
          f"files changed: {stats['files_changed']}, "
          f"total replacements: {stats['replacements']}")
