import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Helper to resolve user ID (Auth or Guest)
async function resolveUserId(ctx: any) {
  try {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId) {
      return authUserId;
    }
  } catch (error) {
    // No authenticated user - fall through to guest
  }
  
  // For guest users, try to find existing guest by email using index
  try {
    const existingGuest = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", "guest@axia.demo"))
      .first();
    
    if (existingGuest) {
      return existingGuest._id;
    }
  } catch (error) {
    // Index query failed, continue to create new guest
  }
  
  // If no guest user exists, create one
  try {
    const guestUserId = await ctx.db.insert("users", {
      email: "guest@axia.demo",
      name: "Guest User",
      subscriptionTier: "free",
      onboardingComplete: true,
    });
    return guestUserId;
  } catch (error) {
    // If insert fails (duplicate), try to find it again
    const existingGuest = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", "guest@axia.demo"))
      .first();
    
    if (existingGuest) {
      return existingGuest._id;
    }
    
    // If all else fails, return null to show empty projects
    return null;
  }
}

// Get all projects for the current user
// ponytail: added optional workspaceId arg so the projects list is scoped to the
// active workspace — matching how getClients and getTags already filter. Without
// this, projects from other workspaces leak into the list, and their tagIds
// (which reference tags from a different workspace) never match the active
// workspace's tag filter chips, making the filter appear broken (returns empty).
export const getMyProjects = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await resolveUserId(ctx);

    if (!userId) {
      return [];
    }

    let projects;
    if (workspaceId) {
      // ponytail: scope by workspace when provided — this is the normal path
      // used by the Projects page (which already has activeWorkspaceId).
      projects = await ctx.db
        .query("projects")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(100);
    } else {
      // ponytail: legacy fallback — no workspace filter. Kept for any caller
      // that still passes {} (e.g. OwnerDashboard cross-workspace views).
      projects = await ctx.db
        .query("projects")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(100);
    }

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
      throw new Error("Project not found or unauthorized");
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
    let projectFilter: string | null = null;
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (project) projectFilter = project.projectName;
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