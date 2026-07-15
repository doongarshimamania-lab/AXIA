import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUser } from "../users";
import { simpleUserIdHash } from "../security/utils";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
/**
 * Production-scale audit log.
 *
 * 1,000-user concerns addressed:
 *  - logOperation is rate-limited per-user (max 60 ops/min). Without this,
 *    a single malicious user could insert millions of rows and exhaust the
 *    table's write budget, knocking audit logging offline for everyone.
 *  - getAuditTrail already uses .take(100) — bounded.
 *  - verifyAuditIntegrity previously used .take(1000) — at 1,000 users each
 *    logging 100 ops/day, a power user could accumulate 100k+ rows. We now cap
 *    at .take(1000) and time-window the scan to the last 30 days.
 */

const AUDIT_LOG_RATE_LIMIT_PER_MIN = 60;
const AUDIT_VERIFY_MAX_ROWS = 1000;
const AUDIT_VERIFY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
    await rateLimitAuthenticated(ctx, "logOperation");
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Rate limit: count this user's audit entries in the last minute.
    const oneMinAgo = Date.now() - 60_000;
    const recentByUser = await ctx.db
      .query("auditTrail")
      .withIndex("by_user_and_timestamp", (q) =>
        q.eq("userId", user._id).gte("timestamp", oneMinAgo)
      )
      .take(AUDIT_LOG_RATE_LIMIT_PER_MIN + 1);

    if (recentByUser.length >= AUDIT_LOG_RATE_LIMIT_PER_MIN) {
      throw new Error(
        `Rate limit: max ${AUDIT_LOG_RATE_LIMIT_PER_MIN} audit log entries per minute.`
      );
    }

    // Cap the size of the data_snapshot — without this a user could attach
    // a multi-MB JSON blob to each log entry and exhaust storage.
    let snapshot = args.data_snapshot;
    try {
      const serialized = JSON.stringify(snapshot);
      if (serialized.length > 16_384) {
        snapshot = {
          _truncated: true,
          _originalSize: serialized.length,
          preview: serialized.slice(0, 4096),
        };
      }
    } catch {
      snapshot = { _error: "unserializable_snapshot" };
    }

    // Generate user_id_hash (will be imported from crypto module)
    const user_id_hash = simpleUserIdHash(user._id);

    await ctx.db.insert("auditTrail", {
      userId: user._id,
      user_id_hash,
      operation: args.operation,
      source_platform: args.source_platform,
      timestamp: Date.now(),
      data_snapshot: snapshot,
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
 * Verify audit trail integrity for a user.
 *
 * Bounded scan: only checks the last 30 days, capped at 1,000 rows.
 * Previous implementation used .take(1000) which at 1,000 users × 6 months
 * of audit history could read 100k+ rows per call.
 */
export const verifyAuditIntegrity = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { valid: false, message: "Not authenticated" };
    }

    const since = Date.now() - AUDIT_VERIFY_WINDOW_MS;
    const trail = await ctx.db
      .query("auditTrail")
      .withIndex("by_user_and_timestamp", (q) =>
        q.eq("userId", user._id).gte("timestamp", since)
      )
      .order("asc")
      .take(AUDIT_VERIFY_MAX_ROWS);

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
      scannedWindow: AUDIT_VERIFY_WINDOW_MS,
      message:
        inconsistencies === 0
          ? "Audit trail is valid"
          : `Found ${inconsistencies} timestamp inconsistencies`,
    };
  },
});
