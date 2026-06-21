#!/bin/bash
# ─── Deploy Axia Convex Functions to Cloud ────────────────────────────────
#
# Usage:
#   ./deploy-convex.sh <deploy-key>
#
# Or set CONVEX_DEPLOY_KEY as environment variable:
#   export CONVEX_DEPLOY_KEY=<your-key>
#   ./deploy-convex.sh
#
# To generate a deploy key:
#   1. Go to https://dashboard.convex.dev
#   2. Select the "veracious-zebra-519" deployment
#   3. Go to Settings → Deploy Keys → Create
#   4. Copy the key and pass it to this script
#
# ─────────────────────────────────────────────────────────────────────────

set -e

cd "$(dirname "$0")"

# Check for deploy key
if [ -n "$1" ]; then
  export CONVEX_DEPLOY_KEY="$1"
elif [ -z "$CONVEX_DEPLOY_KEY" ]; then
  echo "❌ Error: CONVEX_DEPLOY_KEY is required"
  echo ""
  echo "Usage: $0 <deploy-key>"
  echo ""
  echo "Generate a deploy key from the Convex dashboard:"
  echo "  1. https://dashboard.convex.dev"
  echo "  2. Select 'veracious-zebra-519' deployment"
  echo "  3. Settings → Deploy Keys → Create"
  exit 1
fi

echo "🚀 Deploying to Convex cloud (veracious-zebra-519)..."
echo ""

# Deploy to dev cloud
npx convex deploy --typecheck=disable -v

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Verify at https://dashboard.convex.dev/d/veracious-zebra-519"
echo "  2. To deploy to production (artful-civet-344), run:"
echo "     CONVEX_DEPLOY_KEY=<prod-key> npx convex deploy --prod --typecheck=disable"
