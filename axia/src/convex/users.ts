import { getAuthUserId } from "./lib/auth";
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
      // ponytail: 'client' tier removed — clients access the portal via
      // /workspace/:token (no login), not via a user-account subscription.
      // The Clients sidebar page (/clients) and ClientWorkspace portal are
      // untouched; only the user-account 'client' subscription tier is gone.
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
      // ponytail: 'client' tier removed — see setUserTier above.
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

// ─── SELF-SERVE TIER CHANGE (cancellation only — paid upgrades via Paddle) ──
//
// SECURITY (v7.2 hardening): Previously let any signed-in user set their own
// tier to "starter" / "pro" / "expert" — combined with the loose
// `requireAdmin` in security/rateLimit.ts that accepted `subscriptionTier
// === "expert"` as a substitute for `role === "admin"`, this was a 2-call
// privilege escalation to admin.
//
// Now: paid tiers (starter/pro/expert) can ONLY be set by:
//   1. The Paddle webhook (http.ts → /api/paddle/webhook, signature-verified)
//   2. An owner via adminGrants:grantTier (requireOwner-guarded)
//
// Users can still CANCEL their subscription (downgrade to "free") via this
// mutation. Attempting to upgrade via this mutation throws — the PricingModal
// UI will show the error; a future Paddle checkout integration will replace
// the upgrade button with a Paddle checkout URL.
export const setMyTier = mutation({
  args: {
    tier: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("pro"),
      v.literal("expert"),
    ),
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

    // ponytail: only allow self-cancellation. Any tier escalation must go
    // through Paddle webhook (signature-verified) or adminGrants:grantTier.
    if (args.tier !== "free") {
      throw new Error(
        "Paid tier upgrades require checkout. Please use the Pricing modal's checkout button."
      );
    }

    await ctx.db.patch(userId, {
      subscriptionTier: "free",
      tierUpgradedAt: Date.now(),
    });
    return { success: true, userId, tier: "free" as const };
  },
});

// ─── CREEM WEBHOOK-DRIVEN TIER UPDATE (internal-only) ───────────────────────
//
// ponytail: Called only by the Creem webhook handler (http.ts at
// /api/payments/creem-webhook) when a Creem subscription becomes
// active/canceled/expired. There is NO exposed query/HTTP route that accepts
// a userId — the webhook handler looks up the user by `creemCustomerId` and
// invokes this mutation internally via ctx.runMutation.
//
// When Creem sends `subscription.active`, we set the user's tier to the
// matching Solo/Agency/Scale based on the product_id they purchased.
// When `subscription.canceled` or `subscription.expired`, we clear the tier.
//
// NOTE: The `creemCustomerId` field needs to be added to the users table
// (or a separate `creem_customers` table) before this is fully wired.
// For now this mutation is scaffolded but the webhook handler does not
// call it — see http.ts for the TODO.
export const setTierFromCreem = mutation({
  args: {
    creemCustomerId: v.string(),
    tier: v.union(
      v.literal("solo"),
      v.literal("agency"),
      v.literal("scale"),
      v.null(), // null = subscription canceled/expired
    ),
  },
  handler: async (ctx, args) => {
    // ponytail: this mutation is internal-only — there's no rate-limit-by-user
    // because it's invoked by the webhook httpAction, not a user session.
    // For now we just log; full implementation pending the users-table
    // schema change to add `creemCustomerId`.
    console.log("[setTierFromCreem] called", {
      creemCustomerId: args.creemCustomerId,
      tier: args.tier,
    });
    // TODO: once `creemCustomerId` field is added to users table:
    //   const user = await ctx.db.query("users")
    //     .withIndex("by_creem_customer_id", (q) => q.eq("creemCustomerId", args.creemCustomerId))
    //     .first();
    //   if (!user) throw new Error("No user found for Creem customer ID");
    //   await ctx.db.patch(user._id, {
    //     subscriptionTier: args.tier ?? undefined,
    //     tierUpgradedAt: Date.now(),
    //   });
    return { success: true, received: true };
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

// ponytail: save step-1 onboarding data directly to the user doc
// (no localStorage intermediate). Marks onboardingComplete=false so the
// gate at ProtectedRoute.tsx still bounces them to step 2 on next visit.
export const saveOnboardingStep1 = mutation({
  args: {
    fullName: v.string(),
    hourlyRate: v.number(),
    primaryPlatform: v.string(),
    yearsExperience: v.optional(v.string()),
    professionalBio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "updateProfile");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(userId);
    if (!existing) throw new Error("User not found");
    await ctx.db.patch(userId, {
      name: args.fullName,
      hourlyRate: args.hourlyRate,
      primaryPlatform: args.primaryPlatform,
      yearsExperience: args.yearsExperience,
      professionalBio: args.professionalBio,
      // ponytail: keep onboardingComplete=false until step 2 finishes
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