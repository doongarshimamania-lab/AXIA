import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getTags = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (workspaceId) {
      return await ctx.db
        .query("tags")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();
    }
    return await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getTag = query({
  args: { tagId: v.id("tags") },
  handler: async (ctx, { tagId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const tag = await ctx.db.get(tagId);
    if (!tag || tag.userId !== userId) return null;
    return tag;
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

export const createTag = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    name: v.string(),
    color: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { workspaceId, name, color, category }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check for duplicate name
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existing.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("A tag with this name already exists");
    }

    return await ctx.db.insert("tags", {
      userId,
      workspaceId,
      createdBy: userId,
      name,
      color,
      category,
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const updateTag = mutation({
  args: {
    tagId: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    category: v.optional(v.string()),
    usageCount: v.optional(v.number()),
  },
  handler: async (ctx, { tagId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const tag = await ctx.db.get(tagId);
    if (!tag || tag.userId !== userId) throw new Error("Not authorized");

    // Check for duplicate name if name is being updated
    if (updates.name && updates.name.toLowerCase() !== tag.name.toLowerCase()) {
      const existing = await ctx.db
        .query("tags")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      if (existing.some((t) => t._id !== tagId && t.name.toLowerCase() === updates.name!.toLowerCase())) {
        throw new Error("A tag with this name already exists");
      }
    }

    await ctx.db.patch(tagId, updates);
  },
});

export const deleteTag = mutation({
  args: { tagId: v.id("tags") },
  handler: async (ctx, { tagId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const tag = await ctx.db.get(tagId);
    if (!tag || tag.userId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(tagId);
  },
});
