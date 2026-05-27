import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const createAlert = mutation({
  args: {
    sessionId: v.optional(v.id("workSessions")),
    alertType: v.union(
      v.literal("at_risk"),
      v.literal("payment_protection_risk"),
      v.literal("non_browser_work"),
      v.literal("timer_paused")
    ),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    const alertId = await ctx.db.insert("complianceAlerts", {
      userId: user._id,
      sessionId: args.sessionId,
      alertType: args.alertType,
      message: args.message,
      triggeredAt: Date.now(),
      acknowledged: false,
    });

    return alertId;
  },
});

export const getActiveAlerts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const alerts = await ctx.db
      .query("complianceAlerts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("acknowledged"), false))
      .order("desc")
      .take(10);

    return alerts;
  },
});

export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id("complianceAlerts"),
    actionTaken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.userId !== user._id) {
      throw new Error("Alert not found or unauthorized");
    }

    await ctx.db.patch(args.alertId, {
      acknowledged: true,
      actionTaken: args.actionTaken,
    });

    return alert;
  },
});
