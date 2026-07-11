import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// SECURITY: storeConsentAudit now requires auth and can only log for the authenticated user
export const storeConsentAudit = mutation({
  args: {
    platform: v.string(),
    action: v.union(
      v.literal('consent_granted'),
      v.literal('consent_revoked'),
      v.literal('data_accessed'),
      v.literal('data_deleted')
    ),
    details: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "storeConsentAudit");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const ipAddress = 'unknown'; // Would be: ctx.event?.headers?.['x-forwarded-for'] || 'unknown'

    await ctx.db.insert('consentAudits', {
      userId,
      platform: args.platform,
      action: args.action,
      timestamp: Date.now(),
      details: args.details || {},
      ipAddress
    });
    
    return { success: true };
  }
});

export const logConsentAction = mutation({
  args: {
    platform: v.string(),
    action: v.union(
      v.literal('consent_granted'),
      v.literal('consent_revoked'),
      v.literal('data_accessed'),
      v.literal('data_deleted')
    ),
    details: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "logConsentAction");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const ipAddress = 'unknown';

    await ctx.db.insert('consentAudits', {
      userId,
      platform: args.platform,
      action: args.action,
      timestamp: Date.now(),
      details: args.details || {},
      ipAddress
    });

    return { success: true };
  }
});

export const getUserConsentAudits = query({
  args: {
    platform: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    let query = ctx.db
      .query("consentAudits")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (args.platform) {
      const platform = args.platform;
      query = ctx.db
        .query("consentAudits")
        .withIndex("by_user_and_platform", (q) => 
          q.eq("userId", userId).eq("platform", platform)
        );
    }

    const audits = await query
      .order("desc")
      .take(args.limit || 50);

    return audits;
  }
});

export const getPlatformDataUsageStats = query({
  args: {
    platform: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const audits = await ctx.db
      .query("consentAudits")
      .withIndex("by_user_and_platform", (q) => 
        q.eq("userId", userId).eq("platform", args.platform)
      )
      .take(1000);

    const stats = {
      totalAccesses: audits.filter(a => a.action === 'data_accessed').length,
      lastAccessed: audits.find(a => a.action === 'data_accessed')?.timestamp,
      consentGranted: audits.find(a => a.action === 'consent_granted')?.timestamp,
      consentRevoked: audits.find(a => a.action === 'consent_revoked')?.timestamp,
      dataDeleted: audits.find(a => a.action === 'data_deleted')?.timestamp,
    };

    return stats;
  }
});
