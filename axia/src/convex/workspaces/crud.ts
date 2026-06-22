// @ts-nocheck — Convex backend file; workspaces tables not yet in generated types
/**
 * Workspace CRUD — queries and mutations for managing workspaces.
 *
 * A workspace is the top-level organizational unit. Every user gets a
 * "personal" workspace on signup. They can create additional "team"
 * workspaces for agencies / teams.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "../_generated/dataModel";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// ─── Queries ──────────────────────────────────────────────────────────────────

/** Get all workspaces the current user belongs to (as owner or member).
 *
 * Returns each workspace enriched with `myRole` ("owner" | "manager" | "member")
 * so the frontend can correctly enforce role-based UI without hardcoding.
 */
export const getMyWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Workspaces the user owns
    const owned = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .take(1000);

    // Workspaces the user is a member of
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const memberWorkspaceIds = memberships
      .filter((m) => m.status === "active")
      .map((m) => m.workspaceId);

    const memberWorkspaces = await Promise.all(
      memberWorkspaceIds.map((id) => ctx.db.get(id))
    );

    // Combine and deduplicate. For each workspace, compute the user's role:
    //  - "owner" if they are the workspace.ownerId
    //  - otherwise their membership.role
    const roleByWorkspace = new Map<string, "owner" | "manager" | "member">();
    for (const m of memberships) {
      if (m.status === "active") {
        roleByWorkspace.set(m.workspaceId, m.role as any);
      }
    }
    for (const ws of owned) {
      roleByWorkspace.set(ws._id, "owner");
    }

    const all = [...owned, ...memberWorkspaces.filter(Boolean)] as Doc<"workspaces">[];
    const seen = new Set<string>();
    return all
      .filter((w) => {
        if (seen.has(w._id)) return false;
        seen.add(w._id);
        return true;
      })
      .map((w) => ({
        ...w,
        myRole: roleByWorkspace.get(w._id) ?? "member",
      }));
  },
});

/** Get a single workspace by ID (only if the user is a member). */
export const getWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return null;

    // Check membership
    if (workspace.ownerId === userId) return workspace;
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();
    if (membership && membership.status === "active") return workspace;

    return null;
  },
});

/** Get workspace stats (member count, active projects, etc.). */
export const getWorkspaceStats = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Verify membership
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return null;

    const isOwner = workspace.ownerId === userId;
    const membership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", args.workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!membership || membership.status !== "active")) return null;

    // Count active members
    const allMembers = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .take(1000);
    const activeMembers = allMembers.filter((m) => m.status === "active");

    // Count active projects
    const allProjects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .take(1000);
    const activeProjects = allProjects.filter((p) => p.status === "active");

    // Count pending invitations
    const pendingInvitations = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace_and_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "pending")
      )
      .take(1000);

    // Count clients
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .take(1000);

    return {
      memberCount: activeMembers.length,
      activeProjectCount: activeProjects.length,
      totalProjectCount: allProjects.length,
      pendingInvitationCount: pendingInvitations.length,
      clientCount: clients.length,
      type: workspace.type,
      name: workspace.name,
    };
  },
});

/** Get the current user's role in a workspace. */
export const getMyRole = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return null;

    if (workspace.ownerId === userId) return "owner" as const;

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .first();

    if (membership && membership.status === "active") {
      return membership.role;
    }

    return null;
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create a new workspace. Every user also gets an auto-created personal workspace. */
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("personal"), v.literal("team")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "createWorkspace");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const workspaceId = await ctx.db.insert("workspaces", {
      ownerId: userId,
      name: args.name,
      type: args.type,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-add the owner as a workspace member
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "owner",
      status: "active",
      title: args.type === "personal" ? "Freelancer" : "Founder & Creative Director",
      joinedAt: now,
      invitedBy: undefined,
      lastActiveAt: now,
    });

    // Create default pipeline stages for the workspace
    // NOTE: Stage colors should match STAGE_COLORS in src/lib/tokens.ts
    const defaultStages = [
      { name: "Lead", color: "#94a3b8", order: 0 },
      { name: "Qualified", color: "#60a5fa", order: 1 },
      { name: "Proposal", color: "#a78bfa", order: 2 },
      { name: "Negotiation", color: "#fbbf24", order: 3 },
      { name: "Won", color: "#34d399", order: 4 },
      { name: "Lost", color: "#f87171", order: 5 },
    ];

    for (const stage of defaultStages) {
      await ctx.db.insert("pipelineStages", {
        userId,
        workspaceId,
        name: stage.name,
        color: stage.color,
        order: stage.order,
        isDefault: true,
      });
    }

    return workspaceId;
  },
});

/** Update workspace details (name, description, avatar). */
export const updateWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "updateWorkspace");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    if (workspace.ownerId !== userId) {
      // Check if user is a manager (managers can also update)
      const membership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", userId)
        )
        .first();
      if (!membership || membership.role === "member") {
        throw new Error("Only owners and managers can update workspace settings");
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.avatar !== undefined) updates.avatar = args.avatar;

    await ctx.db.patch(args.workspaceId, updates);
    return { success: true };
  },
});

/** Convert a personal workspace to a team workspace. */
export const convertToTeamWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "convertToTeamWorkspace");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    if (workspace.ownerId !== userId) throw new Error("Only the owner can convert the workspace");
    if (workspace.type === "team") throw new Error("Workspace is already a team workspace");

    await ctx.db.patch(args.workspaceId, {
      type: "team",
      name: args.name,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/** Delete a workspace (only owner, only if no active projects). */
export const deleteWorkspace = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "deleteWorkspace");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    if (workspace.ownerId !== userId) throw new Error("Only the owner can delete the workspace");
    if (workspace.type === "personal") throw new Error("Cannot delete personal workspace");

    // Check for active projects
    const activeProjects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(1000);

    if (activeProjects.length > 0) {
      throw new Error("Cannot delete workspace with active projects. Archive them first.");
    }

    // Remove all members
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .take(1000);

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Cancel pending invitations
    const invitations = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .take(1000);

    for (const inv of invitations) {
      await ctx.db.patch(inv._id, { status: "cancelled" });
    }

    // Delete the workspace
    await ctx.db.delete(args.workspaceId);
    return { success: true };
  },
});

/** Seed a personal workspace for a user (called on signup). */
export const seedPersonalWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    await rateLimitAuthenticated(ctx, "seedPersonalWorkspace");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user already has a personal workspace
    const existing = await ctx.db
      .query("workspaces")
      .withIndex("by_owner_and_type", (q) =>
        q.eq("ownerId", userId).eq("type", "personal")
      )
      .first();

    if (existing) return existing._id;

    // Get user name for workspace name
    const user = await ctx.db.get(userId);
    const userName = user?.name || user?.email?.split("@")[0] || "My";

    const now = Date.now();
    const workspaceId = await ctx.db.insert("workspaces", {
      ownerId: userId,
      name: `${userName}'s Workspace`,
      type: "personal",
      description: "Personal workspace for solo freelancing",
      createdAt: now,
      updatedAt: now,
    });

    // Add owner as member
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "owner",
      status: "active",
      title: "Freelancer",
      joinedAt: now,
      lastActiveAt: now,
    });

    // Create default pipeline stages
    // NOTE: Stage colors should match STAGE_COLORS in src/lib/tokens.ts
    const defaultStages = [
      { name: "Lead", color: "#94a3b8", order: 0 },
      { name: "Qualified", color: "#60a5fa", order: 1 },
      { name: "Proposal", color: "#a78bfa", order: 2 },
      { name: "Negotiation", color: "#fbbf24", order: 3 },
      { name: "Won", color: "#34d399", order: 4 },
      { name: "Lost", color: "#f87171", order: 5 },
    ];

    for (const stage of defaultStages) {
      await ctx.db.insert("pipelineStages", {
        userId,
        workspaceId,
        name: stage.name,
        color: stage.color,
        order: stage.order,
        isDefault: true,
      });
    }

    return workspaceId;
  },
});
