import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const billingTables = {
  invoices: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    clientId: v.optional(v.id("clients")),
    invoiceNumber: v.string(), // INV-001 format
    publicToken: v.string(), // for client-facing view
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("viewed"),
      v.literal("paid"),
      v.literal("partial"),
      v.literal("overdue"),
      v.literal("cancelled")
    ),
    issueDate: v.number(),
    dueDate: v.number(),
    paidDate: v.optional(v.number()),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    lineItems: v.array(
      v.object({
        id: v.string(),
        description: v.string(),
        quantity: v.number(),
        rate: v.number(),
        amount: v.number(),
        workLinkId: v.optional(v.string()), // link to invoiceWorkLinks
        hasProof: v.optional(v.boolean()),
      })
    ),
    subtotal: v.number(),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    total: v.number(),
    currency: v.optional(v.string()),
    notes: v.optional(v.string()),
    proofCount: v.optional(v.number()), // how many work proofs attached
    hasValidatedBilling: v.optional(v.boolean()),
    sentAt: v.optional(v.number()),
    viewedAt: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    customFields: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_client", ["clientId"])
    .index("by_public_token", ["publicToken"])
    .index("by_invoice_number", ["invoiceNumber"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"]),

  invoiceWorkLinks: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    invoiceId: v.id("invoices"),
    lineItemId: v.string(),
    proofType: v.union(
      v.literal("time_entry"),
      v.literal("task_completion"),
      v.literal("milestone_delivery"),
      v.literal("deliverable_file"),
      v.literal("deliverable_url"),
      v.literal("expense_record")
    ),
    title: v.string(),
    description: v.optional(v.string()),
    hours: v.optional(v.number()),
    date: v.number(),
    value: v.optional(v.number()),
    url: v.optional(v.string()),
    fileName: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_user", ["userId"])
    .index("by_line_item", ["invoiceId", "lineItemId"])
    .index("by_workspace", ["workspaceId"]),

  paymentReminders: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    invoiceId: v.id("invoices"),
    dayNumber: v.number(), // 3, 7, or 14
    channel: v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp")),
    tone: v.union(v.literal("friendly"), v.literal("firm"), v.literal("urgent")),
    subject: v.string(),
    body: v.string(),
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
    .index("by_invoice", ["invoiceId"])
    .index("by_user", ["userId"])
    .index("by_status_and_date", ["status", "scheduledAt"])
    .index("by_workspace", ["workspaceId"]),

  reminderSettings: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    autoRemindersEnabled: v.boolean(),
    day3Enabled: v.optional(v.boolean()),
    day7Enabled: v.optional(v.boolean()),
    day14Enabled: v.optional(v.boolean()),
    day21Enabled: v.optional(v.boolean()),
    defaultChannel: v.optional(v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"]),

  // ─── INVOICE TEMPLATES ──────────────────────────────────────────────────
  invoiceTemplates: defineTable({
    userId: v.optional(v.id("users")), // null = system template
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    name: v.string(),
    industry: v.optional(v.string()),
    description: v.optional(v.string()),
    sections: v.array(
      v.object({
        id: v.string(),
        type: v.union(
          v.literal("heading"),
          v.literal("text"),
          v.literal("line_items"),
          v.literal("subtotal"),
          v.literal("tax"),
          v.literal("discount"),
          v.literal("terms"),
          v.literal("bank_details"),
          v.literal("divider"),
          v.literal("client_info"),
          v.literal("sender_info"),
          v.literal("invoice_meta"),
          v.literal("total"),
          v.literal("notes")
        ),
        content: v.string(),
        metadata: v.optional(v.any()),
      })
    ),
    isSystem: v.optional(v.boolean()),
    usageCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_system", ["isSystem"])
    .index("by_workspace", ["workspaceId"]),
};
