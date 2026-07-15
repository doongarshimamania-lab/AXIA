import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Create or update public freelancer profile (requires auth + can only edit own profile)
export const upsertFreelancerProfile = mutation({
  args: {
    userId: v.id("users"),
    displayName: v.string(),
    professionalTitle: v.string(),
    bio: v.string(),
    hourlyRate: v.number(),
    skills: v.array(v.string()),
    availability: v.union(v.literal("available"), v.literal("busy"), v.literal("unavailable")),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "upsertFreelancerProfile");
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");

    // SECURITY: Users can only update their own profile
    if (args.userId !== authUserId) throw new Error("Not authorized to edit another user's profile");

    const existing = await ctx.db
      .query("freelancerPublicProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Calculate verification score from user data
    const user = await ctx.db.get(args.userId);
    const verificationScore = user?.protectedHours ? Math.min(100, Math.floor(user.protectedHours / 10)) : 0;

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        professionalTitle: args.professionalTitle,
        bio: args.bio,
        hourlyRate: args.hourlyRate,
        skills: args.skills,
        availability: args.availability,
        lastActive: Date.now(),
      });
      return { profileId: existing._id, success: true };
    } else {
      const profileId = await ctx.db.insert("freelancerPublicProfiles", {
        userId: args.userId,
        displayName: args.displayName,
        professionalTitle: args.professionalTitle,
        bio: args.bio,
        hourlyRate: args.hourlyRate,
        axiaVerified: true,
        verificationScore,
        totalVerifiedHours: user?.protectedHours || 0,
        platformsConnected: user?.connectedPlatforms || [],
        skills: args.skills,
        availability: args.availability,
        lastActive: Date.now(),
        createdAt: Date.now(),
      });
      return { profileId, success: true };
    }
  },
});

// Get all verified freelancers for directory (public — no auth required for browsing)
export const getVerifiedFreelancers = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("freelancerPublicProfiles")
      .withIndex("by_verified", (q) => q.eq("axiaVerified", true))
      .take(1000);

    return profiles;
  },
});

// Get freelancer profile by user ID (public — no auth required for viewing)
export const getFreelancerProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("freelancerPublicProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    return profile;
  },
});
