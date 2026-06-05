import { defineTable } from "convex/server";
import { v } from "convex/values";

export const trackingTables = {
  workSessions: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    totalMinutes: v.optional(v.number()),
    complianceStatus: v.union(v.literal("active"), v.literal("at_risk"), v.literal("rejected")),
    clientName: v.string(),
    projectName: v.string(),
    hourlyRate: v.number(),
    memo: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_project", ["userId", "projectName"])
    .index("by_user_and_date", ["userId", "startTime"])
    .index("by_workspace", ["workspaceId"]),

  timeBlocks: defineTable({
    sessionId: v.id("workSessions"),
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    startTime: v.number(),
    endTime: v.number(),
    activity: v.string(),
    website: v.string(),
    complianceStatus: v.union(v.literal("compliant"), v.literal("at_risk"), v.literal("rejected")),
    screenshotCount: v.number(),
    mouseActivity: v.boolean(),
    keyboardActivity: v.boolean(),
    inactiveDuration: v.number(), // seconds of inactivity
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"]),

  appUsage: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    sessionId: v.optional(v.id("workSessions")),
    appName: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    workRelated: v.boolean(),
    syncedToUpwork: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_workspace", ["workspaceId"]),

  complianceAlerts: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    sessionId: v.optional(v.id("workSessions")),
    alertType: v.union(
      v.literal("at_risk"),
      v.literal("payment_protection_risk"),
      v.literal("non_browser_work"),
      v.literal("timer_paused")
    ),
    message: v.string(),
    triggeredAt: v.number(),
    acknowledged: v.boolean(),
    actionTaken: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_type", ["userId", "alertType"])
    .index("by_workspace", ["workspaceId"]),
};
