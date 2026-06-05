import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

// ═════════════════════════════════════════════
// PIPELINE STAGES
// ═════════════════════════════════════════════

// ─────────────────────────────────────────────
// 1. CREATE DEFAULT STAGES (idempotent)
// ─────────────────────────────────────────────
export const createDefaultStages = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Check if stages already exist for this user
    const existing = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existing.length > 0) {
      return { created: false, message: "Pipeline stages already exist", stages: existing };
    }

    const now = Date.now();
    const defaultStages = [
      { name: "Lead", order: 0, color: "#6B7280", isDefault: true },
      { name: "Qualified", order: 1, color: "#3B82F6", isDefault: true },
      { name: "Proposal Sent", order: 2, color: "#F59E0B", isDefault: true },
      { name: "Negotiation", order: 3, color: "#8B5CF6", isDefault: true },
      { name: "Won", order: 4, color: "#10B981", isDefault: true },
      { name: "Lost", order: 5, color: "#EF4444", isDefault: true },
    ];

    const stageIds = [];
    for (const stage of defaultStages) {
      const id = await ctx.db.insert("pipelineStages", {
        userId,
        name: stage.name,
        order: stage.order,
        color: stage.color,
        isDefault: stage.isDefault,
        createdAt: now,
      });
      stageIds.push(id);
    }

    return { created: true, count: stageIds.length, stageIds };
  },
});

// ─────────────────────────────────────────────
// 2. LIST STAGES (ordered by `order`)
// ─────────────────────────────────────────────
export const listStages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const stages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user_and_order", (q) => q.eq("userId", userId))
      .collect();

    return stages;
  },
});

// ─────────────────────────────────────────────
// 3. UPDATE STAGE
// ─────────────────────────────────────────────
export const updateStage = mutation({
  args: {
    stageId: v.id("pipelineStages"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const stage = await ctx.db.get(args.stageId);
    if (!stage) throw new ConvexError("Pipeline stage not found");
    if (stage.userId !== userId) throw new ConvexError("Not authorized to update this pipeline stage");

    // Validate name is not empty if provided
    if (args.name !== undefined && args.name.trim().length === 0) {
      throw new ConvexError("Stage name cannot be empty");
    }

    // Validate order is non-negative if provided
    if (args.order !== undefined && args.order < 0) {
      throw new ConvexError("Stage order must be non-negative");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.color !== undefined) updates.color = args.color;
    if (args.order !== undefined) updates.order = args.order;

    if (Object.keys(updates).length === 0) {
      throw new ConvexError("No fields to update");
    }

    await ctx.db.patch(args.stageId, updates);

    return args.stageId;
  },
});

// ─────────────────────────────────────────────
// 4. REMOVE STAGE (move deals to first stage)
// ─────────────────────────────────────────────
export const removeStage = mutation({
  args: {
    stageId: v.id("pipelineStages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const stage = await ctx.db.get(args.stageId);
    if (!stage) throw new ConvexError("Pipeline stage not found");
    if (stage.userId !== userId) throw new ConvexError("Not authorized to delete this pipeline stage");

    // Get all stages for this user, ordered by `order`, to find the first one
    const allStages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user_and_order", (q) => q.eq("userId", userId))
      .collect();

    // Cannot delete if this is the only stage
    if (allStages.length <= 1) {
      throw new ConvexError("Cannot delete the only pipeline stage");
    }

    // Find the first stage (lowest order) that is NOT the stage being deleted
    const firstStage = allStages
      .filter((s) => s._id !== args.stageId)
      .sort((a, b) => a.order - b.order)[0];

    if (!firstStage) {
      throw new ConvexError("No fallback stage available for deal migration");
    }

    // Move any deals in the deleted stage to the first stage
    const dealsInStage = await ctx.db
      .query("deals")
      .withIndex("by_user_and_stage", (q) =>
        q.eq("userId", userId).eq("pipelineStageId", args.stageId)
      )
      .collect();

    const now = Date.now();
    for (const deal of dealsInStage) {
      await ctx.db.patch(deal._id, {
        pipelineStageId: firstStage._id,
        updatedAt: now,
      });
    }

    // Delete the stage
    await ctx.db.delete(args.stageId);

    return {
      success: true,
      deletedStageId: args.stageId,
      dealsMoved: dealsInStage.length,
      movedToStageId: firstStage._id,
    };
  },
});

// ═════════════════════════════════════════════
// DEALS
// ═════════════════════════════════════════════

// ─────────────────────────────────────────────
// 5. CREATE DEAL
// ─────────────────────────────────────────────
export const create = mutation({
  args: {
    clientId: v.optional(v.id("clients")),
    pipelineStageId: v.id("pipelineStages"),
    title: v.string(),
    value: v.number(),
    probability: v.optional(v.number()),
    expectedCloseDate: v.optional(v.number()),
    proposalId: v.optional(v.id("proposals")),
    notes: v.optional(v.string()),
    lostReason: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Validate title is not empty
    if (args.title.trim().length === 0) {
      throw new ConvexError("Deal title cannot be empty");
    }

    // Validate value is non-negative
    if (args.value < 0) {
      throw new ConvexError("Deal value cannot be negative");
    }

    // Validate probability is 0-100 if provided
    if (args.probability !== undefined && (args.probability < 0 || args.probability > 100)) {
      throw new ConvexError("Probability must be between 0 and 100");
    }

    // Validate pipelineStageId belongs to user
    const stage = await ctx.db.get(args.pipelineStageId);
    if (!stage) throw new ConvexError("Pipeline stage not found");
    if (stage.userId !== userId) throw new ConvexError("Pipeline stage does not belong to this user");

    // Validate client ownership if provided
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (!client) throw new ConvexError("Client not found");
      if (client.userId !== userId) throw new ConvexError("Client does not belong to this user");
    }

    // Validate proposal ownership if provided
    if (args.proposalId) {
      const proposal = await ctx.db.get(args.proposalId);
      if (!proposal) throw new ConvexError("Proposal not found");
      if (proposal.userId !== userId) throw new ConvexError("Proposal does not belong to this user");
    }

    const now = Date.now();

    const dealId = await ctx.db.insert("deals", {
      userId,
      clientId: args.clientId,
      pipelineStageId: args.pipelineStageId,
      title: args.title.trim(),
      value: args.value,
      probability: args.probability,
      expectedCloseDate: args.expectedCloseDate,
      proposalId: args.proposalId,
      notes: args.notes,
      lostReason: args.lostReason,
      source: args.source,
      createdAt: now,
      updatedAt: now,
    });

    return dealId;
  },
});

// ─────────────────────────────────────────────
// 6. UPDATE DEAL (partial)
// ─────────────────────────────────────────────
export const update = mutation({
  args: {
    dealId: v.id("deals"),
    clientId: v.optional(v.id("clients")),
    pipelineStageId: v.optional(v.id("pipelineStages")),
    title: v.optional(v.string()),
    value: v.optional(v.number()),
    probability: v.optional(v.number()),
    expectedCloseDate: v.optional(v.number()),
    proposalId: v.optional(v.id("proposals")),
    notes: v.optional(v.string()),
    lostReason: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const deal = await ctx.db.get(args.dealId);
    if (!deal) throw new ConvexError("Deal not found");
    if (deal.userId !== userId) throw new ConvexError("Not authorized to update this deal");

    // Validate title if provided
    if (args.title !== undefined && args.title.trim().length === 0) {
      throw new ConvexError("Deal title cannot be empty");
    }

    // Validate value if provided
    if (args.value !== undefined && args.value < 0) {
      throw new ConvexError("Deal value cannot be negative");
    }

    // Validate probability if provided
    if (args.probability !== undefined && (args.probability < 0 || args.probability > 100)) {
      throw new ConvexError("Probability must be between 0 and 100");
    }

    // Validate pipelineStageId belongs to user if provided
    if (args.pipelineStageId) {
      const stage = await ctx.db.get(args.pipelineStageId);
      if (!stage) throw new ConvexError("Pipeline stage not found");
      if (stage.userId !== userId) throw new ConvexError("Pipeline stage does not belong to this user");
    }

    // Validate client ownership if provided
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (!client) throw new ConvexError("Client not found");
      if (client.userId !== userId) throw new ConvexError("Client does not belong to this user");
    }

    // Validate proposal ownership if provided
    if (args.proposalId) {
      const proposal = await ctx.db.get(args.proposalId);
      if (!proposal) throw new ConvexError("Proposal not found");
      if (proposal.userId !== userId) throw new ConvexError("Proposal does not belong to this user");
    }

    // Build partial update object
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.clientId !== undefined) updates.clientId = args.clientId;
    if (args.pipelineStageId !== undefined) updates.pipelineStageId = args.pipelineStageId;
    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.value !== undefined) updates.value = args.value;
    if (args.probability !== undefined) updates.probability = args.probability;
    if (args.expectedCloseDate !== undefined) updates.expectedCloseDate = args.expectedCloseDate;
    if (args.proposalId !== undefined) updates.proposalId = args.proposalId;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.lostReason !== undefined) updates.lostReason = args.lostReason;
    if (args.source !== undefined) updates.source = args.source;

    await ctx.db.patch(args.dealId, updates);

    return args.dealId;
  },
});

// ─────────────────────────────────────────────
// 7. MOVE TO STAGE
// ─────────────────────────────────────────────
export const moveToStage = mutation({
  args: {
    dealId: v.id("deals"),
    pipelineStageId: v.id("pipelineStages"),
    lostReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const deal = await ctx.db.get(args.dealId);
    if (!deal) throw new ConvexError("Deal not found");
    if (deal.userId !== userId) throw new ConvexError("Not authorized to move this deal");

    const targetStage = await ctx.db.get(args.pipelineStageId);
    if (!targetStage) throw new ConvexError("Pipeline stage not found");
    if (targetStage.userId !== userId) throw new ConvexError("Pipeline stage does not belong to this user");

    const now = Date.now();
    const updates: Record<string, unknown> = {
      pipelineStageId: args.pipelineStageId,
      updatedAt: now,
    };

    // If moving to "Won", set probability to 100
    if (targetStage.name.toLowerCase() === "won") {
      updates.probability = 100;
    }

    // If moving to "Lost", require lostReason
    if (targetStage.name.toLowerCase() === "lost") {
      if (!args.lostReason || args.lostReason.trim().length === 0) {
        throw new ConvexError("A lost reason is required when moving a deal to the Lost stage");
      }
      updates.lostReason = args.lostReason.trim();
      updates.probability = 0;
    }

    await ctx.db.patch(args.dealId, updates);

    return args.dealId;
  },
});

// ─────────────────────────────────────────────
// 8. GET DEAL (with ownership check)
// ─────────────────────────────────────────────
export const get = query({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const deal = await ctx.db.get(args.dealId);
    if (!deal) throw new ConvexError("Deal not found");
    if (deal.userId !== userId) throw new ConvexError("Not authorized to view this deal");

    return deal;
  },
});

// ─────────────────────────────────────────────
// 9. LIST DEALS (with optional pipelineStageId filter)
// ─────────────────────────────────────────────
export const list = query({
  args: {
    pipelineStageId: v.optional(v.id("pipelineStages")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    if (args.pipelineStageId) {
      // Validate stage ownership
      const stage = await ctx.db.get(args.pipelineStageId);
      if (!stage) throw new ConvexError("Pipeline stage not found");
      if (stage.userId !== userId) throw new ConvexError("Pipeline stage does not belong to this user");

      const deals = await ctx.db
        .query("deals")
        .withIndex("by_user_and_stage", (q) =>
          q.eq("userId", userId).eq("pipelineStageId", args.pipelineStageId!)
        )
        .order("desc")
        .collect();
      return deals;
    }

    // No filter — return all deals for this user
    const deals = await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return deals.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// ─────────────────────────────────────────────
// 10. GET PIPELINE STATS
// ─────────────────────────────────────────────
export const getPipelineStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Get all stages for the user
    const stages = await ctx.db
      .query("pipelineStages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get all deals for the user
    const deals = await ctx.db
      .query("deals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Total deals by stage
    const dealsByStage: Record<string, number> = {};
    for (const stage of stages) {
      dealsByStage[stage.name] = deals.filter((d) => d.pipelineStageId === stage._id).length;
    }

    // Total pipeline value (sum of all deal values)
    const totalPipelineValue = deals.reduce((sum, d) => sum + d.value, 0);

    // Weighted pipeline value (value * probability / 100)
    const weightedPipelineValue = deals.reduce((sum, d) => {
      const prob = d.probability ?? 0;
      return sum + (d.value * prob) / 100;
    }, 0);

    // Win rate: won deals / (won + lost deals)
    const wonStage = stages.find((s) => s.name.toLowerCase() === "won");
    const lostStage = stages.find((s) => s.name.toLowerCase() === "lost");

    const wonDeals = wonStage ? deals.filter((d) => d.pipelineStageId === wonStage._id) : [];
    const lostDeals = lostStage ? deals.filter((d) => d.pipelineStageId === lostStage._id) : [];

    const totalClosed = wonDeals.length + lostDeals.length;
    const winRate = totalClosed > 0 ? wonDeals.length / totalClosed : 0;

    // Average deal cycle time (days from createdAt to when moved to Won)
    // We approximate by checking updatedAt on won deals vs createdAt
    const wonDealsWithDates = wonDeals.filter((d) => d.createdAt && d.updatedAt);
    const avgDealCycleDays = wonDealsWithDates.length > 0
      ? wonDealsWithDates.reduce((sum, d) => {
          const days = (d.updatedAt - d.createdAt) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / wonDealsWithDates.length
      : 0;

    return {
      dealsByStage,
      totalDeals: deals.length,
      totalPipelineValue,
      weightedPipelineValue,
      winRate: Math.round(winRate * 100) / 100,
      avgDealCycleDays: Math.round(avgDealCycleDays * 10) / 10,
      wonCount: wonDeals.length,
      lostCount: lostDeals.length,
    };
  },
});

// ─────────────────────────────────────────────
// 11. REMOVE DEAL
// ─────────────────────────────────────────────
export const remove = mutation({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const deal = await ctx.db.get(args.dealId);
    if (!deal) throw new ConvexError("Deal not found");
    if (deal.userId !== userId) throw new ConvexError("Not authorized to delete this deal");

    await ctx.db.delete(args.dealId);

    return { success: true, deletedId: args.dealId };
  },
});
