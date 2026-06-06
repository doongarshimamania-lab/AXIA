import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getStages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("pipelineStages")
      .withIndex("by_user_and_order", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

export const getDeals = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
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
      .collect();
  },
});

export const getPipelineStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalDeals: 0, totalValue: 0, weightedValue: 0, byStage: [] };

    const deals = await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const stages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
  args: { name: v.string(), color: v.string() },
  handler: async (ctx, { name, color }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user_and_order", (q) => q.eq("userId", userId))
      .collect();

    const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) : -1;

    return await ctx.db.insert("pipelineStages", {
      userId,
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
    if (!stage || stage.userId !== userId) throw new Error("Not authorized");

    const updates: any = {};
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
    if (!stage || stage.userId !== userId) throw new Error("Not authorized");

    // Move deals in this stage to the first available stage
    const deals = await ctx.db
      .query("deals")
      .withIndex("by_stage", (q) => q.eq("stageId", stageId))
      .collect();

    const stages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const dealsInStage = await ctx.db
      .query("deals")
      .withIndex("by_stage", (q) => q.eq("stageId", args.stageId))
      .collect();

    const maxOrder = dealsInStage.length > 0 ? Math.max(...dealsInStage.map(d => d.order)) : -1;

    return await ctx.db.insert("deals", {
      userId,
      ...args,
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
  },
  handler: async (ctx, { dealId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deal = await ctx.db.get(dealId);
    if (!deal || deal.userId !== userId) throw new Error("Not authorized");

    const patch: any = { ...updates, updatedAt: Date.now() };
    await ctx.db.patch(dealId, patch);
  },
});

export const moveDeal = mutation({
  args: { dealId: v.id("deals"), stageId: v.id("pipelineStages"), order: v.optional(v.number()) },
  handler: async (ctx, { dealId, stageId, order }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deal = await ctx.db.get(dealId);
    if (!deal || deal.userId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(dealId, { stageId, order: order ?? deal.order, updatedAt: Date.now() });
  },
});

export const deleteDeal = mutation({
  args: { dealId: v.id("deals") },
  handler: async (ctx, { dealId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deal = await ctx.db.get(dealId);
    if (!deal || deal.userId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(dealId);
  },
});
