import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { getAuthUserId } from "../lib/auth";

// Generate weekly milestone report
export const generateWeeklyReport = internalMutation({
  args: {
    projectId: v.id("projects"),
    weekNumber: v.number(),
    weekStart: v.number(),
    weekEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }

    // Get snapshot for this week
    const snapshot = await ctx.db
      .query("milestoneSnapshots")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) =>
        q.and(
          q.eq(q.field("weekNumber"), args.weekNumber),
          q.eq(q.field("userId"), userId)
        )
      )
      .first();

    if (!snapshot) {
      throw new Error("No snapshot found for this week");
    }

    // Get previous week for comparison
    const previousSnapshot = await ctx.db
      .query("milestoneSnapshots")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) =>
        q.and(
          q.eq(q.field("weekNumber"), args.weekNumber - 1),
          q.eq(q.field("userId"), userId)
        )
      )
      .first();

    // Calculate trends
    const hoursTrend = previousSnapshot
      ? ((snapshot.totalHours - previousSnapshot.totalHours) / previousSnapshot.totalHours) * 100
      : 0;
    const protectionTrend = previousSnapshot
      ? snapshot.protectionRate - previousSnapshot.protectionRate
      : 0;
    const evidenceTrend = previousSnapshot
      ? ((snapshot.totalEvidence - previousSnapshot.totalEvidence) / previousSnapshot.totalEvidence) * 100
      : 0;

    // Generate insights
    const insights = [];
    if (snapshot.protectionRate < 80) {
      insights.push({
        type: "warning" as const,
        message: `Protection rate is below 80%. Consider increasing evidence collection.`,
      });
    }
    if (protectionTrend < -10) {
      insights.push({
        type: "critical" as const,
        message: `Protection dropped by ${Math.abs(protectionTrend).toFixed(0)}% this week.`,
      });
    }
    if (snapshot.totalHours > 0 && snapshot.totalEvidence / snapshot.totalHours < 3) {
      insights.push({
        type: "warning" as const,
        message: `Evidence collection rate is low. Aim for 3+ evidence items per hour.`,
      });
    }
    if (snapshot.protectionRate >= 90) {
      insights.push({
        type: "success" as const,
        message: `Excellent protection rate! Your work is well-documented.`,
      });
    }

    // Create report
    const reportId = await ctx.db.insert("milestoneReports", {
      userId,
      projectId: args.projectId,
      weekNumber: args.weekNumber,
      weekStart: args.weekStart,
      weekEnd: args.weekEnd,
      snapshotId: snapshot._id,
      metrics: {
        totalHours: snapshot.totalHours,
        totalEvidence: snapshot.totalEvidence,
        protectionRate: snapshot.protectionRate,
        sessionCount: snapshot.sessionCount,
      },
      trends: {
        hoursTrend: Math.round(hoursTrend * 10) / 10,
        protectionTrend: Math.round(protectionTrend),
        evidenceTrend: Math.round(evidenceTrend * 10) / 10,
      },
      insights,
      createdAt: Date.now(),
    });

    return reportId;
  },
});

// Get reports for a project
export const getProjectReports = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const reports = await ctx.db
      .query("milestoneReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(12);

    return reports;
  },
});

// Get latest report
export const getLatestReport = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const report = await ctx.db
      .query("milestoneReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .first();

    return report;
  },
});
