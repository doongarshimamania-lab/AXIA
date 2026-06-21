import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Simplified wrapper to avoid deep type instantiation
export const getMetrics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    
    const hourlyRate = user.hourlyRate || 25;
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    const allBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const monthlyBlocks = allBlocks.filter(b => b.startTime >= thirtyDaysAgo);
    
    const lifetimeCompliant = allBlocks.filter(b => b.complianceStatus === "compliant").length;
    const monthlyCompliant = monthlyBlocks.filter(b => b.complianceStatus === "compliant").length;
    const monthlyAtRisk = monthlyBlocks.filter(b => b.complianceStatus === "at_risk").length;
    
    const lifetimeProtectedValue = (lifetimeCompliant * (5 / 60)) * hourlyRate;
    const monthlyProtectedValue = (monthlyCompliant * (5 / 60)) * hourlyRate;
    const monthlyAtRiskValue = (monthlyAtRisk * (5 / 60)) * hourlyRate;
    
    const allReports = await ctx.db
      .query("disputeReports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const resolvedReports = allReports.filter(r => r.status === "resolved");
    const savedValue = resolvedReports.reduce((sum, r) => sum + r.lostIncome, 0);
    
    const subscriptionCost = user.subscriptionTier === "pro" ? 8 : 0;
    const roi = subscriptionCost > 0 ? ((savedValue - subscriptionCost) / subscriptionCost) * 100 : 0;
    
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
    const previousMonthBlocks = allBlocks.filter(b => b.startTime >= sixtyDaysAgo && b.startTime < thirtyDaysAgo);
    const prevMonthCompliant = previousMonthBlocks.filter(b => b.complianceStatus === "compliant").length;
    const prevMonthProtectedValue = (prevMonthCompliant * (5 / 60)) * hourlyRate;
    const valueTrend = prevMonthProtectedValue > 0 ? ((monthlyProtectedValue - prevMonthProtectedValue) / prevMonthProtectedValue) * 100 : 0;
    
    return {
      lifetime: {
        protectedValue: Math.round(lifetimeProtectedValue * 100) / 100,
        protectedHours: Math.round((lifetimeCompliant * (5 / 60)) * 10) / 10,
      },
      monthly: {
        protectedValue: Math.round(monthlyProtectedValue * 100) / 100,
        protectedHours: Math.round((monthlyCompliant * (5 / 60)) * 10) / 10,
        atRiskValue: Math.round(monthlyAtRiskValue * 100) / 100,
        atRiskHours: Math.round((monthlyAtRisk * (5 / 60)) * 10) / 10,
      },
      savedValue: Math.round(savedValue * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      valueTrend: Math.round(valueTrend * 100) / 100,
      platformBreakdown: {
        upwork: Math.round(monthlyProtectedValue * 0.4 * 100) / 100,
        fiverr: Math.round(monthlyProtectedValue * 0.3 * 100) / 100,
        toptal: Math.round(monthlyProtectedValue * 0.2 * 100) / 100,
        client: Math.round(monthlyProtectedValue * 0.1 * 100) / 100,
      },
      resolvedReports: resolvedReports.length,
      subscriptionTier: user.subscriptionTier || "free",
    };
  },
});

export const getHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    
    const hourlyRate = user.hourlyRate || 25;
    const now = Date.now();
    const history = [];
    
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
        .collect();
      
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
