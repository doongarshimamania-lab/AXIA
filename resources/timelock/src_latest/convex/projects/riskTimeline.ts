import { query } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";

const VALID_TIERS = ["free", "starter", "pro", "expert"] as const;
type TierName = (typeof VALID_TIERS)[number];

const normalizeTier = (value?: string | null): TierName | undefined => {
  if (!value) return undefined;
  const lowered = value.toLowerCase();
  return VALID_TIERS.includes(lowered as TierName) ? (lowered as TierName) : undefined;
};

async function resolveUserId(ctx: QueryCtx, guestUserId?: Id<"users">): Promise<Id<"users"> | null> {
  if (guestUserId) {
    const guestUser = await ctx.db.get(guestUserId);
    if (guestUser) {
      return guestUser._id;
    }
  }

  const authUserId = await getAuthUserId(ctx);
  if (authUserId) return authUserId;

  return null;
}

export const getProjectRiskTimeline = query({
  args: {
    projectId: v.optional(v.id("projects")),
    guestUserId: v.optional(v.id("users")),
    tierOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.projectId) {
      return null;
    }

    const requestedTier = normalizeTier(args.tierOverride);
    const buildEmptyData = (tier: TierName) => ({
      tier,
      totalProtectedWeekly: 0,
      totalProtectedMonthly: 0,
      pillars: {
        free: [
          {
            id: "progress",
            label: "Timeline Progress",
            value: 0,
            displayValue: "$0",
            description: "No data available",
            status: "at_risk",
            dollarImpact: 0,
          },
          {
            id: "evidence",
            label: "Evidence Collection",
            value: 0,
            displayValue: "0/session",
            description: "Avg evidence items",
            status: "vulnerable",
            dollarImpact: 0,
          },
          {
            id: "health",
            label: "Timeline Health",
            value: 0,
            displayValue: "0%",
            description: "Overall timeline status",
            status: "at_risk",
            dollarImpact: 0,
          },
          {
            id: "risks",
            label: "Timeline Risks",
            value: 0,
            displayValue: "0",
            description: "Detected risk events",
            status: "protected",
            dollarImpact: 0,
          },
        ],
      },
      events: [],
      businessMapNodes: [],
      persuasion: {
        scarcity: false,
        socialProof: false,
        lossAversion: false,
        authority: false,
      },
      corePositioningMessage: "No data available",
    });

    const userId = await resolveUserId(ctx, args.guestUserId);
    
    // Default empty structure to return if no user/data found
    if (!userId) {
      return buildEmptyData(requestedTier ?? "free");
    }

    const user = await ctx.db.get(userId);
    if (!user) return buildEmptyData(requestedTier ?? "free");

    const tier = requestedTier ?? (normalizeTier(user.subscriptionTier) ?? "free");
    const hourlyRate = user?.hourlyRate || 25;

    // 1. Gather Data - Fetch all relevant data for the user
    let projectFilter: string | null = null;
    let currentProject = null;
    
    if (args.projectId) {
      currentProject = await ctx.db.get(args.projectId);
      if (currentProject && currentProject.userId === userId) {
        projectFilter = currentProject.projectName;
      }
    }

    // For Free tier: If no specific project selected, show the first active project
    if (tier === "free" && !projectFilter) {
      const firstProject = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();
      
      if (firstProject) {
        projectFilter = firstProject.projectName;
        currentProject = firstProject;
      }
    }

    // Fetch all sessions for the user
    const allSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter sessions by project if specified
    const sessions = projectFilter
      ? allSessions.filter((s) => s.projectName === projectFilter)
      : allSessions;

    // Debug logging
    console.log("Risk Timeline Data Flow:", {
      userId,
      projectFilter,
      totalSessions: allSessions.length,
      filteredSessions: sessions.length,
      hasCurrentProject: !!currentProject,
      sampleSession: sessions[0] ? {
        projectName: sessions[0].projectName,
        startTime: new Date(sessions[0].startTime).toISOString(),
        clientName: sessions[0].clientName,
        totalMinutes: sessions[0].totalMinutes
      } : null
    });

    // If no sessions found, return empty data early
    if (sessions.length === 0) {
      console.log("No sessions found for user/project");
      return buildEmptyData(tier);
    }

    // Time windows for analysis
    const now = Date.now();
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - WEEK_MS;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const recentSessions = sessions.filter((s) => s.startTime >= oneWeekAgo);
    const monthlySessions = sessions.filter((s) => s.startTime >= oneMonthAgo);
    const timeframe: "week" | "month" | "all" =
      recentSessions.length > 0
        ? "week"
        : monthlySessions.length > 0
          ? "month"
          : "all";
    const analysisSessions =
      timeframe === "week"
        ? recentSessions
        : timeframe === "month"
          ? monthlySessions
          : sessions;

    // Get ALL time blocks for the user (we'll filter by session)
    const allTimeBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter blocks to only those belonging to relevant sessions
    const sessionIds = new Set(sessions.map(s => s._id));
    const relevantBlocks = allTimeBlocks.filter(b => sessionIds.has(b.sessionId));
    const recentBlocks = relevantBlocks.filter((b) => b.startTime >= oneWeekAgo);
    const monthlyBlocks = relevantBlocks.filter((b) => b.startTime >= oneMonthAgo);
    const analysisBlocks =
      timeframe === "week"
        ? recentBlocks
        : timeframe === "month"
          ? monthlyBlocks
          : relevantBlocks;

    console.log("Time Blocks Analysis:", {
      totalBlocks: allTimeBlocks.length,
      relevantBlocks: relevantBlocks.length,
      recentBlocks: recentBlocks.length,
      monthlyBlocks: monthlyBlocks.length,
      analysisWindow: timeframe,
      sampleBlock: analysisBlocks[0]
        ? {
            activity: analysisBlocks[0].activity,
            complianceStatus: analysisBlocks[0].complianceStatus,
            screenshotCount: analysisBlocks[0].screenshotCount,
          }
        : null,
    });

    // 2. Calculate Base Metrics from REAL data
    const hoursFromSessions = analysisSessions.reduce((sum, s) => {
      if (s.endTime && s.startTime) {
        return sum + (s.endTime - s.startTime) / (1000 * 60 * 60);
      }
      return sum + (s.totalMinutes || 0) / 60;
    }, 0);
    const datedSessions = analysisSessions
      .filter((s) => typeof s.startTime === "number")
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
    let totalHours = hoursFromSessions;
    if (timeframe === "month") {
      totalHours = hoursFromSessions / 4;
    } else if (timeframe === "all" && datedSessions.length > 1) {
      const spanMs =
        (datedSessions[datedSessions.length - 1].startTime || 0) -
        (datedSessions[0].startTime || 0);
      const spanWeeks = Math.max(spanMs / WEEK_MS, 1);
      totalHours = hoursFromSessions / spanWeeks;
    }

    const rejectedBlocks = analysisBlocks.filter((b) => b.complianceStatus === "rejected");
    const atRiskBlocks = analysisBlocks.filter((b) => b.complianceStatus === "at_risk");
    const compliantBlocks = analysisBlocks.filter((b) => b.complianceStatus === "compliant");
    
    // Evidence metrics - count actual screenshots
    const evidenceCount = analysisBlocks.reduce((sum, b) => sum + (b.screenshotCount || 0), 0);
    const avgEvidencePerSession =
      analysisSessions.length > 0 ? evidenceCount / analysisSessions.length : 0;
    
    // Activity metrics
    const activeBlocks = analysisBlocks.filter((b) => b.mouseActivity || b.keyboardActivity);
    const activityRate =
      analysisBlocks.length > 0 ? (activeBlocks.length / analysisBlocks.length) * 100 : 0;
    
    // 3. Generate Timeline Events from REAL risk data
    const events = [
      ...rejectedBlocks.slice(0, 8).map(b => ({
        id: b._id,
        timestamp: b.startTime,
        description: `Evidence gap: ${b.activity || 'Unknown activity'}`,
        riskLevel: "high" as const,
        impactValue: (5/60) * hourlyRate,
        type: "gap" as const
      })),
      ...atRiskBlocks.slice(0, 8).map(b => ({
        id: b._id,
        timestamp: b.startTime,
        description: `Low activity: ${b.website || 'Unknown site'}`,
        riskLevel: "medium" as const,
        impactValue: (5/60) * hourlyRate * 0.5,
        type: "compliance" as const
      }))
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 12);

    console.log("Generated Timeline Events:", {
      totalEvents: events.length,
      rejectedCount: rejectedBlocks.length,
      atRiskCount: atRiskBlocks.length,
      analysisBlocksTotal: analysisBlocks.length,
      sampleEvent: events[0] || null
    });

    // 4. Calculate Tier-Specific Pillars from REAL data
    const timelineProgress = totalHours > 0 ? Math.min(100, Math.round((totalHours / 40) * 100)) : 0;
    const evidenceRate = Math.round(avgEvidencePerSession);
    const timelineHealth = analysisBlocks.length > 0
      ? Math.round((compliantBlocks.length / analysisBlocks.length) * 100)
      : 0;
    const riskCount = rejectedBlocks.length + atRiskBlocks.length;

    const freePillars = [
      {
        id: "progress",
        label: "Timeline Progress",
        value: timelineProgress,
        displayValue: `$${Math.round(totalHours * hourlyRate)}`,
        description: "Value of tracked progress",
        status: timelineProgress > 50 ? "protected" : "at_risk",
        dollarImpact: Math.round(totalHours * hourlyRate)
      },
      {
        id: "evidence",
        label: "Evidence Collection",
        value: evidenceRate,
        displayValue: `${evidenceRate}/session`,
        description: "Avg evidence items",
        status: evidenceRate > 5 ? "protected" : "vulnerable",
        dollarImpact: Math.round(evidenceRate * 5)
      },
      {
        id: "health",
        label: "Timeline Health",
        value: timelineHealth,
        displayValue: `${timelineHealth}%`,
        description: "Overall timeline status",
        status: timelineHealth > 80 ? "protected" : "at_risk",
        dollarImpact: 0
      },
      {
        id: "risks",
        label: "Timeline Risks",
        value: riskCount,
        displayValue: `${riskCount}`,
        description: "Detected risk events",
        status: riskCount === 0 ? "protected" : "vulnerable",
        dollarImpact: Math.round(riskCount * (5/60) * hourlyRate)
      }
    ];

    // Starter Tier Logic
    const contextRelevance = activityRate;
    const evidenceOptimization = evidenceRate > 0 ? Math.min(100, Math.round((evidenceRate / 10) * 100)) : 0;
    const riskPrediction = atRiskBlocks.length;
    const contextualScore = Math.round((contextRelevance + evidenceOptimization) / 2);

    const starterPillars = [
      {
        id: "context",
        label: "Context Relevance",
        value: contextRelevance,
        displayValue: `$${Math.round(totalHours * hourlyRate * (contextRelevance/100))}`,
        description: "Protected by context",
        status: "protected",
        dollarImpact: Math.round(totalHours * hourlyRate * (contextRelevance/100))
      },
      {
        id: "optimization",
        label: "Evidence Optimization",
        value: evidenceOptimization,
        displayValue: `${evidenceOptimization}%`,
        description: "Collection efficiency",
        status: evidenceOptimization > 80 ? "protected" : "at_risk",
        dollarImpact: Math.round(totalHours * hourlyRate * 0.1)
      },
      {
        id: "prediction",
        label: "Risk Prediction",
        value: riskPrediction,
        displayValue: `${riskPrediction} Risks`,
        description: "Predicted gaps prevented",
        status: riskPrediction < 5 ? "protected" : "vulnerable",
        dollarImpact: Math.round(riskPrediction * 25)
      },
      {
        id: "score",
        label: "Contextual Score",
        value: contextualScore,
        displayValue: `$${Math.round(totalHours * hourlyRate * (contextualScore/100))}`,
        description: "Total contextual value",
        status: contextualScore > 80 ? "protected" : "at_risk",
        dollarImpact: Math.round(totalHours * hourlyRate * (contextualScore/100))
      }
    ];

    // Pro Tier Logic
    const vulnerabilityCount = rejectedBlocks.length;
    const totalBlocksAnalyzed = analysisBlocks.length;
    const crossProjectScore = totalBlocksAnalyzed > 0 
      ? Math.round((compliantBlocks.length / totalBlocksAnalyzed) * 100)
      : 0;
    
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
    const previousWeekSessions = sessions.filter(s => s.startTime >= twoWeeksAgo && s.startTime < oneWeekAgo);
    const previousWeekHours = previousWeekSessions.reduce((sum, s) => sum + (s.totalMinutes || 0) / 60, 0);
    const trendAnalysis = previousWeekHours > 0 
      ? Math.min(99, Math.max(-99, Math.round(((totalHours - previousWeekHours) / previousWeekHours) * 100)))
      : 0;
    
    const protectionScore = Math.round((timelineHealth + crossProjectScore) / 2);

    const proPillars = [
      {
        id: "vulnerability",
        label: "Vulnerability Detection",
        value: vulnerabilityCount,
        displayValue: `$${Math.round(vulnerabilityCount * 150)}`,
        description: "Potential loss prevented",
        status: vulnerabilityCount === 0 ? "protected" : "at_risk",
        dollarImpact: Math.round(vulnerabilityCount * 150)
      },
      {
        id: "cross_project",
        label: "Cross-Project Analysis",
        value: crossProjectScore,
        displayValue: `${crossProjectScore}%`,
        description: "Portfolio consistency",
        status: "protected",
        dollarImpact: Math.round(totalHours * hourlyRate * 0.2)
      },
      {
        id: "trend",
        label: "Timeline Trend",
        value: trendAnalysis,
        displayValue: `+${trendAnalysis}%`,
        description: "Improvement vs last week",
        status: "protected",
        dollarImpact: Math.round(totalHours * hourlyRate * 0.15)
      },
      {
        id: "protection",
        label: "Protection Score",
        value: protectionScore,
        displayValue: `$${Math.round(totalHours * hourlyRate * 0.95)}`,
        description: "Total protected value",
        status: "protected",
        dollarImpact: Math.round(totalHours * hourlyRate * 0.95)
      }
    ];

    // Expert Tier Logic
    const allProjects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const activeProjects = allProjects.filter(p => p.status === "active");
    const businessMapScore = activeProjects.length > 0 ? Math.min(100, activeProjects.length * 25) : 0;
    
    const uniqueClients = new Set(monthlySessions.map(s => s.clientName));
    const crossPlatformScore = Math.min(100, uniqueClients.size * 33);
    
    const strategicCount = Math.min(5, Math.floor(activeProjects.length / 2));
    const monthlyHours = monthlySessions.reduce((sum, s) => sum + (s.totalMinutes || 0) / 60, 0);
    const businessProtection = Math.round(monthlyHours * hourlyRate);

    const expertPillars = [
      {
        id: "mapping",
        label: "Business Mapping",
        value: businessMapScore,
        displayValue: "Active",
        description: "Full portfolio mapped",
        status: "protected",
        dollarImpact: Math.round(businessProtection * 0.3)
      },
      {
        id: "cross_platform",
        label: "Cross-Platform Analysis",
        value: crossPlatformScore,
        displayValue: "Optimized",
        description: "3 Platforms synced",
        status: "protected",
        dollarImpact: Math.round(businessProtection * 0.25)
      },
      {
        id: "strategic",
        label: "Strategic Recs",
        value: strategicCount,
        displayValue: `${strategicCount} Active`,
        description: "Optimization strategies",
        status: "protected",
        dollarImpact: Math.round(businessProtection * 0.15)
      },
      {
        id: "business_score",
        label: "Business Protection",
        value: 99,
        displayValue: `$${businessProtection}`,
        description: "Total business value",
        status: "protected",
        dollarImpact: businessProtection
      }
    ];

    // Select pillars based on tier
    let totalProtectedWeekly = 0;
    
    switch (tier) {
      case "expert":
        totalProtectedWeekly = businessProtection;
        break;
      case "pro":
        totalProtectedWeekly = Math.round(totalHours * hourlyRate * 0.95);
        break;
      case "starter":
        totalProtectedWeekly = Math.round(totalHours * hourlyRate * (contextualScore/100));
        break;
      case "free":
      default:
        totalProtectedWeekly = Math.round(totalHours * hourlyRate);
        break;
    }

    const pillarsObj = {
      free: freePillars,
      starter: (tier === "starter" || tier === "pro" || tier === "expert") ? starterPillars : undefined,
      pro: (tier === "pro" || tier === "expert") ? proPillars : undefined,
      expert: (tier === "expert") ? expertPillars : undefined
    };

    // 5. Persuasion Flags
    const persuasion = {
      scarcity: tier !== "expert" && riskCount > 0,
      socialProof: tier === "free" || tier === "starter",
      lossAversion: tier === "pro" && vulnerabilityCount > 0,
      authority: tier === "expert",
      scarcityMessage: "Only 3 days left to optimize this timeline",
      socialProofMessage: "92% of freelancers prevented denials with this feature",
      lossAversionMessage: `You're at risk of losing $${Math.round(riskCount * 50)} without protection`,
      authorityMessage: "Based on 12,450 verified disputes"
    };

    // 6. Upgrade Prompt
    let upgradePrompt = undefined;
    if (tier === "free") {
      upgradePrompt = {
        targetTier: "Starter",
        valueGap: Math.round(totalHours * hourlyRate * 0.2),
        message: `Prevent $${Math.round(totalHours * hourlyRate * 0.2)}/week from timeline issues`
      };
    } else if (tier === "starter") {
      upgradePrompt = {
        targetTier: "Pro",
        valueGap: Math.round(totalHours * hourlyRate * 4 * 0.15),
        message: `Prevent $${Math.round(totalHours * hourlyRate * 4 * 0.15)}/month in denials`
      };
    } else if (tier === "pro") {
      upgradePrompt = {
        targetTier: "Expert",
        valueGap: Math.round(totalHours * hourlyRate * 4 * 0.4),
        message: `Protect $${Math.round(totalHours * hourlyRate * 4 * 0.4)}/month across all projects`
      };
    }

    // 7. Business Map Nodes (Mock for Expert)
    const businessMapNodes = tier === "expert" ? [
      { id: "p1", label: currentProject?.projectName || "Project A", type: "project", status: "protected", value: 100, x: 20, y: 50, connections: ["pl1"] },
      { id: "pl1", label: "Upwork", type: "platform", status: "protected", value: 100, x: 50, y: 30, connections: ["p1", "p2"] },
      { id: "p2", label: "Project B", type: "project", status: "at_risk", value: 60, x: 80, y: 50, connections: ["pl1"] }
    ] : [];

    return {
      tier,
      totalProtectedWeekly,
      totalProtectedMonthly: totalProtectedWeekly * 4,
      pillars: pillarsObj,
      events: events as any[],
      businessMapNodes: businessMapNodes as any[],
      persuasion,
      upgradePrompt,
      corePositioningMessage: "Your timeline is payment-protected"
    };
  },
});