// @ts-nocheck
import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getClientPolicyProfile = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const client = await ctx.db.get(args.clientId);
    if (!client || client.userId !== userId) {
      throw new Error("Client not found or unauthorized");
    }

    const userTier = user.subscriptionTier || "free";
    
    // Get all sessions for this client to calculate metrics
    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("clientName"), client.clientName))
      .take(1000);

    // Calculate evidence metrics
    let totalEvidence = 0;
    let evidenceWithContext = 0;
    let totalMemoWords = 0;
    let memoCount = 0;

    for (const session of sessions) {
      const evidenceSession = await ctx.db
        .query("evidenceSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .first();

      if (evidenceSession) {
        const events = await ctx.db
          .query("evidenceEvents")
          .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", evidenceSession._id))
          .take(1000);

        totalEvidence += events.length;
        evidenceWithContext += events.filter((e) => e.kind === "memo" || e.kind === "url").length;

        const memos = events.filter((e) => e.kind === "memo");
        memoCount += memos.length;
        memos.forEach((m) => {
          const words = m.data?.text?.split(" ").length || 0;
          totalMemoWords += words;
        });
      }
    }

    const clientData = {
      evidenceCount: totalEvidence,
      evidenceWithClientKeywords: evidenceWithContext,
      clientKeywords: ["design", "mobile", "responsive"],
      workSpecificity: memoCount > 0 ? Math.min(1, (totalMemoWords / memoCount) / 10) : 0,
      hasClientSpecificRequirements: memoCount > 3,
      activityDensity: sessions.length > 0 ? totalEvidence / sessions.length : 0,
      memoQuality: memoCount > 0 ? Math.min(1, (totalMemoWords / memoCount) / 10) : 0,
      avgProjectValue: client.hourlyRate * 40,
      weeklyIncome: user.hourlyRate || 25,
      upworkCompliance: 95,
      fiverrCompliance: 90,
      toptalCompliance: 85,
      platformRecommendations: 3,
      clientDiversity: 75,
      platformCoverage: 80,
      historicalSuccess: 85,
      businessPattern: 85,
      paymentPatternRisk: 15,
      disputeTrend: "Low"
    };
    
    const profile = calculateTierProfile(clientData, userTier);
    
    return {
      score: profile.overallScore,
      metrics: profile.detailedMetrics,
      valueProtection: profile.valueProtection,
      tier: userTier,
      upgradeMessage: getUpgradeMessage(userTier),
      platformAnalysis: profile.platformAnalysis,
      businessInsights: profile.businessInsights,
      ...clientData
    };
  },
});

function calculateTierProfile(clientData: any, tier: string) {
  // Free tier: Basic evidence collection
  if (tier === "free") {
    const evidenceCollection = Math.min(100, Math.round((clientData.evidenceCount || 0) * 20));
    
    return {
      overallScore: evidenceCollection,
      detailedMetrics: [
        { name: "Evidence Collection", value: `${clientData.evidenceCount || 0} items` }
      ],
      valueProtection: Math.round(evidenceCollection * 0.185),
      platformAnalysis: null,
      businessInsights: null,
      formula: "evidenceCount * 20"
    };
  }
  
  // Starter tier: Evidence + context relevance
  if (tier === "starter") {
    const evidenceCollection = Math.min(100, Math.round((clientData.evidenceCount || 0) * 20));
    const contextRelevance = Math.min(100, Math.round(
      ((clientData.evidenceWithClientKeywords || 0) / Math.max(1, (clientData.clientKeywords?.length || 1))) * 50 +
      ((clientData.workSpecificity || 0) * 50)
    ));
    const contextScore = Math.round((evidenceCollection + contextRelevance) / 2);
    
    return {
      overallScore: contextScore,
      detailedMetrics: [
        { name: "Evidence Collection", value: `${clientData.evidenceCount || 0} items` },
        { name: "Context Relevance", value: `${contextRelevance}%` }
      ],
      valueProtection: Math.round(contextScore * 0.85),
      platformAnalysis: {
        upworkCompliance: clientData.upworkCompliance || 0,
        fiverrCompliance: clientData.fiverrCompliance || 0
      },
      businessInsights: null,
      formula: "(evidenceCount * 20 + contextRelevance) / 2"
    };
  }
  
  // Pro tier: Evidence + context + Pattern #7
  if (tier === "pro") {
    const evidenceCollection = Math.min(100, Math.round((clientData.evidenceCount || 0) * 20));
    const contextRelevance = Math.min(100, Math.round(
      ((clientData.evidenceWithClientKeywords || 0) / Math.max(1, (clientData.clientKeywords?.length || 1))) * 50 +
      ((clientData.workSpecificity || 0) * 50)
    ));
    
    let pattern7Score = 0;
    if (clientData.hasClientSpecificRequirements) pattern7Score += 40;
    pattern7Score += Math.min(40, (clientData.activityDensity || 0) * 20);
    pattern7Score += (clientData.memoQuality || 0) * 20;
    
    const platformScore = Math.round((evidenceCollection + contextRelevance + pattern7Score) / 3);
    
    return {
      overallScore: platformScore,
      detailedMetrics: [
        { name: "Evidence Collection", value: `${clientData.evidenceCount || 0} items` },
        { name: "Context Relevance", value: `${contextRelevance}%` },
        { name: "Pattern #7 Vulnerability", value: `${Math.round(pattern7Score)}%` }
      ],
      valueProtection: Math.round((clientData.avgProjectValue || 0) * 0.35),
      platformAnalysis: {
        upworkCompliance: clientData.upworkCompliance || 0,
        fiverrCompliance: clientData.fiverrCompliance || 0,
        toptalCompliance: clientData.toptalCompliance || 0,
        pattern7Vulnerability: Math.round(100 - pattern7Score), // Vulnerability is inverse of score
        platformRecommendations: clientData.platformRecommendations || 0
      },
      businessInsights: {
        businessPattern: clientData.businessPattern || 0,
        paymentPatternRisk: clientData.paymentPatternRisk || 0
      },
      formula: "(evidenceCount * 20 + contextRelevance + pattern7Score) / 3"
    };
  }
  
  // Expert tier: All metrics
  if (tier === "expert") {
    const evidenceCollection = Math.min(100, Math.round((clientData.evidenceCount || 0) * 20));
    const contextRelevance = Math.min(100, Math.round(
      ((clientData.evidenceWithClientKeywords || 0) / Math.max(1, (clientData.clientKeywords?.length || 1))) * 50 +
      ((clientData.workSpecificity || 0) * 50)
    ));
    
    let pattern7Score = 0;
    if (clientData.hasClientSpecificRequirements) pattern7Score += 40;
    pattern7Score += Math.min(40, (clientData.activityDensity || 0) * 20);
    pattern7Score += (clientData.memoQuality || 0) * 20;
    
    const businessScore = Math.min(100, Math.round(
      ((clientData.clientDiversity || 0) * 0.3) + 
      ((clientData.platformCoverage || 0) * 0.35) + 
      ((clientData.historicalSuccess || 0) * 0.35)
    ));
    
    const businessScoreOverall = Math.round((evidenceCollection + contextRelevance + pattern7Score + businessScore) / 4);
    
    return {
      overallScore: businessScoreOverall,
      detailedMetrics: [
        { name: "Evidence Collection", value: `${clientData.evidenceCount || 0} items` },
        { name: "Context Relevance", value: `${contextRelevance}%` },
        { name: "Pattern #7 Vulnerability", value: `${Math.round(pattern7Score)}%` },
        { name: "Business Protection", value: `${businessScore}%` }
      ],
      valueProtection: Math.round(((clientData.weeklyIncome || 0) * 4.33) * 0.12),
      platformAnalysis: {
        upworkCompliance: clientData.upworkCompliance || 0,
        fiverrCompliance: clientData.fiverrCompliance || 0,
        toptalCompliance: clientData.toptalCompliance || 0,
        pattern7Vulnerability: Math.round(100 - pattern7Score),
        platformRecommendations: clientData.platformRecommendations || 0
      },
      businessInsights: {
        businessPattern: clientData.businessPattern || 0,
        paymentPatternRisk: clientData.paymentPatternRisk || 0,
        disputeTrend: clientData.disputeTrend || "Low"
      },
      formula: "(evidenceCount * 20 + contextRelevance + pattern7Score + businessScore) / 4"
    };
  }
  
  // Default to free tier
  return calculateTierProfile(clientData, "free");
}

function getUpgradeMessage(tier: string) {
  if (tier === "free") {
    return "Upgrade to Starter for context-specific protection";
  }
  if (tier === "starter") {
    return "Upgrade to Pro for platform-specific protection";
  }
  if (tier === "pro") {
    return "Upgrade to Expert for business-wide protection";
  }
  return null;
}