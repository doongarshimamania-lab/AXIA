import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// ponytail: IDOR fix — `resolveUserId` previously fell back to a SHARED
// `guest@axia.demo` account when no authenticated user was present. This
// is a 1000-user antipattern: all unauthenticated callers shared ONE
// account, so if any real data ever landed on it (via a demo seed, a
// stale cookie, etc.) it leaked to everyone. Now `resolveUserId` simply
// returns the authenticated userId or null — no guest fallback. UI
// pages already require auth (ProtectedRoute), so legit flows are
// unaffected. Unauthenticated callers get [] / null which is the
// correct empty-state behavior.
async function resolveUserId(ctx: any) {
  try {
    return await getAuthUserId(ctx);
  } catch (error) {
    return null;
  }
}

// Get all projects for the current user
export const getMyProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await resolveUserId(ctx);

    if (!userId) {
      return [];
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(100);

    // Return basic project data
    return projects.map((project) => ({
      ...project,
      totalHours: 0,
      protectionScore: 0,
      activeSession: false,
      totalValue: 0,
      atRiskAmount: 0,
      rejectedHours: 0,
    }));
  },
});

// Add a new project
export const addProject = mutation({
  args: {
    projectName: v.string(),
    clientId: v.id("clients"),
    hourlyRate: v.number(),
    projectType: v.union(v.literal("ongoing"), v.literal("fixed"), v.literal("milestone")),
    protectionLevel: v.union(v.literal("standard"), v.literal("enhanced"), v.literal("maximum")),
    guestUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "addProject");
    const userId = await resolveUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    // Verify client exists and belongs to user
    const client = await ctx.db.get(args.clientId);
    if (!client || client.userId !== userId) {
      throw new Error("Client not found or unauthorized");
    }

    // Check if project already exists
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

// Update project protection level
export const updateProjectProtection = mutation({
  args: {
    projectId: v.id("projects"),
    protectionLevel: v.union(v.literal("standard"), v.literal("enhanced"), v.literal("maximum")),
    guestUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "updateProjectProtection");
    const userId = await resolveUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found or unauthorized");
    }

    await ctx.db.patch(args.projectId, {
      protectionLevel: args.protectionLevel,
    });

    return { success: true };
  },
});

// Get project protection details
export const getProjectProtectionDetails = query({
  args: {
    projectId: v.id("projects"),
    guestUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // ponytail: IDOR fix — return null silently on auth failure instead
    // of throwing, so an attacker can't enumerate project IDs by
    // distinguishing "not found" vs "not authorized" error messages.
    // Also no longer honors guestUserId (was an auth-bypass-as-feature).
    const userId = await resolveUserId(ctx);
    if (!userId) {
      return {
        project: null,
        client: null,
        totalSessions: 0,
        totalReports: 0,
        sessions: [],
      };
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      return {
        project: null,
        client: null,
        totalSessions: 0,
        totalReports: 0,
        sessions: [],
      };
    }

    // Get client info
    const client = await ctx.db.get(project.clientId);

    // Get all sessions for this project
    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("projectName"), project.projectName))
      .take(1000);

    // Get dispute reports for this project
    const reports = await ctx.db
      .query("disputeReports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const projectReports = reports.filter((r) => {
      const session = sessions.find((s) => s._id === r.sessionId);
      return session !== undefined;
    });

    return {
      project,
      client,
      totalSessions: sessions.length,
      totalReports: projectReports.length,
      sessions: sessions.slice(0, 10),
    };
  },
});

// Archive project
export const archiveProject = mutation({
  args: {
    projectId: v.id("projects"),
    guestUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "archiveProject");
    const userId = await resolveUserId(ctx);
    if (!userId) return { success: false, error: "Not authenticated" };

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found or unauthorized");
    }

    await ctx.db.patch(args.projectId, {
      status: "archived",
    });

    return { success: true };
  },
});

// ponytail: removed 4 duplicate query functions that were already exported from their own standalone files in this directory (projectProtectionScore.ts, adaptiveEvidenceSystem.ts, projectHealthDashboard.ts, milestoneProtection.ts). Frontend uses the standalone api paths exclusively. Having two definitions of the same function name in two files in the same convex/projects/ folder caused Convex to refuse to deploy with a duplicate-export error.

// Get project risk heatmap
export const getProjectRiskHeatmap = query({
  args: {
    projectId: v.optional(v.id("projects")),
    guestUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx);
    if (!userId) {
      return {
        heatmap: {},
        topRiskPeriods: [],
        totalRiskEvents: 0,
      };
    }

    // Get project filter
    // ponytail: IDOR fix — previously used ANY project's name as a filter
    // regardless of ownership, which could let an attacker build a heatmap
    // from another user's project data if that project's name collided.
    // Now we only apply the project filter if the project belongs to the
    // caller; otherwise we treat it as no filter (returns caller's own
    // data only, since allSessions is already by_user-scoped).
    let projectFilter: string | null = null;
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (project && project.userId === userId) projectFilter = project.projectName;
    }

    const allSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const sessions = projectFilter
      ? allSessions.filter((s) => s.projectName === projectFilter)
      : allSessions;

    // Create heatmap by day of week and hour
    const heatmapData: Record<string, Record<number, number>> = {
      Monday: {},
      Tuesday: {},
      Wednesday: {},
      Thursday: {},
      Friday: {},
      Saturday: {},
      Sunday: {},
    };

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // Initialize all hours
    Object.keys(heatmapData).forEach((day) => {
      for (let hour = 0; hour < 24; hour++) {
        heatmapData[day][hour] = 0;
      }
    });

    // Get time blocks and calculate risk
    const timeBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const projectBlocks = timeBlocks.filter((block) => {
      const session = sessions.find((s) => s._id === block.sessionId);
      return session !== undefined;
    });

    projectBlocks.forEach((block) => {
      const date = new Date(block.startTime);
      const dayName = days[date.getDay()];
      const hour = date.getHours();

      if (block.complianceStatus === "rejected") {
        heatmapData[dayName][hour] += 3;
      } else if (block.complianceStatus === "at_risk") {
        heatmapData[dayName][hour] += 1;
      }
    });

    // Find highest risk periods
    const riskPeriods: Array<{
      day: string;
      hour: number;
      riskLevel: "high" | "medium" | "low";
      riskScore: number;
    }> = [];
    Object.entries(heatmapData).forEach(([day, hours]) => {
      Object.entries(hours).forEach(([hour, risk]) => {
        if (risk > 0) {
          riskPeriods.push({
            day,
            hour: parseInt(hour),
            riskLevel: risk >= 5 ? "high" : risk >= 2 ? "medium" : "low",
            riskScore: risk,
          });
        }
      });
    });

    riskPeriods.sort((a, b) => b.riskScore - a.riskScore);

    return {
      heatmap: heatmapData,
      topRiskPeriods: riskPeriods.slice(0, 5),
      totalRiskEvents: projectBlocks.filter((b) => b.complianceStatus !== "compliant").length,
    };
  },
});