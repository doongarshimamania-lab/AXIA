import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, getChannelMember } from "./helpers";

// Get messages for a channel
export const listMessages = query({
  args: {
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const member = await getChannelMember(ctx, args.channelId, userId);
    if (!member) {
      throw new Error("Not a member of this channel");
    }

    const limit = args.limit || 50;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q: any) => q.eq("channelId", args.channelId))
      .filter((q: any) => q.eq(q.field("isDeleted"), false))
      .order("desc")
      .take(limit);

    // Get reactions for each message
    const messagesWithReactions = [];
    for (const msg of messages) {
      const reactions = await ctx.db
        .query("reactions")
        .withIndex("by_message", (q: any) => q.eq("messageId", msg._id))
        .collect();

      const author = await ctx.db.get(msg.authorId);

      // Count thread replies
      const threadReplies = await ctx.db
        .query("messages")
        .withIndex("by_parent", (q: any) => q.eq("parentId", msg._id))
        .filter((q: any) => q.eq(q.field("isDeleted"), false))
        .collect();

      messagesWithReactions.push({
        ...msg,
        authorName: author?.name || "Unknown",
        reactions: reactions.reduce(
          (acc: any[], r: any) => {
            const existing = acc.find((a: any) => a.emoji === r.emoji);
            if (existing) {
              existing.count++;
              if (r.userId === userId) existing.hasReacted = true;
            } else {
              acc.push({ emoji: r.emoji, count: 1, hasReacted: r.userId === userId });
            }
            return acc;
          },
          [] as { emoji: string; count: number; hasReacted: boolean }[]
        ),
        threadReplyCount: threadReplies.length,
      });
    }

    return messagesWithReactions.reverse();
  },
});

// Get thread replies
export const getThreadReplies = query({
  args: {
    parentMessageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const parentMessage = await ctx.db.get(args.parentMessageId);
    if (!parentMessage) {
      throw new Error("Message not found");
    }

    const member = await getChannelMember(ctx, parentMessage.channelId, userId);
    if (!member) {
      throw new Error("Not a member of this channel");
    }

    const replies = await ctx.db
      .query("messages")
      .withIndex("by_parent", (q: any) => q.eq("parentId", args.parentMessageId))
      .filter((q: any) => q.eq(q.field("isDeleted"), false))
      .collect();

    const repliesWithAuthors = [];
    for (const reply of replies) {
      const author = await ctx.db.get(reply.authorId);
      repliesWithAuthors.push({
        ...reply,
        authorName: author?.name || "Unknown",
      });
    }

    return repliesWithAuthors;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    content: v.string(),
    parentId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const member = await getChannelMember(ctx, args.channelId, userId);
    if (!member) {
      throw new Error("Not a member of this channel");
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      workspaceId: member.workspaceId,
      authorId: userId,
      content: args.content,
      parentId: args.parentId,
      isEdited: false,
      isPinned: false,
      isDeleted: false,
    });

    // Update channel's lastMessageAt
    await ctx.db.patch(args.channelId, { lastMessageAt: Date.now() });

    // ─── @mention processing ────────────────────────────────────────────
    // Parse @username patterns from the message and create mention records
    // for each channel member whose name matches (excluding the sender).
    // This is what powers real-time mention notifications for OTHER users.
    const mentionRegex = /@([A-Za-z][A-Za-z0-9_\- ]{0,40}?)(?=[\s.,!?;:)]|$)/g;
    const mentionedNames = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = mentionRegex.exec(args.content)) !== null) {
      mentionedNames.add(m[1].trim());
    }

    if (mentionedNames.size > 0) {
      // Fetch all channel members so we can match by name
      const allMembers = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel", (q: any) => q.eq("channelId", args.channelId))
        .collect();

      // Look up each member's user record to match by name
      for (const cm of allMembers) {
        // Skip the sender — they should NOT get a mention notification
        if (cm.userId === userId) continue;

        const user = await ctx.db.get(cm.userId);
        if (!user) continue;

        const userName = (user as any).name || (user as any).email || "";
        if (!userName) continue;

        // Match case-insensitively against any of the mentioned names
        for (const mentioned of mentionedNames) {
          if (userName.toLowerCase() === mentioned.toLowerCase() ||
              userName.toLowerCase().includes(mentioned.toLowerCase())) {
            // Avoid duplicate mention records for the same user+message
            const existing = await ctx.db
              .query("mentions")
              .withIndex("by_message", (q: any) => q.eq("messageId", messageId))
              .filter((q: any) => q.eq(q.field("userId"), cm.userId))
              .first();
            if (!existing) {
              await ctx.db.insert("mentions", {
                messageId,
                userId: cm.userId,
                channelId: args.channelId,
                workspaceId: member.workspaceId,
                isRead: false,
              });
            }
            break; // one mention per user per message
          }
        }
      }
    }

    return messageId;
  },
});

// Get unread mention count for the current user (for notifications)
export const getUnreadMentions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUser(ctx);
    const mentions = await ctx.db
      .query("mentions")
      .withIndex("by_user_unread", (q: any) =>
        q.eq("userId", userId).eq("isRead", false)
      )
      .collect();

    // Enrich with author + channel info for display
    const enriched = [];
    for (const mention of mentions) {
      const message = await ctx.db.get(mention.messageId);
      if (!message || message.isDeleted) continue;
      const author = await ctx.db.get(message.authorId);
      const channel = await ctx.db.get(mention.channelId);
      enriched.push({
        _id: mention._id,
        messageId: mention.messageId,
        channelId: mention.channelId,
        channelName: (channel as any)?.name ?? "Unknown",
        content: message.content,
        authorName: (author as any)?.name ?? "Unknown",
        createdAt: message._creationTime,
      });
    }
    // Sort newest first
    enriched.sort((a, b) => b.createdAt - a.createdAt);
    return enriched;
  },
});

// Mark a mention as read
export const markMentionRead = mutation({
  args: { mentionId: v.id("mentions") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const mention = await ctx.db.get(args.mentionId);
    if (!mention || mention.userId !== userId) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.mentionId, { isRead: true });
  },
});

// Mark all mentions as read for the current user
export const markAllMentionsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUser(ctx);
    const unread = await ctx.db
      .query("mentions")
      .withIndex("by_user_unread", (q: any) =>
        q.eq("userId", userId).eq("isRead", false)
      )
      .collect();
    for (const m of unread) {
      await ctx.db.patch(m._id, { isRead: true });
    }
    return unread.length;
  },
});

// Edit a message
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message || message.authorId !== userId) {
      throw new Error("Can only edit your own messages");
    }
    await ctx.db.patch(args.messageId, {
      content: args.content,
      isEdited: true,
    });
  },
});

// Delete a message
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    // Allow author or channel admin to delete
    if (message.authorId !== userId) {
      const membership = await getChannelMember(ctx, message.channelId, userId);
      if (!membership || membership.role !== "admin") {
        throw new Error("Not authorized to delete this message");
      }
    }
    await ctx.db.patch(args.messageId, { isDeleted: true });
  },
});

// Toggle reaction
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_emoji", (q: any) =>
        q.eq("messageId", args.messageId).eq("emoji", args.emoji)
      )
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      const message = await ctx.db.get(args.messageId);
      if (!message) throw new Error("Message not found");

      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId,
        emoji: args.emoji,
        workspaceId: message.workspaceId,
      });
    }
  },
});

// Pin/unpin a message
export const togglePinMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const membership = await getChannelMember(ctx, message.channelId, userId);
    if (!membership || membership.role !== "admin") {
      throw new Error("Only admins can pin messages");
    }

    await ctx.db.patch(args.messageId, { isPinned: !message.isPinned });
  },
});

// Mark channel as read
export const markChannelRead = mutation({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const membership = await getChannelMember(ctx, args.channelId, userId);
    if (!membership) return;

    await ctx.db.patch(membership._id, { lastReadAt: Date.now() });
  },
});

// Search messages
export const searchMessages = query({
  args: {
    channelId: v.id("channels"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const member = await getChannelMember(ctx, args.channelId, userId);
    if (!member) {
      throw new Error("Not a member of this channel");
    }

    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q: any) => q.eq("channelId", args.channelId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("isDeleted"), false),
          q.includes(q.field("content"), args.query)
        )
      )
      .collect();

    return allMessages;
  },
});
