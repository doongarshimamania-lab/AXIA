import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./helpers";

// Get or create a DM channel between two users
export const getOrCreateDMChannel = mutation({
  args: {
    otherUserId: v.id("users"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    // Check if a DM channel already exists between these users
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_workspace_type", (q: any) =>
        q.eq("workspaceId", args.workspaceId).eq("type", "dm")
      )
      .collect();

    for (const channel of channels) {
      const members = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel", (q: any) => q.eq("channelId", channel._id))
        .collect();

      const memberIds = members.map((m: any) => m.userId);
      if (memberIds.includes(userId) && memberIds.includes(args.otherUserId)) {
        return channel._id;
      }
    }

    // Create new DM channel
    const otherUser = await ctx.db.get(args.otherUserId);
    const dmName = otherUser?.name || "Direct Message";

    const channelId = await ctx.db.insert("channels", {
      name: dmName,
      workspaceId: args.workspaceId,
      type: "dm",
      isPrivate: true,
      createdBy: userId,
      isArchived: false,
    });

    // Add both users as members
    await ctx.db.insert("channelMembers", {
      channelId,
      userId,
      workspaceId: args.workspaceId,
      role: "admin",
      isMuted: false,
      joinedAt: Date.now(),
    });

    await ctx.db.insert("channelMembers", {
      channelId,
      userId: args.otherUserId,
      workspaceId: args.workspaceId,
      role: "member",
      isMuted: false,
      joinedAt: Date.now(),
    });

    return channelId;
  },
});

// Get all DM channels for current user
export const listDMChannels = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const dmChannels = [];
    for (const membership of memberships) {
      const channel = await ctx.db.get(membership.channelId);
      if (!channel || channel.type !== "dm" || channel.isArchived) continue;
      if (channel.workspaceId !== args.workspaceId) continue;

      const otherMembers = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel", (q: any) => q.eq("channelId", channel._id))
        .filter((q: any) => q.neq(q.field("userId"), userId))
        .collect();

      const otherUser = otherMembers[0]
        ? await ctx.db.get(otherMembers[0].userId)
        : null;

      dmChannels.push({
        ...channel,
        otherUserName: otherUser?.name || "Unknown",
        unreadCount: 0, // Would be calculated based on lastReadAt
      });
    }

    return dmChannels;
  },
});
