import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const storeComplianceCheck = mutation({
  args: {
    platform: v.string(),
    complianceScore: v.number(),
    complianceStatus: v.any(),
    lastChecked: v.number(),
    termsLastUpdated: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("platformComplianceChecks", args);
    return { success: true };
  }
});

export const getLatestComplianceCheck = query({
  args: {
    platform: v.string()
  },
  handler: async (ctx, args) => {
    const latestCheck = await ctx.db
      .query("platformComplianceChecks")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .order("desc")
      .first();

    return latestCheck;
  }
});
