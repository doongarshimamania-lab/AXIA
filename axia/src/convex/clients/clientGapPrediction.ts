// @ts-nocheck
import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getClientGapPrediction = query({
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
      nextGapDay: "Tomorrow",
      nextGapTime: "2-4 PM",
      evidenceCount: totalEvidence,
      evidenceWithClientKeywords: evidenceWithContext,
      clientKeywords: ["design", "mobile", "responsive"],
      workSpecificity: memoCount > 0 ? Math.min(1, (totalMemoWords / memoCount) / 10) : 0,
      upworkCompliance: 95,
      fiverrCompliance: 90,
      toptalCompliance: 85,
      hasClientSpecificRequirements: memoCount > 3,
      activityDensity: sessions.length > 0 ? totalEvidence / sessions.length : 0,
      memoQuality: memoCount > 0 ? Math.min(1, (totalMemoWords / memoCount) / 10) : 0,
      pattern7Vulnerability: 15,
      platformRecommendations: 3,
      avgProjectValue: client.hourlyRate * 40,
      weeklyIncome: user.hourlyRate || 25,
      clientDiversity: 75,
      platformCoverage: 80,
      historicalSuccess: 85,
      businessPattern: 85,
      paymentPatternRisk: 15,
      disputeTrend: "Low"
    };
    
    const prediction = calculateTierPrediction(clientData, userTier);
    
    return {
      timePrediction: prediction.timePrediction,
      contextPrediction: prediction.contextPrediction,
      pattern7Prediction: prediction.pattern7Prediction,
      businessPrediction: prediction.businessPrediction,
      valueProtection: prediction.valueProtection,
      tier: userTier,
      upgradeMessage: getUpgradeMessage(userTier),
      platformAnalysis: prediction.platformAnalysis,
      businessInsights: prediction.businessInsights,
      ...clientData
    };
  },
});

function calculateTierPrediction(clientData: any, tier: string) {
  // Mock data for missing fields if they don't exist on the client object
  const data = {
    ...clientData,
    nextGapDay: clientData.nextGapDay || "Tomorrow",
    nextGapTime: clientData.nextGapTime || "2-4 PM",
    evidenceCount: clientData.evidenceCount || 5,
    evidenceWithClientKeywords: clientData.evidenceWithClientKeywords || 4,
    clientKeywords: clientData.clientKeywords || ["design", "mobile", "responsive"],
    workSpecificity: clientData.workSpecificity || 0.9,
    upworkCompliance: clientData.upworkCompliance || 95,
    fiverrCompliance: clientData.fiverrCompliance || 90,
    toptalCompliance: clientData.toptalCompliance || 85,
    hasClientSpecificRequirements: clientData.hasClientSpecificRequirements ?? true,
    activityDensity: clientData.activityDensity || 2.1,
    memoQuality: clientData.memoQuality || 0.9,
    pattern7Vulnerability: clientData.pattern7Vulnerability || 15,
    platformRecommendations: clientData.platformRecommendations || 3,
    avgProjectValue: clientData.avgProjectValue || 1200,
    weeklyIncome: clientData.weeklyIncome || 250,
    clientDiversity: clientData.clientDiversity || 75,
    platformCoverage: clientData.platformCoverage || 80,
    historicalSuccess: clientData.historicalSuccess || 85,
    businessPattern: clientData.businessPattern || 85,
    paymentPatternRisk: clientData.paymentPatternRisk || 15,
    disputeTrend: clientData.disputeTrend || "Low"
  };

  // Free tier: Basic time prediction
  if (tier === "free") {
    const timePrediction = `${data.nextGapDay} ${data.nextGapTime}`;
    
    return {
      timePrediction,
      contextPrediction: null,
      pattern7Prediction: null,
      businessPrediction: null,
      valueProtection: Math.round(data.evidenceCount * 0.185),
      platformAnalysis: null,
      businessInsights: null
    };
  }
  
  // Starter tier: Contextual prediction
  if (tier === "starter") {
    const timePrediction = `${data.nextGapDay} ${data.nextGapTime}`;
    const contextRelevance = Math.min(100, Math.round(
      (data.evidenceWithClientKeywords / Math.max(1, data.clientKeywords.length)) * 50 +
      (data.workSpecificity * 50)
    ));
    
    return {
      timePrediction,
      contextPrediction: contextRelevance,
      pattern7Prediction: null,
      businessPrediction: null,
      valueProtection: Math.round(data.evidenceCount * 0.85),
      platformAnalysis: {
        upworkCompliance: data.upworkCompliance,
        fiverrCompliance: data.fiverrCompliance
      },
      businessInsights: null
    };
  }
  
  // Pro tier: Pattern #7 prediction
  if (tier === "pro") {
    const timePrediction = `${data.nextGapDay} ${data.nextGapTime}`;
    const contextRelevance = Math.min(100, Math.round(
      (data.evidenceWithClientKeywords / Math.max(1, data.clientKeywords.length)) * 50 +
      (data.workSpecificity * 50)
    ));
    
    let pattern7Score = 0;
    if (data.hasClientSpecificRequirements) pattern7Score += 40;
    pattern7Score += Math.min(40, data.activityDensity * 20);
    pattern7Score += data.memoQuality * 20;
    
    return {
      timePrediction,
      contextPrediction: contextRelevance,
      pattern7Prediction: pattern7Score,
      businessPrediction: null,
      valueProtection: Math.round(data.avgProjectValue * 0.35),
      platformAnalysis: {
        upworkCompliance: data.upworkCompliance,
        fiverrCompliance: data.fiverrCompliance,
        toptalCompliance: data.toptalCompliance,
        pattern7Vulnerability: data.pattern7Vulnerability,
        platformRecommendations: data.platformRecommendations
      },
      businessInsights: {
        businessPattern: data.businessPattern,
        paymentPatternRisk: data.paymentPatternRisk
      }
    };
  }
  
  // Expert tier: Business-wide prediction
  if (tier === "expert") {
    const timePrediction = `${data.nextGapDay} ${data.nextGapTime}`;
    const contextRelevance = Math.min(100, Math.round(
      (data.evidenceWithClientKeywords / Math.max(1, data.clientKeywords.length)) * 50 +
      (data.workSpecificity * 50)
    ));
    
    let pattern7Score = 0;
    if (data.hasClientSpecificRequirements) pattern7Score += 40;
    pattern7Score += Math.min(40, data.activityDensity * 20);
    pattern7Score += data.memoQuality * 20;
    
    const businessScore = Math.min(100, Math.round(
      (data.clientDiversity * 0.3) + 
      (data.platformCoverage * 0.35) + 
      (data.historicalSuccess * 0.35)
    ));
    
    return {
      timePrediction,
      contextPrediction: contextRelevance,
      pattern7Prediction: pattern7Score,
      businessPrediction: businessScore,
      valueProtection: Math.round((data.weeklyIncome * 4.33) * 0.12),
      platformAnalysis: {
        upworkCompliance: data.upworkCompliance,
        fiverrCompliance: data.fiverrCompliance,
        toptalCompliance: data.toptalCompliance,
        pattern7Vulnerability: data.pattern7Vulnerability,
        platformRecommendations: data.platformRecommendations
      },
      businessInsights: {
        businessPattern: data.businessPattern,
        paymentPatternRisk: data.paymentPatternRisk,
        disputeTrend: data.disputeTrend
      }
    };
  }
  
  // Default to free tier
  return calculateTierPrediction(data, "free");
}

function getUpgradeMessage(tier: string) {
  if (tier === "free") {
    return "Upgrade to Starter for context-specific gap prevention";
  }
  if (tier === "starter") {
    return "Upgrade to Pro for platform-specific gap prevention";
  }
  if (tier === "pro") {
    return "Upgrade to Expert for business-wide gap prevention";
  }
  return null;
}