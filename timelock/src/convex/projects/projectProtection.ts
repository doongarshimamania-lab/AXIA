import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";

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
      .withIndex("email", (q: any) => q.eq("email", "guest@timelock.demo"))
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
      email: "guest@timelock.demo",
      name: "Guest User",
      subscriptionTier: "free",
      onboardingComplete: true,
    });
    return guestUserId;
  } catch (error) {
    // If insert fails (duplicate), try to find it again
    const existingGuest = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", "guest@timelock.demo"))
      .first();
    
    if (existingGuest) {
      return existingGuest._id;
    }
    
    // If all else fails, return null to show empty projects
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
      .collect();

    // Get dispute reports for this project
    const reports = await ctx.db
      .query("disputeReports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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

// Get project-specific protection score
export const getProjectProtectionScore = query({
  args: {
    projectId: v.optional(v.id("projects")),
    guestUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx);
    if (!userId) {
      return {
        score: 0,
        evidenceQuality: 0,
        timelineCoverage: 0,
        complianceRate: 0,
        improvementOpportunity: "Please log in to view your protection score",
        tierProtectionRate: 22,
        subscriptionTier: "free",
      };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return {
        score: 0,
        evidenceQuality: 0,
        timelineCoverage: 0,
        complianceRate: 0,
        improvementOpportunity: "User not found",
        tierProtectionRate: 22,
        subscriptionTier: "free",
      };
    }

    const tier = (user as any).subscriptionTier || "free";
    const tierProtectionRates: Record<string, number> = {
      free: 22,
      starter: 67,
      pro: 85,
      expert: 95
    };

    // If projectId provided, verify ownership
    let projectFilter: string | null = null;
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== userId) {
        return {
          score: 0,
          evidenceQuality: 0,
          timelineCoverage: 0,
          complianceRate: 0,
          improvementOpportunity: "Project not found or unauthorized",
          tierProtectionRate: 22,
          subscriptionTier: "free",
        };
      }
      projectFilter = project.projectName;
    }

    // Get all work sessions (filtered by project if specified)
    const allSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sessions = projectFilter
      ? allSessions.filter((s) => s.projectName === projectFilter)
      : allSessions;

    if (sessions.length === 0) {
      return {
        score: 0,
        evidenceQuality: 0,
        timelineCoverage: 0,
        complianceRate: 0,
        improvementOpportunity: "Start collecting evidence to build your protection score",
        tierProtectionRate: 22,
        subscriptionTier: "free",
      };
    }

    // Calculate evidence quality
    const sessionIds = sessions.map((s) => s._id);
    let totalEvidence = 0;
    let qualityEvidence = 0;

    for (const sessionId of sessionIds) {
      const evidenceSession = await ctx.db
        .query("evidenceSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .first();

      if (evidenceSession) {
        const events = await ctx.db
          .query("evidenceEvents")
          .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", evidenceSession._id))
          .collect();

        totalEvidence += events.length;
        qualityEvidence += events.filter((e) => e.kind === "screenshot_ref" || e.kind === "memo").length;
      }
    }

    const evidenceQuality = totalEvidence > 0 ? Math.min(100, Math.round((qualityEvidence / totalEvidence) * 120)) : 0;

    // Calculate timeline coverage
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentSessions = sessions.filter((s) => s.startTime >= thirtyDaysAgo);
    const timelineCoverage = recentSessions.length > 0 ? Math.min(100, recentSessions.length * 8) : 0;

    // Calculate compliance rate
    const timeBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const projectBlocks = timeBlocks.filter((block) => {
      const session = sessions.find((s) => s._id === block.sessionId);
      return session !== undefined;
    });

    const compliantBlocks = projectBlocks.filter((b) => b.complianceStatus === "compliant").length;
    const complianceRate = projectBlocks.length > 0 ? Math.round((compliantBlocks / projectBlocks.length) * 100) : 100;

    // Calculate overall score
    const score = Math.round(
      evidenceQuality * 0.4 + timelineCoverage * 0.3 + complianceRate * 0.3
    );

    // Generate improvement opportunity
    let improvementOpportunity = "";
    if (evidenceQuality < 80) {
      improvementOpportunity = "Add more screenshots and memos to increase evidence quality by 15%";
    } else if (timelineCoverage < 80) {
      improvementOpportunity = "Maintain consistent daily evidence collection to reach 95% protection";
    } else {
      improvementOpportunity = "Excellent protection! Keep maintaining your current evidence quality";
    }

    return {
      score,
      evidenceQuality,
      timelineCoverage,
      complianceRate,
      improvementOpportunity,
      tierProtectionRate: tierProtectionRates[tier] || 22,
      subscriptionTier: tier,
    };
  },
});

// Get adaptive evidence recommendations
export const getAdaptiveEvidenceSystem = query({
  args: {
    projectId: v.optional(v.id("projects")),
    guestUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx);
    if (!userId) {
      return {
        recommendations: [],
        currentEvidence: {
          screenshots: 0,
          memos: 0,
          urls: 0,
        },
        nextAction: "Please log in to view evidence recommendations",
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
      .collect();

    const sessions = projectFilter
      ? allSessions.filter((s) => s.projectName === projectFilter)
      : allSessions;

    // Analyze evidence patterns
    let screenshotCount = 0;
    let memoCount = 0;
    let urlCount = 0;

    for (const session of sessions) {
      const evidenceSession = await ctx.db
        .query("evidenceSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .first();

      if (evidenceSession) {
        const events = await ctx.db
          .query("evidenceEvents")
          .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", evidenceSession._id))
          .collect();

        screenshotCount += events.filter((e) => e.kind === "screenshot_ref").length;
        memoCount += events.filter((e) => e.kind === "memo").length;
        urlCount += events.filter((e) => e.kind === "url").length;
      }
    }

    const totalEvidence = screenshotCount + memoCount + urlCount;
    const recommendations = [];

    // Generate recommendations based on gaps
    if (screenshotCount < totalEvidence * 0.4) {
      recommendations.push({
        type: "screenshot",
        priority: "high",
        message: "Increase screenshot frequency to 1 every 10 minutes",
        impact: "+12% protection score",
      });
    }

    if (memoCount < sessions.length * 2) {
      recommendations.push({
        type: "memo",
        priority: "medium",
        message: "Add work context memos at start and end of each session",
        impact: "+8% dispute success rate",
      });
    }

    if (urlCount < totalEvidence * 0.2) {
      recommendations.push({
        type: "url",
        priority: "low",
        message: "Track work-related URLs for better context",
        impact: "+5% evidence quality",
      });
    }

    return {
      recommendations,
      currentEvidence: {
        screenshots: screenshotCount,
        memos: memoCount,
        urls: urlCount,
      },
      nextAction: recommendations.length > 0 ? recommendations[0].message : "Keep up the great work!",
    };
  },
});

// Get project health dashboard metrics
export const getProjectHealthDashboard = query({
  args: {
    projectId: v.optional(v.id("projects")),
    guestUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx);
    if (!userId) {
      return {
        healthScore: 0,
        evidenceRate: 0,
        complianceRate: 0,
        activityConsistency: 0,
        status: "unknown" as const,
        recommendation: "Please log in to view project health",
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
      .collect();

    const sessions = projectFilter
      ? allSessions.filter((s) => s.projectName === projectFilter)
      : allSessions;

    // Calculate health metrics
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentSessions = sessions.filter((s) => s.startTime >= sevenDaysAgo);

    // Evidence collection rate
    let totalEvidence = 0;
    for (const session of recentSessions) {
      const evidenceSession = await ctx.db
        .query("evidenceSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .first();

      if (evidenceSession) {
        const events = await ctx.db
          .query("evidenceEvents")
          .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", evidenceSession._id))
          .collect();
        totalEvidence += events.length;
      }
    }

    const evidenceRate = recentSessions.length > 0 ? totalEvidence / recentSessions.length : 0;

    // Compliance rate
    const timeBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const projectBlocks = timeBlocks.filter((block) => {
      const session = sessions.find((s) => s._id === block.sessionId);
      return session !== undefined;
    });

    const compliantBlocks = projectBlocks.filter((b) => b.complianceStatus === "compliant").length;
    const complianceRate = projectBlocks.length > 0 ? (compliantBlocks / projectBlocks.length) * 100 : 100;

    // Activity consistency (sessions per week)
    const activityConsistency = recentSessions.length;

    // Overall health score
    const healthScore = Math.round(
      (Math.min(evidenceRate / 10, 1) * 40) + (complianceRate * 0.4) + (Math.min(activityConsistency / 7, 1) * 20)
    );

    return {
      healthScore,
      evidenceRate: Math.round(evidenceRate * 10) / 10,
      complianceRate: Math.round(complianceRate),
      activityConsistency,
      status: healthScore >= 80 ? "excellent" : healthScore >= 60 ? "good" : healthScore >= 40 ? "fair" : "poor",
      recommendation: healthScore >= 80 
        ? "Project health is excellent! Maintain current practices."
        : healthScore >= 60
        ? "Good health. Consider increasing evidence collection frequency."
        : "Health needs improvement. Focus on consistent evidence collection and compliance.",
    };
  },
});

// Get milestone protection tracking
export const getMilestoneProtection = query({
  args: {
    projectId: v.optional(v.id("projects")),
    guestUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx);
    if (!userId) {
      return {
        milestones: [],
        totalProtectedValue: 0,
        totalAtRiskValue: 0,
      };
    }

    // Get project filter
    let projectFilter: string | null = null;
    let projectHourlyRate = 25;
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (project) {
        projectFilter = project.projectName;
        projectHourlyRate = project.hourlyRate;
      }
    }

    const allSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sessions = projectFilter
      ? allSessions.filter((s) => s.projectName === projectFilter)
      : allSessions;

    // Create milestone periods (weekly)
    const now = Date.now();
    const milestones = [];

    for (let i = 0; i < 4; i++) {
      const weekStart = now - (i + 1) * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = now - i * 7 * 24 * 60 * 60 * 1000;

      const weekSessions = sessions.filter((s) => s.startTime >= weekStart && s.startTime < weekEnd);
      const totalHours = weekSessions.reduce((sum, s) => sum + (s.totalMinutes || 0) / 60, 0);

      // Get time blocks for this period
      const timeBlocks = await ctx.db
        .query("timeBlocks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      const weekBlocks = timeBlocks.filter((block) => {
        const session = weekSessions.find((s) => s._id === block.sessionId);
        return session !== undefined;
      });

      const compliantBlocks = weekBlocks.filter((b) => b.complianceStatus === "compliant").length;
      const protectionRate = weekBlocks.length > 0 ? (compliantBlocks / weekBlocks.length) * 100 : 100;

      milestones.push({
        period: `Week ${i + 1}`,
        hours: Math.round(totalHours * 10) / 10,
        value: Math.round(totalHours * projectHourlyRate * 100) / 100,
        protectionRate: Math.round(protectionRate),
        status: protectionRate >= 90 ? "protected" : protectionRate >= 70 ? "at_risk" : "vulnerable",
      });
    }

    return {
      milestones: milestones.reverse(),
      totalProtectedValue: milestones.reduce((sum, m) => sum + (m.status === "protected" ? m.value : 0), 0),
      totalAtRiskValue: milestones.reduce((sum, m) => sum + (m.status !== "protected" ? m.value : 0), 0),
    };
  },
});

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
      .collect();

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
      .collect();

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