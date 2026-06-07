import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Business tables for Axia's core features:
 * - CRM (clients, pipeline stages, deals)
 * - Smart Proposals
 * - Validated Billing (invoices, work links)
 * - Scope Creep Protection
 * - Payment Reminders
 */
export const businessTables = {

  // ─────────────────────────────────────────────
  // CRM: CLIENTS (replaces the minimal one in projects.ts)
  // ─────────────────────────────────────────────
  clients: defineTable({
    userId: v.id("users"),
    name: v.string(),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    industry: v.optional(v.string()),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    address: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      zip: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("lead")),
    // Payment behavior tracking
    avgPaymentDays: v.optional(v.number()),
    onTimeRate: v.optional(v.number()), // 0-1
    totalPaid: v.optional(v.number()),
    totalInvoiced: v.optional(v.number()),
    lastPaymentAt: v.optional(v.number()),
    // Metadata
    source: v.optional(v.string()), // how they found us
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_and_name", ["userId", "name"]),

  // ─────────────────────────────────────────────
  // CRM: PIPELINE STAGES
  // ─────────────────────────────────────────────
  pipelineStages: defineTable({
    userId: v.id("users"),
    name: v.string(),
    order: v.number(), // display order
    color: v.optional(v.string()), // hex color
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_order", ["userId", "order"]),

  // ─────────────────────────────────────────────
  // CRM: DEALS
  // ─────────────────────────────────────────────
  deals: defineTable({
    userId: v.id("users"),
    clientId: v.optional(v.id("clients")),
    pipelineStageId: v.id("pipelineStages"),
    title: v.string(),
    value: v.number(), // deal value in dollars
    probability: v.optional(v.number()), // 0-100 close probability
    expectedCloseDate: v.optional(v.number()), // timestamp
    proposalId: v.optional(v.id("proposals")),
    notes: v.optional(v.string()),
    lostReason: v.optional(v.string()),
    source: v.optional(v.string()), // lead source
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_stage", ["userId", "pipelineStageId"])
    .index("by_client", ["clientId"]),

  // ─────────────────────────────────────────────
  // SMART PROPOSALS
  // ─────────────────────────────────────────────
  proposals: defineTable({
    userId: v.id("users"),
    clientId: v.id("clients"),
    dealId: v.optional(v.id("deals")),
    title: v.string(),
    // Content stored as JSON array of sections
    content: v.array(v.object({
      id: v.string(),
      type: v.union(
        v.literal("heading"),
        v.literal("text"),
        v.literal("image"),
        v.literal("pricing_table"),
        v.literal("delimiter"),
        v.literal("terms"),
      ),
      data: v.any(), // section-specific data
    })),
    templateId: v.optional(v.id("proposalTemplates")),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("viewed"),
      v.literal("signed"),
      v.literal("expired"),
      v.literal("declined"),
    ),
    totalValue: v.optional(v.number()),
    currency: v.optional(v.string()),
    validUntil: v.optional(v.number()),
    // Tracking
    sentAt: v.optional(v.number()),
    viewedAt: v.optional(v.number()),
    viewedCount: v.optional(v.number()),
    signedAt: v.optional(v.number()),
    signedIp: v.optional(v.string()),
    signedName: v.optional(v.string()),
    declinedAt: v.optional(v.number()),
    declinedReason: v.optional(v.string()),
    // Public access token for client viewing
    publicToken: v.optional(v.string()),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_client", ["clientId"])
    .index("by_public_token", ["publicToken"]),

  // ─────────────────────────────────────────────
  // PROPOSAL TEMPLATES
  // ─────────────────────────────────────────────
  proposalTemplates: defineTable({
    userId: v.optional(v.id("users")), // null = system template
    name: v.string(),
    industry: v.optional(v.string()),
    category: v.optional(v.string()), // "web_design", "consulting", "marketing", etc.
    content: v.array(v.object({
      id: v.string(),
      type: v.union(
        v.literal("heading"),
        v.literal("text"),
        v.literal("image"),
        v.literal("pricing_table"),
        v.literal("delimiter"),
        v.literal("terms"),
      ),
      data: v.any(),
    })),
    isDefault: v.optional(v.boolean()),
    usageCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_industry", ["industry"]),

  // ─────────────────────────────────────────────
  // PROPOSAL FOLLOW-UPS (Smart Day 3/7/14)
  // ─────────────────────────────────────────────
  proposalFollowUps: defineTable({
    proposalId: v.id("proposals"),
    userId: v.id("users"),
    dayNumber: v.number(), // 3, 7, or 14
    tone: v.union(v.literal("friendly"), v.literal("professional"), v.literal("firm")),
    status: v.union(
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("skipped"),
      v.literal("cancelled"),
    ),
    emailSubject: v.string(),
    emailBody: v.string(),
    scheduledFor: v.number(), // timestamp when it should be sent
    sentAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_proposal", ["proposalId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_scheduled", ["scheduledFor"]),

  // ─────────────────────────────────────────────
  // INVOICES (Validated Billing)
  // ─────────────────────────────────────────────
  invoices: defineTable({
    userId: v.id("users"),
    clientId: v.id("clients"),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    invoiceNumber: v.string(), // auto-generated: INV-001, INV-002, etc.
    // Line items stored as JSON
    lineItems: v.array(v.object({
      id: v.string(),
      description: v.string(),
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
    })),
    subtotal: v.number(),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    total: v.number(),
    currency: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("viewed"),
      v.literal("paid"),
      v.literal("partial"),
      v.literal("overdue"),
      v.literal("cancelled"),
    ),
    dueDate: v.number(),
    sentAt: v.optional(v.number()),
    viewedAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    paidAmount: v.optional(v.number()),
    // Stripe integration
    stripePaymentIntentId: v.optional(v.string()),
    stripeInvoiceId: v.optional(v.string()),
    // Public access
    publicToken: v.optional(v.string()),
    notes: v.optional(v.string()),
    terms: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_client", ["clientId"])
    .index("by_public_token", ["publicToken"])
    .index("by_user_and_number", ["userId", "invoiceNumber"]),

  // ─────────────────────────────────────────────
  // INVOICE WORK LINKS (Validated Billing Proof)
  // ─────────────────────────────────────────────
  invoiceWorkLinks: defineTable({
    invoiceId: v.id("invoices"),
    userId: v.id("users"),
    lineItemIndex: v.number(), // which line item this proof belongs to
    // Link to various proof sources
    workSessionId: v.optional(v.id("workSessions")),
    description: v.string(),
    evidenceUrl: v.optional(v.string()),
    type: v.union(
      v.literal("time"),
      v.literal("task"),
      v.literal("milestone"),
      v.literal("deliverable"),
      v.literal("expense"),
    ),
    hours: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_user", ["userId"])
    .index("by_session", ["workSessionId"]),

  // ─────────────────────────────────────────────
  // PAYMENT REMINDERS
  // ─────────────────────────────────────────────
  paymentReminders: defineTable({
    invoiceId: v.id("invoices"),
    userId: v.id("users"),
    sequenceDay: v.number(), // 3, 7, 14
    channel: v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp")),
    tone: v.union(v.literal("friendly"), v.literal("professional"), v.literal("firm")),
    status: v.union(
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("cancelled"),
    ),
    subject: v.string(),
    body: v.string(),
    scheduledFor: v.number(),
    sentAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_scheduled", ["scheduledFor"]),

  // ─────────────────────────────────────────────
  // SCOPE DEFINITIONS
  // ─────────────────────────────────────────────
  scopeDefinitions: defineTable({
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    clientId: v.optional(v.id("clients")),
    // Deliverables with revision limits
    deliverables: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      revisionLimit: v.number(), // max revisions allowed
      revisionsUsed: v.number(), // revisions requested so far
      status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("revisions_exceeded")),
    })),
    // Explicit exclusions
    exclusions: v.optional(v.array(v.string())),
    // Assumptions
    assumptions: v.optional(v.array(v.string())),
    // Client approval
    clientApprovedAt: v.optional(v.number()),
    clientApprovalToken: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("completed"), v.literal("archived")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_client", ["clientId"])
    .index("by_approval_token", ["clientApprovalToken"]),

  // ─────────────────────────────────────────────
  // SCOPE CHANGE ORDERS
  // ─────────────────────────────────────────────
  scopeChangeOrders: defineTable({
    userId: v.id("users"),
    scopeDefinitionId: v.id("scopeDefinitions"),
    clientId: v.optional(v.id("clients")),
    deliverableId: v.optional(v.string()), // which deliverable triggered this
    requestedBy: v.union(v.literal("client"), v.literal("freelancer")),
    description: v.string(),
    // Impact assessment
    costImpact: v.optional(v.number()),
    timelineImpactDays: v.optional(v.number()),
    additionalRevisions: v.optional(v.number()),
    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("expired"),
    ),
    // Client approval
    clientApprovedAt: v.optional(v.number()),
    clientApprovalToken: v.optional(v.string()),
    clientRejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    // Link to invoice if approved
    invoiceId: v.optional(v.id("invoices")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_scope", ["scopeDefinitionId"])
    .index("by_client", ["clientId"])
    .index("by_approval_token", ["clientApprovalToken"])
    .index("by_status", ["status"]),
};
