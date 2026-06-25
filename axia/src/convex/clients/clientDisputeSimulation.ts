// @ts-nocheck
import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getClientDisputeSimulation = query({
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
      evidenceCompleteness: totalEvidence > 0 ? evidenceWithContext / totalEvidence : 0,
      evidenceWithClientKeywords: evidenceWithContext,
      clientKeywords: ["design", "mobile", "responsive"], // Mock - would extract from client requirements
      workSpecificity: memoCount > 0 ? Math.min(1, (totalMemoWords / memoCount) / 10) : 0,
      hasClientSpecificRequirements: memoCount > 3,
      activityDensity: sessions.length > 0 ? totalEvidence / sessions.length : 0,
      memoQuality: memoCount > 0 ? Math.min(1, (totalMemoWords / memoCount) / 10) : 0,
      avgProjectValue: client.hourlyRate * 40, // Estimate based on hourly rate
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

    const simulation = calculateTierSimulation(clientData, userTier);

    return {
      score: simulation.overallScore,
      metrics: simulation.detailedMetrics,
      valueProtection: simulation.valueProtection,
      tier: userTier,
      upgradeMessage: getUpgradeMessage(userTier),
      platformAnalysis: simulation.platformAnalysis,
      businessInsights: simulation.businessInsights
    };
  },
});

function calculateTierSimulation(clientData: any, tier: string) {
  // Free tier: Basic evidence strength
  if (tier === "free") {
    const evidenceStrength = Math.min(100, Math.round((clientData.evidenceCount || 5) * 15 + (clientData.evidenceCompleteness || 0.8) * 10));
    
    return {
      overallScore: evidenceStrength,
      detailedMetrics: [
        { name: "Evidence Strength", value: `${evidenceStrength}%` }
      ],
      valueProtection: Math.round(evidenceStrength * 0.2),
      platformAnalysis: null,
      businessInsights: null,
      formula: "evidenceCount * 15 + evidenceCompleteness * 10"
    };
  }
  
  // Starter tier: Evidence + context relevance
  if (tier === "starter") {
    const evidenceStrength = Math.min(100, Math.round((clientData.evidenceCount || 5) * 15 + (clientData.evidenceCompleteness || 0.8) * 10));
    const contextRelevance = Math.min(100, Math.round(
      ((clientData.evidenceWithClientKeywords || 4) / Math.max(1, (clientData.clientKeywords?.length || 3))) * 50 +
      ((clientData.workSpecificity || 0.85) * 50)
    ));
    const contextStrength = Math.round((evidenceStrength + contextRelevance) / 2);
    
    return {
      overallScore: contextStrength,
      detailedMetrics: [
        { name: "Evidence Strength", value: `${evidenceStrength}%` },
        { name: "Context Relevance", value: `${contextRelevance}%` }
      ],
      valueProtection: Math.round(contextStrength * 0.85),
      platformAnalysis: {
        upworkCompliance: clientData.upworkCompliance || 95,
        fiverrCompliance: clientData.fiverrCompliance || 90
      },
      businessInsights: null,
      formula: "(evidenceStrength + contextRelevance) / 2"
    };
  }
  
  // Pro tier: Evidence + context + Pattern #7
  if (tier === "pro") {
    const evidenceStrength = Math.min(100, Math.round((clientData.evidenceCount || 5) * 15 + (clientData.evidenceCompleteness || 0.8) * 10));
    const contextRelevance = Math.min(100, Math.round(
      ((clientData.evidenceWithClientKeywords || 4) / Math.max(1, (clientData.clientKeywords?.length || 3))) * 50 +
      ((clientData.workSpecificity || 0.85) * 50)
    ));
    
    let pattern7Score = 0;
    if (clientData.hasClientSpecificRequirements) pattern7Score += 40;
    pattern7Score += Math.min(40, (clientData.activityDensity || 2.0) * 20);
    pattern7Score += (clientData.memoQuality || 0.85) * 20;
    
    const platformStrength = Math.round((evidenceStrength + contextRelevance + pattern7Score) / 3);
    
    return {
      overallScore: platformStrength,
      detailedMetrics: [
        { name: "Evidence Strength", value: `${evidenceStrength}%` },
        { name: "Context Relevance", value: `${contextRelevance}%` },
        { name: "Pattern #7 Vulnerability", value: `${Math.round(pattern7Score)}%` }
      ],
      valueProtection: Math.round((clientData.avgProjectValue || 1200) * 0.35),
      platformAnalysis: {
        upworkCompliance: clientData.upworkCompliance || 95,
        fiverrCompliance: clientData.fiverrCompliance || 90,
        toptalCompliance: clientData.toptalCompliance || 85,
        pattern7Vulnerability: Math.round(100 - pattern7Score),
        platformRecommendations: clientData.platformRecommendations || 3
      },
      businessInsights: {
        businessPattern: clientData.businessPattern || 85,
        paymentPatternRisk: clientData.paymentPatternRisk || 15
      },
      formula: "(evidenceStrength + contextRelevance + pattern7Score) / 3"
    };
  }
  
  // Expert tier: All metrics
  if (tier === "expert") {
    const evidenceStrength = Math.min(100, Math.round((clientData.evidenceCount || 5) * 15 + (clientData.evidenceCompleteness || 0.8) * 10));
    const contextRelevance = Math.min(100, Math.round(
      ((clientData.evidenceWithClientKeywords || 4) / Math.max(1, (clientData.clientKeywords?.length || 3))) * 50 +
      ((clientData.workSpecificity || 0.85) * 50)
    ));
    
    let pattern7Score = 0;
    if (clientData.hasClientSpecificRequirements) pattern7Score += 40;
    pattern7Score += Math.min(40, (clientData.activityDensity || 2.0) * 20);
    pattern7Score += (clientData.memoQuality || 0.85) * 20;
    
    const businessScore = Math.min(100, Math.round(
      ((clientData.clientDiversity || 75) * 0.3) + 
      ((clientData.platformCoverage || 80) * 0.35) + 
      ((clientData.historicalSuccess || 85) * 0.35)
    ));
    
    const businessStrength = Math.round((evidenceStrength + contextRelevance + pattern7Score + businessScore) / 4);
    
    return {
      overallScore: businessStrength,
      detailedMetrics: [
        { name: "Evidence Strength", value: `${evidenceStrength}%` },
        { name: "Context Relevance", value: `${contextRelevance}%` },
        { name: "Pattern #7 Vulnerability", value: `${Math.round(pattern7Score)}%` },
        { name: "Business Protection", value: `${businessScore}%` }
      ],
      valueProtection: Math.round(((clientData.weeklyIncome || 250) * 4.33) * 0.12),
      platformAnalysis: {
        upworkCompliance: clientData.upworkCompliance || 95,
        fiverrCompliance: clientData.fiverrCompliance || 90,
        toptalCompliance: clientData.toptalCompliance || 85,
        pattern7Vulnerability: Math.round(100 - pattern7Score),
        platformRecommendations: clientData.platformRecommendations || 3
      },
      businessInsights: {
        businessPattern: clientData.businessPattern || 85,
        paymentPatternRisk: clientData.paymentPatternRisk || 15,
        disputeTrend: clientData.disputeTrend || "Low"
      },
      formula: "(evidenceStrength + contextRelevance + pattern7Score + businessScore) / 4"
    };
  }
  
  // Default to free tier
  return calculateTierSimulation(clientData, "free");
}

function getUpgradeMessage(tier: string) {
  if (tier === "free") {
    return "Upgrade to Starter for context-specific dispute prevention";
  }
  if (tier === "starter") {
    return "Upgrade to Pro for platform-specific dispute prevention";
  }
  if (tier === "pro") {
    return "Upgrade to Expert for multi-platform business protection";
  }
  return null;
}
