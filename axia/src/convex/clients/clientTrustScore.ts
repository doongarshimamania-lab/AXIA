import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getClientTrustScore = query({
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
  // Free tier: Only payment reliability
  if (tier === "free") {
    const paymentReliability = Math.min(100, Math.round((clientData.paymentHistory || 0.95) * 100));
    return {
      overallScore: paymentReliability,
      detailedMetrics: [
        { name: "Payment Reliability", value: `${paymentReliability}%` }
      ],
      valueProtection: Math.round(paymentReliability * 0.185),
      formula: "paymentHistory * 100"
    };
  }

  // Starter tier: Payment + communication
  if (tier === "starter") {
    const paymentReliability = Math.min(100, Math.round((clientData.paymentHistory || 0.95) * 100));
    const communicationScore = Math.min(100, Math.round(
      ((clientData.communicationFrequency || 85) * 0.4) +
      ((clientData.responseTime || 80) * 0.3) +
      ((clientData.messageClarity || 88) * 0.3)
    ));

    return {
      overallScore: Math.round((paymentReliability + communicationScore) / 2),
      detailedMetrics: [
        { name: "Payment Reliability", value: `${paymentReliability}%` },
        { name: "Communication Quality", value: `${communicationScore}%` }
      ],
      valueProtection: Math.round((paymentReliability + communicationScore) * 0.425),
      formula: "(paymentHistory * 100 + communicationMetrics) / 2"
    };
  }

  // Pro tier: Payment + communication + Pattern #7
  if (tier === "pro") {
    const paymentReliability = Math.min(100, Math.round((clientData.paymentHistory || 0.95) * 100));
    const communicationScore = Math.min(100, Math.round(
      ((clientData.communicationFrequency || 85) * 0.4) +
      ((clientData.responseTime || 80) * 0.3) +
      ((clientData.messageClarity || 88) * 0.3)
    ));

    let pattern7Vulnerability = 0;
    if (!clientData.clientRequirements) pattern7Vulnerability += 40;
    if ((clientData.activityDensity || 2.0) < 1.5) pattern7Vulnerability += 30;
    if ((clientData.memoQuality || 0.85) < 0.8) pattern7Vulnerability += 30;
    const pattern7Score = Math.min(100, 100 - pattern7Vulnerability);

    return {
      overallScore: Math.round((paymentReliability + communicationScore + pattern7Score) / 3),
      detailedMetrics: [
        { name: "Payment Reliability", value: `${paymentReliability}%` },
        { name: "Communication Quality", value: `${communicationScore}%` },
        { name: "Pattern #7 Vulnerability", value: `${pattern7Score}%` }
      ],
      valueProtection: Math.round((clientData.avgProjectValue || 1200) * 0.35),
      formula: "(payment + communication + pattern7) / 3"
    };
  }

  // Expert tier: All metrics
  if (tier === "expert") {
    const paymentReliability = Math.min(100, Math.round((clientData.paymentHistory || 0.95) * 100));
    const communicationScore = Math.min(100, Math.round(
      ((clientData.communicationFrequency || 85) * 0.4) +
      ((clientData.responseTime || 80) * 0.3) +
      ((clientData.messageClarity || 88) * 0.3)
    ));

    let pattern7Vulnerability = 0;
    if (!clientData.clientRequirements) pattern7Vulnerability += 40;
    if ((clientData.activityDensity || 2.0) < 1.5) pattern7Vulnerability += 30;
    if ((clientData.memoQuality || 0.85) < 0.8) pattern7Vulnerability += 30;
    const pattern7Score = Math.min(100, 100 - pattern7Vulnerability);

    const businessScore = Math.min(100, Math.round(
      ((clientData.clientDiversity || 75) * 0.3) +
      ((clientData.platformCoverage || 80) * 0.35) +
      ((clientData.historicalSuccess || 85) * 0.35)
    ));

    return {
      overallScore: Math.round((paymentReliability + communicationScore + pattern7Score + businessScore) / 4),
      detailedMetrics: [
        { name: "Payment Reliability", value: `${paymentReliability}%` },
        { name: "Communication Quality", value: `${communicationScore}%` },
        { name: "Pattern #7 Vulnerability", value: `${pattern7Score}%` },
        { name: "Business Pattern Score", value: `${businessScore}%` }
      ],
      valueProtection: Math.round(((clientData.weeklyIncome || 250) * 4.33) * 0.12),
      formula: "(payment + communication + pattern7 + business) / 4"
    };
  }

  // Default to free tier
  return calculateTierMetrics(clientData, "free");
}

function getUpgradeMessage(tier: string) {
  if (tier === "free") {
    return "Upgrade to Starter for communication pattern analysis";
  }
  if (tier === "starter") {
    return "Upgrade to Pro for Pattern #7 vulnerability detection";
  }
  if (tier === "pro") {
    return "Upgrade to Expert for business-wide trust analysis";
  }
  return null;
}
