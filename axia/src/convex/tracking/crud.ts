import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireWorkspaceAccess, getWorkspaceMembership, getRecordAccess } from "../permissions";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// ─── Queries ─────────────────────────────────────────────────────────────────

/** Get the active (running) session for the current user */
export const getCurrentSession = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // If workspaceId provided, check workspace sessions first
    if (workspaceId) {
      const session = await ctx.db
        .query("workSessions")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .filter((q) => q.eq(q.field("endTime"), undefined))
        .first();
      if (session) return session;
    }

    const session = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();

    return session;
  },
});

/** Get all sessions for the current user, sorted by most recent first */
export const getSessions = query({
  args: {
    limit: v.optional(v.number()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (args.workspaceId) {
      const membership = await getWorkspaceMembership(ctx, args.workspaceId, userId);
      if (!membership) return [];

      return await ctx.db
        .query("workSessions")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .order("desc")
        .take(args.limit ?? 100);
    }

    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 100);

    return sessions;
  },
});

/** Get sessions between a date range */
export const getSessionsByDateRange = query({
  args: {
    startTimestamp: v.number(),
    endTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).gte("startTime", args.startTimestamp)
      )
      .filter((q) => q.lte(q.field("startTime"), args.endTimestamp))
      .take(1000);

    return sessions;
  },
});

/** Get time blocks for a specific session */
export const getTimeBlocks = query({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify the session belongs to the user
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return [];

    const blocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(1000);

    return blocks;
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Start a new work session (timer start) */
export const startSession = mutation({
  args: {
    projectName: v.string(),
    clientName: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    platform: v.optional(v.union(v.literal("upwork"), v.literal("fiverr"), v.literal("toptal"), v.literal("manual"))),
    notes: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "startSession");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    // If workspaceId provided, verify membership
    if (args.workspaceId) {
      await requireWorkspaceAccess(ctx, args.workspaceId, "member");
    }

    // Check if there's already an active session
    const activeSession = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();

    if (activeSession) {
      throw new Error("You already have an active session. Please stop it first.");
    }

    const { workspaceId, teamId, ...sessionArgs } = args;
    const now = Date.now();
    const sessionId = await ctx.db.insert("workSessions", {
      userId: userId,
      workspaceId: workspaceId ?? undefined,
      createdBy: userId,
      teamId: teamId ?? undefined,
      startTime: now,
      complianceStatus: "active",
      clientName: sessionArgs.clientName ?? "No Client",
      projectName: sessionArgs.projectName,
      hourlyRate: sessionArgs.hourlyRate ?? 75,
      platform: sessionArgs.platform,
      notes: sessionArgs.notes,
      isManualEntry: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return sessionId;
  },
});

/** Stop the active session (timer stop) */
export const stopSession = mutation({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "stopSession");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Check workspace membership or direct ownership
    if (session.workspaceId) {
      const access = await getRecordAccess(ctx, session, userId);
      if (!access || access === "read") throw new Error("Not authorized");
    } else if (session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    const now = Date.now();
    const totalMinutes = Math.floor((now - session.startTime) / (1000 * 60));

    await ctx.db.patch(args.sessionId, {
      endTime: now,
      totalMinutes,
      status: "stopped",
      updatedAt: now,
    });

    return { totalMinutes, endTime: now };
  },
});

/** Pause the active session */
export const pauseSession = mutation({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "pauseSession");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.workspaceId) {
      const access = await getRecordAccess(ctx, session, userId);
      if (!access || access === "read") throw new Error("Not authorized");
    } else if (session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    await ctx.db.patch(args.sessionId, {
      status: "paused",
      updatedAt: Date.now(),
    });

    return true;
  },
});

/** Resume a paused session */
export const resumeSession = mutation({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "resumeSession");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.workspaceId) {
      const access = await getRecordAccess(ctx, session, userId);
      if (!access || access === "read") throw new Error("Not authorized");
    } else if (session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    await ctx.db.patch(args.sessionId, {
      status: "active",
      updatedAt: Date.now(),
    });

    return true;
  },
});

/** Create a manual time entry (completed session with manual time) */
export const createManualEntry = mutation({
  args: {
    projectName: v.string(),
    clientName: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    platform: v.optional(v.union(v.literal("upwork"), v.literal("fiverr"), v.literal("toptal"), v.literal("manual"))),
    notes: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "createManualEntry");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    // If workspaceId provided, verify membership
    if (args.workspaceId) {
      await requireWorkspaceAccess(ctx, args.workspaceId, "member");
    }

    if (args.endTime <= args.startTime) {
      throw new Error("End time must be after start time");
    }

    const { workspaceId, teamId, ...sessionArgs } = args;
    const totalMinutes = Math.floor((args.endTime - args.startTime) / (1000 * 60));
    const now = Date.now();

    const sessionId = await ctx.db.insert("workSessions", {
      userId: userId,
      workspaceId: workspaceId ?? undefined,
      createdBy: userId,
      teamId: teamId ?? undefined,
      startTime: sessionArgs.startTime,
      endTime: sessionArgs.endTime,
      totalMinutes,
      complianceStatus: "active",
      clientName: sessionArgs.clientName ?? "Manual Entry",
      projectName: sessionArgs.projectName,
      hourlyRate: sessionArgs.hourlyRate ?? 75,
      platform: sessionArgs.platform ?? "manual",
      notes: sessionArgs.notes,
      isManualEntry: true,
      status: "completed",
      createdAt: now,
      updatedAt: now,
    });

    return sessionId;
  },
});

/** Delete a work session and its associated time blocks */
export const deleteSession = mutation({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "deleteSession");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Check workspace ownership or direct ownership
    if (session.workspaceId) {
      const access = await getRecordAccess(ctx, session, userId);
      if (access !== "owner" && session.userId !== userId) {
        throw new Error("Not authorized");
      }
    } else if (session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    // Delete associated time blocks
    const blocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(1000);

    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }

    // Delete the session itself
    await ctx.db.delete(args.sessionId);

    return true;
  },
});

// ponytail: updateSession — previously the TimeTracking page had an 'Edit'
// button next to the working 'Delete' button that only fired
// toast.info('Edit feature coming soon'). The Delete button calls
// deleteSession above; the Edit button had no backend mutation. This
// mutation lets the user edit a completed session's projectName,
// clientName, hourlyRate, notes, and (for manual entries) startTime /
// endTime. Recomputes totalMinutes when times change. Mirrors the
// deleteSession access gate. (Audit item #13.)
export const updateSession = mutation({
  args: {
    sessionId: v.id("workSessions"),
    projectName: v.optional(v.string()),
    clientName: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    notes: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "updateSession");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Same access gate as deleteSession
    if (session.workspaceId) {
      const access = await getRecordAccess(ctx, session, userId);
      if (access !== "owner" && session.userId !== userId) {
        throw new Error("Not authorized");
      }
    } else if (session.userId !== userId) {
      throw new Error("Session not found or unauthorized");
    }

    // Don't allow editing a currently-running session's times — that
    // would corrupt the live timer. The user must stop it first.
    const isRunning = !session.endTime && session.status === "active";
    if (isRunning && (args.startTime !== undefined || args.endTime !== undefined)) {
      throw new Error("Stop the running timer before editing its start/end times");
    }

    // Validate time range if both are provided
    const newStart = args.startTime ?? session.startTime;
    const newEnd = args.endTime ?? session.endTime;
    if (newEnd !== undefined && newEnd <= newStart) {
      throw new Error("End time must be after start time");
    }

    // Recompute totalMinutes if times changed
    let totalMinutes = session.totalMinutes;
    if (args.startTime !== undefined || args.endTime !== undefined) {
      const endForCalc = newEnd ?? Date.now();
      totalMinutes = Math.floor((endForCalc - newStart) / (1000 * 60));
    }

    const patch: Record<string, any> = { updatedAt: Date.now() };
    if (args.projectName !== undefined) patch.projectName = args.projectName;
    if (args.clientName !== undefined) patch.clientName = args.clientName;
    if (args.hourlyRate !== undefined) patch.hourlyRate = args.hourlyRate;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.startTime !== undefined) patch.startTime = args.startTime;
    if (args.endTime !== undefined) patch.endTime = args.endTime;
    if (totalMinutes !== session.totalMinutes) patch.totalMinutes = totalMinutes;

    await ctx.db.patch(args.sessionId, patch);

    return { success: true, totalMinutes };
  },
});
