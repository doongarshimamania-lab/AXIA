import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

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
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    customFields: v.optional(v.any()),
    name: v.string().maxLength(100),
    email: v.optional(v.string().maxLength(320)),
    company: v.optional(v.string().maxLength(1000)),
    phone: v.optional(v.string().maxLength(32)),
    industry: v.optional(v.string().maxLength(1000)),
    website: v.optional(v.string().maxLength(2048)),
    notes: v.optional(v.string().maxLength(5000)),
    hourlyRate: v.optional(v.number()),
    address: v.optional(v.object({
      street: v.optional(v.string().maxLength(1000)),
      city: v.optional(v.string().maxLength(1000)),
      state: v.optional(v.string().maxLength(1000)),
      zip: v.optional(v.string().maxLength(1000)),
      country: v.optional(v.string().maxLength(1000)),
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
    .index("by_user_and_name", ["userId", "name"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"]),

  // ─────────────────────────────────────────────
  // CRM: PIPELINE STAGES
  // ─────────────────────────────────────────────
  pipelineStages: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    name: v.string().maxLength(100),
    order: v.number(), // display order
    color: v.optional(v.string()), // hex color
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_order", ["userId", "order"])
    .index("by_workspace", ["workspaceId"]),

  // ─────────────────────────────────────────────
  // CRM: DEALS
  // ─────────────────────────────────────────────
  deals: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    customFields: v.optional(v.any()),
    clientId: v.optional(v.id("clients")),
    pipelineStageId: v.id("pipelineStages"),
    title: v.string().maxLength(200),
    value: v.number(), // deal value in dollars
    probability: v.optional(v.number()), // 0-100 close probability
    expectedCloseDate: v.optional(v.number()), // timestamp
    proposalId: v.optional(v.id("proposals")),
    notes: v.optional(v.string().maxLength(5000)),
    lostReason: v.optional(v.string().maxLength(1000)),
    source: v.optional(v.string()), // lead source
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_stage", ["userId", "pipelineStageId"])
    .index("by_client", ["clientId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"]),

  // ─────────────────────────────────────────────
  // SMART PROPOSALS
  // ─────────────────────────────────────────────
  proposals: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    customFields: v.optional(v.any()),
    clientId: v.id("clients"),
    dealId: v.optional(v.id("deals")),
    title: v.string().maxLength(200),
    // Content stored as JSON array of sections
    content: v.array(v.object({
      id: v.string().maxLength(1000),
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
    currency: v.optional(v.string().maxLength(8)),
    validUntil: v.optional(v.number()),
    // Tracking
    sentAt: v.optional(v.number()),
    viewedAt: v.optional(v.number()),
    viewedCount: v.optional(v.number()),
    signedAt: v.optional(v.number()),
    signedIp: v.optional(v.string().maxLength(1000)),
    signedName: v.optional(v.string().maxLength(100)),
    declinedAt: v.optional(v.number()),
    declinedReason: v.optional(v.string().maxLength(1000)),
    // Public access token for client viewing
    publicToken: v.optional(v.string().maxLength(64)),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_client", ["clientId"])
    .index("by_public_token", ["publicToken"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"]),

  // ─────────────────────────────────────────────
  // PROPOSAL TEMPLATES
  // ─────────────────────────────────────────────
  proposalTemplates: defineTable({
    userId: v.optional(v.id("users")), // null = system template
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    name: v.string().maxLength(100),
    industry: v.optional(v.string().maxLength(1000)),
    category: v.optional(v.string()), // "web_design", "consulting", "marketing", etc.
    content: v.array(v.object({
      id: v.string().maxLength(1000),
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
    .index("by_industry", ["industry"])
    .index("by_workspace", ["workspaceId"]),

  // ─────────────────────────────────────────────
  // PROPOSAL FOLLOW-UPS (Smart Day 3/7/14)
  // ─────────────────────────────────────────────
  proposalFollowUps: defineTable({
    proposalId: v.id("proposals"),
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    dayNumber: v.number(), // 3, 7, or 14
    tone: v.union(v.literal("friendly"), v.literal("professional"), v.literal("firm")),
    status: v.union(
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("skipped"),
      v.literal("cancelled"),
    ),
    emailSubject: v.string().maxLength(320),
    emailBody: v.string().maxLength(320),
    scheduledFor: v.number(), // timestamp when it should be sent
    sentAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_proposal", ["proposalId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_scheduled", ["scheduledFor"])
    .index("by_workspace", ["workspaceId"]),

  // ─────────────────────────────────────────────
  // INVOICES (Validated Billing) — MOVED to billing.ts
  // These tables are now defined in billingTables (billing.ts) which is the
  // canonical source for invoice schema. The billing.ts version has been
  // consolidated with all fields from both schemas.
  // ─────────────────────────────────────────────
  // invoices: defineTable({ ... }) — SEE billing.ts
  // invoiceWorkLinks: defineTable({ ... }) — SEE billing.ts
  // paymentReminders: defineTable({ ... }) — SEE billing.ts

  // ─────────────────────────────────────────────
  // SCOPE DEFINITIONS
  // ─────────────────────────────────────────────
  scopeDefinitions: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    clientId: v.optional(v.id("clients")),
    // Deliverables with revision limits
    deliverables: v.array(v.object({
      id: v.string().maxLength(1000),
      name: v.string().maxLength(100),
      description: v.string().maxLength(5000),
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
    clientApprovalToken: v.optional(v.string().maxLength(64)),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("completed"), v.literal("archived")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_client", ["clientId"])
    .index("by_approval_token", ["clientApprovalToken"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"]),

  // ─────────────────────────────────────────────
  // SCOPE CHANGE ORDERS
  // ─────────────────────────────────────────────
  scopeChangeOrders: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    scopeDefinitionId: v.id("scopeDefinitions"),
    clientId: v.optional(v.id("clients")),
    deliverableId: v.optional(v.string()), // which deliverable triggered this
    requestedBy: v.union(v.literal("client"), v.literal("freelancer")),
    description: v.string().maxLength(5000),
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
    clientApprovalToken: v.optional(v.string().maxLength(64)),
    clientRejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string().maxLength(1000)),
    // Link to invoice if approved
    invoiceId: v.optional(v.id("invoices")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_scope", ["scopeDefinitionId"])
    .index("by_client", ["clientId"])
    .index("by_approval_token", ["clientApprovalToken"])
    .index("by_status", ["status"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"]),
};
