import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { getAuthUserId } from "../lib/auth";
import { Id } from "../_generated/dataModel";

// Create a milestone snapshot at week completion
export const createMilestoneSnapshot = internalMutation({
  args: {
    projectId: v.id("projects"),
    weekNumber: v.number(),
    weekStart: v.number(),
    weekEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get all work sessions for this week
    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("startTime"), args.weekStart),
          q.lt(q.field("startTime"), args.weekEnd)
        )
      )
      .take(1000);

    const projectSessions = sessions.filter((s) => {
      const project = ctx.db.get(args.projectId);
      return project && s.projectName === (project as any).projectName;
    });

    // Calculate snapshot metrics
    const totalHours = projectSessions.reduce(
      (sum, s) => sum + (s.totalMinutes || 0) / 60,
      0
    );

    let totalEvidence = 0;
    for (const session of projectSessions) {
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
        totalEvidence += events.length;
      }
    }

    // Get time blocks for compliance
    const timeBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const weekBlocks = timeBlocks.filter((block) => {
      const session = projectSessions.find((s) => s._id === block.sessionId);
      return session !== undefined;
    });

    const compliantBlocks = weekBlocks.filter(
      (b) => b.complianceStatus === "compliant"
    ).length;
    const protectionRate =
      weekBlocks.length > 0 ? (compliantBlocks / weekBlocks.length) * 100 : 100;

    // Create the snapshot
    const snapshotId = await ctx.db.insert("milestoneSnapshots", {
      userId,
      projectId: args.projectId,
      weekNumber: args.weekNumber,
      weekStart: args.weekStart,
      weekEnd: args.weekEnd,
      totalHours,
      totalEvidence,
      protectionRate: Math.round(protectionRate),
      sessionCount: projectSessions.length,
      createdAt: Date.now(),
    });

    return snapshotId;
  },
});

// Get snapshots for a project
export const getProjectSnapshots = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const snapshots = await ctx.db
      .query("milestoneSnapshots")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(1000);

    return snapshots;
  },
});

// Internal mutation to auto-create snapshots (called by cron)
export const autoCreateWeeklySnapshots = internalMutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get all active projects
    const projects = await ctx.db.query("projects").take(1000);

    for (const project of projects) {
      // Check if snapshot already exists for last week
      const existingSnapshot = await ctx.db
        .query("milestoneSnapshots")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .filter((q) =>
          q.and(
            q.gte(q.field("weekStart"), weekAgo),
            q.eq(q.field("userId"), project.userId)
          )
        )
        .first();

      if (!existingSnapshot) {
        // Create snapshot for last week
        const weekStart = weekAgo;
        const weekEnd = now;

        const sessions = await ctx.db
          .query("workSessions")
          .withIndex("by_user", (q) => q.eq("userId", project.userId))
          .filter((q) =>
            q.and(
              q.gte(q.field("startTime"), weekStart),
              q.lt(q.field("startTime"), weekEnd)
            )
          )
          .take(1000);

        const projectSessions = sessions.filter(
          (s) => s.projectName === project.projectName
        );

        if (projectSessions.length > 0) {
          const totalHours = projectSessions.reduce(
            (sum, s) => sum + (s.totalMinutes || 0) / 60,
            0
          );

          let totalEvidence = 0;
          for (const session of projectSessions) {
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
              totalEvidence += events.length;
            }
          }

          const timeBlocks = await ctx.db
            .query("timeBlocks")
            .withIndex("by_user", (q) => q.eq("userId", project.userId))
            .take(1000);

          const weekBlocks = timeBlocks.filter((block) => {
            const session = projectSessions.find((s) => s._id === block.sessionId);
            return session !== undefined;
          });

          const compliantBlocks = weekBlocks.filter(
            (b) => b.complianceStatus === "compliant"
          ).length;
          const protectionRate =
            weekBlocks.length > 0
              ? (compliantBlocks / weekBlocks.length) * 100
              : 100;

          await ctx.db.insert("milestoneSnapshots", {
            userId: project.userId,
            projectId: project._id,
            weekNumber: Math.floor((now - project._creationTime) / (7 * 24 * 60 * 60 * 1000)),
            weekStart,
            weekEnd,
            totalHours,
            totalEvidence,
            protectionRate: Math.round(protectionRate),
            sessionCount: projectSessions.length,
            createdAt: now,
          });
        }
      }
    }
  },
});