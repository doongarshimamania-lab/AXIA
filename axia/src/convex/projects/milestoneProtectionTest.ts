import { mutation } from "../_generated/server";
import { getAuthUserId } from "../lib/auth";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Test utility: Create snapshot for a project
// Note: Due to TypeScript limitations with Convex internal references,
// these test functions directly insert data instead of calling internal mutations
export const testCreateSnapshot = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "testCreateSnapshot");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }

    const now = Date.now();
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;
    const weekEnd = now;
    const weekNumber = Math.floor((now - project._creationTime) / (7 * 24 * 60 * 60 * 1000));

    // Get work sessions for this week
    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("startTime"), weekStart),
          q.lt(q.field("startTime"), weekEnd)
        )
      )
      .take(1000);

    const projectSessions = sessions.filter((s) => s.projectName === project.projectName);
    const totalHours = projectSessions.reduce((sum, s) => sum + (s.totalMinutes || 0) / 60, 0);

    // Create snapshot directly
    const snapshotId = await ctx.db.insert("milestoneSnapshots", {
      userId,
      projectId: args.projectId,
      weekNumber,
      weekStart,
      weekEnd,
      totalHours,
      totalEvidence: Math.floor(Math.random() * 50) + 20,
      protectionRate: Math.floor(Math.random() * 30) + 70,
      sessionCount: projectSessions.length,
      createdAt: now,
    });

    return { snapshotId, message: "Snapshot created successfully" };
  },
});

// Test utility: Create alert for a project
export const testCreateAlert = mutation({
  args: {
    projectId: v.id("projects"),
    alertType: v.union(
      v.literal("protection_drop"),
      v.literal("evidence_gap"),
      v.literal("week_completion"),
      v.literal("approval_needed")
    ),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "testCreateAlert");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }

    const alertId = await ctx.db.insert("milestoneAlerts", {
      userId,
      projectId: args.projectId,
      weekNumber: 1,
      alertType: args.alertType,
      severity: args.alertType === "protection_drop" ? "critical" : "warning",
      message: `Test alert: ${args.alertType.replace(/_/g, " ")}`,
      protectionRate: args.alertType === "protection_drop" ? 65 : undefined,
      isRead: false,
      createdAt: Date.now(),
    });

    return { alertId, message: "Alert created successfully" };
  },
});

// Test utility: Generate report for a project
export const testGenerateReport = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "testGenerateReport");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }

    const now = Date.now();
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;
    const weekEnd = now;
    const weekNumber = Math.floor((now - project._creationTime) / (7 * 24 * 60 * 60 * 1000));

    // Create a snapshot first if it doesn't exist
    const existingSnapshot = await ctx.db
      .query("milestoneSnapshots")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) =>
        q.and(
          q.eq(q.field("weekNumber"), weekNumber),
          q.eq(q.field("userId"), userId)
        )
      )
      .first();

    const snapshotId = existingSnapshot?._id || await ctx.db.insert("milestoneSnapshots", {
      userId,
      projectId: args.projectId,
      weekNumber,
      weekStart,
      weekEnd,
      totalHours: 35.5,
      totalEvidence: 42,
      protectionRate: 88,
      sessionCount: 7,
      createdAt: now,
    });

    // Create report
    const reportId = await ctx.db.insert("milestoneReports", {
      userId,
      projectId: args.projectId,
      weekNumber,
      weekStart,
      weekEnd,
      snapshotId,
      metrics: {
        totalHours: 35.5,
        totalEvidence: 42,
        protectionRate: 88,
        sessionCount: 7,
      },
      trends: {
        hoursTrend: 5.2,
        protectionTrend: 3,
        evidenceTrend: 8.5,
      },
      insights: [
        {
          type: "success" as const,
          message: "Excellent protection rate! Your work is well-documented.",
        },
      ],
      createdAt: now,
    });

    return { reportId, message: "Report generated successfully" };
  },
});
