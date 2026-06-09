import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Get the active (running) session for the current user */
export const getCurrentSession = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

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
      .collect();

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
      .collect();

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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    // Check if there's already an active session
    const activeSession = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();

    if (activeSession) {
      throw new Error("You already have an active session. Please stop it first.");
    }

    const now = Date.now();
    const sessionId = await ctx.db.insert("workSessions", {
      userId: userId,
      startTime: now,
      complianceStatus: "active",
      clientName: args.clientName ?? "No Client",
      projectName: args.projectName,
      hourlyRate: args.hourlyRate ?? 75,
      platform: args.platform,
      notes: args.notes,
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    if (args.endTime <= args.startTime) {
      throw new Error("End time must be after start time");
    }

    const totalMinutes = Math.floor((args.endTime - args.startTime) / (1000 * 60));
    const now = Date.now();

    const sessionId = await ctx.db.insert("workSessions", {
      userId: userId,
      startTime: args.startTime,
      endTime: args.endTime,
      totalMinutes,
      complianceStatus: "active",
      clientName: args.clientName ?? "Manual Entry",
      projectName: args.projectName,
      hourlyRate: args.hourlyRate ?? 75,
      platform: args.platform ?? "manual",
      notes: args.notes,
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

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

    // Delete the session itself
    await ctx.db.delete(args.sessionId);

    return true;
  },
});
