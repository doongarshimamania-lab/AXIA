import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Track upgrade trigger views
export const trackUpgradeTrigger = mutation({
  args: {
    triggerType: v.string(),
    triggerSource: v.string(),
    tierShown: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "trackUpgradeTrigger");
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    await ctx.db.insert("upgradeTriggers", {
      userId,
      triggerType: args.triggerType,
      triggerSource: args.triggerSource,
      tierShown: args.tierShown,
      triggeredAt: Date.now(),
      converted: false,
      metadata: args.metadata,
    });
  },
});

// Track successful upgrade
export const trackUpgradeConversion = mutation({
  args: {
    fromTier: v.string(),
    toTier: v.string(),
    triggerSource: v.string(),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "trackUpgradeConversion");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Update user tier
    await ctx.db.patch(userId, {
      subscriptionTier: args.toTier,
      tierUpgradedAt: Date.now(),
    });

    // Record conversion
    await ctx.db.insert("upgradeConversions", {
      userId,
      fromTier: args.fromTier,
      toTier: args.toTier,
      triggerSource: args.triggerSource,
      convertedAt: Date.now(),
    });

    return { success: true };
  },
});
