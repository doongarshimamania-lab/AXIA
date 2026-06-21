// @ts-nocheck
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./helpers";

/**
 * Message mutations — send, edit, delete, react, pin, mark read.
 */

export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    body: v.string(),
    parentMessageId: v.optional(v.id("messages")),
    messageType: v.optional(v.union(
      v.literal("text"),
      v.literal("system"),
      v.literal("file"),
      v.literal("link")
    )),
    attachments: v.optional(v.array(v.object({
      storageId: v.optional(v.id("_storage")),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      url: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify channel membership
    const member = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();
    if (!member) throw new Error("Not a member of this channel");

    // If replying to thread, verify parent message exists in this channel
    if (args.parentMessageId) {
      const parentMsg = await ctx.db.get(args.parentMessageId);
      if (!parentMsg || parentMsg.channelId !== args.channelId) {
        throw new Error("Parent message not found in this channel");
      }
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      workspaceId: channel.workspaceId,
      authorId: userId,
      parentMessageId: args.parentMessageId,
      body: args.body,
      messageType: args.messageType ?? "text",
      attachments: args.attachments,
      isEdited: false,
      isPinned: false,
    });

    // Parse @mentions and create mention records
    const mentionRegex = /@(\w[\w.-]*)/g;
    let match;
    while ((match = mentionRegex.exec(args.body)) !== null) {
      const mentionedName = match[1];
      // Try to find user by name (simplified)
      const users = await ctx.db.query("users").collect();
      const mentionedUser = users.find(
        (u) => u.name?.toLowerCase().replace(/\s+/g, ".") === mentionedName.toLowerCase()
      );
      if (mentionedUser && mentionedUser._id !== userId) {
        await ctx.db.insert("mentions", {
          messageId,
          userId: mentionedUser._id,
          channelId: args.channelId,
          workspaceId: channel.workspaceId,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return messageId;
  },
});

export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.authorId !== userId) throw new Error("Can only edit your own messages");
    if (message.deletedAt) throw new Error("Cannot edit deleted messages");

    await ctx.db.patch(args.messageId, {
      body: args.body,
      isEdited: true,
      editedAt: Date.now(),
    });
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Only author or workspace manager+ can delete
    const isAuthor = message.authorId === userId;
    const wsMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", message.workspaceId).eq("userId", userId)
      )
      .unique();
    const isManager = wsMember?.role === "owner" || wsMember?.role === "manager";

    if (!isAuthor && !isManager) {
      throw new Error("No permission to delete this message");
    }

    // Soft delete
    await ctx.db.patch(args.messageId, { deletedAt: Date.now() });
  },
});

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_and_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false; // removed
    } else {
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId,
        emoji: args.emoji,
        createdAt: Date.now(),
      });
      return true; // added
    }
  },
});

export const togglePinMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Only channel admin or workspace manager+ can pin
    const channelMember = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", message.channelId).eq("userId", userId)
      )
      .unique();
    const wsMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", message.workspaceId).eq("userId", userId)
      )
      .unique();

    const canPin = channelMember?.role === "admin" ||
      wsMember?.role === "owner" || wsMember?.role === "manager";
    if (!canPin) throw new Error("No permission to pin messages");

    if (message.isPinned) {
      await ctx.db.patch(args.messageId, {
        isPinned: false,
        pinnedBy: undefined,
        pinnedAt: undefined,
      });
    } else {
      await ctx.db.patch(args.messageId, {
        isPinned: true,
        pinnedBy: userId,
        pinnedAt: Date.now(),
      });
    }
    return !message.isPinned;
  },
});

export const markChannelRead = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const member = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();
    if (!member) return;

    await ctx.db.patch(member._id, { lastReadAt: Date.now() });
  },
});

export const getOrCreateDMChannel = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    // Verify both users are workspace members
    const myMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();
    if (!myMembership || myMembership.status !== "active") {
      throw new Error("Not a workspace member");
    }

    const otherMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.otherUserId)
      )
      .unique();
    if (!otherMembership || otherMembership.status !== "active") {
      throw new Error("Other user is not a workspace member");
    }

    // Look for existing DM channel between these two users
    const myChannels = await ctx.db
      .query("channelMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const cm of myChannels) {
      const channel = await ctx.db.get(cm.channelId);
      if (!channel || channel.type !== "direct" || channel.workspaceId !== args.workspaceId) continue;

      const otherMember = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", channel._id).eq("userId", args.otherUserId)
        )
        .unique();

      if (otherMember) {
        return channel._id;
      }
    }

    // Create new DM channel
    const otherUser = await ctx.db.get(args.otherUserId);
    const now = Date.now();
    const channelId = await ctx.db.insert("channels", {
      workspaceId: args.workspaceId,
      name: `dm-${userId.slice(-6)}-${args.otherUserId.slice(-6)}`,
      type: "direct",
      description: `Direct message with ${otherUser?.name || "Unknown"}`,
      createdBy: userId,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    // Add both users
    await ctx.db.insert("channelMembers", {
      channelId,
      userId,
      workspaceMemberId: myMembership._id,
      role: "admin",
      lastReadAt: now,
      isMuted: false,
      joinedAt: now,
    });

    await ctx.db.insert("channelMembers", {
      channelId,
      userId: args.otherUserId,
      workspaceMemberId: otherMembership._id,
      role: "admin",
      isMuted: false,
      joinedAt: now,
    });

    return channelId;
  },
});
