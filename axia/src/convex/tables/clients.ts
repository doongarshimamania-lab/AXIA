import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const clientPolicies = defineTable({
  userId: v.id("users"),
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.id("users")),
  clientName: v.string(),
  platform: v.union(
    v.literal("upwork"),
    v.literal("fiverr"),
    v.literal("toptal"),
    v.literal("freelancer"),
    v.literal("custom")
  ),
  requirements: v.array(
    v.object({
      type: v.union(
        v.literal("activity"),
        v.literal("screenshots"),
        v.literal("memos"),
        v.literal("timer")
      ),
      description: v.string(),
      requirement: v.string(),
      evidenceType: v.string(),
    })
  ),
  documentUrl: v.optional(v.string()),
  createdAt: v.number(),
  lastUpdated: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_workspace", ["workspaceId"]);

export const clients = defineTable({
  userId: v.id("users"),
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.id("users")),
  teamId: v.optional(v.id("teams")),
  sharing: v.optional(v.array(sharingEntry)),
  clientName: v.string(),
  platform: v.union(
    v.literal("upwork"),
    v.literal("fiverr"),
    v.literal("toptal"),
    v.literal("freelancer"),
    v.literal("direct")
  ),
  hourlyRate: v.number(),
  contractType: v.union(v.literal("hourly"), v.literal("fixed")),
  riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  contactEmail: v.optional(v.string()),
  contactName: v.optional(v.string()),
  notes: v.optional(v.string()),
  assignedMemberIds: v.optional(v.array(v.id("users"))),
  customFields: v.optional(v.any()), // { [key: string]: string | number | boolean }
  addedAt: v.number(),
  lastActivityAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_and_name", ["userId", "clientName"])
  .index("by_workspace", ["workspaceId"])
  .index("by_team", ["teamId"])
  .index("by_contact_email", ["contactEmail"]);

export const clientCompanies = defineTable({
  workspaceId: v.optional(v.id("workspaces")),
  email: v.string(),
  companyName: v.string(),
  contactName: v.string(),
  industry: v.string(),
  companySize: v.string(),
  website: v.string(),
  verificationCount: v.number(),
  createdAt: v.number(),
  lastLoginAt: v.number(),
  subscriptionTier: v.string(),
})
  .index("by_email", ["email"])
  .index("by_workspace", ["workspaceId"]);

export const verificationRequests = defineTable({
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.id("users")),
  clientId: v.id("clientCompanies"),
  freelancerUserId: v.id("users"),
  projectName: v.string(),
  projectDescription: v.string(),
  workPeriodStart: v.number(),
  workPeriodEnd: v.number(),
  requestedAt: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("rejected"),
    v.literal("completed")
  ),
  freelancerResponse: v.optional(v.string()),
  respondedAt: v.optional(v.number()),
})
  .index("by_client", ["clientId"])
  .index("by_freelancer", ["freelancerUserId"])
  .index("by_status", ["status"])
  .index("by_workspace", ["workspaceId"]);

export const clientVerificationResults = defineTable({
  workspaceId: v.optional(v.id("workspaces")),
  verificationRequestId: v.id("verificationRequests"),
  clientId: v.id("clientCompanies"),
  freelancerUserId: v.id("users"),
  wcvmScore: v.number(), // 0-100
  verificationMatrix: v.any(),
  evidenceSummary: v.object({
    totalHours: v.number(),
    screenshotCount: v.number(),
    activityScore: v.number(),
    complianceRate: v.number(),
  }),
  verificationSignature: v.string(),
  generatedAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_client", ["clientId"])
  .index("by_request", ["verificationRequestId"])
  .index("by_freelancer", ["freelancerUserId"])
  .index("by_workspace", ["workspaceId"]);

export const clientActivityLog = defineTable({
  workspaceId: v.optional(v.id("workspaces")),
  clientId: v.id("clientCompanies"),
  action: v.string(),
  targetFreelancerId: v.optional(v.id("users")),
  metadata: v.any(),
  timestamp: v.number(),
})
  .index("by_client", ["clientId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_workspace", ["workspaceId"]);
