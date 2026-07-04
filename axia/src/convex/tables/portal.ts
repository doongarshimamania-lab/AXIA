// ──────────────────────────────────────────────────────────────────────────────
// tables/portal.ts — Portal-specific tables (audit log, revoked tokens,
// per-record message threads, email log, payment records).
//
// REUSE: `scopeChangeOrders` and `scopeDefinitions.deliverables[]` already
// exist in tables/scope.ts — no need to duplicate. This file only adds what's
// missing.
// ──────────────────────────────────────────────────────────────────────────────

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const portalTables = {
  // ─── REVOKED TOKENS ─────────────────────────────────────────────────────────
  // Hashed token + expiry. When a freelancer revokes a portal link, we insert
  // the hash here. verifyPortalScope() checks this on every call.
  portalRevokedTokens: defineTable({
    tokenHash: v.string(),
    clientId: v.id("clients"),
    revokedBy: v.id("users"),
    reason: v.optional(v.string()),
    revokedAt: v.number(),
    // Auto-cleanup: rows older than 30d are safe to delete (JWT max TTL is 7d,
    // so any revoked token has naturally expired by then).
    expiresAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_client", ["clientId"])
    .index("by_expires", ["expiresAt"]),

  // ─── PORTAL AUDIT LOG ───────────────────────────────────────────────────────
  // Separate from the user-facing auditTrail so freelancers can audit portal
  // access without seeing internal user actions.
  portalAuditLog: defineTable({
    // Hashed token at time of action (NOT the raw token)
    tokenHash: v.string(),
    clientId: v.id("clients"),
    workspaceId: v.optional(v.id("workspaces")),
    // What the client did
    action: v.string(), // e.g. "view_deliverable", "approve_change_order", "post_message"
    // What they acted on (polymorphic — set the relevant one)
    targetDeliverableId: v.optional(v.string()),
    targetChangeOrderId: v.optional(v.id("scopeChangeOrders")),
    targetInvoiceId: v.optional(v.id("invoices")),
    targetMessageId: v.optional(v.id("portalMessages")),
    // Optional result snapshot (small JSON, max 4KB)
    result: v.optional(v.any()),
    // Request metadata for forensic analysis
    ipHash: v.optional(v.string()), // SHA-256 of IP (hashed, never raw)
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_token", ["tokenHash"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),

  // ─── PORTAL MESSAGES (per-record threads) ───────────────────────────────────
  // Every message is anchored to a record (deliverable / change order / invoice).
  // NO general inbox. This is the key scope-creep detection surface.
  portalMessages: defineTable({
    workspaceId: v.id("workspaces"),
    clientId: v.id("clients"),
    // Thread anchor — exactly one of these must be set
    threadType: v.union(
      v.literal("deliverable"),
      v.literal("change_order"),
      v.literal("invoice"),
    ),
    deliverableId: v.optional(v.string()), // matches scopeDefinitions.deliverables[].id
    changeOrderId: v.optional(v.id("scopeChangeOrders")),
    invoiceId: v.optional(v.id("invoices")),
    // Author
    authorRole: v.union(v.literal("client"), v.literal("freelancer")),
    authorId: v.optional(v.id("users")), // null for client
    authorName: v.string(), // client contact name OR freelancer display name
    content: v.string(), // markdown, sanitized on display
    // Scope-creep detection (set on insert, used to surface flags)
    scopeCreepDetected: v.boolean(),
    scopeCreepScore: v.number(), // 0-100, confidence
    scopeCreepMatches: v.optional(v.array(v.string())), // matched patterns
    // Soft delete
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_thread", ["threadType", "deliverableId"])
    .index("by_thread_co", ["threadType", "changeOrderId"])
    .index("by_thread_inv", ["threadType", "invoiceId"])
    .index("by_client", ["clientId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_scope_creep", ["scopeCreepDetected", "createdAt"])
    .index("by_created", ["createdAt"]),

  // ─── EMAIL LOG ──────────────────────────────────────────────────────────────
  // Append-only log of every email sent. Used for bounce tracking + audit.
  emailLog: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    toEmail: v.string(),
    toName: v.optional(v.string()),
    fromEmail: v.string(),
    templateId: v.string(), // e.g. "change_order_requested", "invoice_issued"
    // Template variables (for re-rendering if needed)
    variables: v.any(),
    // Provider tracking
    provider: v.string(), // "resend" | "mock"
    providerMessageId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("complained"),
      v.literal("failed"),
    ),
    errorMessage: v.optional(v.string()),
    // What record this email is about (for audit thread)
    relatedChangeOrderId: v.optional(v.id("scopeChangeOrders")),
    relatedInvoiceId: v.optional(v.id("invoices")),
    relatedDeliverableId: v.optional(v.string()),
    sentAt: v.number(),
  })
    .index("by_to", ["toEmail"])
    .index("by_workspace", ["workspaceId"])
    .index("by_status", ["status"])
    .index("by_template", ["templateId"])
    .index("by_sent", ["sentAt"]),

  // ─── PAYMENTS ───────────────────────────────────────────────────────────────
  // Provider-agnostic. Mock provider returns "paid" instantly for dev.
  // Real providers (Stripe, Razorpay, PayPal) added later as separate files.
  portalPayments: defineTable({
    workspaceId: v.id("workspaces"),
    clientId: v.id("clients"),
    invoiceId: v.id("invoices"),
    amount: v.number(), // in cents to avoid float drift
    currency: v.string(), // ISO 4217: "USD", "INR", etc
    provider: v.string(), // "mock" | "stripe" | "razorpay" | "paypal"
    providerPaymentId: v.optional(v.string()), // provider's payment ID
    providerCheckoutUrl: v.optional(v.string()), // URL client visits to pay
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    // Idempotency: Stripe webhooks deliver the same event 2-3x normally.
    // Use providerPaymentId + provider as the idempotency key.
    completedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    initiatedBy: v.id("users"), // freelancer who initiated, or system
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_client", ["clientId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_provider", ["provider", "providerPaymentId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
};
