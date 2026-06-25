// @ts-nocheck
/**
 * Share Records Query — Fetch all sharing entries across record types.
 * Used by the Pipeline page and Share Records panel to show a unified
 * view of who has access to what.
 */
import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get all records shared with or by the current user in a workspace.
 * Returns clients, projects, deals, and proposals with their sharing entries.
 */
export const getWorkspaceShareRecords = query({
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

    const shareRecords: any[] = [];

    // ── Clients with sharing ──
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(1000);

    for (const client of clients) {
      if (!client.sharing || client.sharing.length === 0) continue;
      const ownerUser = await ctx.db.get(client.userId);
      shareRecords.push({
        recordId: client._id,
        recordType: "client",
        recordName: client.clientName || client.name || "Unnamed Client",
        ownerId: client.userId,
        ownerName: ownerUser?.name || ownerUser?.email || "Unknown",
        sharing: client.sharing,
        createdAt: client.createdAt,
      });
    }

    // ── Projects with sharing ──
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(1000);

    for (const project of projects) {
      if (!project.sharing || project.sharing.length === 0) continue;
      const ownerUser = await ctx.db.get(project.userId);
      shareRecords.push({
        recordId: project._id,
        recordType: "project",
        recordName: project.projectName || "Unnamed Project",
        ownerId: project.userId,
        ownerName: ownerUser?.name || ownerUser?.email || "Unknown",
        sharing: project.sharing,
        createdAt: project.createdAt,
      });
    }

    // ── Deals with sharing ──
    const deals = await ctx.db
      .query("deals")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(1000);

    for (const deal of deals) {
      if (!deal.sharing || deal.sharing.length === 0) continue;
      const ownerUser = await ctx.db.get(deal.userId);
      const stage = await ctx.db.get(deal.stageId);
      shareRecords.push({
        recordId: deal._id,
        recordType: "deal",
        recordName: deal.title || "Unnamed Deal",
        ownerId: deal.userId,
        ownerName: ownerUser?.name || ownerUser?.email || "Unknown",
        stageName: stage?.name || "Unknown",
        dealValue: deal.value,
        sharing: deal.sharing,
        createdAt: deal.createdAt,
      });
    }

    // ── Proposals with sharing ──
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(1000);

    for (const proposal of proposals) {
      if (!proposal.sharing || proposal.sharing.length === 0) continue;
      const ownerUser = await ctx.db.get(proposal.userId);
      shareRecords.push({
        recordId: proposal._id,
        recordType: "proposal",
        recordName: proposal.title || "Unnamed Proposal",
        ownerId: proposal.userId,
        ownerName: ownerUser?.name || ownerUser?.email || "Unknown",
        proposalStatus: proposal.status,
        sharing: proposal.sharing,
        createdAt: proposal.createdAt,
      });
    }

    // ── Enrich sharing entries with user/team names ──
    const enrichedRecords = await Promise.all(
      shareRecords.map(async (record) => {
        const enrichedSharing = await Promise.all(
          record.sharing.map(async (entry: any) => {
            const enrichedEntry: any = { ...entry };

            if (entry.teamId) {
              const team = await ctx.db.get(entry.teamId);
              enrichedEntry.teamName = team?.name || `Team ${entry.teamId.slice(-6)}`;
            }

            if (entry.userId) {
              const user = await ctx.db.get(entry.userId);
              enrichedEntry.userName = user?.name || user?.email || `User ${entry.userId.slice(-6)}`;
              enrichedEntry.userEmail = user?.email;
            }

            return enrichedEntry;
          })
        );

        return { ...record, sharing: enrichedSharing };
      })
    );

    return enrichedRecords.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
});

/**
 * Get a summary of sharing stats for a workspace.
 */
export const getShareStats = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const workspace = await ctx.db.get(workspaceId);
    if (!workspace) return null;

    const isOwner = workspace.ownerId === userId;
    const membership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!membership || membership.status !== "active")) return null;

    let totalSharedRecords = 0;
    let totalSharingEntries = 0;
    let byType: Record<string, number> = { client: 0, project: 0, deal: 0, proposal: 0 };
    let byAccessLevel: Record<string, number> = { read: 0, comment: 0, collaborate: 0, full: 0 };

    // Count shared clients
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(1000);

    for (const client of clients) {
      if (client.sharing && client.sharing.length > 0) {
        totalSharedRecords++;
        byType.client++;
        for (const entry of client.sharing) {
          totalSharingEntries++;
          byAccessLevel[entry.access] = (byAccessLevel[entry.access] || 0) + 1;
        }
      }
    }

    // Count shared projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(1000);

    for (const project of projects) {
      if (project.sharing && project.sharing.length > 0) {
        totalSharedRecords++;
        byType.project++;
        for (const entry of project.sharing) {
          totalSharingEntries++;
          byAccessLevel[entry.access] = (byAccessLevel[entry.access] || 0) + 1;
        }
      }
    }

    // Count shared deals
    const deals = await ctx.db
      .query("deals")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(1000);

    for (const deal of deals) {
      if (deal.sharing && deal.sharing.length > 0) {
        totalSharedRecords++;
        byType.deal++;
        for (const entry of deal.sharing) {
          totalSharingEntries++;
          byAccessLevel[entry.access] = (byAccessLevel[entry.access] || 0) + 1;
        }
      }
    }

    // Count shared proposals
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(1000);

    for (const proposal of proposals) {
      if (proposal.sharing && proposal.sharing.length > 0) {
        totalSharedRecords++;
        byType.proposal++;
        for (const entry of proposal.sharing) {
          totalSharingEntries++;
          byAccessLevel[entry.access] = (byAccessLevel[entry.access] || 0) + 1;
        }
      }
    }

    return {
      totalSharedRecords,
      totalSharingEntries,
      byType,
      byAccessLevel,
    };
  },
});
