import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tagTables = {
  tags: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    name: v.string(),
    color: v.string(),
    category: v.optional(v.string()), // "client"|"project"|"evidence"|"general"
    usageCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"]),
};
