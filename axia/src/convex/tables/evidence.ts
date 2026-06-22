import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const evidenceTables = {
  evidenceSessions: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    sessionId: v.id("workSessions"),
    platform: v.union(
      v.literal("upwork"),
      v.literal("fiverr"),
      v.literal("toptal"),
      v.literal("freelancer"),
      v.literal("client")
    ),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("finalized")),
  })
    .index("by_user_and_status", ["userId", "status"])
    .index("by_session", ["sessionId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"]),

  evidenceEvents: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    evidenceSessionId: v.id("evidenceSessions"),
    t: v.number(), // timestamp in ms
    kind: v.union(
      v.literal("mouse"),
      v.literal("keyboard"),
      v.literal("url"),
      v.literal("screenshot_ref"),
      v.literal("memo"),
      v.literal("platform_status")
    ),
    data: v.any(),
    url: v.optional(v.string().maxLength(2048)),
  })
    .index("by_session_and_time", ["evidenceSessionId", "t"])
    .index("by_workspace", ["workspaceId"]),

  wcvmVerifications: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    sessionId: v.id("workSessions"),
    evidenceSessionId: v.id("evidenceSessions"),
    contextRelevanceScore: v.number(), // 0-100
    verificationMatrix: v.any(), // Mapping of requirements to evidence
    verificationSignature: v.string().maxLength(1000),
    verifiedAt: v.number(),
    clientRequirements: v.array(v.object({
      id: v.string().maxLength(1000),
      description: v.string().maxLength(5000),
      relevanceScore: v.number(),
      matchedEvidence: v.array(v.string()),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_evidence_session", ["evidenceSessionId"])
    .index("by_workspace", ["workspaceId"]),

  evidenceMetadata: defineTable({
    evidenceId: v.string().maxLength(1000),
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    sessionId: v.id("workSessions"),
    contextScore: v.number(), // 0-100
    complianceStatus: v.union(
      v.literal("compliant"),
      v.literal("at_risk"),
      v.literal("rejected")
    ),
    workRelevance: v.number(), // 0-1
    activityDensity: v.number(),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_workspace", ["workspaceId"]),
};
