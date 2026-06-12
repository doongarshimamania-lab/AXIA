import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const projectTables = {
  clientPolicies: defineTable({
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
    .index("by_workspace", ["workspaceId"]),

  clients: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    customFields: v.optional(v.any()),
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
    addedAt: v.number(),
    lastActivityAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "clientName"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"]),

  projects: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    customFields: v.optional(v.any()),
    clientId: v.id("clients"),
    projectName: v.string(),
    hourlyRate: v.number(),
    projectType: v.union(v.literal("ongoing"), v.literal("fixed"), v.literal("milestone")),
    protectionLevel: v.union(v.literal("standard"), v.literal("enhanced"), v.literal("maximum")),
    status: v.union(v.literal("active"), v.literal("archived")),
    createdAt: v.number(),
    lastActivityAt: v.number(),
    
    // P1 FIX: Link to proposal that created this project (nullable for manually created projects)
    proposalId: v.optional(v.id("proposals")),
    
    // Protection score metrics
    protectionScore: v.optional(v.number()),
    totalHours: v.optional(v.number()),
    totalValue: v.optional(v.number()),
    atRiskAmount: v.optional(v.number()),
    rejectedHours: v.optional(v.number()),
    evidenceCount: v.optional(v.number()),
    evidenceWithClientKeywords: v.optional(v.number()),
    clientKeywords: v.optional(v.array(v.string())),
    workSpecificity: v.optional(v.number()),
    activityDensity: v.optional(v.number()),
    memoQuality: v.optional(v.number()),
    hasClientSpecificRequirements: v.optional(v.boolean()),
    
    // Platform compliance scores
    upworkCompliance: v.optional(v.number()),
    fiverrCompliance: v.optional(v.number()),
    toptalCompliance: v.optional(v.number()),
    pattern7Vulnerability: v.optional(v.number()),
    platformRecommendations: v.optional(v.number()),
    
    // Business metrics
    businessPattern: v.optional(v.number()),
    paymentPatternRisk: v.optional(v.number()),
    disputeTrend: v.optional(v.string()),
    clientDiversity: v.optional(v.number()),
    platformCoverage: v.optional(v.number()),
    historicalSuccess: v.optional(v.number()),
    weeklyIncome: v.optional(v.number()),
    avgProjectValue: v.optional(v.number()),
    activeSession: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "projectName"])
    .index("by_client", ["clientId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"])
    .index("by_creator", ["createdBy"])
    .index("by_proposal", ["proposalId"]),

  clientCompanies: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
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
    .index("by_workspace", ["workspaceId"]),

  verificationRequests: defineTable({
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
    .index("by_workspace", ["workspaceId"]),

  clientVerificationResults: defineTable({
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
    .index("by_workspace", ["workspaceId"]),

  freelancerPublicProfiles: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    userId: v.id("users"),
    createdBy: v.optional(v.id("users")),
    displayName: v.string(),
    professionalTitle: v.string(),
    bio: v.string(),
    hourlyRate: v.number(),
    axiaVerified: v.boolean(),
    verificationScore: v.number(), // 0-100
    totalVerifiedHours: v.number(),
    platformsConnected: v.array(v.string()),
    skills: v.array(v.string()),
    availability: v.union(v.literal("available"), v.literal("busy"), v.literal("unavailable")),
    lastActive: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_verified", ["axiaVerified"])
    .index("by_score", ["verificationScore"])
    .index("by_workspace", ["workspaceId"]),

  clientActivityLog: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    clientId: v.id("clientCompanies"),
    action: v.string(),
    targetFreelancerId: v.optional(v.id("users")),
    metadata: v.any(),
    timestamp: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_workspace", ["workspaceId"]),
};
