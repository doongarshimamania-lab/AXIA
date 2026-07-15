import { defineTable } from "convex/server";
import { v } from "convex/values";

// Channels table
export const channels = defineTable({
  name: v.string(),
  workspaceId: v.id("workspaces"),
  type: v.union(v.literal("channel"), v.literal("dm")),
  isPrivate: v.boolean(),
  description: v.optional(v.string()),
  createdBy: v.id("users"),
  isArchived: v.boolean(),
  lastMessageAt: v.optional(v.number()),
})
  .index("by_workspace", ["workspaceId"])
  .index("by_workspace_type", ["workspaceId", "type"])
  .index("by_name", ["workspaceId", "name"]);

// Channel Members table
export const channelMembers = defineTable({
  channelId: v.id("channels"),
  userId: v.id("users"),
  workspaceId: v.id("workspaces"),
  role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  isMuted: v.boolean(),
  lastReadAt: v.optional(v.number()),
  joinedAt: v.number(),
})
  .index("by_channel", ["channelId"])
  .index("by_user", ["userId"])
  .index("by_channel_user", ["channelId", "userId"])
  .index("by_workspace", ["workspaceId"]);

// Messages table
export const messages = defineTable({
  channelId: v.id("channels"),
  workspaceId: v.id("workspaces"),
  authorId: v.id("users"),
  content: v.string(),
  parentId: v.optional(v.id("messages")),
  isEdited: v.boolean(),
  isPinned: v.boolean(),
  isDeleted: v.boolean(),
  attachments: v.optional(v.array(v.string())),
})
  .index("by_channel", ["channelId"])
  .index("by_channel_parent", ["channelId", "parentId"])
  .index("by_author", ["authorId"])
  .index("by_workspace", ["workspaceId"])
  .index("by_parent", ["parentId"]);

// Reactions table
export const reactions = defineTable({
  messageId: v.id("messages"),
  userId: v.id("users"),
  emoji: v.string(),
  workspaceId: v.id("workspaces"),
})
  .index("by_message", ["messageId"])
  .index("by_message_emoji", ["messageId", "emoji"])
  .index("by_user", ["userId"]);

// Mentions table
export const mentions = defineTable({
  messageId: v.id("messages"),
  userId: v.id("users"),
  channelId: v.id("channels"),
  workspaceId: v.id("workspaces"),
  isRead: v.boolean(),
})
  .index("by_user", ["userId"])
  .index("by_user_unread", ["userId", "isRead"])
  .index("by_message", ["messageId"]);
