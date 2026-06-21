// @ts-nocheck
/**
 * Transfer Ownership — Reassign ownership of records between users.
 *
 * Supports:
 * - Workspace ownership transfer (ownerId swap)
 * - Project ownership transfer (userId/createdBy change)
 * - Client ownership transfer (userId/createdBy change)
 * - Deal ownership transfer (userId/createdBy change)
 *
 * Only current owners can transfer. The new owner must be an active
 * workspace member. A transfer log entry is recorded for audit.
 */
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getRecordAccess } from "../permissions";

// ---------------------------------------------------------------------------
// Transfer Mutations
// ---------------------------------------------------------------------------

/**
 * Transfer workspace ownership to another member.
 * The caller must be the current workspace owner.
 * The new owner must be an active member of the workspace.
 */
export const transferWorkspaceOwnership = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    newOwnerId: v.id("users"),
  },
  handler: async (ctx, { workspaceId, newOwnerId }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const workspace = await ctx.db.get(workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    // Only the current owner can transfer
    if (workspace.ownerId !== callerId) {
      throw new Error("Only the workspace owner can transfer ownership");
    }

    // The new owner must be an active member
    const newOwnerMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", workspaceId).eq("userId", newOwnerId)
      )
      .first();

    if (!newOwnerMembership || newOwnerMembership.status !== "active") {
      throw new Error("The new owner must be an active workspace member");
    }

    // Cannot transfer to self
    if (newOwnerId === callerId) {
      throw new Error("You are already the owner");
    }

    const now = Date.now();

    // 1. Update workspace ownerId
    await ctx.db.patch(workspaceId, { ownerId: newOwnerId });

    // 2. Update old owner's membership role to "manager"
    const oldOwnerMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", workspaceId).eq("userId", callerId)
      )
      .first();

    if (oldOwnerMembership) {
      await ctx.db.patch(oldOwnerMembership._id, { role: "manager" });
    }

    // 3. Update new owner's membership role to "owner"
    await ctx.db.patch(newOwnerMembership._id, { role: "owner" });

    // 4. Log the transfer
    await ctx.db.insert("clientActivityLog", {
      workspaceId,
      clientId: (await ctx.db
        .query("clientCompanies")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .first())?._id as any,
      action: "workspace_ownership_transferred",
      targetFreelancerId: newOwnerId,
      metadata: {
        previousOwnerId: callerId,
        newOwnerId,
        transferredAt: now,
      },
      timestamp: now,
    });

    return { success: true, previousOwnerId: callerId, newOwnerId };
  },
});

/**
 * Transfer project ownership to another workspace member.
 * Changes userId and createdBy on the project.
 */
export const transferProjectOwnership = mutation({
  args: {
    projectId: v.id("projects"),
    newOwnerId: v.id("users"),
  },
  handler: async (ctx, { projectId, newOwnerId }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");

    // Caller must have owner-level access
    const access = await getRecordAccess(ctx, project, callerId);
    if (access !== "owner") {
      throw new Error("Only the record owner can transfer ownership");
    }

    // New owner must be in the same workspace
    if (project.workspaceId) {
      const newOwnerMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", project.workspaceId).eq("userId", newOwnerId)
        )
        .first();

      const workspace = await ctx.db.get(project.workspaceId);
      const isWorkspaceOwner = workspace?.ownerId === newOwnerId;

      if (!newOwnerMembership?.status && !isWorkspaceOwner) {
        throw new Error("The new owner must be a member of this workspace");
      }
    }

    if (newOwnerId === callerId) {
      throw new Error("You are already the owner");
    }

    const now = Date.now();

    await ctx.db.patch(projectId, {
      userId: newOwnerId,
      createdBy: newOwnerId,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Transfer client ownership to another workspace member.
 * Changes userId and createdBy on the client.
 */
export const transferClientOwnership = mutation({
  args: {
    clientId: v.id("clients"),
    newOwnerId: v.id("users"),
  },
  handler: async (ctx, { clientId, newOwnerId }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const client = await ctx.db.get(clientId);
    if (!client) throw new Error("Client not found");

    // Caller must have owner-level access
    const access = await getRecordAccess(ctx, client, callerId);
    if (access !== "owner") {
      throw new Error("Only the record owner can transfer ownership");
    }

    // New owner must be in the same workspace
    if (client.workspaceId) {
      const newOwnerMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", client.workspaceId).eq("userId", newOwnerId)
        )
        .first();

      const workspace = await ctx.db.get(client.workspaceId);
      const isWorkspaceOwner = workspace?.ownerId === newOwnerId;

      if (!newOwnerMembership?.status && !isWorkspaceOwner) {
        throw new Error("The new owner must be a member of this workspace");
      }
    }

    if (newOwnerId === callerId) {
      throw new Error("You are already the owner");
    }

    const now = Date.now();

    await ctx.db.patch(clientId, {
      userId: newOwnerId,
      createdBy: newOwnerId,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Transfer deal ownership to another workspace member.
 * Changes userId and createdBy on the deal.
 */
export const transferDealOwnership = mutation({
  args: {
    dealId: v.id("deals"),
    newOwnerId: v.id("users"),
  },
  handler: async (ctx, { dealId, newOwnerId }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const deal = await ctx.db.get(dealId);
    if (!deal) throw new Error("Deal not found");

    // Caller must have owner-level access
    const access = await getRecordAccess(ctx, deal, callerId);
    if (access !== "owner") {
      throw new Error("Only the record owner can transfer ownership");
    }

    // New owner must be in the same workspace
    if (deal.workspaceId) {
      const newOwnerMembership = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", deal.workspaceId).eq("userId", newOwnerId)
        )
        .first();

      const workspace = await ctx.db.get(deal.workspaceId);
      const isWorkspaceOwner = workspace?.ownerId === newOwnerId;

      if (!newOwnerMembership?.status && !isWorkspaceOwner) {
        throw new Error("The new owner must be a member of this workspace");
      }
    }

    if (newOwnerId === callerId) {
      throw new Error("You are already the owner");
    }

    const now = Date.now();

    await ctx.db.patch(dealId, {
      userId: newOwnerId,
      createdBy: newOwnerId,
      updatedAt: now,
    });

    return { success: true };
  },
});

// ---------------------------------------------------------------------------
// Transfer History Query
// ---------------------------------------------------------------------------

/**
 * Get the transfer history for a workspace.
 * Looks at clientActivityLog for ownership transfer events.
 */
export const getTransferHistory = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify membership
    const workspace = await ctx.db.get(workspaceId);
    if (!workspace) return [];

    const isOwner = workspace.ownerId === userId;
    const membership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!membership || membership.status !== "active")) return [];

    // Get transfer logs
    const logs = await ctx.db
      .query("clientActivityLog")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect();

    const transferLogs = logs.filter((log) =>
      log.action?.includes("ownership_transferred") ||
      log.action?.includes("transferred")
    );

    // Enrich with user names
    const enriched = await Promise.all(
      transferLogs.map(async (log) => {
        const targetUser = log.targetFreelancerId
          ? await ctx.db.get(log.targetFreelancerId)
          : null;
        const previousOwner = log.metadata?.previousOwnerId
          ? await ctx.db.get(log.metadata.previousOwnerId)
          : null;

        return {
          _id: log._id,
          action: log.action,
          timestamp: log.timestamp,
          targetUser: targetUser
            ? { name: targetUser.name || targetUser.email || "Unknown", email: targetUser.email }
            : null,
          previousOwner: previousOwner
            ? { name: previousOwner.name || previousOwner.email || "Unknown", email: previousOwner.email }
            : null,
          metadata: log.metadata,
        };
      })
    );

    return enriched.sort((a, b) => b.timestamp - a.timestamp);
  },
});
