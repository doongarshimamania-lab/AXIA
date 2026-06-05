import { query } from "../_generated/server";
import { v } from "convex/values";
import { auth } from "./helpers";

/**
 * Channel queries — list, get, and search channels for a workspace.
 */

export const getWorkspaceChannels = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await auth(ctx);
    // Verify the user is a member of the workspace
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();
    if (!membership || membership.status !== "active") return [];

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    // For each channel, check if the user is a member (for private channels)
    const result = [];
    for (const channel of channels) {
      const channelMember = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", channel._id).eq("userId", userId)
        )
        .unique();

      // General channels are visible to all workspace members
      // Private channels only to members
      if (channel.type === "general" || channel.type === "project" || channelMember) {
        result.push({
          ...channel,
          isMember: !!channelMember,
          unreadCount: 0, // computed below
        });
      }
    }

    // Compute unread counts
    for (const channel of result) {
      const membership2 = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", channel._id).eq("userId", userId)
        )
        .unique();
      if (membership2?.lastReadAt) {
        const unreadMessages = await ctx.db
          .query("messages")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .filter((q) =>
            q.and(
              q.gt(q.field("_creationTime"), membership2.lastReadAt!),
              q.eq(q.field("deletedAt"), undefined),
              q.neq(q.field("authorId"), userId)
            )
          )
          .collect();
        channel.unreadCount = unreadMessages.length;
      } else if (membership2) {
        // Never read — count all messages not from user
        const allMessages = await ctx.db
          .query("messages")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("deletedAt"), undefined),
              q.neq(q.field("authorId"), userId)
            )
          )
          .collect();
        channel.unreadCount = allMessages.length;
      }
    }

    return result;
  },
});

export const getChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await auth(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return null;

    // Verify workspace membership
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();
    if (!membership || membership.status !== "active") return null;

    return channel;
  },
});

export const getChannelMembers = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await auth(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return [];

    const members = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    // Enrich with user data
    const result = [];
    for (const member of members) {
      const user = await ctx.db.get(member.userId);
      if (user) {
        result.push({
          ...member,
          name: user.name || "Unknown",
          image: user.image,
          email: user.email,
        });
      }
    }
    return result;
  },
});

export const searchChannels = query({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth(ctx);
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();
    if (!membership || membership.status !== "active") return [];

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isArchived"), false),
          q.includes(q.field("name"), args.query)
        )
      )
      .collect();

    return channels;
  },
});
