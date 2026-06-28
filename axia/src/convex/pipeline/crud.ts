// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireWorkspaceAccess, getWorkspaceMembership, getRecordAccess } from "../permissions";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getStages = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // If workspaceId provided, filter by workspace; otherwise fall back to userId
    if (workspaceId) {
      // Verify workspace membership
      const membership = await getWorkspaceMembership(ctx, workspaceId, userId);
      if (!membership) return [];

      const stages = await ctx.db
        .query("pipelineStages")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .order("asc")
        .take(1000);

      // Dedup by _id (defensive — historical seed races could create dupes)
      const seen = new Set<string>();
      const unique = stages.filter((s) => {
        if (seen.has(s._id)) return false;
        seen.add(s._id);
        return true;
      });
      // Further dedup by name+order (keep the oldest by _creationTime) — this
      // handles the case where two seed mutations created duplicate stages
      // with different _ids but the same name. Keeps the first occurrence
      // (already sorted by _creationTime asc through the index).
      const byName = new Map<string, typeof unique[number]>();
      for (const s of unique) {
        const key = `${s.name}|${s.order}`;
        if (!byName.has(key)) byName.set(key, s);
      }
      return Array.from(byName.values()).sort((a, b) => a.order - b.order);
    }

    const stages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user_and_order", (q) => q.eq("userId", userId))
      .order("asc")
      .take(1000);
    const seen = new Set<string>();
    return stages.filter((s) => {
      if (seen.has(s._id)) return false;
      seen.add(s._id);
      return true;
    });
  },
});

export const getDeals = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // If workspaceId provided, filter by workspace; otherwise fall back to userId
    if (workspaceId) {
      // Verify workspace membership
      const membership = await getWorkspaceMembership(ctx, workspaceId, userId);
      if (!membership) return [];

      return await ctx.db
        .query("deals")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(1000);
    }

    return await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);
  },
});

export const getDealsByStage = query({
  args: { stageId: v.id("pipelineStages") },
  handler: async (ctx, { stageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("deals")
      .withIndex("by_stage", (q) => q.eq("stageId", stageId))
      .order("asc")
      .take(1000);
  },
});

export const getPipelineStats = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalDeals: 0, totalValue: 0, weightedValue: 0, byStage: [] };

    let deals, stages;
    if (workspaceId) {
      const membership = await getWorkspaceMembership(ctx, workspaceId, userId);
      if (!membership) return { totalDeals: 0, totalValue: 0, weightedValue: 0, byStage: [] };

      deals = await ctx.db
        .query("deals")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(1000);
      stages = await ctx.db
        .query("pipelineStages")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(1000);
      // Dedupe stages so the byStage breakdown doesn't show duplicate columns
      const seenStageIds = new Set<string>();
      const seenStageKeys = new Set<string>();
      stages = stages.filter((s) => {
        if (seenStageIds.has(s._id)) return false;
        seenStageIds.add(s._id);
        const key = `${s.name}|${s.order}`;
        if (seenStageKeys.has(key)) return false;
        seenStageKeys.add(key);
        return true;
      });
    } else {
      deals = await ctx.db
        .query("deals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(1000);
      stages = await ctx.db
        .query("pipelineStages")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(1000);
    }

    const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = deals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);

    const byStage = stages.map(stage => {
      const stageDeals = deals.filter(d => d.stageId === stage._id);
      return {
        stageId: stage._id,
        stageName: stage.name,
        color: stage.color,
        dealCount: stageDeals.length,
        totalValue: stageDeals.reduce((sum, d) => sum + d.value, 0),
      };
    });

    return { totalDeals: deals.length, totalValue, weightedValue, byStage };
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

export const createDefaultStages = mutation({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If workspaceId provided, verify membership
    if (workspaceId) {
      await requireWorkspaceAccess(ctx, workspaceId, "member");
    }

    // Check existing stages
    let existing;
    if (workspaceId) {
      existing = await ctx.db
        .query("pipelineStages")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(1000);
    } else {
      existing = await ctx.db
        .query("pipelineStages")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(1000);
    }

    if (existing.length > 0) return existing;

    const defaults = [
      { name: "Lead", color: "#6366f1" },
      { name: "Qualified", color: "#8b5cf6" },
      { name: "Proposal", color: "#a855f7" },
      { name: "Negotiation", color: "#c084fc" },
      { name: "Won", color: "#22c55e" },
      { name: "Lost", color: "#ef4444" },
    ];

    const created = [];
    for (let i = 0; i < defaults.length; i++) {
      const id = await ctx.db.insert("pipelineStages", {
        userId,
        workspaceId: workspaceId ?? undefined,
        createdBy: userId,
        name: defaults[i].name,
        color: defaults[i].color,
        order: i,
        isDefault: true,
      });
      created.push(id);
    }
    return created;
  },
});

export const addStage = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, { name, color, workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If workspaceId provided, verify membership
    if (workspaceId) {
      await requireWorkspaceAccess(ctx, workspaceId, "member");
    }

    let stages;
    if (workspaceId) {
      stages = await ctx.db
        .query("pipelineStages")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(1000);
    } else {
      stages = await ctx.db
        .query("pipelineStages")
        .withIndex("by_user_and_order", (q) => q.eq("userId", userId))
        .take(1000);
    }

    const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) : -1;

    return await ctx.db.insert("pipelineStages", {
      userId,
      workspaceId: workspaceId ?? undefined,
      createdBy: userId,
      name,
      color,
      order: maxOrder + 1,
    });
  },
});

export const updateStage = mutation({
  args: { stageId: v.id("pipelineStages"), name: v.optional(v.string()), color: v.optional(v.string()), order: v.optional(v.number()) },
  handler: async (ctx, { stageId, name, color, order }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stage = await ctx.db.get(stageId);
    if (!stage) throw new Error("Stage not found");

    // Check workspace access or direct ownership
    if (stage.workspaceId) {
      const access = await getRecordAccess(ctx, stage, userId);
      if (!access || access === "read" || access === "comment") {
        throw new Error("Not authorized");
      }
    } else if (stage.userId !== userId) {
      throw new Error("Not authorized");
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (order !== undefined) updates.order = order;

    await ctx.db.patch(stageId, updates);
  },
});

export const deleteStage = mutation({
  args: { stageId: v.id("pipelineStages") },
  handler: async (ctx, { stageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stage = await ctx.db.get(stageId);
    if (!stage) throw new Error("Stage not found");

    // Check workspace access or direct ownership
    if (stage.workspaceId) {
      const access = await getRecordAccess(ctx, stage, userId);
      if (access !== "owner") {
        throw new Error("Not authorized — only owners can delete stages");
      }
    } else if (stage.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Move deals in this stage to the first available stage
    const deals = await ctx.db
      .query("deals")
      .withIndex("by_stage", (q) => q.eq("stageId", stageId))
      .take(1000);

    const stages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const fallbackStage = stages.find(s => s._id !== stageId);
    if (fallbackStage) {
      for (const deal of deals) {
        await ctx.db.patch(deal._id, { stageId: fallbackStage._id });
      }
    }

    await ctx.db.delete(stageId);
  },
});

export const createDeal = mutation({
  args: {
    stageId: v.id("pipelineStages"),
    title: v.string(),
    value: v.number(),
    probability: v.optional(v.number()),
    clientId: v.optional(v.id("clients")),
    description: v.optional(v.string()),
    source: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    expectedCloseDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "createDeal");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If workspaceId provided, verify membership
    if (args.workspaceId) {
      await requireWorkspaceAccess(ctx, args.workspaceId, "member");
    }

    const { workspaceId, teamId, customFields, ...rest } = args;

    const dealsInStage = await ctx.db
      .query("deals")
      .withIndex("by_stage", (q) => q.eq("stageId", args.stageId))
      .take(1000);

    const maxOrder = dealsInStage.length > 0 ? Math.max(...dealsInStage.map(d => d.order)) : -1;

    return await ctx.db.insert("deals", {
      userId,
      workspaceId: workspaceId ?? undefined,
      createdBy: userId,
      teamId: teamId ?? undefined,
      ...rest,
      customFields: customFields ?? undefined,
      probability: args.probability ?? 20,
      currency: "USD",
      order: maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateDeal = mutation({
  args: {
    dealId: v.id("deals"),
    title: v.optional(v.string()),
    value: v.optional(v.number()),
    probability: v.optional(v.number()),
    stageId: v.optional(v.id("pipelineStages")),
    description: v.optional(v.string()),
    source: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    expectedCloseDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, { dealId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deal = await ctx.db.get(dealId);
    if (!deal) throw new Error("Deal not found");

    // Check workspace access or direct ownership
    if (deal.workspaceId) {
      const access = await getRecordAccess(ctx, deal, userId);
      if (!access || access === "read" || access === "comment") {
        throw new Error("Not authorized");
      }
    } else if (deal.userId !== userId) {
      throw new Error("Not authorized");
    }

    const patch: Record<string, any> = { ...updates, updatedAt: Date.now() };
    await ctx.db.patch(dealId, patch);
  },
});

export const moveDeal = mutation({
  args: { dealId: v.id("deals"), stageId: v.id("pipelineStages"), order: v.optional(v.number()) },
  handler: async (ctx, { dealId, stageId, order }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deal = await ctx.db.get(dealId);
    if (!deal) throw new Error("Deal not found");

    // Check workspace access or direct ownership
    if (deal.workspaceId) {
      const access = await getRecordAccess(ctx, deal, userId);
      if (!access || access === "read" || access === "comment") {
        throw new Error("Not authorized");
      }
    } else if (deal.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(dealId, { stageId, order: order ?? deal.order, updatedAt: Date.now() });
  },
});

export const deleteDeal = mutation({
  args: { dealId: v.id("deals") },
  handler: async (ctx, { dealId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deal = await ctx.db.get(dealId);
    if (!deal) throw new Error("Deal not found");

    // Check workspace access or direct ownership
    if (deal.workspaceId) {
      const access = await getRecordAccess(ctx, deal, userId);
      if (access !== "owner") {
        throw new Error("Not authorized — only owners can delete deals");
      }
    } else if (deal.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(dealId);
  },
});

export const linkDealToProposal = mutation({
  args: { dealId: v.id("deals"), proposalId: v.id("proposals") },
  handler: async (ctx, { dealId, proposalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deal = await ctx.db.get(dealId);
    if (!deal) throw new Error("Deal not found");

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    // Check access for deal
    if (deal.workspaceId) {
      const access = await getRecordAccess(ctx, deal, userId);
      if (!access || access === "read" || access === "comment") {
        throw new Error("Not authorized on deal");
      }
    } else if (deal.userId !== userId) {
      throw new Error("Not authorized on deal");
    }

    // Check access for proposal
    if (proposal.workspaceId) {
      const access = await getRecordAccess(ctx, proposal, userId);
      if (!access || access === "read" || access === "comment") {
        throw new Error("Not authorized on proposal");
      }
    } else if (proposal.userId !== userId) {
      throw new Error("Not authorized on proposal");
    }

    await ctx.db.patch(dealId, { proposalId, updatedAt: Date.now() });
    await ctx.db.patch(proposalId, { dealId, updatedAt: Date.now() });
  },
});

export const getDeal = query({
  args: { dealId: v.id("deals") },
  handler: async (ctx, { dealId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const deal = await ctx.db.get(dealId);
    if (!deal) return null;

    // Check workspace access or direct ownership
    if (deal.workspaceId) {
      const access = await getRecordAccess(ctx, deal, userId);
      if (!access) return null;
    } else if (deal.userId !== userId) {
      return null;
    }
    return deal;
  },
});
