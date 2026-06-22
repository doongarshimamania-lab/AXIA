// @ts-nocheck
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./helpers";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
/**
 * Channel mutations — create, update, archive, join/leave channels.
 */

export const createChannel = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    type: v.union(
      v.literal("general"),
      v.literal("project"),
      v.literal("direct"),
      v.literal("private")
    ),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    memberIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "createChannel");
    const userId = await getAuthenticatedUser(ctx);

    // Verify workspace membership
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();
    if (!membership || membership.status !== "active") {
      throw new Error("Not a member of this workspace");
    }

    // Check for duplicate channel name in workspace
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_workspace_and_name", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("name", args.name)
      )
      .unique();
    if (existing) {
      throw new Error("A channel with this name already exists");
    }

    const now = Date.now();
    const channelId = await ctx.db.insert("channels", {
      workspaceId: args.workspaceId,
      name: args.name.toLowerCase().replace(/\s+/g, "-"),
      type: args.type,
      description: args.description,
      icon: args.icon,
      projectId: args.projectId,
      createdBy: userId,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    // Creator auto-joins the channel as admin
    await ctx.db.insert("channelMembers", {
      channelId,
      userId,
      workspaceMemberId: membership._id,
      role: "admin",
      lastReadAt: now,
      isMuted: false,
      joinedAt: now,
    });

    // Add additional members
    if (args.memberIds) {
      for (const memberId of args.memberIds) {
        if (memberId === userId) continue;
        const memberWs = await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", args.workspaceId).eq("userId", memberId)
          )
          .unique();
        if (memberWs && memberWs.status === "active") {
          await ctx.db.insert("channelMembers", {
            channelId,
            userId: memberId,
            workspaceMemberId: memberWs._id,
            role: "member",
            isMuted: false,
            joinedAt: now,
          });
        }
      }
    }

    // System message
    await ctx.db.insert("messages", {
      channelId,
      workspaceId: args.workspaceId,
      authorId: userId,
      body: `created channel #${args.name.toLowerCase().replace(/\s+/g, "-")}`,
      messageType: "system",
      isEdited: false,
      isPinned: false,
    });

    return channelId;
  },
});

export const updateChannel = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "updateChannel");
    const userId = await getAuthenticatedUser(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Verify admin or workspace owner/manager
    const channelMember = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();

    const wsMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();

    const canEdit = channelMember?.role === "admin" ||
      wsMember?.role === "owner" || wsMember?.role === "manager";
    if (!canEdit) throw new Error("No permission to edit this channel");

    const updates: any = { updatedAt: Date.now() };
    if (args.name) updates.name = args.name.toLowerCase().replace(/\s+/g, "-");
    if (args.description !== undefined) updates.description = args.description;
    if (args.icon !== undefined) updates.icon = args.icon;

    await ctx.db.patch(args.channelId, updates);
  },
});

export const archiveChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "archiveChannel");
    const userId = await getAuthenticatedUser(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    const wsMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();
    if (wsMember?.role !== "owner" && wsMember?.role !== "manager") {
      throw new Error("Only workspace owners/managers can archive channels");
    }

    await ctx.db.patch(args.channelId, { isArchived: true, updatedAt: Date.now() });
  },
});

export const joinChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "joinChannel");
    const userId = await getAuthenticatedUser(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Check already a member
    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();
    if (existing) return; // already joined

    const wsMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();
    if (!wsMember || wsMember.status !== "active") {
      throw new Error("Not a workspace member");
    }

    // Private channels require invitation — can't join freely
    if (channel.type === "private") {
      throw new Error("This is a private channel. You need an invitation to join.");
    }

    await ctx.db.insert("channelMembers", {
      channelId: args.channelId,
      userId,
      workspaceMemberId: wsMember._id,
      role: "member",
      isMuted: false,
      joinedAt: Date.now(),
    });
  },
});

export const leaveChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "leaveChannel");
    const userId = await getAuthenticatedUser(ctx);
    const member = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();
    if (member) {
      await ctx.db.delete(member._id);
    }
  },
});

export const addChannelMember = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "addChannelMember");
    const callerId = await getAuthenticatedUser(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Caller must be channel admin or workspace manager+
    const callerMember = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", callerId)
      )
      .unique();

    const wsMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", callerId)
      )
      .unique();

    const canAdd = callerMember?.role === "admin" ||
      wsMember?.role === "owner" || wsMember?.role === "manager";
    if (!canAdd) throw new Error("No permission to add members");

    // Check not already a member
    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .unique();
    if (existing) return;

    const targetWsMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", args.userId)
      )
      .unique();
    if (!targetWsMember || targetWsMember.status !== "active") {
      throw new Error("User is not an active workspace member");
    }

    await ctx.db.insert("channelMembers", {
      channelId: args.channelId,
      userId: args.userId,
      workspaceMemberId: targetWsMember._id,
      role: "member",
      isMuted: false,
      joinedAt: Date.now(),
    });

    // System message
    const user = await ctx.db.get(args.userId);
    await ctx.db.insert("messages", {
      channelId: args.channelId,
      workspaceId: channel.workspaceId,
      authorId: callerId,
      body: `added ${user?.name || "a member"} to the channel`,
      messageType: "system",
      isEdited: false,
      isPinned: false,
    });
  },
});

export const removeChannelMember = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "removeChannelMember");
    const callerId = await getAuthenticatedUser(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    const wsMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", callerId)
      )
      .unique();
    if (wsMember?.role !== "owner" && wsMember?.role !== "manager") {
      throw new Error("Only workspace owners/managers can remove channel members");
    }

    const member = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .unique();
    if (member) {
      await ctx.db.delete(member._id);
    }
  },
});

export const toggleMuteChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "toggleMuteChannel");
    const userId = await getAuthenticatedUser(ctx);
    const member = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();
    if (!member) throw new Error("Not a member of this channel");

    await ctx.db.patch(member._id, { isMuted: !member.isMuted });
    return !member.isMuted;
  },
});
