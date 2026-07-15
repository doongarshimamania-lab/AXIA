import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Workspace tables — the foundation for multi-user collaboration in Axia.
 *
 * Design decisions:
 * ─────────────────
 * 1. A User can own/belong to many Workspaces (solo + team).
 * 2. WorkspaceMembers links Users → Workspaces with a role.
 *    This is a separate table (not an embedded array) so we can index,
 *    query efficiently, and enforce uniqueness per (workspace, user).
 * 3. WorkspaceInvitations handles the invite flow:
 *    email → token → accept → create WorkspaceMember.
 * 4. All business tables (projects, clients, deals, proposals, invoices)
 *    get a `workspaceId` field so data is scoped per-workspace.
 * 5. `assignedMemberIds` on projects/clients/deals/proposals reference
 *    workspaceMembers._id (not users._id), so a person's role in the
 *    workspace is always accessible alongside the assignment.
 */

export const workspaceTables = {
  // ─── Workspaces ─────────────────────────────────────────────────────────────
  workspaces: defineTable({
    ownerId: v.id("users"),
    name: v.string().maxLength(100),
    type: v.union(v.literal("personal"), v.literal("team")),
    description: v.optional(v.string().maxLength(5000)),
    avatar: v.optional(v.string()), // storage ID or URL
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_type", ["ownerId", "type"]),

  // ─── Workspace Members ──────────────────────────────────────────────────────
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("member")),
    status: v.union(v.literal("active"), v.literal("invited"), v.literal("removed")),
    title: v.optional(v.string()), // e.g. "Senior Developer", "UI Designer"
    joinedAt: v.number(),
    invitedBy: v.optional(v.id("users")),
    lastActiveAt: v.optional(v.number()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"])
    .index("by_workspace_and_status", ["workspaceId", "status"])
    .index("by_workspace_and_role", ["workspaceId", "role"]),

  // ─── Workspace Invitations ──────────────────────────────────────────────────
  workspaceInvitations: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string().maxLength(320),
    role: v.union(v.literal("manager"), v.literal("member")),
    token: v.string(), // unique token for accept/cancel
    invitedBy: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("cancelled"),
      v.literal("expired")
    ),
    createdAt: v.number(),
    expiresAt: v.number(), // typically 7 days from creation
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_workspace_and_status", ["workspaceId", "status"])
    .index("by_status_and_expires", ["status", "expiresAt"]),
};
