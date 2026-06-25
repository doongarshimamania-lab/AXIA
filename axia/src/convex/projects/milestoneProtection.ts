import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get milestone protection data for a project with new features
export const getMilestoneProtection = query({
  args: {
    projectId: v.optional(v.id("projects")),
    userTier: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.projectId) {
      return null;
    }
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      // User not authenticated
      return {
        tier: "free",
        milestones: [],
        totalProtectedValue: 0,
        totalAtRiskValue: 0,
        avgProtectionRate: 0,
        predictions: null,
        projectData: null,
        snapshots: [],
        alerts: [],
        latestReport: null,
      };
    }
    if (!userId) {
      return {
        tier: "free",
        milestones: [],
        totalProtectedValue: 0,
        totalAtRiskValue: 0,
        avgProtectionRate: 0,
        predictions: null,
        projectData: null,
        snapshots: [],
        alerts: [],
        latestReport: null,
      };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return {
        tier: "free",
        milestones: [],
        totalProtectedValue: 0,
        totalAtRiskValue: 0,
        avgProtectionRate: 0,
        predictions: null,
        projectData: null,
        snapshots: [],
        alerts: [],
        latestReport: null,
      };
    }

    const tier = "expert";

    // Get project filter
    let projectFilter: string | null = null;
    let projectHourlyRate = 25;
    let projectData = null;

    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (project && project.userId === userId) {
        projectFilter = project.projectName;
        projectHourlyRate = project.hourlyRate;
        projectData = project;
      }
    }

    const allSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const sessions = projectFilter
      ? allSessions.filter((s) => s.projectName === projectFilter)
      : allSessions;

    // Create milestone periods based on tier
    const now = Date.now();
    const milestones = [];
    const weeksToShow = tier === "free" ? 1 : tier === "starter" ? 2 : tier === "pro" ? 4 : 8;

    for (let i = 0; i < weeksToShow; i++) {
      const weekStart = now - (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = now - i * 7 * 24 * 60 * 60 * 1000;

      const weekSessions = sessions.filter(
        (s) => s.startTime >= weekStart && s.startTime < weekEnd
      );
      const totalHours = weekSessions.reduce(
        (sum, s) => sum + (s.totalMinutes || 0) / 60,
        0
      );

      // Get time blocks for this period
      const timeBlocks = await ctx.db
        .query("timeBlocks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(1000);

      const weekBlocks = timeBlocks.filter((block) => {
        const session = weekSessions.find((s) => s._id === block.sessionId);
        return session !== undefined;
      });

      const compliantBlocks = weekBlocks.filter(
        (b) => b.complianceStatus === "compliant"
      ).length;
      const protectionRate =
        weekBlocks.length > 0
          ? (compliantBlocks / weekBlocks.length) * 100
          : 100;

      // Calculate evidence quality for this period
      let evidenceScore = 0;
      for (const session of weekSessions) {
        const evidenceSession = await ctx.db
          .query("evidenceSessions")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .first();

        if (evidenceSession) {
          const events = await ctx.db
            .query("evidenceEvents")
            .withIndex("by_session_and_time", (q) =>
              q.eq("evidenceSessionId", evidenceSession._id)
            )
            .take(1000);
          evidenceScore += events.length;
        }
      }

      // Check if snapshot exists for this week
      let hasSnapshot = false;
      if (args.projectId) {
        const projectId = args.projectId;
        const snapshot = await ctx.db
          .query("milestoneSnapshots")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .filter((q) =>
            q.and(
              q.gte(q.field("weekStart"), weekStart),
              q.lt(q.field("weekEnd"), weekEnd),
              q.eq(q.field("userId"), userId)
            )
          )
          .first();
        hasSnapshot = !!snapshot;
      }

      milestones.push({
        period: `Week ${i + 1}`,
        weekNumber: i + 1,
        hours: Math.round(totalHours * 10) / 10,
        value: Math.round(totalHours * projectHourlyRate * 100) / 100,
        protectionRate: Math.round(protectionRate),
        evidenceCount: evidenceScore,
        status:
          protectionRate >= 90
            ? "protected"
            : protectionRate >= 70
            ? "at_risk"
            : "vulnerable",
        weekStart,
        weekEnd,
        hasSnapshot,
      });
    }

    // Calculate tier-specific metrics
    const totalProtectedValue = milestones.reduce(
      (sum, m) => sum + (m.status === "protected" ? m.value : 0),
      0
    );
    const totalAtRiskValue = milestones.reduce(
      (sum, m) => sum + (m.status !== "protected" ? m.value : 0),
      0
    );
    const avgProtectionRate =
      milestones.length > 0
        ? milestones.reduce((sum, m) => sum + m.protectionRate, 0) /
          milestones.length
        : 0;

    // Get snapshots, alerts, and reports if project is selected
    let snapshots: any[] = [];
    let alerts: any[] = [];
    let latestReport: any = null;

    if (args.projectId) {
      const projectId = args.projectId;
      
      snapshots = await ctx.db
        .query("milestoneSnapshots")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .order("desc")
        .take(8);

      alerts = await ctx.db
        .query("milestoneAlerts")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .order("desc")
        .take(5);

      latestReport = await ctx.db
        .query("milestoneReports")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .order("desc")
        .first();
    }

    // Expert tier: Add predictive analytics (algorithmic, no AI needed)
    let predictions = null;
    if (tier === "expert" && milestones.length >= 2) {
      // Calculate trends from recent weeks
      const recentWeeks = milestones.slice(0, 4);
      const avgRecentProtection = recentWeeks.reduce((sum, m) => sum + m.protectionRate, 0) / recentWeeks.length;
      const avgRecentHours = recentWeeks.reduce((sum, m) => sum + m.hours, 0) / recentWeeks.length;
      const avgRecentEvidence = recentWeeks.reduce((sum, m) => sum + m.evidenceCount, 0) / recentWeeks.length;
      
      // Calculate week-over-week trends
      const protectionTrend = milestones.length >= 2 
        ? milestones[0].protectionRate - milestones[1].protectionRate 
        : 0;
      const hoursTrend = milestones.length >= 2
        ? ((milestones[0].hours - milestones[1].hours) / milestones[1].hours) * 100
        : 0;
      
      // Predict next week's protection rate using linear regression
      let nextWeekProtection = avgRecentProtection;
      if (milestones.length >= 3) {
        const slope = (milestones[0].protectionRate - milestones[2].protectionRate) / 2;
        nextWeekProtection = Math.min(100, Math.max(0, milestones[0].protectionRate + slope));
      }
      
      // Determine risk forecast
      let riskForecast = "stable";
      let riskLevel = "low";
      if (protectionTrend < -10) {
        riskForecast = "increasing";
        riskLevel = "high";
      } else if (protectionTrend < -5) {
        riskForecast = "increasing";
        riskLevel = "medium";
      } else if (protectionTrend > 5) {
        riskForecast = "decreasing";
        riskLevel = "low";
      }
      
      // Generate smart recommendations based on data patterns
      const recommendedActions: string[] = [];
      
      if (avgRecentProtection < 80) {
        recommendedActions.push("🚨 Priority: Increase evidence collection to reach 80%+ protection");
      }
      if (protectionTrend < -5) {
        recommendedActions.push("⚠️ Protection declining - review recent work sessions for gaps");
      }
      if (avgRecentEvidence / avgRecentHours < 3) {
        recommendedActions.push("📸 Collect 3+ evidence items per hour for optimal protection");
      }
      if (hoursTrend > 20) {
        recommendedActions.push("⏰ Hours increased 20%+ - ensure evidence keeps pace");
      }
      if (avgRecentProtection >= 90) {
        recommendedActions.push("✅ Excellent protection - maintain current practices");
      }
      if (milestones[0].status === "at_risk" && milestones[1]?.status === "protected") {
        recommendedActions.push("🔄 Recent protection drop - schedule milestone review");
      }
      
      // Add general best practices if no critical issues
      if (recommendedActions.length === 0 || avgRecentProtection >= 85) {
        recommendedActions.push("📋 Schedule weekly client check-ins for approval");
        recommendedActions.push("💾 Back up evidence to external storage monthly");
      }
      
      predictions = {
        nextWeekProtection: Math.round(nextWeekProtection),
        riskForecast,
        riskLevel,
        recommendedActions,
        trends: {
          protectionTrend: Math.round(protectionTrend * 10) / 10,
          hoursTrend: Math.round(hoursTrend * 10) / 10,
          evidencePerHour: Math.round((avgRecentEvidence / avgRecentHours) * 10) / 10,
        },
        analytics: {
          avgProtection: Math.round(avgRecentProtection),
          avgHours: Math.round(avgRecentHours * 10) / 10,
          avgEvidence: Math.round(avgRecentEvidence),
          consistency: Math.round((1 - (Math.max(...recentWeeks.map(m => m.protectionRate)) - Math.min(...recentWeeks.map(m => m.protectionRate))) / 100) * 100),
        }
      };
    }

    return {
      tier,
      milestones: milestones.reverse(),
      totalProtectedValue: Math.round(totalProtectedValue * 100) / 100,
      totalAtRiskValue: Math.round(totalAtRiskValue * 100) / 100,
      avgProtectionRate: Math.round(avgProtectionRate),
      predictions,
      projectData,
      snapshots,
      alerts,
      latestReport,
    };
  },
});