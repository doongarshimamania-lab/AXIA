import { defineTable } from "convex/server";
import { v } from "convex/values";

export const complianceTables = {
  auditTrail: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    user_id_hash: v.string(),
    operation: v.string(),
    source_platform: v.string(),
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
    user_id_hash: v.string(),
    consent_type: v.union(v.literal("PII"), v.literal("health"), v.literal("financial")),
    status: v.union(v.literal("granted"), v.literal("revoked")),
    version: v.string(),
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
    user_id_hash: v.string(),
    certificate_type: v.union(v.literal("deletion"), v.literal("export"), v.literal("audit")),
    certificate_hash: v.string(),
    issued_at: v.number(),
    metadata: v.any(),
  })
    .index("by_user_hash", ["user_id_hash"])
    .index("by_type", ["certificate_type"])
    .index("by_user_and_type", ["userId", "certificate_type"])
    .index("by_workspace", ["workspaceId"]),

  dataLineage: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    record_id: v.string(),
    user_id_hash: v.string(),
    source_platform: v.string(),
    import_timestamp: v.number(),
    jwt_signature: v.string(),
    data_type: v.string(),
  })
    .index("by_user_hash", ["user_id_hash"])
    .index("by_record_id", ["record_id"])
    .index("by_platform", ["source_platform"])
    .index("by_workspace", ["workspaceId"]),

  consentAudits: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    platform: v.string(),
    action: v.union(
      v.literal("consent_granted"),
      v.literal("consent_revoked"),
      v.literal("data_accessed"),
      v.literal("data_deleted")
    ),
    timestamp: v.number(),
    details: v.any(),
    ipAddress: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_platform", ["userId", "platform"])
    .index("by_timestamp", ["timestamp"])
    .index("by_workspace", ["workspaceId"]),

  platformComplianceChecks: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    platform: v.string(),
    complianceScore: v.number(),
    complianceStatus: v.any(),
    lastChecked: v.number(),
    termsLastUpdated: v.string(),
  })
    .index("by_platform", ["platform"])
    .index("by_last_checked", ["lastChecked"])
    .index("by_workspace", ["workspaceId"]),
};
