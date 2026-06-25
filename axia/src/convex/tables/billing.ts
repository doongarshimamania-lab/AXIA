import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const billingTables = {
  invoices: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    clientId: v.optional(v.id("clients")),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
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
    paidAmount: v.optional(v.number()),
    clientName: v.optional(v.string().maxLength(100)),
    clientEmail: v.optional(v.string().maxLength(320)),
    lineItems: v.array(
      v.object({
        id: v.string().maxLength(1000),
        description: v.string().maxLength(5000),
        quantity: v.number(),
        rate: v.number(),
        amount: v.number(),
        type: v.optional(v.union(
          v.literal("service"),
          v.literal("product"),
          v.literal("time"),
          v.literal("expense"),
          v.literal("discount"),
        )),
        workLinkId: v.optional(v.string()), // link to invoiceWorkLinks
        hasProof: v.optional(v.boolean()),
      })
    ),
    subtotal: v.number(),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    total: v.number(),
    currency: v.optional(v.string().maxLength(8)),
    notes: v.optional(v.string().maxLength(5000)),
    terms: v.optional(v.string().maxLength(1000)),
    // Stripe integration
    stripePaymentIntentId: v.optional(v.string().maxLength(1000)),
    stripeInvoiceId: v.optional(v.string().maxLength(1000)),
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

    // ── Tags (ponytail: tag attachment — populated by tags.crud.setEntityTags) ──
    tagIds: v.optional(v.array(v.id("tags"))),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_client", ["clientId"])
    .index("by_project", ["projectId"])
    .index("by_proposal", ["proposalId"])
    .index("by_public_token", ["publicToken"])
    .index("by_invoice_number", ["invoiceNumber"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"]),

  invoiceWorkLinks: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    invoiceId: v.id("invoices"),
    lineItemId: v.string().maxLength(1000),
    proofType: v.union(
      v.literal("time_entry"),
      v.literal("task_completion"),
      v.literal("milestone_delivery"),
      v.literal("deliverable_file"),
      v.literal("deliverable_url"),
      v.literal("expense_record")
    ),
    title: v.string().maxLength(200),
    description: v.optional(v.string().maxLength(5000)),
    hours: v.optional(v.number()),
    date: v.number(),
    value: v.optional(v.number()),
    url: v.optional(v.string().maxLength(2048)),
    fileName: v.optional(v.string().maxLength(100)),
    verified: v.optional(v.boolean()),
    workSessionId: v.optional(v.id("workSessions")),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_user", ["userId"])
    .index("by_line_item", ["invoiceId", "lineItemId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_session", ["workSessionId"]),

  paymentReminders: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    invoiceId: v.id("invoices"),
    dayNumber: v.number(), // 3, 7, or 14
    sequenceDay: v.optional(v.number()), // alias for dayNumber, matching invoices.ts convention
    channel: v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp")),
    tone: v.union(v.literal("friendly"), v.literal("firm"), v.literal("urgent")),
    subject: v.string().maxLength(1000),
    body: v.string().maxLength(20000),
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
    name: v.string().maxLength(100),
    industry: v.optional(v.string().maxLength(1000)),
    description: v.optional(v.string().maxLength(5000)),
    sections: v.array(
      v.object({
        id: v.string().maxLength(1000),
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
        content: v.string().maxLength(20000),
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

  // ─── RECURRING INVOICES ─────────────────────────────────────────────────
  recurringInvoices: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    clientId: v.id("clients"),
    projectId: v.optional(v.id("projects")),
    templateInvoiceId: v.id("invoices"),
    frequency: v.union(v.literal("weekly"), v.literal("monthly"), v.literal("quarterly")),
    nextDueDate: v.number(),
    active: v.boolean(),
    lastGeneratedAt: v.optional(v.number()),
    createdFromInvoiceId: v.optional(v.id("invoices")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_client", ["clientId"])
    .index("by_next_due_date", ["nextDueDate"])
    .index("by_workspace", ["workspaceId"]),
};
