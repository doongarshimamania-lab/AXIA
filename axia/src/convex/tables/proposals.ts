import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

// Shared section type union — used by both proposals and proposalTemplates
const sectionTypeUnion = v.union(
  v.literal("heading"),
  v.literal("text"),
  v.literal("pricing"),
  v.literal("terms"),
  v.literal("milestone"),
  v.literal("divider"),
  v.literal("client_info"),
  v.literal("sender_info"),
  v.literal("summary"),
  v.literal("scope_of_work"),
);

const sectionSchema = v.object({
  id: v.string().maxLength(1000),
  type: sectionTypeUnion,
  content: v.string().maxLength(20000),
  metadata: v.optional(v.any()),
});

export const proposalTables = {
  proposals: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    clientId: v.optional(v.id("clients")),
    dealId: v.optional(v.id("deals")),
    projectId: v.optional(v.id("projects")), // ponytail: back-link set when proposal is converted to project
    title: v.string().maxLength(200),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("viewed"),
      v.literal("signed"),
      v.literal("declined"),
      v.literal("expired")
    ),
    publicToken: v.string(), // for client-facing view
    sections: v.array(sectionSchema),
    totalValue: v.number(),
    currency: v.optional(v.string().maxLength(8)),
    validUntil: v.optional(v.number()),
    templateId: v.optional(v.id("proposalTemplates")),
    clientName: v.optional(v.string().maxLength(100)),
    clientEmail: v.optional(v.string().maxLength(320)),
    sentAt: v.optional(v.number()),
    viewedAt: v.optional(v.number()),
    signedAt: v.optional(v.number()),
    signatureData: v.optional(v.string().maxLength(1000)),
    notes: v.optional(v.string().maxLength(5000)),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    customFields: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_public_token", ["publicToken"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"]),

  proposalTemplates: defineTable({
    userId: v.optional(v.id("users")), // system templates have no userId
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    name: v.string().maxLength(100),
    industry: v.optional(v.string().maxLength(1000)),
    description: v.optional(v.string().maxLength(5000)),
    sections: v.array(sectionSchema),
    isSystem: v.optional(v.boolean()),
    usageCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_system", ["isSystem"])
    .index("by_workspace", ["workspaceId"]),

  proposalFollowUps: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    proposalId: v.id("proposals"),
    dayNumber: v.number(), // 3, 7, or 14
    subject: v.string().maxLength(1000),
    body: v.string().maxLength(20000),
    channel: v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp")),
    status: v.union(
      v.literal("scheduled"),
      v.literal("due"),
      v.literal("sent"),
      v.literal("skipped"),
      v.literal("cancelled")
    ),
    scheduledAt: v.number(),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_proposal", ["proposalId"])
    .index("by_user", ["userId"])
    .index("by_status_and_date", ["status", "scheduledAt"])
    .index("by_workspace", ["workspaceId"]),

  proposalFollowUpSettings: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    autoFollowUpsEnabled: v.boolean(),  // master toggle
    day1Enabled: v.optional(v.boolean()),
    day3Enabled: v.optional(v.boolean()),
    day7Enabled: v.optional(v.boolean()),
    day14Enabled: v.optional(v.boolean()),
    day21Enabled: v.optional(v.boolean()),
    customIntervals: v.optional(v.array(v.number())),  // custom day intervals like [2, 5, 10]
    defaultChannel: v.optional(v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"]),
};
