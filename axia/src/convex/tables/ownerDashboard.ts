import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Owner Dashboard tables — audit log, cache, Paddle subscription sync.
 *
 * These tables back the /owner-dashboard page:
 *   - auditLog: every owner dashboard access + upstream API call
 *   - dashboardCache: TTL-based cache for Sentry/PostHog/Vercel/Paddle responses
 *   - paddleSubscriptions: AXIA's own SaaS subscriptions (synced from Paddle webhooks)
 *   - paddleEvents: Paddle webhook event log (idempotency)
 *   - ownerAuthAttempts: legacy — kept for backward compat, no longer used for auth
 *     (owner auth now flows through Better Auth + role:"owner")
 */

export const ownerDashboardTables = {
  // ── Audit Log ────────────────────────────────────────────────────────────
  // Every owner dashboard action: page loads, tab views, upstream API calls,
  // alert dismissals, exports. Used for the audit log tab + security forensics.
  auditLog: defineTable({
    ts: v.number(),
    actorUserId: v.optional(v.id("users")),
    actorEmail: v.optional(v.string()),
    action: v.string(), // e.g., "owner_dashboard.view", "sentry.issues.list", "alert.dismiss"
    tab: v.optional(v.string()), // which dashboard tab
    details: v.optional(v.any()), // arbitrary structured payload
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    status: v.optional(v.string()), // "success" | "error" | "rate_limited"
  })
    .index("by_ts", ["ts"])
    .index("by_actor", ["actorUserId"])
    .index("by_action", ["action"]),

  // ── Dashboard Cache ──────────────────────────────────────────────────────
  // TTL-based cache for upstream API responses (Sentry, PostHog, Vercel, Paddle).
  // Keyed by cacheKey (e.g., "sentry:issues:24h"). TTLs:
  //   - Sentry issues/events: 30s
  //   - PostHog DAU/MAU: 60s
  //   - Vercel deploys: 60s
  //   - Paddle MRR: 5min
  //   - Stats/timeseries: 5min
  dashboardCache: defineTable({
    cacheKey: v.string(),
    data: v.any(),
    fetchedAt: v.number(),
    expiresAt: v.number(),
    source: v.string(), // "sentry" | "posthog" | "vercel" | "paddle" | "convex"
    latencyMs: v.optional(v.number()),
  })
    .index("by_cacheKey", ["cacheKey"])
    .index("by_expiresAt", ["expiresAt"]),

  // ── Paddle Subscriptions (AXIA's own SaaS billing) ───────────────────────
  // Synced from Paddle webhooks. One row per Paddle subscription.
  // The users.subscriptionTier field is the denormalized "current tier" —
  // updated by webhook handlers when subscription status changes.
  paddleSubscriptions: defineTable({
    paddleSubscriptionId: v.string(),
    paddleCustomerId: v.string(),
    userId: v.id("users"),
    userEmail: v.optional(v.string()),
    status: v.string(), // "active" | "canceled" | "paused" | "past_due" | "trialing"
    plan: v.string(), // "starter" | "pro" | "expert"
    quantity: v.optional(v.number()),
    unitPriceCents: v.optional(v.number()),
    currency: v.optional(v.string()), // "USD" | "EUR" | ...
    interval: v.optional(v.string()), // "month" | "year"
    startedAt: v.number(),
    canceledAt: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    mrrCents: v.optional(v.number()), // normalized to monthly, in cents
    rawPayload: v.optional(v.any()), // last webhook payload (for debugging)
    updatedAt: v.number(),
  })
    .index("by_paddleSubscriptionId", ["paddleSubscriptionId"])
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  // ── Paddle Webhook Events (idempotency) ──────────────────────────────────
  // Every Paddle webhook event is logged here. The event_id is checked for
  // idempotency — if we've already processed it, we skip.
  paddleEvents: defineTable({
    paddleEventId: v.string(),
    eventType: v.string(),
    receivedAt: v.number(),
    processed: v.boolean(),
    error: v.optional(v.string()),
    rawPayload: v.any(),
  })
    .index("by_paddleEventId", ["paddleEventId"])
    .index("by_receivedAt", ["receivedAt"]),
};
