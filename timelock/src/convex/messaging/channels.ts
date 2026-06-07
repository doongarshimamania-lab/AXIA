import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, getChannelMember } from "./helpers";

// Get all channels for a workspace
export const listChannels = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", args.workspaceId))
      .filter((q: any) => q.eq(q.field("isArchived"), false))
      .collect();

    // Filter to channels the user is a member of
    const memberChannels = [];
    for (const channel of channels) {
      const member = await getChannelMember(ctx, channel._id, userId);
      if (member) {
        memberChannels.push({
          ...channel,
          membership: member,
        });
      }
    }

    return memberChannels;
  },
});

// Get channel members
export const getChannelMembers = query({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const member = await getChannelMember(ctx, args.channelId, userId);
    if (!member) {
      throw new Error("Not a member of this channel");
    }

    const members = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q: any) => q.eq("channelId", args.channelId))
      .collect();

    const membersWithProfiles = [];
    for (const m of members) {
      const user = await ctx.db.get(m.userId);
      if (user) {
        membersWithProfiles.push({
          ...m,
          name: user.name || "Unknown",
          email: user.email,
        });
      }
    }

    return membersWithProfiles;
  },
});

// Create a new channel
export const createChannel = mutation({
  args: {
    name: v.string(),
    workspaceId: v.id("workspaces"),
    type: v.union(v.literal("channel"), v.literal("dm")),
    isPrivate: v.boolean(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const channelId = await ctx.db.insert("channels", {
      name: args.name,
      workspaceId: args.workspaceId,
      type: args.type,
      isPrivate: args.isPrivate,
      description: args.description,
      createdBy: userId,
      isArchived: false,
    });

    // Add creator as admin member
    await ctx.db.insert("channelMembers", {
      channelId,
      userId,
      workspaceId: args.workspaceId,
      role: "admin",
      isMuted: false,
      joinedAt: Date.now(),
    });

    return channelId;
  },
});

// Join a channel
export const joinChannel = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const existing = await getChannelMember(ctx, args.channelId, userId);
    if (existing) {
      throw new Error("Already a member");
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    await ctx.db.insert("channelMembers", {
      channelId: args.channelId,
      userId,
      workspaceId: channel.workspaceId,
      role: "member",
      isMuted: false,
      joinedAt: Date.now(),
    });
  },
});

// Leave a channel
export const leaveChannel = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const membership = await getChannelMember(ctx, args.channelId, userId);
    if (!membership) {
      throw new Error("Not a member");
    }
    await ctx.db.delete(membership._id);
  },
});

// Archive a channel
export const archiveChannel = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const membership = await getChannelMember(ctx, args.channelId, userId);
    if (!membership || membership.role !== "admin") {
      throw new Error("Only admins can archive channels");
    }
    await ctx.db.patch(args.channelId, { isArchived: true });
  },
});

// Mute/unmute a channel
export const toggleMuteChannel = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const membership = await getChannelMember(ctx, args.channelId, userId);
    if (!membership) {
      throw new Error("Not a member");
    }
    await ctx.db.patch(membership._id, { isMuted: !membership.isMuted });
  },
});

// Search channels
export const searchChannels = query({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", args.workspaceId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("isArchived"), false),
          q.includes(q.field("name"), args.query)
        )
      )
      .collect();

    const memberChannels = [];
    for (const channel of channels) {
      const member = await getChannelMember(ctx, channel._id, userId);
      if (member) {
        memberChannels.push(channel);
      }
    }
    return memberChannels;
  },
});
