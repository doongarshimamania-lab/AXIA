import { defineTable } from "convex/server";
import { v } from "convex/values";

export const complianceTables = {
  auditTrail: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    user_id_hash: v.string().maxLength(64),
    operation: v.string().maxLength(1000),
    source_platform: v.string().maxLength(50),
    timestamp: v.number(),
    data_snapshot: v.any(),
  })
    .index("by_user_hash", ["user_id_hash"])
    .index("by_timestamp", ["timestamp"])
    .index("by_user_and_timestamp", ["userId", "timestamp"])
    .index("by_workspace", ["workspaceId"]),

  consentManagement: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    user_id_hash: v.string().maxLength(64),
    consent_type: v.union(v.literal("PII"), v.literal("health"), v.literal("financial")),
    status: v.union(v.literal("granted"), v.literal("revoked")),
    version: v.string().maxLength(1000),
    granted_at: v.number(),
    expires_at: v.number(),
    revoked_at: v.optional(v.number()),
  })
    .index("by_user_hash", ["user_id_hash"])
    .index("by_user_and_type", ["userId", "consent_type"])
    .index("by_expiration", ["expires_at"])
    .index("by_workspace", ["workspaceId"]),

  complianceCertificates: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    user_id_hash: v.string().maxLength(64),
    certificate_type: v.union(v.literal("deletion"), v.literal("export"), v.literal("audit")),
    certificate_hash: v.string().maxLength(64),
    issued_at: v.number(),
    metadata: v.any(),
  })
    .index("by_user_hash", ["user_id_hash"])
    .index("by_type", ["certificate_type"])
    .index("by_user_and_type", ["userId", "certificate_type"])
    .index("by_workspace", ["workspaceId"]),

  dataLineage: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    record_id: v.string().maxLength(1000),
    user_id_hash: v.string().maxLength(64),
    source_platform: v.string().maxLength(50),
    import_timestamp: v.number(),
    jwt_signature: v.string().maxLength(128),
    data_type: v.string().maxLength(50),
  })
    .index("by_user_hash", ["user_id_hash"])
    .index("by_record_id", ["record_id"])
    .index("by_platform", ["source_platform"])
    .index("by_workspace", ["workspaceId"]),

  consentAudits: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    platform: v.string().maxLength(50),
    action: v.union(
      v.literal("consent_granted"),
      v.literal("consent_revoked"),
      v.literal("data_accessed"),
      v.literal("data_deleted")
    ),
    timestamp: v.number(),
    details: v.any(),
    ipAddress: v.string().maxLength(64),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_platform", ["userId", "platform"])
    .index("by_timestamp", ["timestamp"])
    .index("by_workspace", ["workspaceId"]),

  platformComplianceChecks: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    platform: v.string().maxLength(50),
    complianceScore: v.number(),
    complianceStatus: v.any(),
    lastChecked: v.number(),
    termsLastUpdated: v.string().maxLength(1000),
  })
    .index("by_platform", ["platform"])
    .index("by_last_checked", ["lastChecked"])
    .index("by_workspace", ["workspaceId"]),

  // ponytail: moved rateLimits here from tables/security.ts so it is actually
  // included in the deployed schema. Previously rateLimit.ts queried a table
  // that did not exist in the deployment, breaking every mutation in the app.
  rateLimits: defineTable({
    bucket: v.string(),          // `${action}::${identifier}::${windowStart}`
    action: v.string(),          // e.g. "signIn", "createInvoice"
    identifier: v.string(),      // userId, email, or hashed IP
    count: v.number(),
    windowStart: v.number(),
    windowEnd: v.number(),
    createdAt: v.number(),
  })
    .index("by_bucket", ["bucket"])
    .index("by_window_end", ["windowEnd"])
    .index("by_action_and_identifier", ["action", "identifier"]),
};
