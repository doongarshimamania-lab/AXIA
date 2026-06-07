import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUser } from "../users";
import { simpleUserIdHash } from "../security/utils";

/**
 * Log an operation to the immutable audit trail
 */
export const logOperation = mutation({
  args: {
    operation: v.string(),
    source_platform: v.string(),
    data_snapshot: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Generate user_id_hash (will be imported from crypto module)
    const user_id_hash = simpleUserIdHash(user._id);

    await ctx.db.insert("auditTrail", {
      userId: user._id,
      user_id_hash,
      operation: args.operation,
      source_platform: args.source_platform,
      timestamp: Date.now(),
      data_snapshot: args.data_snapshot,
    });

    return { success: true };
  },
});

/**
 * Get audit trail for a user within a date range
 */
export const getAuditTrail = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    let query = ctx.db
      .query("auditTrail")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", user._id));

    if (args.startDate && args.endDate) {
      query = query.filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startDate!),
          q.lte(q.field("timestamp"), args.endDate!)
        )
      );
    }

    const trail = await query.order("desc").take(100);
    return trail;
  },
});

/**
 * Verify audit trail integrity for a user
 */
export const verifyAuditIntegrity = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { valid: false, message: "Not authenticated" };
    }

    const trail = await ctx.db
      .query("auditTrail")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", user._id))
      .order("asc")
      .collect();

    // Check for timestamp consistency
    let inconsistencies = 0;
    for (let i = 1; i < trail.length; i++) {
      if (trail[i].timestamp < trail[i - 1].timestamp) {
        inconsistencies++;
      }
    }

    return {
      valid: inconsistencies === 0,
      totalRecords: trail.length,
      inconsistencies,
      message: inconsistencies === 0 ? "Audit trail is valid" : `Found ${inconsistencies} timestamp inconsistencies`,
    };
  },
});
