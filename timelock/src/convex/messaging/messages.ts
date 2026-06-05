import { query } from "../_generated/server";
import { v } from "convex/values";
import { auth } from "./helpers";

/**
 * Message queries — list messages in a channel, get thread replies, search.
 */

export const getChannelMessages = query({
  args: {
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return [];

    // Verify access
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();
    if (!membership || membership.status !== "active") return [];

    const limit = args.limit ?? 100;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) =>
        q.and(
          q.eq(q.field("parentMessageId"), undefined),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .order("desc")
      .take(limit)
      .collect();

    // Reverse to chronological order + enrich with author + reactions
    const enriched = [];
    for (const msg of messages.reverse()) {
      const author = await ctx.db.get(msg.authorId);
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .collect();

      // Group reactions by emoji
      const reactionGroups: Record<string, { emoji: string; count: number; hasUser: boolean }> = {};
      for (const r of reactions) {
        if (!reactionGroups[r.emoji]) {
          reactionGroups[r.emoji] = { emoji: r.emoji, count: 0, hasUser: false };
        }
        reactionGroups[r.emoji].count++;
        if (r.userId === userId) reactionGroups[r.emoji].hasUser = true;
      }

      // Get thread reply count
      const threadReplies = await ctx.db
        .query("messages")
        .withIndex("by_channel_and_parent", (q) =>
          q.eq("channelId", args.channelId).eq("parentMessageId", msg._id)
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

      enriched.push({
        ...msg,
        authorName: author?.name || "Unknown",
        authorImage: author?.image,
        authorEmail: author?.email,
        reactions: Object.values(reactionGroups),
        threadReplyCount: threadReplies.length,
        lastReplyAt: threadReplies.length > 0
          ? threadReplies[threadReplies.length - 1]._creationTime
          : undefined,
      });
    }

    return enriched;
  },
});

export const getThreadReplies = query({
  args: {
    parentMessageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await auth(ctx);
    const parentMsg = await ctx.db.get(args.parentMessageId);
    if (!parentMsg) return [];

    // Verify access
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", parentMsg.workspaceId).eq("userId", userId)
      )
      .unique();
    if (!membership || membership.status !== "active") return [];

    const replies = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_parent", (q) =>
        q.eq("channelId", parentMsg.channelId).eq("parentMessageId", args.parentMessageId)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const enriched = [];
    for (const reply of replies) {
      const author = await ctx.db.get(reply.authorId);
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_message", (q) => q.eq("messageId", reply._id))
        .collect();

      const reactionGroups: Record<string, { emoji: string; count: number; hasUser: boolean }> = {};
      for (const r of reactions) {
        if (!reactionGroups[r.emoji]) {
          reactionGroups[r.emoji] = { emoji: r.emoji, count: 0, hasUser: false };
        }
        reactionGroups[r.emoji].count++;
        if (r.userId === userId) reactionGroups[r.emoji].hasUser = true;
      }

      enriched.push({
        ...reply,
        authorName: author?.name || "Unknown",
        authorImage: author?.image,
        authorEmail: author?.email,
        reactions: Object.values(reactionGroups),
      });
    }
    return enriched;
  },
});

export const getPinnedMessages = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await auth(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) return [];

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();
    if (!membership || membership.status !== "active") return [];

    const pinned = await ctx.db
      .query("messages")
      .withIndex("by_pinned", (q) =>
        q.eq("channelId", args.channelId).eq("isPinned", true)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const enriched = [];
    for (const msg of pinned) {
      const author = await ctx.db.get(msg.authorId);
      enriched.push({
        ...msg,
        authorName: author?.name || "Unknown",
        authorImage: author?.image,
      });
    }
    return enriched;
  },
});

export const searchMessages = query({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
    limit: v.optional(v.number()),
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

    // Simple text search — Convex doesn't have full-text search
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.includes(q.field("body"), args.query)
        )
      )
      .take(args.limit ?? 20)
      .collect();

    const enriched = [];
    for (const msg of messages) {
      const author = await ctx.db.get(msg.authorId);
      const channel = await ctx.db.get(msg.channelId);
      enriched.push({
        ...msg,
        authorName: author?.name || "Unknown",
        authorImage: author?.image,
        channelName: channel?.name || "unknown",
      });
    }
    return enriched;
  },
});
