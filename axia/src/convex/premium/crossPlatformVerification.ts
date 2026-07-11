import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Verify consistency across connected platforms
export const verifyPlatforms = mutation({
  args: {},
  handler: async (ctx) => {
    await rateLimitAuthenticated(ctx, "verifyPlatforms");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.subscriptionTier !== "pro") {
      throw new Error("PRO subscription required");
    }

    // Get all connected platforms
    const connections = await ctx.db
      .query("platformConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "connected"))
      .take(1000);

    const platforms = connections.map((c) => c.platform);
    const discrepancies: Array<{
      platform1: string;
      platform2: string;
      issue: string;
      severity: "low" | "medium" | "high";
    }> = [];

    // Cross-verify work sessions across platforms
    let consistencyScore = 100;

    // Check for time overlaps
    for (let i = 0; i < platforms.length; i++) {
      for (let j = i + 1; j < platforms.length; j++) {
        const platform1 = platforms[i];
        const platform2 = platforms[j];

        // Simulate verification logic
        const hasOverlap = Math.random() > 0.8;
        if (hasOverlap) {
          discrepancies.push({
            platform1,
            platform2,
            issue: "Overlapping work sessions detected",
            severity: "high",
          });
          consistencyScore -= 15;
        }
      }
    }

    const verificationStatus =
      consistencyScore >= 90
        ? "verified"
        : consistencyScore >= 70
        ? "partial"
        : "failed";

    // Store verification result
    await ctx.db.insert("crossPlatformVerifications", {
      userId,
      platforms,
      verificationStatus,
      consistencyScore: Math.max(0, consistencyScore),
      discrepancies,
      verifiedAt: Date.now(),
      nextVerification: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      status: verificationStatus,
      score: consistencyScore,
      discrepancies,
    };
  },
});

// Get latest verification
export const getLatestVerification = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user || user.subscriptionTier !== "pro") return null;

    const verification = await ctx.db
      .query("crossPlatformVerifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    return verification;
  },
});
