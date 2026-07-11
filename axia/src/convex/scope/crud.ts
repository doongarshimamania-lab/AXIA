// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";
import { requireWorkspaceAccess, getWorkspaceMembership, getRecordAccess, requireRecordAccess } from "../permissions";
import { getUserVisibility, isRecordVisible } from "../workspaceFilter";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getScopeDefinitions = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { workspaceId, projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // If projectId provided, filter by project
    if (projectId) {
      // ponytail: IDOR fix — previously returned all scope definitions
      // for any projectId without verifying the caller owns/has-access-to
      // the project. Scope definitions contain deliverables, revision
      // limits, approval tokens — sensitive scope-creep protection data.
      // Now we look up the project and verify ownership/workspace access.
      const project = await ctx.db.get(projectId);
      if (!project) return [];

      if (project.workspaceId) {
        const access = await getRecordAccess(ctx, project, userId);
        if (!access) return [];
      } else if (project.userId !== userId) {
        return [];
      }

      return await ctx.db
        .query("scopeDefinitions")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .take(1000);
    }

    // If workspaceId provided, filter by workspace with team-aware visibility
    if (workspaceId) {
      const visibility = await getUserVisibility(ctx, workspaceId);
      if (!visibility) return [];

      const allScopes = await ctx.db
        .query("scopeDefinitions")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(1000);

      return allScopes.filter((s) => isRecordVisible(s, visibility));
    }

    // Backward compat: no workspaceId
    return await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);
  },
});

export const getScopeDefinition = query({
  args: { scopeId: v.id("scopeDefinitions") },
  handler: async (ctx, { scopeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const scope = await ctx.db.get(scopeId);
    if (!scope) return null;

    // Check workspace membership or direct ownership
    if (scope.workspaceId) {
      const access = await getRecordAccess(ctx, scope, userId);
      if (!access) return null;
    } else if (scope.userId !== userId) {
      return null;
    }
    return scope;
  },
});

export const getChangeOrders = query({
  args: { scopeId: v.id("scopeDefinitions") },
  handler: async (ctx, { scopeId }) => {
    return await ctx.db
      .query("scopeChangeOrders")
      .withIndex("by_scope", (q) => q.eq("scopeId", scopeId))
      .take(1000);
  },
});

export const getScopeByApprovalToken = query({
  args: { approvalToken: v.string() },
  handler: async (ctx, { approvalToken }) => {
    return await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_approval_token", (q) => q.eq("approvalToken", approvalToken))
      .first();
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

/**
 * Cryptographically secure token generator (see proposals/crud.ts).
 */
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const buf = new Uint32Array(32);
  crypto.getRandomValues(buf);
  let result = "";
  for (let i = 0; i < 32; i++) result += chars.charAt(buf[i] % chars.length);
  return result;
}

export const createScopeDefinition = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
    title: v.string(),
    description: v.string(),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    deliverables: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      estimatedHours: v.optional(v.number()),
      status: v.optional(v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("revised"))),
    })),
    totalEstimatedHours: v.optional(v.number()),
    revisionLimit: v.number(),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "createScopeDefinition");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If workspaceId provided, verify membership
    if (args.workspaceId) {
      await requireWorkspaceAccess(ctx, args.workspaceId, "member");
    }

    const { workspaceId, teamId, ...rest } = args;

    return await ctx.db.insert("scopeDefinitions", {
      userId,
      workspaceId: workspaceId ?? undefined,
      createdBy: userId,
      teamId: teamId ?? undefined,
      ...rest,
      revisionCount: 0,
      status: "active",
      approvalToken: generateToken(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateScopeDefinition = mutation({
  args: {
    scopeId: v.id("scopeDefinitions"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    deliverables: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      estimatedHours: v.optional(v.number()),
      status: v.optional(v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("revised"))),
    }))),
    totalEstimatedHours: v.optional(v.number()),
    revisionLimit: v.optional(v.number()),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, { scopeId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scope = await ctx.db.get(scopeId);
    if (!scope) throw new Error("Scope not found");

    // Check workspace access or direct ownership
    if (scope.workspaceId) {
      await requireRecordAccess(ctx, scope, "collaborate");
    } else if (scope.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(scopeId, { ...updates, updatedAt: Date.now() });
  },
});

export const recordRevision = mutation({
  args: {
    scopeId: v.id("scopeDefinitions"),
    title: v.string(),
    description: v.string(),
    changeType: v.union(v.literal("addition"), v.literal("modification"), v.literal("removal"), v.literal("revision")),
    hoursAdded: v.number(),
    costImpact: v.number(),
    deadlineImpact: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "recordRevision");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scope = await ctx.db.get(args.scopeId);
    if (!scope) throw new Error("Scope not found");

    // Check workspace access or direct ownership
    if (scope.workspaceId) {
      await requireRecordAccess(ctx, scope, "collaborate");
    } else if (scope.userId !== userId) {
      throw new Error("Not authorized");
    }

    const newRevisionCount = scope.revisionCount + 1;
    const autoGenerated = newRevisionCount > scope.revisionLimit;

    const changeOrderId = await ctx.db.insert("scopeChangeOrders", {
      userId,
      workspaceId: scope.workspaceId ?? undefined,
      createdBy: userId,
      teamId: scope.teamId ?? undefined,
      scopeId: args.scopeId,
      title: args.title,
      description: args.description,
      changeType: args.changeType,
      impact: {
        hoursAdded: args.hoursAdded,
        costImpact: args.costImpact,
        deadlineImpact: args.deadlineImpact,
      },
      reason: args.reason,
      status: autoGenerated ? "auto_generated" : "pending",
      clientApprovalToken: generateToken(),
      autoGenerated,
      originalLimit: scope.revisionLimit,
      newLimit: autoGenerated ? scope.revisionLimit + 1 : scope.revisionLimit,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.scopeId, {
      revisionCount: newRevisionCount,
      updatedAt: Date.now(),
    });

    return { changeOrderId, autoGenerated, revisionCount: newRevisionCount, limit: scope.revisionLimit };
  },
});

export const approveChangeOrder = mutation({
  args: { changeOrderId: v.id("scopeChangeOrders") },
  handler: async (ctx, { changeOrderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const co = await ctx.db.get(changeOrderId);
    if (!co) throw new Error("Change order not found");

    // Check workspace access or direct ownership
    if (co.workspaceId) {
      await requireRecordAccess(ctx, co, "owner");
    } else if (co.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(changeOrderId, {
      status: "approved",
      clientApprovedAt: Date.now(),
    });

    if (co.newLimit) {
      await ctx.db.patch(co.scopeId, {
        revisionLimit: co.newLimit,
        updatedAt: Date.now(),
      });
    }
  },
});

// ponytail: rejectChangeOrder — previously the Scope.tsx 'Reject' button
// (next to the working 'Approve' button) only fired
// toast.info('Change order rejected') with no mutation. Pending change
// orders could never be rejected through the UI; they stayed pending
// forever despite the toast claiming 'rejected'. This mutation mirrors
// the access checks in approveChangeOrder and patches status to
// 'rejected'. (Audit item #10.)
export const rejectChangeOrder = mutation({
  args: {
    changeOrderId: v.id("scopeChangeOrders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { changeOrderId, reason }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const co = await ctx.db.get(changeOrderId);
    if (!co) throw new Error("Change order not found");

    // Check workspace access (owner level) or direct ownership — same
    // gate as approveChangeOrder so a member can't reject an owner's CO.
    if (co.workspaceId) {
      await requireRecordAccess(ctx, co, "owner");
    } else if (co.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Only pending / auto_generated change orders can be rejected —
    // already-approved or already-rejected ones are immutable.
    if (co.status !== "pending" && co.status !== "auto_generated") {
      throw new Error(`Cannot reject a ${co.status} change order`);
    }

    await ctx.db.patch(changeOrderId, {
      status: "rejected",
      // ponytail: store the optional rejection reason on the CO so the
      // user can later see WHY it was rejected. The scopeChangeOrders
      // schema doesn't have a dedicated rejectionReason field (and no
      // updatedAt), so we stash it in the existing `reason` field
      // (which previously held the SUBMISSION reason). To preserve the
      // original reason, we append the rejection note.
      ...(reason
        ? { reason: `${co.reason ?? ""}\n\n[Rejected]: ${reason}`.trim() }
        : {}),
    });

    return { success: true };
  },
});

export const approveScopeByClient = mutation({
  args: { approvalToken: v.string() },
  handler: async (ctx, { approvalToken }) => {
    // This is a public action via shared link — client approves without being a platform user
    const scope = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_approval_token", (q) => q.eq("approvalToken", approvalToken))
      .first();

    if (!scope) throw new Error("Invalid approval token");
    if (scope.clientApprovedAt) throw new Error("Scope has already been approved");

    await ctx.db.patch(scope._id, {
      clientApprovedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, scopeTitle: scope.title };
  },
});

export const deleteScopeDefinition = mutation({
  args: { scopeId: v.id("scopeDefinitions") },
  handler: async (ctx, { scopeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scope = await ctx.db.get(scopeId);
    if (!scope) throw new Error("Scope not found");

    // Check workspace access (owner level) or direct ownership
    if (scope.workspaceId) {
      await requireRecordAccess(ctx, scope, "owner");
    } else if (scope.userId !== userId) {
      throw new Error("Not authorized");
    }

    const changeOrders = await ctx.db
      .query("scopeChangeOrders")
      .withIndex("by_scope", (q) => q.eq("scopeId", scopeId))
      .take(1000);
    for (const co of changeOrders) await ctx.db.delete(co._id);

    await ctx.db.delete(scopeId);
  },
});
