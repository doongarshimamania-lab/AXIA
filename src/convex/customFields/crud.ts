// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "../permissions";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// ─── QUERIES ──────────────────────────────────────────────────────────────

/**
 * Get all custom field definitions for a specific table (e.g. "clients", "deals", "projects")
 * within a workspace, ordered by their `order` field.
 */
export const getFields = query({
  args: {
    workspaceId: v.id("workspaces"),
    tableName: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify workspace membership
    const userId = await requireWorkspaceAccess(ctx, args.workspaceId, "member");

    const fields = await ctx.db
      .query("customFieldDefinitions")
      .withIndex("by_workspace_and_table", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("tableName", args.tableName)
      )
      .take(1000);

    // Sort by order
    return fields.sort((a, b) => a.order - b.order);
  },
});

/**
 * Get all custom field definitions for an entire workspace (across all tables).
 */
export const getAllFields = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId, "member");

    return await ctx.db
      .query("customFieldDefinitions")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", args.workspaceId)
      )
      .take(1000);
  },
});

/**
 * Get a single custom field definition by ID.
 */
export const getField = query({
  args: {
    fieldId: v.id("customFieldDefinitions"),
  },
  handler: async (ctx, args) => {
    const field = await ctx.db.get(args.fieldId);
    if (!field) return null;

    // Verify workspace membership
    await requireWorkspaceAccess(ctx, field.workspaceId, "member");
    return field;
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

/**
 * Create a new custom field definition.
 * `fieldName` is the machine-readable key stored in `customFields` objects.
 * `label` is the human-readable label shown in the UI.
 */
export const createField = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    tableName: v.string(),
    fieldName: v.string(),
    label: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("number"),
      v.literal("boolean"),
      v.literal("date"),
      v.literal("select")
    ),
    options: v.optional(v.array(v.string())),
    required: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "createField");
    await requireWorkspaceAccess(ctx, args.workspaceId, "member");

    // Determine the order — place after the last existing field for this table
    const existing = await ctx.db
      .query("customFieldDefinitions")
      .withIndex("by_workspace_and_table", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("tableName", args.tableName)
      )
      .take(1000);

    const maxOrder =
      existing.length > 0 ? Math.max(...existing.map((f) => f.order)) : -1;

    // Validate: select type must have options
    if (args.type === "select" && (!args.options || args.options.length === 0)) {
      throw new Error("Select type fields must have at least one option");
    }

    // Validate: fieldName should be unique within this table+workspace
    const duplicate = existing.find((f) => f.fieldName === args.fieldName);
    if (duplicate) {
      throw new Error(
        `A custom field with fieldName "${args.fieldName}" already exists for ${args.tableName}`
      );
    }

    return await ctx.db.insert("customFieldDefinitions", {
      workspaceId: args.workspaceId,
      tableName: args.tableName,
      fieldName: args.fieldName,
      label: args.label,
      type: args.type,
      options: args.type === "select" ? args.options : undefined,
      required: args.required ?? false,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update a custom field definition.
 * Only the provided fields will be updated.
 */
export const updateField = mutation({
  args: {
    fieldId: v.id("customFieldDefinitions"),
    fieldName: v.optional(v.string()),
    label: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("text"),
        v.literal("number"),
        v.literal("boolean"),
        v.literal("date"),
        v.literal("select")
      )
    ),
    options: v.optional(v.array(v.string())),
    required: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "updateField");
    const { fieldId, ...updates } = args;

    const field = await ctx.db.get(fieldId);
    if (!field) throw new Error("Custom field not found");

    // Verify workspace membership
    await requireWorkspaceAccess(ctx, field.workspaceId, "member");

    // Build patch object — only include defined values
    const patch: Record<string, any> = {};
    if (updates.fieldName !== undefined) patch.fieldName = updates.fieldName;
    if (updates.label !== undefined) patch.label = updates.label;
    if (updates.type !== undefined) patch.type = updates.type;
    if (updates.required !== undefined) patch.required = updates.required;
    if (updates.order !== undefined) patch.order = updates.order;

    // Handle options: if type is changing to select, ensure options are provided
    const effectiveType = updates.type ?? field.type;
    if (effectiveType === "select") {
      const effectiveOptions = updates.options ?? field.options;
      if (!effectiveOptions || effectiveOptions.length === 0) {
        throw new Error("Select type fields must have at least one option");
      }
      patch.options = updates.options;
    } else {
      // Non-select types should not have options
      if (updates.type !== undefined) {
        patch.options = undefined;
      }
    }

    await ctx.db.patch(fieldId, patch);
    return fieldId;
  },
});

/**
 * Delete a custom field definition.
 * This does NOT remove the field from existing customFields data on records.
 */
export const deleteField = mutation({
  args: {
    fieldId: v.id("customFieldDefinitions"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "deleteField");
    const field = await ctx.db.get(args.fieldId);
    if (!field) throw new Error("Custom field not found");

    // Verify workspace membership — require manager or owner to delete
    await requireWorkspaceAccess(ctx, field.workspaceId, "manager");

    await ctx.db.delete(args.fieldId);
    return args.fieldId;
  },
});

/**
 * Reorder custom field definitions for a table.
 * Accepts an array of { id, order } pairs.
 */
export const reorderFields = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    tableName: v.string(),
    orders: v.array(
      v.object({
        fieldId: v.id("customFieldDefinitions"),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "reorderFields");
    await requireWorkspaceAccess(ctx, args.workspaceId, "member");

    for (const { fieldId, order } of args.orders) {
      const field = await ctx.db.get(fieldId);
      if (!field) continue;
      if (
        field.workspaceId !== args.workspaceId ||
        field.tableName !== args.tableName
      ) {
        throw new Error("Field does not belong to this workspace/table");
      }
      await ctx.db.patch(fieldId, { order });
    }

    return true;
  },
});
