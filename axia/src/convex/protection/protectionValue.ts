import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get comprehensive protection value metrics with 4-Pillar tier awareness
export const getProtectionValueMetrics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const tier = "expert";
    const hourlyRate = user.hourlyRate || 25;
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

    // Get all time blocks
    const allBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const monthlyBlocks = allBlocks.filter(b => b.startTime >= thirtyDaysAgo);
    const quarterlyBlocks = allBlocks.filter(b => b.startTime >= ninetyDaysAgo);

    // Calculate lifetime metrics
    const lifetimeCompliant = allBlocks.filter(b => b.complianceStatus === "compliant").length;
    const lifetimeRejected = allBlocks.filter(b => b.complianceStatus === "rejected").length;
    const lifetimeAtRisk = allBlocks.filter(b => b.complianceStatus === "at_risk").length;

    const lifetimeProtectedHours = lifetimeCompliant * (5 / 60);
    const lifetimeProtectedValue = lifetimeProtectedHours * hourlyRate;
    const lifetimeRejectedHours = lifetimeRejected * (5 / 60);
    const lifetimeRejectedValue = lifetimeRejectedHours * hourlyRate;
    const lifetimeAtRiskHours = lifetimeAtRisk * (5 / 60);
    const lifetimeAtRiskValue = lifetimeAtRiskHours * hourlyRate;

    // Calculate monthly metrics
    const monthlyCompliant = monthlyBlocks.filter(b => b.complianceStatus === "compliant").length;
    const monthlyRejected = monthlyBlocks.filter(b => b.complianceStatus === "rejected").length;
    const monthlyAtRisk = monthlyBlocks.filter(b => b.complianceStatus === "at_risk").length;

    const monthlyProtectedHours = monthlyCompliant * (5 / 60);
    const monthlyProtectedValue = monthlyProtectedHours * hourlyRate;
    const monthlyRejectedHours = monthlyRejected * (5 / 60);
    const monthlyRejectedValue = monthlyRejectedHours * hourlyRate;
    const monthlyAtRiskHours = monthlyAtRisk * (5 / 60);
    const monthlyAtRiskValue = monthlyAtRiskHours * hourlyRate;

    // Get dispute reports to calculate saved value
    const allReports = await ctx.db
      .query("disputeReports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const resolvedReports = allReports.filter(r => r.status === "resolved");
    const savedValue = resolvedReports.reduce((sum, r) => sum + r.lostIncome, 0);

    // Tier-based subscription costs (4-Pillar structure)
    const subscriptionCosts: Record<string, number> = {
      free: 0,
      starter: 4,
      pro: 8,
      expert: 16
    };
    const subscriptionCost = subscriptionCosts[tier] || 0;
    const monthlyROI = subscriptionCost > 0 ? ((savedValue - subscriptionCost) / subscriptionCost) * 100 : 0;

    // Calculate trends (compare current month to previous month)
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
    const previousMonthBlocks = allBlocks.filter(b => b.startTime >= sixtyDaysAgo && b.startTime < thirtyDaysAgo);
    const prevMonthCompliant = previousMonthBlocks.filter(b => b.complianceStatus === "compliant").length;
    const prevMonthProtectedValue = (prevMonthCompliant * (5 / 60)) * hourlyRate;
    
    const valueTrend = prevMonthProtectedValue > 0 
      ? ((monthlyProtectedValue - prevMonthProtectedValue) / prevMonthProtectedValue) * 100 
      : 0;

    // Platform breakdown
    const platformBreakdown = {
      upwork: 0,
      fiverr: 0,
      toptal: 0,
      client: 0,
    };

    monthlyBlocks.forEach(block => {
      const platform = (block as any).platform || "client";
      if (block.complianceStatus === "compliant") {
        const value = (5 / 60) * hourlyRate;
        platformBreakdown[platform as keyof typeof platformBreakdown] += value;
      }
    });

    // Tier-specific protection rates (4-Pillar)
    const tierProtectionRates: Record<string, number> = {
      free: 22,
      starter: 67,
      pro: 85,
      expert: 95
    };

    return {
      lifetime: {
        protectedValue: Math.round(lifetimeProtectedValue * 100) / 100,
        protectedHours: Math.round(lifetimeProtectedHours * 10) / 10,
        rejectedValue: Math.round(lifetimeRejectedValue * 100) / 100,
        rejectedHours: Math.round(lifetimeRejectedHours * 10) / 10,
        atRiskValue: Math.round(lifetimeAtRiskValue * 100) / 100,
        atRiskHours: Math.round(lifetimeAtRiskHours * 10) / 10,
      },
      monthly: {
        protectedValue: Math.round(monthlyProtectedValue * 100) / 100,
        protectedHours: Math.round(monthlyProtectedHours * 10) / 10,
        rejectedValue: Math.round(monthlyRejectedValue * 100) / 100,
        rejectedHours: Math.round(monthlyRejectedHours * 10) / 10,
        atRiskValue: Math.round(monthlyAtRiskValue * 100) / 100,
        atRiskHours: Math.round(monthlyAtRiskHours * 10) / 10,
      },
      savedValue: Math.round(savedValue * 100) / 100,
      roi: Math.round(monthlyROI * 100) / 100,
      valueTrend: Math.round(valueTrend * 100) / 100,
      platformBreakdown: {
        upwork: Math.round(platformBreakdown.upwork * 100) / 100,
        fiverr: Math.round(platformBreakdown.fiverr * 100) / 100,
        toptal: Math.round(platformBreakdown.toptal * 100) / 100,
        client: Math.round(platformBreakdown.client * 100) / 100,
      },
      totalReports: allReports.length,
      resolvedReports: resolvedReports.length,
      tierProtectionRate: tierProtectionRates[tier] || 22,
      subscriptionCost,
    };
  },
});

// Get value history for charts (last 12 months)
export const getValueHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const hourlyRate = user.hourlyRate || 25;
    const now = Date.now();
    const history = [];

    // Generate last 12 months of data
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const monthBlocks = await ctx.db
        .query("timeBlocks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => 
          q.and(
            q.gte(q.field("startTime"), monthStart.getTime()),
            q.lt(q.field("startTime"), monthEnd.getTime())
          )
        )
        .take(1000);

      const compliantBlocks = monthBlocks.filter(b => b.complianceStatus === "compliant").length;
      const protectedValue = (compliantBlocks * (5 / 60)) * hourlyRate;

      history.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: Math.round(protectedValue * 100) / 100,
      });
    }

    return history;
  },
});