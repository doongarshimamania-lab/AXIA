/**
 * Time Tracking CRUD — queries and mutations for work sessions, time blocks,
 * and compliance alerts. Supports workspace-scoped data and team aggregation.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── QUERIES ──────────────────────────────────────────────────────────────────

/** Get work sessions for the current user, optionally filtered by workspace. */
export const getWorkSessions = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let sessions;
    if (args.workspaceId) {
      sessions = await ctx.db
        .query("workSessions")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .filter((q) => q.eq(q.field("userId"), userId))
        .order("desc")
        .take(args.limit || 50)
        .collect();
    } else {
      sessions = await ctx.db
        .query("workSessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(args.limit || 50)
        .collect();
    }

    return sessions;
  },
});

/** Get the current active (running) session for the user. */
export const getActiveSession = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const session = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();

    return session || null;
  },
});

/** Get a single work session by ID. */
export const getWorkSession = query({
  args: { sessionId: v.id("workSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return null;
    return session;
  },
});

/** Get aggregate session stats for the current user. */
export const getSessionStats = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;
    const monthStart = now - 30 * 24 * 60 * 60 * 1000;

    let sessions;
    if (args.workspaceId) {
      sessions = await ctx.db
        .query("workSessions")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
    } else {
      sessions = await ctx.db
        .query("workSessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    const completedSessions = sessions.filter((s) => s.endTime !== undefined);
    const activeSession = sessions.find((s) => s.endTime === undefined);

    // Week stats
    const weekSessions = completedSessions.filter((s) => s.startTime >= weekStart);
    const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0);

    // Month stats
    const monthSessions = completedSessions.filter((s) => s.startTime >= monthStart);
    const monthMinutes = monthSessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0);

    // By client
    const byClient: Record<string, { totalMinutes: number; totalSessions: number; totalValue: number }> = {};
    for (const s of completedSessions) {
      if (!byClient[s.clientName]) {
        byClient[s.clientName] = { totalMinutes: 0, totalSessions: 0, totalValue: 0 };
      }
      byClient[s.clientName].totalMinutes += s.totalMinutes || 0;
      byClient[s.clientName].totalSessions += 1;
      byClient[s.clientName].totalValue += ((s.totalMinutes || 0) / 60) * s.hourlyRate;
    }

    // By project
    const byProject: Record<string, { totalMinutes: number; totalSessions: number }> = {};
    for (const s of completedSessions) {
      if (!byProject[s.projectName]) {
        byProject[s.projectName] = { totalMinutes: 0, totalSessions: 0 };
      }
      byProject[s.projectName].totalMinutes += s.totalMinutes || 0;
      byProject[s.projectName].totalSessions += 1;
    }

    // Compliance stats
    const compliantCount = completedSessions.filter((s) => s.complianceStatus === "active").length;
    const atRiskCount = completedSessions.filter((s) => s.complianceStatus === "at_risk").length;
    const rejectedCount = completedSessions.filter((s) => s.complianceStatus === "rejected").length;

    return {
      totalSessions: completedSessions.length,
      activeSession: activeSession ? {
        _id: activeSession._id,
        clientName: activeSession.clientName,
        projectName: activeSession.projectName,
        startTime: activeSession.startTime,
        hourlyRate: activeSession.hourlyRate,
      } : null,
      weekMinutes,
      weekSessions: weekSessions.length,
      monthMinutes,
      monthSessions: monthSessions.length,
      totalMinutes: completedSessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0),
      byClient,
      byProject,
      compliance: {
        compliant: compliantCount,
        atRisk: atRiskCount,
        rejected: rejectedCount,
        complianceRate: completedSessions.length > 0
          ? Math.round((compliantCount / completedSessions.length) * 100)
          : 100,
      },
    };
  },
});

/** Get time blocks for a session. */
export const getTimeBlocks = query({
  args: { sessionId: v.id("workSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify the session belongs to the user
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return [];

    return await ctx.db
      .query("timeBlocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

/** Get compliance alerts for the current user. */
export const getComplianceAlerts = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    acknowledged: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let alerts;
    if (args.workspaceId) {
      alerts = await ctx.db
        .query("complianceAlerts")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
    } else {
      alerts = await ctx.db
        .query("complianceAlerts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    if (args.acknowledged !== undefined) {
      return alerts.filter((a) => a.acknowledged === args.acknowledged);
    }

    return alerts;
  },
});

/** Get team time stats (aggregated across workspace members). */
export const getTeamTimeStats = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Verify the user is a member of this workspace
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return null;

    const isOwner = workspace.ownerId === userId;
    const membership = !isOwner
      ? await ctx.db
          .query("workspaceMembers")
          .withIndex("by_workspace_and_user", (q) =>
            q.eq("workspaceId", args.workspaceId).eq("userId", userId)
          )
          .first()
      : null;

    if (!isOwner && (!membership || membership.status !== "active")) return null;

    // Get all workspace members
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Get all sessions in this workspace
    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const now = Date.now();
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;

    // Aggregate by member
    const memberStats = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        const memberSessions = sessions.filter((s) => s.userId === member.userId);
        const weekSessions = memberSessions.filter((s) => s.startTime >= weekStart && s.endTime);
        const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0);

        return {
          userId: member.userId,
          name: user?.name || user?.email || "Unknown",
          email: user?.email || "",
          role: member.role,
          weekMinutes,
          weekSessions: weekSessions.length,
          totalSessions: memberSessions.filter((s) => s.endTime).length,
          totalMinutes: memberSessions
            .filter((s) => s.endTime)
            .reduce((sum, s) => sum + (s.totalMinutes || 0), 0),
          activeSession: memberSessions.find((s) => !s.endTime) ? {
            clientName: memberSessions.find((s) => !s.endTime)!.clientName,
            startTime: memberSessions.find((s) => !s.endTime)!.startTime,
          } : null,
        };
      })
    );

    // Aggregate by project
    const byProject: Record<string, { totalMinutes: number; totalSessions: number }> = {};
    for (const s of sessions.filter((s) => s.endTime)) {
      if (!byProject[s.projectName]) {
        byProject[s.projectName] = { totalMinutes: 0, totalSessions: 0 };
      }
      byProject[s.projectName].totalMinutes += s.totalMinutes || 0;
      byProject[s.projectName].totalSessions += 1;
    }

    // Aggregate by client
    const byClient: Record<string, { totalMinutes: number; totalValue: number }> = {};
    for (const s of sessions.filter((s) => s.endTime)) {
      if (!byClient[s.clientName]) {
        byClient[s.clientName] = { totalMinutes: 0, totalValue: 0 };
      }
      byClient[s.clientName].totalMinutes += s.totalMinutes || 0;
      byClient[s.clientName].totalValue += ((s.totalMinutes || 0) / 60) * s.hourlyRate;
    }

    const weekSessions = sessions.filter((s) => s.startTime >= weekStart && s.endTime);
    const totalWeekMinutes = weekSessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0);

    return {
      memberCount: members.length,
      totalWeekMinutes,
      totalWeekSessions: weekSessions.length,
      memberStats,
      byProject,
      byClient,
    };
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

/** Start a new work session. */
export const startSession = mutation({
  args: {
    clientName: v.string(),
    projectName: v.string(),
    hourlyRate: v.number(),
    memo: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if there's already an active session
    const existing = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();

    if (existing) {
      throw new Error("You already have an active session. Please stop it first.");
    }

    const sessionId = await ctx.db.insert("workSessions", {
      userId,
      workspaceId: args.workspaceId,
      startTime: Date.now(),
      complianceStatus: "active",
      clientName: args.clientName,
      projectName: args.projectName,
      hourlyRate: args.hourlyRate,
      memo: args.memo,
    });

    return sessionId;
  },
});

/** Stop the active session, calculating total minutes. */
export const stopSession = mutation({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    if (session.endTime) {
      throw new Error("Session is already stopped");
    }

    const endTime = Date.now();
    const totalMinutes = Math.floor((endTime - session.startTime) / (1000 * 60));

    await ctx.db.patch(args.sessionId, {
      endTime,
      totalMinutes,
    });

    return { totalMinutes, endTime };
  },
});

/** Update session details (memo, client, project, etc.). */
export const updateSession = mutation({
  args: {
    sessionId: v.id("workSessions"),
    clientName: v.optional(v.string()),
    projectName: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    memo: v.optional(v.string()),
    complianceStatus: v.optional(v.union(v.literal("active"), v.literal("at_risk"), v.literal("rejected"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    const updates: Record<string, unknown> = {};
    if (args.clientName !== undefined) updates.clientName = args.clientName;
    if (args.projectName !== undefined) updates.projectName = args.projectName;
    if (args.hourlyRate !== undefined) updates.hourlyRate = args.hourlyRate;
    if (args.memo !== undefined) updates.memo = args.memo;
    if (args.complianceStatus !== undefined) updates.complianceStatus = args.complianceStatus;

    await ctx.db.patch(args.sessionId, updates);
    return { success: true };
  },
});

/** Delete a work session. */
export const deleteSession = mutation({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    // Delete associated time blocks
    const blocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }

    // Delete the session
    await ctx.db.delete(args.sessionId);
    return { success: true };
  },
});

/** Acknowledge a compliance alert. */
export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id("complianceAlerts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.userId !== userId) {
      throw new Error("Alert not found or unauthorized");
    }

    await ctx.db.patch(args.alertId, {
      acknowledged: true,
      actionTaken: "acknowledged_by_user",
    });

    return { success: true };
  },
});
