import { defineTable } from "convex/server";
import { v } from "convex/values";

export const networkConnections = defineTable({
  userId: v.id("users"),
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.id("users")),
  targetUserId: v.id("users"),
  status: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("rejected")
  ),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_and_target", ["userId", "targetUserId"])
  .index("by_workspace", ["workspaceId"]);

export const platformComplianceChecks = defineTable({
  workspaceId: v.optional(v.id("workspaces")),
  platform: v.string(),
  complianceScore: v.number(),
  complianceStatus: v.any(),
  lastChecked: v.number(),
  termsLastUpdated: v.string(),
})
  .index("by_platform", ["platform"])
  .index("by_last_checked", ["lastChecked"])
  .index("by_workspace", ["workspaceId"]);

export const platformConnections = defineTable({
  userId: v.id("users"),
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.id("users")),
  platform: v.union(
    v.literal("upwork"),
    v.literal("fiverr"),
    v.literal("toptal"),
    v.literal("freelancer")
  ),
  status: v.union(
    v.literal("pending"),
    v.literal("connected"),
    v.literal("disconnected")
  ),
  connectedAt: v.optional(v.number()),
  disconnectedAt: v.optional(v.number()),
  platformUserId: v.optional(v.string()),
  platformEmail: v.optional(v.string()),
  accessToken: v.optional(v.string()), // encrypted
  refreshToken: v.optional(v.string()), // encrypted
  tokenExpiresAt: v.optional(v.number()),
  lastSyncedAt: v.optional(v.number()),
  metadata: v.optional(v.any()),
})
  .index("by_user", ["userId"])
  .index("by_user_and_platform", ["userId", "platform"])
  .index("by_status", ["status"])
  .index("by_workspace", ["workspaceId"]);

export const platformImportedData = defineTable({
  userId: v.id("users"),
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.id("users")),
  platform: v.union(
    v.literal("upwork"),
    v.literal("fiverr"),
    v.literal("toptal"),
    v.literal("freelancer")
  ),
  dataType: v.union(
    v.literal("profile"),
    v.literal("workHistory"),
    v.literal("earnings"),
    v.literal("reviews")
  ),
  importedAt: v.number(),
  data: v.any(),
  user_id_hash: v.string(),
  dataLineageId: v.optional(v.id("dataLineage")),
})
  .index("by_user", ["userId"])
  .index("by_user_and_platform", ["userId", "platform"])
  .index("by_user_and_type", ["userId", "dataType"])
  .index("by_workspace", ["workspaceId"]);

export const crossPlatformVerifications = defineTable({
  userId: v.id("users"),
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.id("users")),
  platforms: v.array(v.string()),
  verificationStatus: v.union(
    v.literal("verified"),
    v.literal("partial"),
    v.literal("failed")
  ),
  consistencyScore: v.number(), // 0-100
  discrepancies: v.array(v.object({
    platform1: v.string(),
    platform2: v.string(),
    issue: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  })),
  verifiedAt: v.number(),
  nextVerification: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_status", ["verificationStatus"])
  .index("by_workspace", ["workspaceId"]);
