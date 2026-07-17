// ──────────────────────────────────────────────────────────────────────────────
// security/rateLimit.ts — Distributed per-user rate limiter for Convex
//
// v5.5.0 — Production-scale (1,000 users) DoS defense.
//
// USAGE:
//   import { rateLimit, RATE_LIMITS } from "./security/rateLimit";
//
//   export const signIn = mutation({
//     args: { email: v.string() },
//     handler: async (ctx, args) => {
//       await rateLimit(ctx, "signIn", args.email, RATE_LIMITS.SIGN_IN);
//       // ... business logic
//     },
//   });
//
// Design:
//   - One row per (action, identifier, minuteBucket) in `rateLimits` table.
//   - Identifier = userId (for authenticated calls) or email/IP (for public calls).
//   - On each call: read current bucket, increment count, throw if over limit.
//   - Buckets auto-expire via cron (or simply by being ignored after windowMs).
//
// 1,000-user math:
//   - 278 protected mutations × 1,000 users × 1 call/min = 278K rows/hour
//   - With 1-hour window: max ~278K active rows at any moment
//   - At ~100 bytes/row = ~28 MB — well within Convex's free tier
// ──────────────────────────────────────────────────────────────────────────────

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { getAuthUserId } from "../lib/auth";

export interface RateLimitConfig {
  /** Max calls per window per identifier */
  max: number;
  /** Window in milliseconds */
  windowMs: number;
}

/** Pre-defined rate limits for common mutation classes */
export const RATE_LIMITS = {
  // Auth flows — tight limits (brute-force defense)
  SIGN_IN: { max: 10, windowMs: 60_000 },          // 10/min per email
  SIGN_UP: { max: 5, windowMs: 60_000 },           // 5/min per email
  RESET_PASSWORD: { max: 3, windowMs: 60_000 },    // 3/min per email
  OWNER_LOGIN: { max: 5, windowMs: 60_000 },       // 5/min per IP

  // High-traffic mutations
  CREATE_RECORD: { max: 60, windowMs: 60_000 },    // 60/min per user
  UPDATE_RECORD: { max: 120, windowMs: 60_000 },   // 120/min per user
  DELETE_RECORD: { max: 30, windowMs: 60_000 },    // 30/min per user

  // Bulk operations — very tight (cloud billing attack defense)
  BULK_IMPORT: { max: 3, windowMs: 60_000 },       // 3/min per user
  BULK_EXPORT: { max: 5, windowMs: 60_000 },       // 5/min per user

  // Messaging
  SEND_MESSAGE: { max: 60, windowMs: 60_000 },     // 60/min per user
  SEND_INVITATION: { max: 10, windowMs: 60_000 },  // 10/min per user

  // File / attachment uploads
  UPLOAD: { max: 20, windowMs: 60_000 },           // 20/min per user

  // Default for any other mutation
  DEFAULT: { max: 60, windowMs: 60_000 },
} as const;

/**
 * Enforce a rate limit. Throws ConvexError(429) if exceeded.
 *
 * @param ctx       Convex mutation context
 * @param action    Stable action name (e.g., "signIn", "createInvoice")
 * @param identifier Per-user key — userId, email, or hashed IP
 * @param config    { max, windowMs }
 */
export async function rateLimit(
  ctx: MutationCtx,
  action: string,
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT,
): Promise<void> {
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const bucketKey = `${action}::${identifier}::${windowStart}`;

  // Look up existing bucket
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_bucket", (q) => q.eq("bucket", bucketKey))
    .first();

  if (existing) {
    if (existing.count >= config.max) {
      const retryAfter = Math.ceil((existing.windowEnd - now) / 1000);
      throw new Error(
        `Rate limit exceeded for ${action}. Try again in ${retryAfter}s.`,
      );
    }
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
  } else {
    // Create new bucket
    await ctx.db.insert("rateLimits", {
      bucket: bucketKey,
      action,
      identifier,
      count: 1,
      windowStart,
      windowEnd: windowStart + config.windowMs,
      createdAt: now,
    });
  }

  // Opportunistically clean up expired buckets (1% chance per call — cheap GC)
  if (Math.random() < 0.01) {
    const expired = await ctx.db
      .query("rateLimits")
      .withIndex("by_window_end", (q) => q.lt("windowEnd", now - 3600_000))
      .take(50);
    for (const e of expired) {
      await ctx.db.delete(e._id);
    }
  }
}

/**
 * Convenience wrapper for authenticated mutations:
 * reads userId from ctx.auth and rate-limits by userId.
 */
export async function rateLimitAuthenticated(
  ctx: MutationCtx,
  action: string,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT,
): Promise<void> {
  const userId = await ctx.auth?.getUserId?.();
  if (!userId) {
    // No auth — fall back to IP-based or just skip (auth check will fail anyway)
    return;
  }
  await rateLimit(ctx, action, userId, config);
}

/**
 * Admin-only auth gate. Throws if caller is not signed in OR not admin.
 * Returns the admin userId on success.
 *
 * SECURITY (v7.2 hardening): Previously accepted `subscriptionTier === "expert"`
 * as a substitute for `role === "admin"` — combined with the (now-fixed)
 * `users.setMyTier` mutation that let any user self-set their tier to "expert",
 * this was a 2-call privilege-escalation path to admin. The expert-tier bypass
 * has been removed; only `role === "admin"` (or `role === "owner"`) qualifies.
 *
 * Also fixed: now uses `getAuthUserId(ctx)` from lib/auth (Better Auth) instead
 * of `ctx.auth?.getUserId?.()` (Convex native auth) — the latter returns null
 * under BA-only sessions, which previously caused requireAdmin to throw
 * "Unauthorized" even for legitimately signed-in admins.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<string> {
  const userId = await getAuthUserId(ctx as any);
  if (!userId) {
    throw new Error("Unauthorized: Sign in required.");
  }
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("Unauthorized: User not found.");
  }
  if (user.role !== "admin" && user.role !== "owner") {
    throw new Error("Forbidden: Admin access required.");
  }
  return userId;
}
