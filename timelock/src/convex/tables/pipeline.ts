import { defineTable } from "convex/server";
import { v } from "convex/values";

export const pipelineTables = {
  pipelineStages: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    name: v.string(),
    color: v.string(),
    order: v.number(),
    isDefault: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_order", ["userId", "order"])
    .index("by_workspace", ["workspaceId"]),

  deals: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    stageId: v.id("pipelineStages"),
    clientId: v.optional(v.id("clients")),
    title: v.string(),
    description: v.optional(v.string()),
    value: v.number(),
    probability: v.number(), // 0-100
    currency: v.optional(v.string()),
    source: v.optional(v.string()), // e.g. "upwork", "fiverr", "referral", "direct"
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    expectedCloseDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    proposalId: v.optional(v.id("proposals")),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stage", ["stageId"])
    .index("by_user_and_stage", ["userId", "stageId"])
    .index("by_workspace", ["workspaceId"]),
};
