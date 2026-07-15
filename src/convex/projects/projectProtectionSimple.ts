import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Simplified wrapper to avoid deep type instantiation
export const getProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const sessions = await ctx.db
          .query("workSessions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("projectName"), project.projectName))
          .take(1000);

        const totalHours = sessions.reduce((sum, s) => sum + (s.totalMinutes || 0) / 60, 0);
        const activeSession = sessions.find((s) => !s.endTime);

        const timeBlocks = await ctx.db
          .query("timeBlocks")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(1000);

        const projectBlocks = timeBlocks.filter((block) => {
          const session = sessions.find((s) => s._id === block.sessionId);
          return session !== undefined;
        });

        const compliantBlocks = projectBlocks.filter((b) => b.complianceStatus === "compliant").length;
        const rejectedBlocks = projectBlocks.filter((b) => b.complianceStatus === "rejected").length;
        const totalBlocks = projectBlocks.length;
        const protectionScore = totalBlocks > 0 ? Math.round((compliantBlocks / totalBlocks) * 100) : 100;

        const rejectedHours = rejectedBlocks * (5 / 60);
        const atRiskAmount = rejectedHours * project.hourlyRate;

        return {
          ...project,
          totalHours: Math.round(totalHours * 10) / 10,
          protectionScore,
          activeSession: activeSession ? true : false,
          totalValue: Math.round(totalHours * project.hourlyRate * 100) / 100,
          atRiskAmount: Math.round(atRiskAmount * 100) / 100,
          rejectedHours: Math.round(rejectedHours * 10) / 10,
        };
      })
    );

    return enrichedProjects;
  },
});

// Simplified addProject mutation wrapper
export const addProject = mutation({
  args: {
    projectName: v.string(),
    clientId: v.id("clients"),
    hourlyRate: v.number(),
    projectType: v.union(v.literal("ongoing"), v.literal("fixed"), v.literal("milestone")),
    protectionLevel: v.union(v.literal("standard"), v.literal("enhanced"), v.literal("maximum")),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "addProject");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new Error("Client not found or unauthorized");
    }
    // Allow access if client belongs to same workspace or same user
    if (client.workspaceId) {
      if (client.workspaceId !== args.workspaceId && client.userId !== userId) {
        throw new Error("Client not found or unauthorized");
      }
    } else if (client.userId !== userId) {
      throw new Error("Client not found or unauthorized");
    }

    const existing = await ctx.db
      .query("projects")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", userId).eq("projectName", args.projectName)
      )
      .first();

    if (existing) {
      throw new Error("Project already exists");
    }

    const projectId = await ctx.db.insert("projects", {
      userId,
      workspaceId: args.workspaceId,
      clientId: args.clientId,
      projectName: args.projectName,
      hourlyRate: args.hourlyRate,
      projectType: args.projectType,
      protectionLevel: args.protectionLevel,
      status: "active",
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    return { projectId, success: true };
  },
});