import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const projectTables = {
  clientPolicies: defineTable({
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
    .index("by_workspace", ["workspaceId"]),

  clients: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    customFields: v.optional(v.any()),

    // ── Name fields ──────────────────────────────────────────────────────
    // clientName is canonical (used by freelancer features & indexes).
    // name is an alias used by CRM mutations — both should be kept in sync.
    clientName: v.string().maxLength(100),
    name: v.optional(v.string().maxLength(100)),
    // ── CRM contact fields ───────────────────────────────────────────────
    email: v.optional(v.string().maxLength(320)),
    company: v.optional(v.string().maxLength(1000)),
    phone: v.optional(v.string().maxLength(32)),
    industry: v.optional(v.string().maxLength(1000)),
    website: v.optional(v.string().maxLength(2048)),
    notes: v.optional(v.string().maxLength(5000)),
    address: v.optional(v.object({
      street: v.optional(v.string().maxLength(1000)),
      city: v.optional(v.string().maxLength(1000)),
      state: v.optional(v.string().maxLength(1000)),
      zip: v.optional(v.string().maxLength(1000)),
      country: v.optional(v.string().maxLength(1000)),
    })),

    // ── CRM status & source ──────────────────────────────────────────────
    status: v.optional(v.union(v.literal("active"), v.literal("archived"), v.literal("lead"))),
    source: v.optional(v.string().maxLength(1000)),
    // ── Freelancer platform fields (optional for CRM-created clients) ────
    platform: v.optional(v.union(
      v.literal("upwork"),
      v.literal("fiverr"),
      v.literal("toptal"),
      v.literal("freelancer"),
      v.literal("direct")
    )),
    hourlyRate: v.optional(v.number()),
    contractType: v.optional(v.union(v.literal("hourly"), v.literal("fixed"))),
    riskLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),

    // ── Freelancer-specific contact fields ───────────────────────────────
    contactEmail: v.optional(v.string().maxLength(320)),
    contactName: v.optional(v.string().maxLength(100)),
    // ── Payment behavior tracking ────────────────────────────────────────
    avgPaymentDays: v.optional(v.number()),
    onTimeRate: v.optional(v.number()), // 0-1
    totalPaid: v.optional(v.number()),
    totalInvoiced: v.optional(v.number()),
    lastPaymentAt: v.optional(v.number()),

    // ── Workspace assignment ─────────────────────────────────────────────
    assignedMemberIds: v.optional(v.array(v.id("workspaceMembers"))),

    // ── Timestamps ───────────────────────────────────────────────────────
    addedAt: v.optional(v.number()),
    lastActivityAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "clientName"])
    .index("by_user_and_status", ["userId", "status"])
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
    projectName: v.string().maxLength(100),
    hourlyRate: v.number(),
    projectType: v.union(v.literal("ongoing"), v.literal("fixed"), v.literal("milestone")),
    protectionLevel: v.union(v.literal("standard"), v.literal("enhanced"), v.literal("maximum")),
    status: v.union(v.literal("active"), v.literal("archived")),
    createdAt: v.number(),
    lastActivityAt: v.number(),
    
    // Protection score metrics
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
    disputeTrend: v.optional(v.string().maxLength(1000)),
    clientDiversity: v.optional(v.number()),
    platformCoverage: v.optional(v.number()),
    historicalSuccess: v.optional(v.number()),
    weeklyIncome: v.optional(v.number()),
    avgProjectValue: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "projectName"])
    .index("by_client", ["clientId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"])
    .index("by_creator", ["createdBy"]),

  clientCompanies: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    email: v.string().maxLength(320),
    companyName: v.string().maxLength(100),
    contactName: v.string().maxLength(100),
    industry: v.string().maxLength(1000),
    companySize: v.string().maxLength(1000),
    website: v.string().maxLength(2048),
    verificationCount: v.number(),
    createdAt: v.number(),
    lastLoginAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_workspace", ["workspaceId"]),

  verificationRequests: defineTable({
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
    verificationSignature: v.string().maxLength(1000),
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
    displayName: v.string().maxLength(100),
    professionalTitle: v.string().maxLength(200),
    bio: v.string().maxLength(5000),
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
    action: v.string().maxLength(1000),
    targetFreelancerId: v.optional(v.id("users")),
    metadata: v.any(),
    timestamp: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_workspace", ["workspaceId"]),

  clientWorkspaceTokens: defineTable({
    token: v.string().maxLength(1000),
    clientId: v.id("clients"),
    clientName: v.string().maxLength(100),
    contactEmail: v.optional(v.string().maxLength(320)),
    workspaceId: v.optional(v.id("workspaces")),
    freelancerUserId: v.string().maxLength(1000),
    createdAt: v.number(),
    lastAccessedAt: v.optional(v.number()),
    accessCount: v.optional(v.number()),
    revoked: v.optional(v.boolean()),
  })
    .index("by_token", ["token"])
    .index("by_client", ["clientId"])
    .index("by_freelancer", ["freelancerUserId"]),
};
