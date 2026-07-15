import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const pipelineTables = {
  pipelineStages: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    name: v.string(),
    color: v.string(),
    order: v.number(),
    isDefault: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_order", ["userId", "order"])
    .index("by_workspace", ["workspaceId"])
    .index("by_creator", ["createdBy"]),

  deals: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    stageId: v.id("pipelineStages"),
    clientId: v.optional(v.id("clients")),
    proposalId: v.optional(v.id("proposals")),
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
    order: v.number(),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    customFields: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stage", ["stageId"])
    .index("by_user_and_stage", ["userId", "stageId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"])
    .index("by_creator", ["createdBy"]),
};
