import { defineTable } from "convex/server";
import { v } from "convex/values";
import { sharingEntry } from "../sharedValidators";

export const featureTables = {
  extensionTokens: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    // ponytail: v5.5.0 — token is now stored as SHA-256 hash (irreversible).
    // Plaintext token is shown once at creation time, never retrievable after.
    // Previously this used a plaintext `token` field with a `by_token` index,
    // but the actual extension.ts code uses tokenHash + tokenSuffix + by_token_hash,
    // so the schema and the code were out of sync and broke extension pairing.
    // ponytail: made tokenHash + tokenSuffix OPTIONAL because the deployment
    // has legacy rows that still use the old plaintext `token` field. New
    // rows always populate tokenHash+tokenSuffix; old rows keep `token`.
    tokenHash: v.optional(v.string()),
    // Last 4 chars of plaintext token for UI display only ("...abcd")
    tokenSuffix: v.optional(v.string()),
    // ponytail: legacy plaintext token field — kept optional so old rows
    // don't fail schema validation. New code never writes this field.
    token: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    lastUsed: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_token_hash", ["tokenHash"])
    .index("by_workspace", ["workspaceId"]),

  networkConnections: defineTable({
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
    .index("by_workspace", ["workspaceId"]),

  platformConnections: defineTable({
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
    .index("by_workspace", ["workspaceId"]),

  platformImportedData: defineTable({
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
    .index("by_workspace", ["workspaceId"]),

  crossPlatformVerifications: defineTable({
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
    .index("by_workspace", ["workspaceId"]),

  protectionAdvisorAlerts: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    alertType: v.union(
      v.literal("activity_gap"),
      v.literal("screenshot_needed"),
      v.literal("policy_violation"),
      v.literal("platform_sync_issue"),
      v.literal("evidence_quality_low")
    ),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    message: v.string(),
    recommendation: v.string(),
    actionRequired: v.boolean(),
    triggeredAt: v.number(),
    resolvedAt: v.optional(v.number()),
    autoResolved: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_resolved", ["userId", "resolvedAt"])
    .index("by_workspace", ["workspaceId"]),

  teamValidations: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    validatorUserId: v.id("users"),
    evidenceSessionId: v.id("evidenceSessions"),
    validationStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("needs_revision")
    ),
    validationScore: v.number(), // 0-100
    feedback: v.string(),
    validatedAt: v.number(),
    issues: v.array(v.object({
      type: v.string(),
      description: v.string(),
      severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_validator", ["validatorUserId"])
    .index("by_session", ["evidenceSessionId"])
    .index("by_workspace", ["workspaceId"]),

  disputeReports: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
    sharing: v.optional(v.array(sharingEntry)),
    sessionId: v.optional(v.id("workSessions")),
    caseId: v.string(),
    generatedAt: v.number(),
    rejectedHours: v.number(),
    lostIncome: v.number(),
    reportContent: v.optional(v.string()),
    status: v.union(v.literal("generated"), v.literal("sent"), v.literal("viewed"), v.literal("resolved"), v.literal("appealed")),
    // Additional fields for richer report management
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    evidenceCount: v.optional(v.number()),
    evidenceSummary: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    viewedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    appealDeadline: v.optional(v.number()),
    publicToken: v.optional(v.string()),
    clientId: v.optional(v.string()),
    clientName: v.optional(v.string()),
    projectName: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_case_id", ["caseId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_team", ["teamId"]),

  automatedDisputeReports: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    disputeReportId: v.id("disputeReports"),
    automationLevel: v.union(
      v.literal("manual"),
      v.literal("semi_automated"),
      v.literal("fully_automated")
    ),
    generatedSections: v.array(v.object({
      section: v.string(),
      content: v.string(),
      aiGenerated: v.boolean(),
    })),
    evidenceAttached: v.array(v.string()),
    platformSubmitted: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("ready"),
      v.literal("submitted"),
      v.literal("resolved")
    ),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_workspace", ["workspaceId"]),

  policyIntelligence: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    clientPolicyId: v.id("clientPolicies"),
    analysisResults: v.object({
      complianceScore: v.number(),
      riskAreas: v.array(v.string()),
      recommendations: v.array(v.string()),
      automationOpportunities: v.array(v.string()),
    }),
    workPatternMatch: v.number(), // 0-100
    lastAnalyzed: v.number(),
    nextReview: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_policy", ["clientPolicyId"])
    .index("by_workspace", ["workspaceId"]),

  upgradeTriggers: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    triggerType: v.string(), // "loss_aversion" | "feature_gate" | "value_showcase"
    triggerSource: v.string(),
    tierShown: v.string(),
    triggeredAt: v.number(),
    converted: v.boolean(),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_converted", ["userId", "converted"])
    .index("by_workspace", ["workspaceId"]),

  upgradeConversions: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    fromTier: v.string(),
    toTier: v.string(),
    triggerSource: v.string(),
    convertedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_tier", ["toTier"])
    .index("by_workspace", ["workspaceId"]),

  waitlistEntries: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    email: v.string(),
    submittedAt: v.number(),
    source: v.string(), // "hero" | "cta" | "pricing"
    suggestions: v.optional(v.string()),
    referralCode: v.optional(v.string()), // Unique code for this user
    referredBy: v.optional(v.string()), // Referral code of who referred them
    referredCount: v.optional(v.number()), // Number of people they've referred
    position: v.optional(v.number()), // Current position in waitlist
  })
    .index("by_email", ["email"])
    .index("by_submitted_at", ["submittedAt"])
    .index("by_referral_code", ["referralCode"])
    .index("by_referred_by", ["referredBy"])
    .index("by_position", ["position"]),

  protectionPlans: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    planName: v.string(),
    planType: v.union(
      v.literal("conservative"),
      v.literal("balanced"),
      v.literal("aggressive")
    ),
    customRules: v.array(v.object({
      ruleId: v.string(),
      ruleName: v.string(),
      condition: v.string(),
      action: v.string(),
      enabled: v.boolean(),
    })),
    protectionGoals: v.object({
      targetDisputeRate: v.number(),
      minEvidenceQuality: v.number(),
      autoScreenshotFrequency: v.number(), // minutes
    }),
    performance: v.object({
      disputesAvoided: v.number(),
      hoursProtected: v.number(),
      incomeSecured: v.number(),
    }),
    createdAt: v.number(),
    lastUpdated: v.number(),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_active", ["userId", "isActive"])
    .index("by_workspace", ["workspaceId"]),

  milestoneSnapshots: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    projectId: v.id("projects"),
    weekNumber: v.number(),
    weekStart: v.number(),
    weekEnd: v.number(),
    totalHours: v.number(),
    totalEvidence: v.number(),
    protectionRate: v.number(),
    sessionCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_workspace", ["workspaceId"]),

  milestoneAlerts: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    projectId: v.id("projects"),
    weekNumber: v.number(),
    alertType: v.union(
      v.literal("protection_drop"),
      v.literal("evidence_gap"),
      v.literal("week_completion"),
      v.literal("approval_needed")
    ),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    message: v.string(),
    protectionRate: v.optional(v.number()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_workspace", ["workspaceId"]),

  milestoneReports: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    projectId: v.id("projects"),
    weekNumber: v.number(),
    weekStart: v.number(),
    weekEnd: v.number(),
    snapshotId: v.id("milestoneSnapshots"),
    metrics: v.object({
      totalHours: v.number(),
      totalEvidence: v.number(),
      protectionRate: v.number(),
      sessionCount: v.number(),
    }),
    trends: v.object({
      hoursTrend: v.number(),
      protectionTrend: v.number(),
      evidenceTrend: v.number(),
    }),
    insights: v.array(
      v.object({
        type: v.union(v.literal("success"), v.literal("warning"), v.literal("critical")),
        message: v.string(),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_workspace", ["workspaceId"]),

  scopeFormalizations: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    createdBy: v.optional(v.id("users")),
    projectId: v.id("projects"),
    changeDescription: v.string(),
    originalScope: v.string(),
    newScope: v.string(),
    impactAssessment: v.object({
      timeImpact: v.string(),
      budgetImpact: v.string(),
      deliverableImpact: v.string(),
    }),
    clientAcknowledgment: v.optional(v.string()),
    clientApprovalEvidence: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("formalized"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
    formalizedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_project_and_status", ["projectId", "status"])
    .index("by_workspace", ["workspaceId"]),
};
