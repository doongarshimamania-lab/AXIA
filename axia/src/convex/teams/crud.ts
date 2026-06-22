import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireWorkspaceAccess } from "../permissions";

export const getTeams = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const workspace = await ctx.db.get(workspaceId);
    if (!workspace) return [];

    // Owner shortcut: the workspace owner always has full access even if they
    // don't have a `workspaceMembers` row (this happens when the team workspace
    // was created by `seedTeamUsers` which picked the owner from `workspaces`
    // but didn't insert them into `workspaceMembers`).
    const isOwner = workspace.ownerId === userId;
    if (!isOwner) {
      const membership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", workspaceId).eq("userId", userId)
        )
        .first();
      if (!membership || membership.status !== "active") return [];
    }

    return await ctx.db
      .query("teams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();
  },
});

export const createTeam = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    isCrossTeam: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceAccess(
      ctx,
      args.workspaceId,
      "manager"
    );
    const now = Date.now();
    const teamId = await ctx.db.insert("teams", {
      workspaceId: args.workspaceId,
      name: args.name,
      color: args.color,
      icon: args.icon,
      description: args.description,
      isCrossTeam: args.isCrossTeam,
      createdAt: now,
      updatedAt: now,
    });
    // Auto-add creator as lead
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId,
      workspaceId: args.workspaceId,
      role: "lead",
      joinedAt: now,
    });
    return teamId;
  },
});

export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    isCrossTeam: v.optional(v.boolean()),
  },
  handler: async (ctx, { teamId, ...updates }) => {
    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Team not found");
    await requireWorkspaceAccess(ctx, team.workspaceId, "manager");
    const patch: Record<string, any> = { updatedAt: Date.now() };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.icon !== undefined) patch.icon = updates.icon;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.isCrossTeam !== undefined) patch.isCrossTeam = updates.isCrossTeam;
    await ctx.db.patch(teamId, patch);
  },
});

export const deleteTeam = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Team not found");
    await requireWorkspaceAccess(ctx, team.workspaceId, "owner");
    // Remove all memberships
    const memberships = await ctx.db
      .query("teamMemberships")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();
    for (const m of memberships) {
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(teamId);
  },
});

export const addTeamMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.optional(v.union(v.literal("lead"), v.literal("member"))),
  },
  handler: async (ctx, { teamId, userId: targetUserId, role }) => {
    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Team not found");
    await requireWorkspaceAccess(ctx, team.workspaceId, "manager");
    // Check if already a member
    const existing = await ctx.db
      .query("teamMemberships")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", teamId).eq("userId", targetUserId)
      )
      .first();
    if (existing) throw new Error("Already a team member");
    await ctx.db.insert("teamMemberships", {
      teamId,
      userId: targetUserId,
      workspaceId: team.workspaceId,
      role: role ?? "member",
      joinedAt: Date.now(),
    });
  },
});

export const removeTeamMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
  },
  handler: async (ctx, { teamId, userId: targetUserId }) => {
    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Team not found");
    await requireWorkspaceAccess(ctx, team.workspaceId, "manager");
    const existing = await ctx.db
      .query("teamMemberships")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", teamId).eq("userId", targetUserId)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const getTeamMembers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const team = await ctx.db.get(teamId);
    if (!team) return [];

    // Owner shortcut: workspace owner always has access (even without a
    // workspaceMembers row).
    const workspace = await ctx.db.get(team.workspaceId);
    if (!workspace) return [];
    const isOwner = workspace.ownerId === userId;
    if (!isOwner) {
      const membership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", team.workspaceId).eq("userId", userId)
        )
        .first();
      if (!membership || membership.status !== "active") return [];
    }

    const memberships = await ctx.db
      .query("teamMemberships")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();
    // Enrich with user data
    return await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          ...m,
          userName: user?.name || "Unknown",
          userEmail: user?.email || "",
          userImage: user?.image,
        };
      })
    );
  },
});
