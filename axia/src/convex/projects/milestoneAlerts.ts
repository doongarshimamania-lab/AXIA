import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Create a milestone alert
export const createMilestoneAlert = internalMutation({
  args: {
    projectId: v.id("projects"),
    weekNumber: v.number(),
    alertType: v.union(
      v.literal("protection_drop"),
      v.literal("evidence_gap"),
      v.literal("week_completion"),
      v.literal("approval_needed")
    ),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    message: v.string(),
    protectionRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const alertId = await ctx.db.insert("milestoneAlerts", {
      userId,
      projectId: args.projectId,
      weekNumber: args.weekNumber,
      alertType: args.alertType,
      severity: args.severity,
      message: args.message,
      protectionRate: args.protectionRate,
      isRead: false,
      createdAt: Date.now(),
    });

    return alertId;
  },
});

// Get alerts for a project
export const getProjectAlerts = query({
  args: {
    projectId: v.id("projects"),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let alertsQuery = ctx.db
      .query("milestoneAlerts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), userId));

    if (args.unreadOnly) {
      alertsQuery = alertsQuery.filter((q) => q.eq(q.field("isRead"), false));
    }

    const alerts = await alertsQuery.order("desc").take(20);

    return alerts;
  },
});

// Mark alert as read
export const markAlertAsRead = mutation({
  args: {
    alertId: v.id("milestoneAlerts"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "markAlertAsRead");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.userId !== userId) {
      throw new Error("Alert not found");
    }

    await ctx.db.patch(args.alertId, { isRead: true });
  },
});

// Get unread alert count
export const getUnreadAlertCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const alerts = await ctx.db
      .query("milestoneAlerts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .take(1000);

    return alerts.length;
  },
});
