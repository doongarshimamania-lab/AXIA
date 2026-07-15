import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Create a new scope change formalization
export const createFormalization = mutation({
  args: {
    projectId: v.id("projects"),
    changeDescription: v.string(),
    originalScope: v.string(),
    newScope: v.string(),
    impactAssessment: v.object({
      timeImpact: v.string(),
      budgetImpact: v.string(),
      deliverableImpact: v.string(),
    }),
    clientAcknowledgment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "createFormalization");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found or unauthorized");
    }

    const formalizationId = await ctx.db.insert("scopeFormalizations", {
      userId,
      projectId: args.projectId,
      changeDescription: args.changeDescription,
      originalScope: args.originalScope,
      newScope: args.newScope,
      impactAssessment: args.impactAssessment,
      clientAcknowledgment: args.clientAcknowledgment,
      status: "pending",
      createdAt: Date.now(),
      formalizedAt: undefined,
    });

    return { success: true, formalizationId };
  },
});

// Complete formalization (mark as formalized)
export const completeFormalization = mutation({
  args: {
    formalizationId: v.id("scopeFormalizations"),
    clientApprovalEvidence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "completeFormalization");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const formalization = await ctx.db.get(args.formalizationId);
    if (!formalization || formalization.userId !== userId) {
      throw new Error("Formalization not found or unauthorized");
    }

    await ctx.db.patch(args.formalizationId, {
      status: "formalized",
      formalizedAt: Date.now(),
      clientApprovalEvidence: args.clientApprovalEvidence,
    });

    return { success: true };
  },
});

// Get formalizations for a project
export const getProjectFormalizations = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      return [];
    }

    const formalizations = await ctx.db
      .query("scopeFormalizations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(1000);

    return formalizations.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get pending formalizations count
export const getPendingFormalizationsCount = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      return 0;
    }

    const formalizations = await ctx.db
      .query("scopeFormalizations")
      .withIndex("by_project_and_status", (q) => 
        q.eq("projectId", args.projectId).eq("status", "pending")
      )
      .take(1000);

    return formalizations.length;
  },
});

// Detect scope creep and suggest formalization
export const detectScopeCreep = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { detected: false, severity: "none", suggestions: [] };

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      return { detected: false, severity: "none", suggestions: [] };
    }

    // Get recent work sessions
    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("projectName"), project.projectName))
      .take(1000);

    const recentSessions = sessions.filter(
      (s) => s.startTime >= Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    // Check for scope creep indicators
    const totalHours = recentSessions.reduce(
      (sum, s) => sum + (s.totalMinutes || 0) / 60,
      0
    );

    // Get existing formalizations
    const formalizations = await ctx.db
      .query("scopeFormalizations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .take(1000);

    const recentFormalizations = formalizations.filter(
      (f) => f.createdAt >= Date.now() - 14 * 24 * 60 * 60 * 1000
    );

    // Scope creep detection logic
    const detected = totalHours > 40 && recentFormalizations.length === 0;
    const severity = totalHours > 60 ? "high" : totalHours > 40 ? "medium" : "low";

    const suggestions = [];
    if (detected) {
      suggestions.push({
        type: "formalize_changes",
        message: "High work volume detected without formalized scope changes",
        action: "Document and formalize scope changes with client",
      });
    }

    return {
      detected,
      severity,
      suggestions,
      metrics: {
        recentHours: Math.round(totalHours * 10) / 10,
        pendingFormalizations: formalizations.filter((f) => f.status === "pending").length,
        completedFormalizations: formalizations.filter((f) => f.status === "formalized").length,
      },
    };
  },
});
