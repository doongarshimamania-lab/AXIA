import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getClientProtectionScore = query({
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
    const metrics = calculateTierMetrics(client, userTier);

    return {
      score: metrics.overallScore,
      metrics: metrics.detailedMetrics,
      valueProtection: metrics.valueProtection,
      tier: userTier,
      upgradeMessage: getUpgradeMessage(userTier),
    };
  },
});

function calculateTierMetrics(clientData: any, tier: string) {
  // Free tier: Only evidence collection
  if (tier === "free") {
    const evidenceCollection = Math.min(100, Math.round((clientData.evidenceCount || 5) * 20));
    return {
      overallScore: evidenceCollection,
      detailedMetrics: [
        { name: "Evidence Collection", value: `${clientData.evidenceCount || 5} items` }
      ],
      valueProtection: Math.round(evidenceCollection * 0.185),
      formula: "evidenceCount * 20"
    };
  }

  // Starter tier: Evidence + context relevance
  if (tier === "starter") {
    const evidenceCollection = Math.min(100, Math.round((clientData.evidenceCount || 5) * 20));
    const contextRelevance = Math.min(100, Math.round(
      ((clientData.evidenceWithClientKeywords || 4) / Math.max(1, (clientData.clientKeywords?.length || 3))) * 50 +
      ((clientData.workSpecificity || 0.85) * 50)
    ));

    return {
      overallScore: Math.round((evidenceCollection + contextRelevance) / 2),
      detailedMetrics: [
        { name: "Evidence Collection", value: `${clientData.evidenceCount || 5} items` },
        { name: "Context Relevance", value: `${contextRelevance}%` }
      ],
      valueProtection: Math.round((evidenceCollection + contextRelevance) * 0.425),
      formula: "(evidenceCount * 20 + contextRelevance) / 2"
    };
  }

  // Pro tier: Evidence + context + Pattern #7
  if (tier === "pro") {
    const evidenceCollection = Math.min(100, Math.round((clientData.evidenceCount || 5) * 20));
    const contextRelevance = Math.min(100, Math.round(
      ((clientData.evidenceWithClientKeywords || 4) / Math.max(1, (clientData.clientKeywords?.length || 3))) * 50 +
      ((clientData.workSpecificity || 0.85) * 50)
    ));

    let pattern7Score = 0;
    if (clientData.hasClientSpecificRequirements) pattern7Score += 40;
    pattern7Score += Math.min(40, (clientData.activityDensity || 2.0) * 20);
    pattern7Score += (clientData.memoQuality || 0.85) * 20;

    return {
      overallScore: Math.round((evidenceCollection + contextRelevance + pattern7Score) / 3),
      detailedMetrics: [
        { name: "Evidence Collection", value: `${clientData.evidenceCount || 5} items` },
        { name: "Context Relevance", value: `${contextRelevance}%` },
        { name: "Pattern #7 Vulnerability", value: `${Math.round(pattern7Score)}%` }
      ],
      valueProtection: Math.round((clientData.avgProjectValue || 1200) * 0.35),
      formula: "(evidenceCount * 20 + contextRelevance + pattern7Score) / 3"
    };
  }

  // Expert tier: All metrics
  if (tier === "expert") {
    const evidenceCollection = Math.min(100, Math.round((clientData.evidenceCount || 5) * 20));
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

    return {
      overallScore: Math.round((evidenceCollection + contextRelevance + pattern7Score + businessScore) / 4),
      detailedMetrics: [
        { name: "Evidence Collection", value: `${clientData.evidenceCount || 5} items` },
        { name: "Context Relevance", value: `${contextRelevance}%` },
        { name: "Pattern #7 Vulnerability", value: `${Math.round(pattern7Score)}%` },
        { name: "Business Protection", value: `${businessScore}%` }
      ],
      valueProtection: Math.round(((clientData.weeklyIncome || 250) * 4.33) * 0.12),
      formula: "(evidenceCount * 20 + contextRelevance + pattern7Score + businessScore) / 4"
    };
  }

  // Default to free tier
  return calculateTierMetrics(clientData, "free");
}

function getUpgradeMessage(tier: string) {
  if (tier === "free") {
    return "Upgrade to Starter for context relevance metrics";
  }
  if (tier === "starter") {
    return "Upgrade to Pro for Pattern #7 vulnerability protection";
  }
  if (tier === "pro") {
    return "Upgrade to Expert for business-wide protection";
  }
  return null;
}
