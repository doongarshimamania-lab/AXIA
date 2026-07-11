import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Get protection network connections with enhanced metrics
export const getProtectionNetwork = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.subscriptionTier !== "pro") {
      return [];
    }

    // Find other premium users
    const connections = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subscriptionTier"), "pro"))
      .take(1000);

    // Calculate connection strength based on multiple factors
    const networkConnections = connections
      .filter((conn) => conn._id !== userId)
      .map((conn) => {
        let strength = 0;

        // Hourly rate similarity (within 20%)
        const userRate = user.hourlyRate ?? 0;
        const connRate = conn.hourlyRate ?? 0;
        if (userRate > 0 && connRate > 0) {
          const rateDiff =
            Math.abs(userRate - connRate) /
            ((userRate + connRate) / 2);
          if (rateDiff < 0.2) strength += 25;
        }

        // Platform overlap
        const userPlatforms = Array.isArray(user.connectedPlatforms) ? user.connectedPlatforms : [];
        const connPlatforms = Array.isArray(conn.connectedPlatforms) ? conn.connectedPlatforms : [];
        const overlap = userPlatforms.filter((p) => connPlatforms.includes(p)).length;
        strength += overlap * 15;

        // Protection score similarity
        const userHours = user.protectedHours ?? 0;
        const connHours = conn.protectedHours ?? 0;
        if (userHours > 0 && connHours > 0) {
          const hoursDiff = Math.abs(userHours - connHours);
          if (hoursDiff < 50) strength += 20;
        }

        // Bio similarity (if both have bios)
        if (user.professionalBio && conn.professionalBio) {
          strength += 10;
        }

        return {
          _id: conn._id,
          name: conn.name || "Anonymous",
          image: conn.image || undefined,
          hourlyRate: conn.hourlyRate ?? 0,
          professionalBio: conn.professionalBio || undefined,
          connectedPlatforms: Array.isArray(conn.connectedPlatforms) ? conn.connectedPlatforms : [],
          protectedHours: conn.protectedHours ?? 0,
          connectionStrength: Math.min(strength, 100),
        };
      })
      .sort((a, b) => b.connectionStrength - a.connectionStrength)
      .slice(0, 50);

    return networkConnections;
  },
});

// Send connection request
export const sendConnectionRequest = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "sendConnectionRequest");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    const targetUser = await ctx.db.get(args.targetUserId);

    if (!user || user.subscriptionTier !== "pro") {
      throw new Error("Protection Network is only available to Pro users");
    }

    if (!targetUser || targetUser.subscriptionTier !== "pro") {
      throw new Error("Cannot connect to non-premium user");
    }

    // Check if connection already exists
    const existing = await ctx.db
      .query("networkConnections")
      .withIndex("by_user_and_target", (q) =>
        q.eq("userId", userId).eq("targetUserId", args.targetUserId)
      )
      .first();

    if (existing) {
      throw new Error("Connection request already sent");
    }

    // Create connection request
    await ctx.db.insert("networkConnections", {
      userId,
      targetUserId: args.targetUserId,
      status: "pending",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Accept connection request
export const acceptConnectionRequest = mutation({
  args: {
    connectionId: v.id("networkConnections"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "acceptConnectionRequest");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) throw new Error("Connection not found");

    if (connection.targetUserId !== userId) {
      throw new Error("Not authorized to accept this connection");
    }

    await ctx.db.patch(args.connectionId, {
      status: "accepted",
    });

    return { success: true };
  },
});

// Get referral opportunities
export const getReferralOpportunities = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.subscriptionTier !== "pro") {
      throw new Error("Protection Network is only available to Pro users");
    }

    // Find recent dispute reports from other premium users
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentReports = await ctx.db
      .query("disputeReports")
      .filter((q) => q.gt(q.field("generatedAt"), sevenDaysAgo))
      .take(1000);

    // Filter for reports from other premium users
    const opportunities = [];
    for (const report of recentReports.slice(0, 10)) {
      if (report.userId !== userId) {
        const reportUser = await ctx.db.get(report.userId);
        if (reportUser && reportUser.subscriptionTier === "pro") {
          opportunities.push({
            reportId: report._id,
            userId: reportUser._id,
            userName: reportUser.name || "Anonymous",
            caseId: report.caseId,
            lostIncome: report.lostIncome,
            generatedAt: report.generatedAt,
          });
        }
      }
    }

    return opportunities.slice(0, 5);
  },
});

// Get my connection requests
export const getMyConnectionRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const requests = await ctx.db
      .query("networkConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const enrichedRequests = [];
    for (const req of requests) {
      const targetUser = await ctx.db.get(req.targetUserId);
      if (targetUser) {
        enrichedRequests.push({
          _id: req._id,
          status: req.status,
          createdAt: req.createdAt,
          targetUser: {
            _id: targetUser._id,
            name: targetUser.name || "Anonymous",
            image: targetUser.image,
            hourlyRate: targetUser.hourlyRate,
          },
        });
      }
    }

    return enrichedRequests;
  },
});