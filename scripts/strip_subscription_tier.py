#!/usr/bin/env python3
"""
Phase 1 tier removal — strip all `subscriptionTier` references from Convex code.

Rules:
  1. `user.subscriptionTier === "free"` → `false`  (no one is free; gated "deny" code never runs)
  2. `user.subscriptionTier === "pro"`  → `true`   (everyone is expert, which is pro+)
  3. `user.subscriptionTier === "expert"` → `true`
  4. `user.subscriptionTier !== "pro"`   → `false`
  5. `user.subscriptionTier !== "expert"` → `false`
  6. `user.subscriptionTier` (bare read) → `"expert"`
  7. `subscriptionTier: "free"` / `"pro"` / `args.tier` / `tier` (in object literal being inserted) → remove the line
  8. `tier: user.subscriptionTier` (in returned object) → `tier: "expert"`
  9. `targetUser.subscriptionTier` / `reportUser.subscriptionTier` / `devUser.subscriptionTier` / `u.subscriptionTier` → same rules as #1-#6
 10. `(user as any).subscriptionTier` → `"expert"`

Also removes:
  - `tierUpgradedAt: Date.now(),` lines (in object literals)
  - `tierUpgradedAt: v.optional(v.number()),` lines (in schema — already done in users.ts but check)

Strategy:
  - Read each file
  - Apply regex substitutions in order
  - Write back only if changed
  - Report what was changed

Idempotent: running twice = same result.
"""

import re
import sys
from pathlib import Path

CONVEX_DIR = Path("/home/z/my-project/axia/src/convex")

# Files to process (from grep)
TARGET_FILES = [
    "disputeReports.ts",
    "network/premiumNetwork.ts",
    "seedTeamUsers.ts",
    "evidence.ts",
    "seedProjects.ts",
    "adminSeed.ts",
    "users.ts",
    "clientAuth.ts",
    "projects/projectProtection.ts",
    "projects/milestoneProtection.ts",
    "premium/protectionPlans.ts",
    "projects/riskTimeline.ts",
    "premium/protectionAdvisor.ts",
    "premium/crossPlatformVerification.ts",
    "premium/teamValidation.ts",
    "autoSeed.ts",
    "adminListAll.ts",
    "seed.ts",
    "protection/protectionValueSimple.ts",
    "protection/protectionValue.ts",
    "clients/clientDisputeSimulation.ts",
    "clients/clientProtectionScore.ts",
    "clients/clientTrustScore.ts",
    "clients/clientGapPrediction.ts",
    "clients/clientAuth.ts",
    "clients/clientPolicyProfile.ts",
]

# Order matters: earlier substitutions can introduce text that later ones match.
SUBSTITUTIONS = [
    # === Strict equality / inequality checks (do these FIRST before bare reads) ===
    # `=== "free"` → false (no one is free; the "is free?" check is always false)
    (re.compile(r'(\w+(?:\.\w+)*(?:\s+as\s+\w+)?\.subscriptionTier)\s*===\s*"free"'), 'false'),
    # `=== "pro"` → true (everyone is expert which is pro+)
    (re.compile(r'(\w+(?:\.\w+)*(?:\s+as\s+\w+)?\.subscriptionTier)\s*===\s*"pro"'), 'true'),
    # `=== "expert"` → true
    (re.compile(r'(\w+(?:\.\w+)*(?:\s+as\s+\w+)?\.subscriptionTier)\s*===\s*"expert"'), 'true'),
    # `=== "starter"` → false (no one is starter; everyone is expert)
    (re.compile(r'(\w+(?:\.\w+)*(?:\s+as\s+\w+)?\.subscriptionTier)\s*===\s*"starter"'), 'false'),
    # `=== "client"` → false (client tier removed; client portal uses different mechanism)
    (re.compile(r'(\w+(?:\.\w+)*(?:\s+as\s+\w+)?\.subscriptionTier)\s*===\s*"client"'), 'false'),
    # `!== "free"` → true
    (re.compile(r'(\w+(?:\.\w+)*(?:\s+as\s+\w+)?\.subscriptionTier)\s*!==\s*"free"'), 'true'),
    # `!== "pro"` → false
    (re.compile(r'(\w+(?:\.\w+)*(?:\s+as\s+\w+)?\.subscriptionTier)\s*!==\s*"pro"'), 'false'),
    # `!== "expert"` → false
    (re.compile(r'(\w+(?:\.\w+)*(?:\s+as\s+\w+)?\.subscriptionTier)\s*!==\s*"expert"'), 'false'),
    # `!== "starter"` → true
    (re.compile(r'(\w+(?:\.\w+)*(?:\s+as\s+\w+)?\.subscriptionTier)\s*!==\s*"starter"'), 'true'),
    # `!== "client"` → true
    (re.compile(r'(\w+(?:\.\w+)*(?:\s+as\s+\w+)?\.subscriptionTier)\s*!==\s*"client"'), 'true'),

    # === Object literal inserts: remove `subscriptionTier: ...,` lines entirely ===
    # Match a line that is just `subscriptionTier: <something>,` (with optional leading whitespace)
    (re.compile(r'^[ \t]*subscriptionTier\s*:\s*[^,\n]+,\s*$\n?', re.MULTILINE), ''),

    # === Object literal inserts: remove `tierUpgradedAt: ...,` lines entirely ===
    (re.compile(r'^[ \t]*tierUpgradedAt\s*:\s*[^,\n]+,\s*$\n?', re.MULTILINE), ''),

    # === Returned object: `tier: <x>.subscriptionTier` → `tier: "expert"` ===
    (re.compile(r'tier\s*:\s*(\w+(?:\.\w+)*)\.subscriptionTier(?:\s*\|\|\s*"[^"]*")?'), 'tier: "expert"'),

    # === Returned object: `subscriptionTier: user.subscriptionTier || "free"` → remove ===
    (re.compile(r'^[ \t]*subscriptionTier\s*:\s*\w+(?:\.\w+)*(?:\s*\|\|\s*"[^"]*")?\s*,?\s*$\n?', re.MULTILINE), ''),

    # === Bare reads: `<x>.subscriptionTier || "free"` → `"expert"` ===
    (re.compile(r'\w+(?:\.\w+)*(?:\s+as\s+\w+)?\.subscriptionTier(?:\s*\|\|\s*"[^"]*")?'), '"expert"'),

    # === Empty if (false) { ... } blocks — leave them; dead code is harmless and removing risks breaking braces ===
    # We'll leave them for now; can be cleaned up in a follow-up.

    # === Comment references (informational only, but cleaner to update) ===
    (re.compile(r'`?subscriptionTier`?'), '`subscriptionTier` (REMOVED in Phase 1)'),
]

def process_file(path: Path) -> tuple[int, str]:
    """Return (count of substitutions, new content)."""
    original = path.read_text()
    content = original
    total_subs = 0
    for pattern, replacement in SUBSTITUTIONS:
        new_content, n = pattern.subn(replacement, content)
        total_subs += n
        content = new_content
    return total_subs, content

def main():
    total_files_changed = 0
    total_subs = 0
    for rel_path in TARGET_FILES:
        full = CONVEX_DIR / rel_path
        if not full.exists():
            print(f"  SKIP  {rel_path} (not found)")
            continue
        n, new_content = process_file(full)
        if n > 0:
            full.write_text(new_content)
            print(f"  EDIT  {rel_path}: {n} substitution(s)")
            total_files_changed += 1
            total_subs += n
        else:
            print(f"  NOOP  {rel_path}")
    print(f"\nDone. {total_files_changed} file(s) changed, {total_subs} substitution(s) total.")

if __name__ == "__main__":
    main()
