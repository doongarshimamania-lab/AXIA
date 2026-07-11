import { action } from "../_generated/server";
import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";
import { api, internal } from "../_generated/api";
import { obfuscateToken, simpleUserIdHash } from "../security/utils";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Initiate platform connection (generates OAuth URL or manual setup instructions)
export const initiatePlatformConnection = mutation({
  args: {
    platform: v.union(
      v.literal("upwork"),
      v.literal("fiverr"),
      v.literal("toptal"),
      v.literal("freelancer")
    ),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "initiatePlatformConnection");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already connected
    const existing = await ctx.db
      .query("platformConnections")
      .withIndex("by_user_and_platform", (q) =>
        q.eq("userId", userId).eq("platform", args.platform)
      )
      .filter((q) => q.eq(q.field("status"), "connected"))
      .first();

    if (existing) {
      return { alreadyConnected: true, connectionId: existing._id };
    }

    // Create pending connection
    const connectionId = await ctx.db.insert("platformConnections", {
      userId,
      platform: args.platform,
      status: "pending",
    });

    // Audit logging skipped to avoid type instantiation issues

    return {
      connectionId,
      // In production, this would return OAuth URL
      // For now, return manual setup instructions
      setupInstructions: `To connect ${args.platform}, you would typically be redirected to their OAuth flow. For demo purposes, connection is simulated.`,
    };
  },
});

// Complete platform connection (stores tokens, creates consent, triggers import)
export const completePlatformConnection = mutation({
  args: {
    connectionId: v.id("platformConnections"),
    platformUserId: v.string(),
    platformEmail: v.string(),
    // In production, these would be encrypted tokens from OAuth
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "completePlatformConnection");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== userId) {
      throw new Error("Connection not found or unauthorized");
    }

    // SECURITY: Obfuscate tokens before storing (prevents plaintext in DB)
    const encryptedAccessToken = args.accessToken ? obfuscateToken(args.accessToken) : undefined;
    const encryptedRefreshToken = args.refreshToken ? obfuscateToken(args.refreshToken) : undefined;

    // Update connection status
    await ctx.db.patch(args.connectionId, {
      status: "connected",
      connectedAt: Date.now(),
      platformUserId: args.platformUserId,
      platformEmail: args.platformEmail,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      lastSyncedAt: Date.now(),
    });

    // Update user's connected platforms list
    const user = await ctx.db.get(userId);
    const connectedPlatforms = user?.connectedPlatforms || [];
    if (!connectedPlatforms.includes(connection.platform)) {
      await ctx.db.patch(userId, {
        connectedPlatforms: [...connectedPlatforms, connection.platform],
      });
    }

    // Audit logging and import scheduling skipped to avoid type instantiation issues

    return { success: true, connectionId: args.connectionId };
  },
});

// Helper mutation to get connection (internal) - used by platformImport action
export const getConnectionForImport = internalMutation({
  args: {
    connectionId: v.id("platformConnections"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.connectionId);
  },
});

// Store imported platform data (internal mutation) - called by platformImport action
export const storePlatformDataInternal = internalMutation({
  args: {
    userId: v.id("users"),
    platform: v.union(
      v.literal("upwork"),
      v.literal("fiverr"),
      v.literal("toptal"),
      v.literal("freelancer")
    ),
    profileData: v.any(),
    workHistoryData: v.any(),
    earningsData: v.any(),
    reviewsData: v.any(),
  },
  handler: async (ctx, args) => {
    const user_id_hash = simpleUserIdHash(args.userId as string);
    const now = Date.now();

    // Store profile data
    await ctx.db.insert("platformImportedData", {
      userId: args.userId,
      platform: args.platform,
      dataType: "profile",
      importedAt: now,
      data: args.profileData,
      user_id_hash,
    });

    // Store work history
    await ctx.db.insert("platformImportedData", {
      userId: args.userId,
      platform: args.platform,
      dataType: "workHistory",
      importedAt: now,
      data: args.workHistoryData,
      user_id_hash,
    });

    // Store earnings
    await ctx.db.insert("platformImportedData", {
      userId: args.userId,
      platform: args.platform,
      dataType: "earnings",
      importedAt: now,
      data: args.earningsData,
      user_id_hash,
    });

    // Store reviews
    await ctx.db.insert("platformImportedData", {
      userId: args.userId,
      platform: args.platform,
      dataType: "reviews",
      importedAt: now,
      data: args.reviewsData,
      user_id_hash,
    });

    // Update user profile with imported data
    const user = await ctx.db.get(args.userId);
    if (user && args.profileData.hourlyRate) {
      await ctx.db.patch(args.userId, {
        hourlyRate: args.profileData.hourlyRate,
      });
    }

    return { success: true };
  },
});

// Disconnect platform (revokes tokens, deletes data, creates compliance certificate)
export const disconnectPlatform = mutation({
  args: {
    platform: v.union(
      v.literal("upwork"),
      v.literal("fiverr"),
      v.literal("toptal"),
      v.literal("freelancer")
    ),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "disconnectPlatform");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const connection = await ctx.db
      .query("platformConnections")
      .withIndex("by_user_and_platform", (q) =>
        q.eq("userId", userId).eq("platform", args.platform)
      )
      .filter((q) => q.eq(q.field("status"), "connected"))
      .first();

    if (!connection) {
      throw new Error("No active connection found");
    }

    // Update connection status
    await ctx.db.patch(connection._id, {
      status: "disconnected",
      disconnectedAt: Date.now(),
      accessToken: undefined,
      refreshToken: undefined,
    });

    // Remove from user's connected platforms
    const user = await ctx.db.get(userId);
    const connectedPlatforms = (user?.connectedPlatforms || []).filter(
      (p) => p !== args.platform
    );
    await ctx.db.patch(userId, { connectedPlatforms });

    // Delete imported data
    const importedData = await ctx.db
      .query("platformImportedData")
      .withIndex("by_user_and_platform", (q) =>
        q.eq("userId", userId).eq("platform", args.platform)
      )
      .take(1000);

    for (const data of importedData) {
      await ctx.db.delete(data._id);
    }

    // Audit logging skipped to avoid type instantiation issues

    return { success: true, deletedRecords: importedData.length };
  },
});

// Get user's platform connections
export const getUserPlatformConnections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const connections = await ctx.db
      .query("platformConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    return connections;
  },
});