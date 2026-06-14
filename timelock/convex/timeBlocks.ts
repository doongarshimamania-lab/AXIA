import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const addTimeBlock = mutation({
  args: {
    sessionId: v.id("workSessions"),
    activity: v.string(),
    website: v.string(),
    screenshotCount: v.number(),
    mouseActivity: v.boolean(),
    keyboardActivity: v.boolean(),
    inactiveDuration: v.number(),
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

    // Determine compliance status based on activity
    let complianceStatus: "compliant" | "at_risk" | "rejected" = "compliant";
    
    if (args.website.includes("fiverr.com") || args.website.includes("freelancer.com")) {
      complianceStatus = "at_risk";
    }
    
    if (args.inactiveDuration > 300 || (!args.mouseActivity && !args.keyboardActivity)) {
      complianceStatus = "rejected";
    }

    const now = Date.now();
    const blockId = await ctx.db.insert("timeBlocks", {
      sessionId: args.sessionId,
      userId: user._id,
      startTime: now - (5 * 60 * 1000), // 5 minutes ago
      endTime: now,
      activity: args.activity,
      website: args.website,
      complianceStatus,
      screenshotCount: args.screenshotCount,
      mouseActivity: args.mouseActivity,
      keyboardActivity: args.keyboardActivity,
      inactiveDuration: args.inactiveDuration,
    });

    return blockId;
  },
});

export const getSessionBlocks = query({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // SECURITY: Verify the session belongs to the requesting user
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) return [];

    const blocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return blocks;
  },
});

export const getUserTimeBlocks = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    let query = ctx.db.query("timeBlocks").withIndex("by_user", (q) => q.eq("userId", user._id));

    if (args.startDate && args.endDate) {
      query = query.filter((q) => 
        q.and(
          q.gte(q.field("startTime"), args.startDate!),
          q.lte(q.field("endTime"), args.endDate!)
        )
      );
    }

    const blocks = await query.collect();
    return blocks;
  },
});

export const calculateRejectedHours = query({
  args: {
    timeframe: v.optional(v.union(v.literal("today"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { rejectedHours: 0, lostIncome: 0, atRiskHours: 0 };
    }

    const now = Date.now();
    let startTime = now - (24 * 60 * 60 * 1000); // Default to today

    if (args.timeframe === "week") {
      startTime = now - (7 * 24 * 60 * 60 * 1000);
    } else if (args.timeframe === "month") {
      startTime = now - (30 * 24 * 60 * 60 * 1000);
    }

    const blocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("startTime"), startTime))
      .collect();

    const rejectedBlocks = blocks.filter(b => b.complianceStatus === "rejected");
    const atRiskBlocks = blocks.filter(b => b.complianceStatus === "at_risk");

    const rejectedHours = rejectedBlocks.length * (5 / 60); // 5-minute blocks
    const atRiskHours = atRiskBlocks.length * (5 / 60);

    // Calculate average hourly rate from recent sessions
    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(10);

    const avgHourlyRate = sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + s.hourlyRate, 0) / sessions.length 
      : 15; // Default $15/hr

    const lostIncome = rejectedHours * avgHourlyRate;

    return {
      rejectedHours: Math.round(rejectedHours * 10) / 10,
      lostIncome: Math.round(lostIncome * 100) / 100,
      atRiskHours: Math.round(atRiskHours * 10) / 10,
    };
  },
});
