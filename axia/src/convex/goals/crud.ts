import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getGoals = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (workspaceId) {
      return await ctx.db
        .query("goals")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(1000);
    }
    return await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);
  },
});

export const getGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId) return null;
    return goal;
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

export const createGoal = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    target: v.number(),
    current: v.number(),
    unit: v.string(),
    deadline: v.optional(v.number()),
    status: v.string(),
    milestones: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          completed: v.boolean(),
          completedAt: v.optional(v.number()),
        })
      )
    ),
    streak: v.optional(v.number()),
    lastCheckIn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "createGoal");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("goals", {
      userId,
      workspaceId: args.workspaceId,
      createdBy: userId,
      title: args.title,
      description: args.description,
      type: args.type,
      target: args.target,
      current: args.current,
      unit: args.unit,
      deadline: args.deadline,
      status: args.status,
      milestones: args.milestones,
      streak: args.streak,
      lastCheckIn: args.lastCheckIn,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateGoal = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    target: v.optional(v.number()),
    current: v.optional(v.number()),
    unit: v.optional(v.string()),
    deadline: v.optional(v.number()),
    status: v.optional(v.string()),
    streak: v.optional(v.number()),
    lastCheckIn: v.optional(v.number()),
  },
  handler: async (ctx, { goalId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(goalId, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteGoal = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(goalId);
  },
});

export const markGoalComplete = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId) throw new Error("Not authorized");

    const now = Date.now();

    // Mark all milestones as completed
    const updatedMilestones = (goal.milestones ?? []).map((m) => ({
      ...m,
      completed: true,
      completedAt: m.completed ? m.completedAt : now,
    }));

    await ctx.db.patch(goalId, {
      status: "completed",
      current: goal.target,
      milestones: updatedMilestones,
      updatedAt: now,
    });
  },
});

export const updateMilestone = mutation({
  args: {
    goalId: v.id("goals"),
    milestoneId: v.string(),
    completed: v.boolean(),
  },
  handler: async (ctx, { goalId, milestoneId, completed }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId) throw new Error("Not authorized");

    const now = Date.now();
    const milestones = (goal.milestones ?? []).map((m) =>
      m.id === milestoneId
        ? { ...m, completed, completedAt: completed ? now : undefined }
        : m
    );

    await ctx.db.patch(goalId, {
      milestones,
      updatedAt: now,
    });
  },
});
