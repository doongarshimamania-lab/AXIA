import { defineTable } from "convex/server";
import { v } from "convex/values";

export const customFieldTables = {
  customFieldDefinitions: defineTable({
    workspaceId: v.id("workspaces"),
    tableName: v.string(), // "clients", "deals", "projects", etc.
    fieldName: v.string(), // Machine-readable key used in customFields objects
    label: v.string(), // Human-readable label shown in UI
    type: v.union(
      v.literal("text"),
      v.literal("number"),
      v.literal("boolean"),
      v.literal("date"),
      v.literal("select")
    ),
    options: v.optional(v.array(v.string())), // For select type
    required: v.optional(v.boolean()),
    order: v.number(), // Display order within the table's fields
    createdAt: v.number(),
  })
    .index("by_workspace_and_table", ["workspaceId", "tableName"])
    .index("by_workspace", ["workspaceId"]),
};
