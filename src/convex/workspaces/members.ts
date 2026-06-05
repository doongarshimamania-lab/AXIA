/**
 * Workspace Member CRUD — queries and mutations for managing members.
 *
 * Members are the "people" in a workspace. Each member is a User who
 * has been added to a Workspace with a specific role.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Get all members of a workspace (active, invited, or all). */
export const getMembers = query({
  args: {
    workspaceId: v.id("workspaces"),
    status: v.optional(v.union(v.literal("active"), v.literal("invited"), v.literal("removed"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify the caller is a member of this workspace
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return [];

    const isOwner = workspace.ownerId === userId;
    const callerMembership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", args.workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!callerMembership || callerMembership.status !== "active")) return [];

    // Get all members
    const allMembers = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Filter by status if specified
    const filtered = args.status
      ? allMembers.filter((m) => m.status === args.status)
      : allMembers;

    // Enrich with user data
    const enriched = await Promise.all(
      filtered.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          userName: user?.name || "Unknown",
          userEmail: user?.email || "",
          userImage: user?.image,
        };
      })
    );

    return enriched;
  },
});

/** Get a specific member by ID. */
export const getMember = query({
  args: { memberId: v.id("workspaceMembers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const member = await ctx.db.get(args.memberId);
    if (!member) return null;

    // Verify the caller is in the same workspace
    const workspace = await ctx.db.get(member.workspaceId);
    if (!workspace) return null;

    const isOwner = workspace.ownerId === userId;
    const callerMembership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", member.workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!callerMembership || callerMembership.status !== "active")) return null;

    const user = await ctx.db.get(member.userId);
    return {
      ...member,
      userName: user?.name || "Unknown",
      userEmail: user?.email || "",
      userImage: user?.image,
    };
  },
});

/** Search members across all workspaces the user belongs to. */
export const searchMembers = query({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify membership
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return [];

    const isOwner = workspace.ownerId === userId;
    const membership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", args.workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!membership || membership.status !== "active")) return [];

    // Get all active members and filter by name/email
    const allMembers = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "active")
      )
      .collect();

    const searchLower = args.query.toLowerCase();
    const enriched = await Promise.all(
      allMembers.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        const name = user?.name || "";
        const email = user?.email || "";
        return {
          ...member,
          userName: name,
          userEmail: email,
          userImage: user?.image,
        };
      })
    );

    return enriched.filter(
      (m) =>
        m.userName.toLowerCase().includes(searchLower) ||
        m.userEmail.toLowerCase().includes(searchLower) ||
        (m.title && m.title.toLowerCase().includes(searchLower))
    );
  },
});

/** Get all projects assigned to a specific member. */
export const getMemberProjects = query({
  args: { memberId: v.id("workspaceMembers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const member = await ctx.db.get(args.memberId);
    if (!member) return [];

    // Verify the caller is in the same workspace
    const callerMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", member.workspaceId).eq("userId", userId)
      )
      .first();

    if (!callerMembership || callerMembership.status !== "active") return [];

    // Get all projects in the workspace that include this member
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", member.workspaceId))
      .collect();

    return projects.filter(
      (p) => p.assignedMemberIds && p.assignedMemberIds.includes(args.memberId)
    );
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Update a member's role. Only owners and managers can do this. */
export const updateMemberRole = mutation({
  args: {
    memberId: v.id("workspaceMembers"),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    const workspace = await ctx.db.get(member.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    // Only owners can change roles, or managers changing members (not other managers)
    const isOwner = workspace.ownerId === userId;
    const callerMembership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", member.workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!callerMembership || callerMembership.role !== "manager")) {
      throw new Error("Only owners and managers can update member roles");
    }

    // Managers can't change owner or other managers' roles
    if (!isOwner && (member.role === "owner" || member.role === "manager")) {
      throw new Error("Managers cannot change owner or manager roles");
    }

    // Can't change the owner's role (that requires ownership transfer)
    if (member.role === "owner" && args.role !== "owner") {
      throw new Error("Transfer ownership instead of changing the owner's role");
    }

    await ctx.db.patch(args.memberId, { role: args.role });
    return { success: true };
  },
});

/** Remove a member from the workspace. */
export const removeMember = mutation({
  args: { memberId: v.id("workspaceMembers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    const workspace = await ctx.db.get(member.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    // Cannot remove the owner
    if (member.role === "owner") throw new Error("Cannot remove the workspace owner");

    // Verify the caller has permission
    const isOwner = workspace.ownerId === userId;
    const callerMembership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", member.workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!callerMembership || callerMembership.role !== "manager")) {
      throw new Error("Only owners and managers can remove members");
    }

    // Mark as removed instead of deleting (for audit trail)
    await ctx.db.patch(args.memberId, { status: "removed" });

    // Also remove this member from all project/client assignments
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", member.workspaceId))
      .collect();

    for (const project of projects) {
      if (project.assignedMemberIds && project.assignedMemberIds.includes(args.memberId)) {
        await ctx.db.patch(project._id, {
          assignedMemberIds: project.assignedMemberIds.filter((id) => id !== args.memberId),
        });
      }
    }

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", member.workspaceId))
      .collect();

    for (const client of clients) {
      if (client.assignedMemberIds && client.assignedMemberIds.includes(args.memberId)) {
        await ctx.db.patch(client._id, {
          assignedMemberIds: client.assignedMemberIds.filter((id) => id !== args.memberId),
        });
      }
    }

    return { success: true };
  },
});

/** Update a member's title or lastActiveAt. */
export const updateMemberProfile = mutation({
  args: {
    memberId: v.id("workspaceMembers"),
    title: v.optional(v.string()),
    lastActiveAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    // Users can only update their own profile, or managers can update others
    const workspace = await ctx.db.get(member.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const isSelf = member.userId === userId;
    const isOwner = workspace.ownerId === userId;
    const callerMembership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", member.workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isSelf && !isOwner && (!callerMembership || callerMembership.role !== "manager")) {
      throw new Error("You can only update your own profile");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.lastActiveAt !== undefined) updates.lastActiveAt = args.lastActiveAt;

    await ctx.db.patch(args.memberId, updates);
    return { success: true };
  },
});

/** Assign a member to a project. */
export const assignMemberToProject = mutation({
  args: {
    memberId: v.id("workspaceMembers"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    // Verify member is in the same workspace as the project
    if (project.workspaceId && member.workspaceId !== project.workspaceId) {
      throw new Error("Member and project are in different workspaces");
    }

    const currentIds = project.assignedMemberIds || [];
    if (currentIds.includes(args.memberId)) {
      return { success: true }; // already assigned
    }

    await ctx.db.patch(args.projectId, {
      assignedMemberIds: [...currentIds, args.memberId],
    });

    return { success: true };
  },
});

/** Unassign a member from a project. */
export const unassignMemberFromProject = mutation({
  args: {
    memberId: v.id("workspaceMembers"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const currentIds = project.assignedMemberIds || [];
    await ctx.db.patch(args.projectId, {
      assignedMemberIds: currentIds.filter((id) => id !== args.memberId),
    });

    return { success: true };
  },
});

/** Assign a member to a client. */
export const assignMemberToClient = mutation({
  args: {
    memberId: v.id("workspaceMembers"),
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    if (client.workspaceId && member.workspaceId !== client.workspaceId) {
      throw new Error("Member and client are in different workspaces");
    }

    const currentIds = client.assignedMemberIds || [];
    if (currentIds.includes(args.memberId)) {
      return { success: true };
    }

    await ctx.db.patch(args.clientId, {
      assignedMemberIds: [...currentIds, args.memberId],
    });

    return { success: true };
  },
});

/** Unassign a member from a client. */
export const unassignMemberFromClient = mutation({
  args: {
    memberId: v.id("workspaceMembers"),
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");

    const currentIds = client.assignedMemberIds || [];
    await ctx.db.patch(args.clientId, {
      assignedMemberIds: currentIds.filter((id) => id !== args.memberId),
    });

    return { success: true };
  },
});
