import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Get active protection alerts
export const getActiveAlerts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.subscriptionTier !== "pro") return [];

    const alerts = await ctx.db
      .query("protectionAdvisorAlerts")
      .withIndex("by_user_and_resolved", (q) =>
        q.eq("userId", userId).eq("resolvedAt", undefined)
      )
      .order("desc")
      .take(10);

    return alerts;
  },
});

// Create protection alert
export const createAlert = mutation({
  args: {
    alertType: v.union(
      v.literal("activity_gap"),
      v.literal("screenshot_needed"),
      v.literal("policy_violation"),
      v.literal("platform_sync_issue"),
      v.literal("evidence_quality_low")
    ),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    message: v.string(),
    recommendation: v.string(),
    actionRequired: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const alertId = await ctx.db.insert("protectionAdvisorAlerts", {
      userId,
      ...args,
      triggeredAt: Date.now(),
      autoResolved: false,
    });

    return alertId;
  },
});

// Resolve alert
export const resolveAlert = mutation({
  args: {
    alertId: v.id("protectionAdvisorAlerts"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "resolveAlert");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.alertId, {
      resolvedAt: Date.now(),
    });

    return { success: true };
  },
});
