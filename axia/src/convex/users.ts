import { getAuthUserId } from "@convex-dev/auth/server";
import { query, QueryCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

import { rateLimitAuthenticated, RATE_LIMITS } from "./security/rateLimit";
/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user === null) {
      return null;
    }

    return user;
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

// Add: Fetch the current user's profile document
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user; // can be null if not signed in
  },
});

// Add: Update current user's profile (partial updates)
// NOTE: `subscriptionTier` was previously accepted here, allowing any user
// to self-upgrade to any tier ("expert", "pro", etc.) and bypass billing.
// That field is now managed exclusively by the admin-only `setUserTier`
// mutation below. This closes the billing-bypass vulnerability flagged in
// the Wave 2 security audit.
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    // subscriptionTier intentionally omitted — see comment above.
    // Add: extended profile fields
    professionalBio: v.optional(v.string()),
    protectedHours: v.optional(v.number()),
    protectedValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "updateProfile");
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    const existing = await ctx.db.get(userId);
    if (!existing) {
      throw new Error("User not found");
    }
    await ctx.db.patch(userId, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.image !== undefined ? { image: args.image } : {}),
      ...(args.hourlyRate !== undefined ? { hourlyRate: args.hourlyRate } : {}),
      ...(args.professionalBio !== undefined ? { professionalBio: args.professionalBio } : {}),
      ...(args.protectedHours !== undefined ? { protectedHours: args.protectedHours } : {}),
      ...(args.protectedValue !== undefined ? { protectedValue: args.protectedValue } : {}),
    });
    return true;
  },
});

// ─── ADMIN: GRANT TIERS ─────────────────────────────────────────────────────
//
// Use these mutations to grant subscription tiers to yourself or other users.
// Admin auth required — callers must have `users.role === "admin"`.
//
// Example (grant yourself "expert" tier):
//   npx convex run users:setUserTier '{ "targetUserId": "<your user id>", "tier": "expert" }'
//
// Example (grant by email — convenient when you only know the email):
//   npx convex run users:grantTierByEmail '{ "email": "priya@example.com", "tier": "pro" }'

async function requireAdmin(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
  if (user.role !== "admin") throw new Error("Admin access required");
  return user;
}

/**
 * Admin-only: set a user's subscription tier by user ID.
 */
export const setUserTier = mutation({
  args: {
    targetUserId: v.id("users"),
    tier: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("pro"),
      v.literal("expert"),
      v.literal("client"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new Error("Target user not found");
    await ctx.db.patch(args.targetUserId, {
      subscriptionTier: args.tier,
      tierUpgradedAt: Date.now(),
    });
    return { success: true, userId: args.targetUserId, tier: args.tier };
  },
});

/**
 * Admin-only: set a user's subscription tier by email.
 * Convenience wrapper — looks up the user by email, then calls setUserTier logic.
 */
export const grantTierByEmail = mutation({
  args: {
    email: v.string(),
    tier: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("pro"),
      v.literal("expert"),
      v.literal("client"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
    if (!target) throw new Error(`No user found with email ${args.email}`);
    await ctx.db.patch(target._id, {
      subscriptionTier: args.tier,
      tierUpgradedAt: Date.now(),
    });
    return { success: true, userId: target._id, email: args.email, tier: args.tier };
  },
});

/**
 * Admin-only: promote a user to admin role (or demote).
 * Useful for granting the owner/admin role to a co-founder or trusted dev.
 */
export const setUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new Error("Target user not found");
    await ctx.db.patch(args.targetUserId, { role: args.role });
    return { success: true, userId: args.targetUserId, role: args.role };
  },
});

// Add: Complete onboarding mutation
export const completeOnboarding = mutation({
  args: {
    fullName: v.string(),
    hourlyRate: v.number(),
    primaryPlatform: v.string(),
    yearsExperience: v.optional(v.string()),
    professionalBio: v.optional(v.string()),
    acquisitionSource: v.string(),
    acquisitionSourceDetail: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "completeOnboarding");
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db.get(userId);
    if (!existing) {
      throw new Error("User not found");
    }

    await ctx.db.patch(userId, {
      name: args.fullName,
      hourlyRate: args.hourlyRate,
      primaryPlatform: args.primaryPlatform,
      yearsExperience: args.yearsExperience,
      professionalBio: args.professionalBio,
      acquisitionSource: args.acquisitionSource,
      acquisitionSourceDetail: args.acquisitionSourceDetail,
      onboardingComplete: true,
      onboardingCompletedAt: Date.now()
    });

    return { success: true };
  },
});

// Add: Get protection metrics for sidebar
export const getProtectionMetrics = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    // Get active session
    const activeSession = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();

    // Calculate protection score based on recent activity
    const now = Date.now();
    const last30Days = now - (30 * 24 * 60 * 60 * 1000);
    
    const recentBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("startTime"), last30Days))
      .take(1000);

    const totalBlocks = recentBlocks.length;
    const compliantBlocks = recentBlocks.filter(b => b.complianceStatus === "compliant").length;
    const rejectedBlocks = recentBlocks.filter(b => b.complianceStatus === "rejected").length;

    // FIX (2026-06-22): Return REAL data, not fake estimates.
    // Previously this returned fake "95% protection score / 171 protected hours"
    // for every new user — that was hardcoded data masquerading as analytics.
    // Now: when there's no real data, return zeros so the UI can show an
    // honest empty state instead of misleading fake metrics.
    const hourlyRate = user.hourlyRate || 0;
    let protectedHours: number;
    let protectedValue: number;
    let denialRate: number;
    let protectionScore: number;

    if (totalBlocks > 0) {
      // Use actual data
      protectedHours = Math.round((compliantBlocks * 5 / 60) * 10) / 10;
      protectedValue = Math.round(protectedHours * hourlyRate * 100) / 100;
      denialRate = Math.round((rejectedBlocks / totalBlocks) * 100);
      protectionScore = Math.round((compliantBlocks / totalBlocks) * 100);
    } else {
      // No real data — return zeros (NOT fake estimates)
      protectedHours = 0;
      protectedValue = 0;
      denialRate = 0;
      protectionScore = 0;
    }

    // Count evidence events
    const evidenceSessions = await ctx.db
      .query("evidenceSessions")
      .withIndex("by_user_and_status", (q) => q.eq("userId", user._id))
      .take(1000);

    let totalEvidenceEvents = 0;
    for (const session of evidenceSessions) {
      const events = await ctx.db
        .query("evidenceEvents")
        .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", session._id))
        .take(1000);
      totalEvidenceEvents += events.length;
    }

    // Count connected platforms
    const connectedPlatforms = user.connectedPlatforms?.length || 0;

    return {
      protectionScore,
      activeSession: activeSession ? {
        clientName: activeSession.clientName,
        startTime: activeSession.startTime,
        duration: Math.floor((now - activeSession.startTime) / 60000), // minutes
      } : null,
      protectedHours,
      protectedValue,
      denialRate,
      evidenceEvents: totalEvidenceEvents,
      connectedPlatforms,
      complianceStatus: activeSession?.complianceStatus || "active",
    };
  },
});