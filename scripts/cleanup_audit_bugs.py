#!/usr/bin/env python3
"""
Strictly-scoped cleanup of the AXIA project per user request.

Scope:
1. Fix Bug #4 — remove 4 duplicate functions from src/convex/projects/projectProtection.ts
   (duplicates already exist as standalone files: projectProtectionScore.ts,
   adaptiveEvidenceSystem.ts, projectHealthDashboard.ts, milestoneProtection.ts)
2. Delete 4 orphan page files: ApiSettings.tsx, HelpCenter.tsx, Subscription.tsx,
   PlatformIntegrations.tsx
3. Remove their imports from src/main.tsx (lines 33, 35, 36)
4. KEEP the reroute routes in main.tsx (lines 300-302) so old links still work
   (e.g. navigate("/subscription") in Projects.tsx still resolves to AccountSettings)

NOT in scope:
- Bug #1 (rateLimits) — already fixed in tables/compliance.ts:101-112
- Bug #2 (extensionTokens v5.5.0) — already fixed in tables/features.ts:6-24
- Bug #3 (OwnerDashboard phantom api path) — already fixed at OwnerDashboard.tsx:58
- AccountSettings.tsx — DO NOT TOUCH (already has equivalent sections wired)
- src/components/project-protection/ tree — DO NOT TOUCH (user said keep tree)

Every change marked with // ponytail: comment.
"""

import os
import re
import sys

AXIA_ROOT = "/home/z/my-project/axia"
ERR = "\033[31m"
OK = "\033[32m"
YELLOW = "\033[33m"
RESET = "\033[0m"


def log(msg, kind="info"):
    color = {"info": "", "ok": OK, "err": ERR, "warn": YELLOW}.get(kind, "")
    print(f"{color}{msg}{RESET}")


def remove_duplicate_functions_from_project_protection():
    """Remove 4 duplicate functions from projectProtection.ts.

    The duplicates (and their standalone counterparts the frontend actually uses):
      - getProjectProtectionScore  (standalone: projectProtectionScore.ts)
      - getAdaptiveEvidenceSystem  (standalone: adaptiveEvidenceSystem.ts)
      - getProjectHealthDashboard  (standalone: projectHealthDashboard.ts)
      - getMilestoneProtection     (standalone: milestoneProtection.ts)

    Each function in projectProtection.ts is preceded by a "// Get ..." comment.
    We delete from the start of the first comment through the last function's
    closing `});` line, then re-insert a single ponytail comment marking the
    cleanup. The next function (getProjectRiskHeatmap) is preserved.
    """
    path = os.path.join(AXIA_ROOT, "src/convex/projects/projectProtection.ts")
    with open(path, "r") as f:
        src = f.read()
    lines = src.split("\n")

    # Locate the start: "// Get project-specific protection score" before line 238
    start_idx = None
    for i, line in enumerate(lines):
        if line.strip() == "// Get project-specific protection score":
            start_idx = i
            break
    if start_idx is None:
        log("FAIL: could not find start marker for getProjectProtectionScore", "err")
        sys.exit(1)

    # Locate the end: the `});` that closes getMilestoneProtection.
    # Strategy: from start_idx, walk forward and find the line that contains
    # the comment "// Get project risk heatmap" — the line *before* that
    # (after stripping trailing blank lines) is the end of the last duplicate.
    end_idx = None
    for i in range(start_idx, len(lines)):
        if lines[i].strip() == "// Get project risk heatmap":
            # Walk back to skip blank lines
            j = i - 1
            while j > start_idx and lines[j].strip() == "":
                j -= 1
            end_idx = j  # inclusive: this is the last `});` line
            break
    if end_idx is None:
        log("FAIL: could not find end marker (// Get project risk heatmap)", "err")
        sys.exit(1)

    # Sanity: end_idx line should be `});`
    closing = "});"
    if lines[end_idx].strip() != closing:
        got = repr(lines[end_idx])
        log("FAIL: end_idx " + str(end_idx) + " is not '" + closing + "' — got: " + got, "err")
        sys.exit(1)

    # Sanity: count how many `export const` declarations we are removing — should be 4
    removed_block = "\n".join(lines[start_idx:end_idx + 1])
    export_count = len(re.findall(r"^export const \w+ = (?:query|mutation|action)\(", removed_block, re.MULTILINE))
    if export_count != 4:
        log(f"FAIL: expected to remove 4 exports, found {export_count}", "err")
        sys.exit(1)

    expected_names = {
        "getProjectProtectionScore",
        "getAdaptiveEvidenceSystem",
        "getProjectHealthDashboard",
        "getMilestoneProtection",
    }
    found_names = set(re.findall(r"^export const (\w+) = (?:query|mutation|action)\(", removed_block, re.MULTILINE))
    if found_names != expected_names:
        log(f"FAIL: expected names {expected_names}, found {found_names}", "err")
        sys.exit(1)

    # Replace lines[start_idx..end_idx] with the ponytail comment
    ponytail_comment = (
        "// ponytail: removed 4 duplicate query functions that were already"
        " exported from their own standalone files in this directory "
        "(projectProtectionScore.ts, adaptiveEvidenceSystem.ts,"
        " projectHealthDashboard.ts, milestoneProtection.ts)."
        " Frontend uses the standalone api paths exclusively."
        " Having two definitions of the same function name in two files"
        " in the same convex/projects/ folder caused Convex to refuse to"
        " deploy with a duplicate-export error."
    )

    new_lines = lines[:start_idx] + [ponytail_comment] + lines[end_idx + 1:]
    new_src = "\n".join(new_lines)

    # Write back
    with open(path, "w") as f:
        f.write(new_src)

    log(f"OK: removed {export_count} duplicate functions from projectProtection.ts", "ok")
    log(f"    deleted lines {start_idx + 1}..{end_idx + 1} (1-indexed)", "info")
    log(f"    new file has {len(new_lines)} lines (was {len(lines)})", "info")


def delete_orphan_page_files():
    """Delete the 4 orphan page files."""
    files = [
        "src/pages/ApiSettings.tsx",
        "src/pages/HelpCenter.tsx",
        "src/pages/Subscription.tsx",
        "src/pages/PlatformIntegrations.tsx",
    ]
    for rel in files:
        path = os.path.join(AXIA_ROOT, rel)
        if not os.path.exists(path):
            log(f"WARN: {rel} already gone", "warn")
            continue
        os.remove(path)
        log(f"OK: deleted {rel}", "ok")


def clean_main_tsx_imports():
    """Remove the 3 orphan-page imports from main.tsx.

    Lines to remove (by content match, not line number, so it's robust):
      import PlatformIntegrations from "./pages/PlatformIntegrations.tsx";
      import Subscription from "./pages/Subscription.tsx";
      import HelpCenter from "./pages/HelpCenter.tsx";

    ApiSettings was never imported in main.tsx, so nothing to remove for it.

    We DO NOT touch the reroute routes at the bottom of main.tsx:
        <Route path="/platform-integrations" element={<AccountSettings />} />
        <Route path="/subscription" element={<AccountSettings />} />
        <Route path="/help-center" element={<AccountSettings />} />
    These keep old links (e.g. navigate("/subscription") in Projects.tsx)
    working by redirecting to AccountSettings, which is the consolidated page.
    """
    path = os.path.join(AXIA_ROOT, "src/main.tsx")
    with open(path, "r") as f:
        src = f.read()

    # ponytail comment to mark the cleanup (one line, placed where the first
    # removed import used to be)
    ponytail = (
        "// ponytail: removed orphan page imports — ApiSettings, HelpCenter,"
        " Subscription, PlatformIntegrations are now fully consolidated into"
        " AccountSettings.tsx (which has SubscriptionSection, HelpSection,"
        " ConnectionsSection). The route aliases"
        " /subscription /help-center /platform-integrations are kept below"
        " as redirects to /account-settings so existing navigate() calls"
        " (e.g. Projects.tsx upgrade CTAs) keep working."
    )

    patterns = [
        r'^import PlatformIntegrations from "\./pages/PlatformIntegrations\.tsx";\n',
        r'^import Subscription from "\./pages/Subscription\.tsx";\n',
        r'^import HelpCenter from "\./pages/HelpCenter\.tsx";\n',
    ]

    new_src = src
    matched = 0
    for pat in patterns:
        new_src, n = re.subn(pat, "", new_src, count=1, flags=re.MULTILINE)
        if n == 0:
            log(f"FAIL: pattern not found in main.tsx: {pat}", "err")
            sys.exit(1)
        matched += n

    # Insert the ponytail comment immediately before the "import Pipeline" line
    # (which used to follow the HelpCenter import)
    insert_pat = r'(?m)^(import Pipeline from "\./pages/Pipeline\.tsx";)'
    new_src, n = re.subn(insert_pat, ponytail + r"\n\n\1", new_src, count=1)
    if n == 0:
        log("FAIL: could not find insertion point (import Pipeline) in main.tsx", "err")
        sys.exit(1)

    with open(path, "w") as f:
        f.write(new_src)

    log(f"OK: removed {matched} orphan-page imports from main.tsx + added ponytail comment", "ok")


def main():
    log("=== AXIA strictly-scoped cleanup ===", "info")
    log("")
    log("Step 1: Bug #4 — remove 4 duplicate functions from projectProtection.ts", "info")
    remove_duplicate_functions_from_project_protection()
    log("")
    log("Step 2: Delete 4 orphan page files", "info")
    delete_orphan_page_files()
    log("")
    log("Step 3: Clean orphan-page imports from main.tsx (keep reroute routes)", "info")
    clean_main_tsx_imports()
    log("")
    log("=== DONE ===", "ok")
    log("")
    log("Bugs #1, #2, #3 were already fixed in earlier commits — verified, no action taken.", "info")
    log("AccountSettings.tsx NOT modified — already has the equivalent sections wired.", "info")
    log("src/components/project-protection/ tree NOT modified — user said keep it.", "info")


if __name__ == "__main__":
    main()
