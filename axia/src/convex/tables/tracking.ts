import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const trackingTables = {
  workSessions: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    totalMinutes: v.optional(v.number()),
    complianceStatus: v.union(v.literal("active"), v.literal("at_risk"), v.literal("rejected")),
    clientName: v.string().maxLength(100),
    projectName: v.string().maxLength(100),
    hourlyRate: v.number(),
    // Optional fields for richer tracking
    platform: v.optional(v.union(v.literal("upwork"), v.literal("fiverr"), v.literal("toptal"), v.literal("manual"))),
    notes: v.optional(v.string().maxLength(5000)),
    isManualEntry: v.optional(v.boolean()),
    invoiced: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"), v.literal("stopped"), v.literal("completed"))),
    // Invoice linking fields
    clientId: v.optional(v.id("clients")),
    projectId_fk: v.optional(v.id("projects")),
    invoiceId: v.optional(v.id("invoices")),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_project", ["userId", "projectName"])
    .index("by_user_and_date", ["userId", "startTime"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"])
    .index("by_client", ["clientId"])
    .index("by_project_invoiced", ["projectId_fk", "invoiced"])
    .index("by_invoice", ["invoiceId"]),

  timeBlocks: defineTable({
    sessionId: v.id("workSessions"),
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    startTime: v.number(),
    endTime: v.number(),
    activity: v.string().maxLength(1000),
    website: v.string().maxLength(2048),
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
    createdBy: v.optional(v.id("users")),
    sessionId: v.optional(v.id("workSessions")),
    appName: v.string().maxLength(100),
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
    createdBy: v.optional(v.id("users")),
    sessionId: v.optional(v.id("workSessions")),
    alertType: v.union(
      v.literal("at_risk"),
      v.literal("payment_protection_risk"),
      v.literal("non_browser_work"),
      v.literal("timer_paused")
    ),
    message: v.string().maxLength(20000),
    triggeredAt: v.number(),
    acknowledged: v.boolean(),
    actionTaken: v.optional(v.string().maxLength(1000)),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_type", ["userId", "alertType"])
    .index("by_workspace", ["workspaceId"]),
};
