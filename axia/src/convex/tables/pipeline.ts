import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const pipelineTables = {
  pipelineStages: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    name: v.string().maxLength(100),
    color: v.string().maxLength(32),
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
    title: v.string().maxLength(200),
    description: v.optional(v.string().maxLength(5000)),
    value: v.number(),
    probability: v.number(), // 0-100
    currency: v.optional(v.string().maxLength(8)),
    source: v.optional(v.string()), // e.g. "upwork", "fiverr", "referral", "direct"
    contactEmail: v.optional(v.string().maxLength(320)),
    contactName: v.optional(v.string().maxLength(100)),
    expectedCloseDate: v.optional(v.number()),
    notes: v.optional(v.string().maxLength(5000)),
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
