import { defineTable } from "convex/server";
import { v } from "convex/values";

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
  id: v.string(),
  type: sectionTypeUnion,
  content: v.string(),
  metadata: v.optional(v.any()),
});

export const proposalTables = {
  proposals: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    clientId: v.optional(v.id("clients")),
    dealId: v.optional(v.id("deals")),
    title: v.string(),
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
    currency: v.optional(v.string()),
    validUntil: v.optional(v.number()),
    templateId: v.optional(v.id("proposalTemplates")),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    viewedAt: v.optional(v.number()),
    signedAt: v.optional(v.number()),
    signatureData: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_public_token", ["publicToken"]),

  proposalTemplates: defineTable({
    userId: v.optional(v.id("users")), // system templates have no userId
    name: v.string(),
    industry: v.optional(v.string()),
    description: v.optional(v.string()),
    sections: v.array(sectionSchema),
    isSystem: v.optional(v.boolean()),
    usageCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_system", ["isSystem"]),

  proposalFollowUps: defineTable({
    userId: v.id("users"),
    proposalId: v.id("proposals"),
    dayNumber: v.number(), // 3, 7, or 14
    subject: v.string(),
    body: v.string(),
    channel: v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp")),
    status: v.union(
      v.literal("scheduled"),
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
    .index("by_status_and_date", ["status", "scheduledAt"]),
};
