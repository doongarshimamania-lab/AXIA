import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.insert("platformComplianceChecks", args);
    return { success: true };
  }
});

// Get latest compliance check (requires auth)
export const getLatestComplianceCheck = query({
  args: {
    platform: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const latestCheck = await ctx.db
      .query("platformComplianceChecks")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .order("desc")
      .first();

    return latestCheck;
  }
});
