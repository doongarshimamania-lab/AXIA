#!/usr/bin/env bash
# AXIA Admin Runbook — Dev Team + Expert Tier + Grant Helpers
# ----------------------------------------------------------------------
# Run from the axia/ project root (where package.json lives).
# Requires: `npx convex login` already done on this machine.
#
# What this script does (in order):
#   1. Deploys the new adminGrants.ts mutation to your Convex deployment.
#   2. Renames the "Engineering" team → "Dev Team" in the AXIA Team workspace.
#   3. Upgrades priya@axia.dev from "pro" → "expert" tier.
#
# After running, see AXIA-PERMISSIONS-GUIDE.md
# for how to grant tiers/roles/team-membership to OTHER people.
# ----------------------------------------------------------------------

set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Step 1: Deploying adminGrants.ts to Convex ==="
npx convex deploy

echo
echo "=== Step 2: Renaming 'Engineering' team → 'Dev Team' ==="
npx convex run adminGrants:renameEngineeringToDevTeam '{}'

echo
echo "=== Step 3: Upgrading priya@axia.dev to 'expert' tier ==="
npx convex run adminGrants:upgradeSelfToExpert '{"email":"priya@axia.dev"}'

echo
echo "=== DONE ==="
echo "Refresh your AXIA app — the team list will show 'Dev Team' (emerald)"
echo "and your account badge will show 'Expert'."
echo
echo "To grant tiers/roles to OTHER people, see:"
echo "  /home/z/my-project/download/AXIA-PERMISSIONS-GUIDE.md"
