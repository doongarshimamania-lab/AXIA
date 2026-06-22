import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const workSessions = defineTable({
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
}).index("by_user", ["userId"]).index("by_user_and_project", ["userId", "projectName"]).index("by_user_and_date", ["userId", "startTime"]).index("by_workspace", ["workspaceId"]).index("by_team", ["teamId"]);

export const timeBlocks = defineTable({
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
}).index("by_session", ["sessionId"]).index("by_user", ["userId"]).index("by_workspace", ["workspaceId"]);

export const disputeReports = defineTable({
  userId: v.id("users"),
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.id("users")),
  teamId: v.optional(v.id("teams")),
  sharing: v.optional(v.array(sharingEntry)),
  sessionId: v.id("workSessions"),
  caseId: v.string().maxLength(1000),
  generatedAt: v.number(),
  rejectedHours: v.number(),
  lostIncome: v.number(),
  reportContent: v.string().maxLength(20000),
  status: v.union(v.literal("generated"), v.literal("sent"), v.literal("resolved")),
}).index("by_user", ["userId"]).index("by_case_id", ["caseId"]).index("by_workspace", ["workspaceId"]).index("by_team", ["teamId"]);

export const appUsage = defineTable({
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
}).index("by_user", ["userId"]).index("by_session", ["sessionId"]).index("by_workspace", ["workspaceId"]);

export const complianceAlerts = defineTable({
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
}).index("by_user", ["userId"]).index("by_user_and_type", ["userId", "alertType"]).index("by_workspace", ["workspaceId"]);
