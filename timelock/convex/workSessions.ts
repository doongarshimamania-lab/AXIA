import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const createSession = mutation({
  args: {
    clientName: v.string(),
    projectName: v.string(),
    hourlyRate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    const sessionId = await ctx.db.insert("workSessions", {
      userId: user._id,
      startTime: Date.now(),
      complianceStatus: "active",
      clientName: args.clientName,
      projectName: args.projectName,
      hourlyRate: args.hourlyRate,
    });

    return sessionId;
  },
});

export const endSession = mutation({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or unauthorized");
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

export const getCurrentSession = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    const session = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();

    return session;
  },
});

export const getUserSessions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 50);

    return sessions;
  },
});

export const updateSessionCompliance = mutation({
  args: {
    sessionId: v.id("workSessions"),
    complianceStatus: v.union(v.literal("active"), v.literal("at_risk"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or unauthorized");
    }

    await ctx.db.patch(args.sessionId, {
      complianceStatus: args.complianceStatus,
    });

    return session;
  },
});
