// @ts-nocheck
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Simplified wrapper to avoid deep type instantiation
export const getClients = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        const sessions = await ctx.db
          .query("workSessions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("clientName"), client.clientName))
          .collect();

        const totalHours = sessions.reduce((sum, s) => sum + (s.totalMinutes || 0) / 60, 0);
        const activeSession = sessions.find((s) => !s.endTime);

        const timeBlocks = await ctx.db
          .query("timeBlocks")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

        const clientBlocks = timeBlocks.filter((block) => {
          const session = sessions.find((s) => s._id === block.sessionId);
          return session !== undefined;
        });

        const compliantBlocks = clientBlocks.filter((b) => b.complianceStatus === "compliant").length;
        const totalBlocks = clientBlocks.length;
        const protectionScore = totalBlocks > 0 ? Math.round((compliantBlocks / totalBlocks) * 100) : 100;

        return {
          ...client,
          totalHours: Math.round(totalHours * 10) / 10,
          protectionScore,
          activeSession: activeSession ? true : false,
          totalValue: Math.round(totalHours * client.hourlyRate * 100) / 100,
        };
      })
    );

    return enrichedClients;
  },
});

// Simplified addClient mutation wrapper
export const addClient = mutation({
  args: {
    clientName: v.string(),
    platform: v.union(
      v.literal("upwork"),
      v.literal("fiverr"),
      v.literal("toptal"),
      v.literal("freelancer"),
      v.literal("direct")
    ),
    hourlyRate: v.number(),
    contractType: v.union(v.literal("hourly"), v.literal("fixed")),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("clients")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", userId).eq("clientName", args.clientName)
      )
      .first();

    if (existing) {
      throw new Error("Client already exists");
    }

    const clientId = await ctx.db.insert("clients", {
      userId,
      clientName: args.clientName,
      platform: args.platform,
      hourlyRate: args.hourlyRate,
      contractType: args.contractType,
      riskLevel: args.riskLevel,
      addedAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    return { clientId, success: true };
  },
});