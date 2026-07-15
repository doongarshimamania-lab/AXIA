import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../users";

// Tier detection based on Pattern #7 vulnerability scoring
export const detectUserTier = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const currentTier = user.subscriptionTier || "free";
    
    // Calculate vulnerability score based on work patterns
    const vulnerabilityScore = await calculateVulnerabilityScore(ctx, user._id);
    
    // Determine recommended tier based on vulnerability
    let recommendedTier = "free";
    if (vulnerabilityScore >= 75) {
      recommendedTier = "expert";
    } else if (vulnerabilityScore >= 50) {
      recommendedTier = "pro";
    } else if (vulnerabilityScore >= 25) {
      recommendedTier = "starter";
    }

    return {
      currentTier,
      recommendedTier,
      vulnerabilityScore,
      shouldUpgrade: getTierLevel(recommendedTier) > getTierLevel(currentTier),
    };
  },
});

// Calculate Pattern #7 vulnerability score
async function calculateVulnerabilityScore(ctx: any, userId: any): Promise<number> {
  const now = Date.now();
  const last30Days = now - (30 * 24 * 60 * 60 * 1000);
  
  // Get recent time blocks
  const recentBlocks = await ctx.db
    .query("timeBlocks")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) => q.gte(q.field("startTime"), last30Days))
    .collect();

  if (recentBlocks.length === 0) return 0;

  // Calculate vulnerability factors
  const rejectedBlocks = recentBlocks.filter((b: any) => b.complianceStatus === "rejected").length;
  const atRiskBlocks = recentBlocks.filter((b: any) => b.complianceStatus === "at_risk").length;
  const totalBlocks = recentBlocks.length;

  const rejectionRate = (rejectedBlocks / totalBlocks) * 100;
  const atRiskRate = (atRiskBlocks / totalBlocks) * 100;
  
  // Vulnerability score: higher = more vulnerable
  const vulnerabilityScore = Math.min(100, rejectionRate * 2 + atRiskRate);
  
  return Math.round(vulnerabilityScore);
}

function getTierLevel(tier: string): number {
  const levels: Record<string, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    expert: 3,
    client: 4,
  };
  return levels[tier] || 0;
}

// Get tier-specific features with 4-pillar structure
export const getTierFeatures = query({
  args: { tier: v.string() },
  handler: async (ctx, args) => {
    const features = {
      free: {
        disputeReports: 1,
        successRate: 22,
        support: "Community",
        clients: 1,
        pillars: {
          evidenceCollection: "Basic screenshots only",
          complianceMonitoring: "Manual checks",
          disputePrevention: "Limited (1 report/month)",
          successOptimization: "None",
        },
        features: ["1 Client", "Basic Time Tracking", "1 Dispute Report/Month", "22% Success Rate", "Community Support"],
      },
      starter: {
        disputeReports: 5,
        successRate: 45,
        support: "Email (48h)",
        clients: 5,
        pillars: {
          evidenceCollection: "Screenshots + activity logs",
          complianceMonitoring: "Automated hourly checks",
          disputePrevention: "5 reports/month",
          successOptimization: "Basic analytics",
        },
        features: ["5 Clients", "5 Dispute Reports/Month", "45% Success Rate", "Email Support", "Basic Evidence Collection"],
      },
      pro: {
        disputeReports: -1, // unlimited
        successRate: 83,
        support: "Priority (24h)",
        clients: -1, // unlimited
        pillars: {
          evidenceCollection: "Full evidence library + memos",
          complianceMonitoring: "Real-time (5-min intervals)",
          disputePrevention: "Unlimited AI-powered reports",
          successOptimization: "Cross-platform verification",
        },
        features: ["UNLIMITED Clients", "Unlimited Dispute Reports", "83% Success Rate", "Priority Support", "AI Dispute Prediction", "Cross-Platform Verification"],
      },
      expert: {
        disputeReports: -1,
        successRate: 95,
        support: "Dedicated (4h)",
        clients: -1,
        pillars: {
          evidenceCollection: "Advanced + custom policy analysis",
          complianceMonitoring: "Predictive risk detection",
          disputePrevention: "Proactive intervention",
          successOptimization: "Team validation + analytics",
        },
        features: ["All Pro Features", "95% Success Rate", "Dedicated Support", "Custom Policy Analysis", "Team Validation", "Predictive Analytics"],
      },
      client: {
        disputeReports: -1,
        successRate: 100,
        support: "White Glove",
        clients: -1,
        pillars: {
          evidenceCollection: "Enterprise-grade verification",
          complianceMonitoring: "WCVM Dashboard",
          disputePrevention: "Freelancer directory access",
          successOptimization: "Custom integrations",
        },
        features: ["WCVM Verification Dashboard", "Freelancer Directory", "Real-time Work Validation", "Custom Integrations"],
      },
    };

    return features[args.tier as keyof typeof features] || features.free;
  },
});

// Calculate relative value for upgrade
export const calculateUpgradeValue = query({
  args: { targetTier: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const currentTier = user.subscriptionTier || "free";
    const hourlyRate = user.hourlyRate || 25;
    
    // Get recent loss data
    const now = Date.now();
    const last30Days = now - (30 * 24 * 60 * 60 * 1000);
    
    const recentBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .filter((q: any) => q.gte(q.field("startTime"), last30Days))
      .collect();

    const rejectedBlocks = recentBlocks.filter((b: any) => b.complianceStatus === "rejected");
    const rejectedHours = rejectedBlocks.length * (5 / 60); // 5-minute blocks
    const monthlyLoss = rejectedHours * hourlyRate;

    // Calculate savings based on target tier success rate
    const successRates: Record<string, number> = {
      free: 22,
      starter: 45,
      pro: 83,
      expert: 95,
      client: 100,
    };
    const successRate = (successRates[args.targetTier] || 22) / 100;
    const monthlySavings = monthlyLoss * successRate;

    // Get tier pricing
    const pricing: Record<string, number> = {
      free: 0,
      starter: 7,
      pro: 15,
      expert: 49,
      client: 199,
    };

    const monthlyCost = pricing[args.targetTier] || 0;
    const netValue = monthlySavings - monthlyCost;

    return {
      currentTier,
      targetTier: args.targetTier,
      monthlyLoss,
      monthlySavings,
      monthlyCost,
      netValue,
      roi: monthlyCost > 0 ? (netValue / monthlyCost) * 100 : 0,
    };
  },
});