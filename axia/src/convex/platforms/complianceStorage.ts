import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Store compliance check (requires auth)
export const storeComplianceCheck = mutation({
  args: {
    platform: v.string(),
    complianceScore: v.number(),
    complianceStatus: v.any(),
    lastChecked: v.number(),
    termsLastUpdated: v.string()
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "storeComplianceCheck");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.insert("platformComplianceChecks", args);
    return { success: true };
  }
});

// ponytail: IDOR fix — previously returned the latest compliance check
// across the ENTIRE system for the requested platform, regardless of
// caller. platformComplianceChecks are workspace-scoped (or system-wide
// when workspaceId is null). Now we filter to: (a) system-wide checks
// (workspaceId is null/undefined), OR (b) checks for a workspace the
// caller is a member of. This prevents leaking another workspace's
// compliance scores/status to competitors.
// Get latest compliance check (requires auth)
export const getLatestComplianceCheck = query({
  args: {
    platform: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Collect all checks for this platform, then filter to caller-visible
    // ones. We can't use the index alone because we need an OR condition
    // (workspaceId IS NULL OR workspaceId IN caller's workspaces).
    // For 1000-user scale this is fine — platformComplianceChecks is a
    // small table (one row per platform per workspace per check).
    const allChecks = await ctx.db
      .query("platformComplianceChecks")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .take(1000);

    // ponytail: caller-visible = system-wide (no workspaceId) OR caller
    // is a member of the workspace. We use ctx.db.get + a membership
    // probe per distinct workspaceId — at most a handful of workspaces
    // per platform, so this is O(workspaces) not O(rows).
    const { getWorkspaceMembership } = await import("../permissions");
    const visibleChecks: typeof allChecks = [];
    const membershipCache = new Map<string, boolean>();

    for (const check of allChecks) {
      if (!check.workspaceId) {
        visibleChecks.push(check);
        continue;
      }
      const wsIdStr = check.workspaceId.toString();
      let isMember = membershipCache.get(wsIdStr);
      if (isMember === undefined) {
        const membership = await getWorkspaceMembership(ctx, check.workspaceId, userId);
        isMember = !!membership;
        membershipCache.set(wsIdStr, isMember);
      }
      if (isMember) visibleChecks.push(check);
    }

    // Return the most recent visible check
    return visibleChecks.sort((a, b) => b.lastChecked - a.lastChecked)[0] ?? null;
  }
});
