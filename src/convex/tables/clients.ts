import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const clientPolicies = defineTable({
  userId: v.id("users"),
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.id("users")),
  clientName: v.string().maxLength(100),
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
      description: v.string().maxLength(5000),
      requirement: v.string().maxLength(1000),
      evidenceType: v.string().maxLength(50),
    })
  ),
  documentUrl: v.optional(v.string().maxLength(2048)),
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
  clientName: v.string().maxLength(100),
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
  contactEmail: v.optional(v.string().maxLength(320)),
  contactName: v.optional(v.string().maxLength(100)),
  notes: v.optional(v.string().maxLength(5000)),
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
  email: v.string().maxLength(320),
  companyName: v.string().maxLength(100),
  contactName: v.string().maxLength(100),
  industry: v.string().maxLength(1000),
  companySize: v.string().maxLength(1000),
  website: v.string().maxLength(2048),
  verificationCount: v.number(),
  createdAt: v.number(),
  lastLoginAt: v.number(),
  subscriptionTier: v.string().maxLength(50),
})
  .index("by_email", ["email"])
  .index("by_workspace", ["workspaceId"]);

export const verificationRequests = defineTable({
  workspaceId: v.optional(v.id("workspaces")),
  createdBy: v.optional(v.id("users")),
  clientId: v.id("clientCompanies"),
  freelancerUserId: v.id("users"),
  projectName: v.string().maxLength(100),
  projectDescription: v.string().maxLength(5000),
  workPeriodStart: v.number(),
  workPeriodEnd: v.number(),
  requestedAt: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("rejected"),
    v.literal("completed")
  ),
  freelancerResponse: v.optional(v.string().maxLength(1000)),
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
  verificationSignature: v.string().maxLength(1000),
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
  action: v.string().maxLength(1000),
  targetFreelancerId: v.optional(v.id("users")),
  metadata: v.any(),
  timestamp: v.number(),
})
  .index("by_client", ["clientId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_workspace", ["workspaceId"]);
