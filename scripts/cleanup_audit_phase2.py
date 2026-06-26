#!/usr/bin/env python3
"""
Phase 2 of audit cleanup: delete orphan component trees + their backend code.

Scope:
- Delete all 5 src/components/client-protection/*.tsx files (audit item #26)
  - 3 were orphan (ClientDisputeSimulation, ClientPaymentPattern, ClientGapPrediction)
  - 2 were used by Clients.tsx (ClientList, ClientPolicyProfile) — Clients.tsx
    was refactored to inline a minimal honest list, so the components are now
    safe to delete.
- Delete 7 src/convex/clients/*.ts backend files that supported the deleted
  client-protection feature surface. Verified zero frontend usage remains:
    clientProtection.ts, clientDisputeSimulation.ts, clientGapPrediction.ts,
    clientPolicyProfile.ts, clientProtectionScore.ts, clientTrustScore.ts,
    clientProtectionSimple.ts
  (api.clients.crud.* and api.clients.clientWorkspace.* are KEPT — used by
  Clients.tsx, ClientWorkspace.tsx, Dashboard.tsx, etc.)
- Delete all 4 src/components/connectors/* files (audit item #28)
  - FeatureConnector.tsx, WorkflowActions.tsx, ActivityTimeline.tsx,
    navigationHelpers.ts — verified zero imports anywhere in src/

NOT in scope:
- src/convex/clients/crud.ts            (used by 8+ pages)
- src/convex/clients/bulkImport.ts       (used by Clients.tsx)
- src/convex/clients/clientAuth.ts       (used by ClientSignup.tsx)
- src/convex/clients/clientPortal.ts     (separate audit item — owner-only)
- src/convex/clients/clientWorkspace.ts  (used by ClientWorkspace.tsx)
- src/convex/clients/freelancerDirectory.ts (separate audit item)
- src/convex/clients/verificationRequests.ts (separate audit item)
"""

import os
import sys

AXIA_ROOT = "/home/z/my-project/axia"
ERR = "\033[31m"
OK = "\033[32m"
YELLOW = "\033[33m"
RESET = "\033[0m"


def log(msg, kind="info"):
    color = {"info": "", "ok": OK, "err": ERR, "warn": YELLOW}.get(kind, "")
    print(f"{color}{msg}{RESET}")


# Files to delete — relative to AXIA_ROOT
TO_DELETE = [
    # --- 5 client-protection components (audit item #26) ---
    "src/components/client-protection/ClientDisputeSimulation.tsx",
    "src/components/client-protection/ClientPaymentPattern.tsx",
    "src/components/client-protection/ClientGapPrediction.tsx",
    "src/components/client-protection/ClientPolicyProfile.tsx",
    "src/components/client-protection/ClientList.tsx",

    # --- 7 convex backend files for client-protection (audit item #26) ---
    "src/convex/clients/clientProtection.ts",
    "src/convex/clients/clientDisputeSimulation.ts",
    "src/convex/clients/clientGapPrediction.ts",
    "src/convex/clients/clientPolicyProfile.ts",
    "src/convex/clients/clientProtectionScore.ts",
    "src/convex/clients/clientTrustScore.ts",
    "src/convex/clients/clientProtectionSimple.ts",

    # --- 4 connectors components (audit item #28) ---
    "src/components/connectors/FeatureConnector.tsx",
    "src/components/connectors/WorkflowActions.tsx",
    "src/components/connectors/ActivityTimeline.tsx",
    "src/components/connectors/navigationHelpers.ts",
]


# Directories to remove if empty after file deletions
DIRS_TO_CLEAN = [
    "src/components/client-protection",
    "src/components/connectors",
]


def main():
    log("=== Phase 2: delete orphan component trees + backend code ===", "info")
    log("")

    deleted_count = 0
    skipped_count = 0
    total_lines = 0

    for rel in TO_DELETE:
        path = os.path.join(AXIA_ROOT, rel)
        if not os.path.exists(path):
            log(f"WARN: {rel} already gone — skipping", "warn")
            skipped_count += 1
            continue

        # Count lines for reporting
        try:
            with open(path, "r") as f:
                lines = sum(1 for _ in f)
            total_lines += lines
        except Exception:
            lines = "?"

        os.remove(path)
        log(f"OK: deleted {rel} ({lines} lines)", "ok")
        deleted_count += 1

    log("")
    log(f"Deleted {deleted_count} files ({total_lines} lines total)", "info")
    if skipped_count:
        log(f"Skipped {skipped_count} already-gone files", "warn")

    log("")
    log("Cleaning up empty directories...", "info")
    for d in DIRS_TO_CLEAN:
        path = os.path.join(AXIA_ROOT, d)
        if not os.path.exists(path):
            log(f"WARN: dir {d} does not exist", "warn")
            continue
        remaining = os.listdir(path)
        if remaining:
            log(f"WARN: dir {d} not empty — {len(remaining)} files remain: {remaining}", "warn")
            continue
        os.rmdir(path)
        log(f"OK: removed empty dir {d}/", "ok")

    log("")
    log("=== DONE ===", "ok")


if __name__ == "__main__":
    main()
