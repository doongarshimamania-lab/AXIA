import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { getCurrentUser } from "../users";
import { simpleUserIdHash } from "../security/utils";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
/**
 * Grant consent for a specific data type
 */
export const grantConsent = mutation({
  args: {
    consentType: v.union(v.literal("PII"), v.literal("health"), v.literal("financial")),
    version: v.string(),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "grantConsent");
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const user_id_hash = simpleUserIdHash(user._id);
    const now = Date.now();
    const expiresAt = now + (args.expiresInDays || 365) * 24 * 60 * 60 * 1000;

    // Revoke any existing consent for this type
    const existing = await ctx.db
      .query("consentManagement")
      .withIndex("by_user_and_type", (q) =>
        q.eq("userId", user._id)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("consent_type"), args.consentType),
          q.eq(q.field("status"), "granted")
        )
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "revoked",
        revoked_at: now,
      });
    }

    // Create new consent record
    const consentId = await ctx.db.insert("consentManagement", {
      userId: user._id,
      user_id_hash,
      consent_type: args.consentType,
      status: "granted",
      version: args.version,
      granted_at: now,
      expires_at: expiresAt,
    });

    return { consentId, expiresAt };
  },
});

/**
 * Revoke consent for a specific data type
 */
export const revokeConsent = mutation({
  args: {
    consentType: v.union(v.literal("PII"), v.literal("health"), v.literal("financial")),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "revokeConsent");
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const consent = await ctx.db
      .query("consentManagement")
      .withIndex("by_user_and_type", (q) =>
        q.eq("userId", user._id)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("consent_type"), args.consentType),
          q.eq(q.field("status"), "granted")
        )
      )
      .first();

    if (!consent) {
      throw new Error("No active consent found");
    }

    await ctx.db.patch(consent._id, {
      status: "revoked",
      revoked_at: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Verify if user has granted consent for a data type
 */
export const verifyConsent = query({
  args: {
    consentType: v.union(v.literal("PII"), v.literal("health"), v.literal("financial")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { granted: false, message: "Not authenticated" };
    }

    const consent = await ctx.db
      .query("consentManagement")
      .withIndex("by_user_and_type", (q) =>
        q.eq("userId", user._id)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("consent_type"), args.consentType),
          q.eq(q.field("status"), "granted")
        )
      )
      .first();

    if (!consent) {
      return { granted: false, message: "No consent granted" };
    }

    const now = Date.now();
    if (consent.expires_at < now) {
      return { granted: false, message: "Consent expired" };
    }

    return {
      granted: true,
      version: consent.version,
      granted_at: consent.granted_at,
      expires_at: consent.expires_at,
    };
  },
});

/**
 * Get all consent status for current user
 */
export const getConsentStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const consents = await ctx.db
      .query("consentManagement")
      .withIndex("by_user_and_type", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "granted"))
      .take(1000);

    const now = Date.now();
    return consents.map((c) => ({
      type: c.consent_type,
      status: c.status,
      version: c.version,
      granted_at: c.granted_at,
      expires_at: c.expires_at,
      is_expired: c.expires_at < now,
    }));
  },
});

/**
 * Auto-revoke expired consents (scheduled job)
 */
export const autoRevokeExpiredConsents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const expiredConsents = await ctx.db
      .query("consentManagement")
      .withIndex("by_expiration")
      .filter((q) =>
        q.and(
          q.lt(q.field("expires_at"), now),
          q.eq(q.field("status"), "granted")
        )
      )
      .take(1000);

    for (const consent of expiredConsents) {
      await ctx.db.patch(consent._id, {
        status: "revoked",
        revoked_at: now,
      });
    }

    return { revokedCount: expiredConsents.length };
  },
});
