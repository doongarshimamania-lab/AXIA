import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Messaging tables — Slack-like internal communication for agencies & teams.
 *
 * Design decisions:
 * ─────────────────
 * 1. Channels are scoped to a workspace (team or personal).
 * 2. Channel types: "general" (workspace-wide), "project" (linked to a project),
 *    "direct" (1:1 DM), and "private" (invite-only group).
 * 3. Messages support threads (parentMessageId), reactions, and attachments.
 * 4. ChannelMembers tracks membership + read state per user per channel.
 * 5. Typing indicators are ephemeral (not persisted) — handled via Convex actions
 *    or client-side state. Read receipts are persisted for unread counts.
 */

export const messagingTables = {
  // ─── Channels ─────────────────────────────────────────────────────────────
  channels: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(), // e.g. "general", "project-alpha", "dm-john"
    type: v.union(
      v.literal("general"),   // workspace-wide, auto-joined
      v.literal("project"),   // linked to a project
      v.literal("direct"),    // 1:1 DM between two members
      v.literal("private")    // invite-only group channel
    ),
    description: v.optional(v.string()),
    icon: v.optional(v.string()), // emoji or icon name
    projectId: v.optional(v.id("projects")), // if type === "project"
    createdBy: v.id("users"),
    isArchived: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_type", ["workspaceId", "type"])
    .index("by_workspace_and_name", ["workspaceId", "name"])
    .index("by_project", ["projectId"]),

  // ─── Channel Members ──────────────────────────────────────────────────────
  channelMembers: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    workspaceMemberId: v.optional(v.id("workspaceMembers")),
    role: v.union(v.literal("admin"), v.literal("member")),
    lastReadMessageId: v.optional(v.id("messages")), // for unread count
    lastReadAt: v.optional(v.number()),
    isMuted: v.boolean(),
    joinedAt: v.number(),
  })
    .index("by_channel", ["channelId"])
    .index("by_user", ["userId"])
    .index("by_channel_and_user", ["channelId", "userId"])
    .index("by_user_and_muted", ["userId", "isMuted"]),

  // ─── Messages ─────────────────────────────────────────────────────────────
  messages: defineTable({
    channelId: v.id("channels"),
    workspaceId: v.id("workspaces"),
    authorId: v.id("users"),
    parentMessageId: v.optional(v.id("messages")), // for threads
    body: v.string(), // markdown content
    messageType: v.union(
      v.literal("text"),
      v.literal("system"),  // e.g. "John created channel #general"
      v.literal("file"),    // file attachment
      v.literal("link")     // shared link with preview
    ),
    attachments: v.optional(v.array(v.object({
      storageId: v.optional(v.id("_storage")),
      name: v.string(),
      type: v.string(), // mime type
      size: v.number(),
      url: v.optional(v.string()),
    }))),
    isEdited: v.boolean(),
    isPinned: v.boolean(),
    editedAt: v.optional(v.number()),
    pinnedBy: v.optional(v.id("users")),
    pinnedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()), // soft delete
  })
    .index("by_channel", ["channelId"])
    .index("by_channel_and_parent", ["channelId", "parentMessageId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_author", ["authorId"])
    .index("by_pinned", ["channelId", "isPinned"]),

  // ─── Reactions ────────────────────────────────────────────────────────────
  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(), // unicode emoji or :shortcode:
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_and_emoji", ["messageId", "emoji"])
    .index("by_message_and_user", ["messageId", "userId"]),

  // ─── Mentions ─────────────────────────────────────────────────────────────
  mentions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    channelId: v.id("channels"),
    workspaceId: v.id("workspaces"),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "isRead"])
    .index("by_message", ["messageId"]),
};
