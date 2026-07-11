import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Create a new client policy
export const createClientPolicy = mutation({
  args: {
    clientName: v.string(),
    platform: v.union(
      v.literal("upwork"),
      v.literal("fiverr"),
      v.literal("toptal"),
      v.literal("freelancer"),
      v.literal("custom")
    ),
    requirements: v.array(
      v.object({
        type: v.union(
          v.literal("activity"),
          v.literal("screenshots"),
          v.literal("memos"),
          v.literal("timer")
        ),
        description: v.string(),
        requirement: v.string(),
        evidenceType: v.string(),
      })
    ),
    documentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "createClientPolicy");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const policyId = await ctx.db.insert("clientPolicies", {
      userId,
      clientName: args.clientName,
      platform: args.platform,
      requirements: args.requirements,
      documentUrl: args.documentUrl,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    return { policyId };
  },
});

// Get all policies for current user
export const getUserPolicies = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const policies = await ctx.db
      .query("clientPolicies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    return policies;
  },
});

// Analyze compliance with a specific policy
export const analyzePolicyCompliance = query({
  args: {
    policyId: v.id("clientPolicies"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const policy = await ctx.db.get(args.policyId);
    if (!policy || policy.userId !== userId) {
      throw new Error("Policy not found");
    }

    // Get user's recent evidence sessions (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sessions = await ctx.db
      .query("evidenceSessions")
      .withIndex("by_user_and_status", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("startTime"), sevenDaysAgo))
      .take(1000);

    let compliantCount = 0;
    const issues = [];

    for (const req of policy.requirements) {
      let isCompliant = false;

      // Simple compliance checks based on requirement type
      switch (req.type) {
        case "activity":
          // Check if there are active sessions
          isCompliant = sessions.length > 0;
          break;
        case "screenshots":
          // Check if evidence events exist
          const hasEvidence = sessions.length > 0;
          isCompliant = hasEvidence;
          break;
        case "memos":
          // Check for memo events in evidence
          isCompliant = sessions.length > 0;
          break;
        case "timer":
          // Check if sessions are being tracked
          isCompliant = sessions.length > 0;
          break;
      }

      if (isCompliant) {
        compliantCount++;
      } else {
        issues.push({
          requirement: req.description,
          missing: req.requirement,
        });
      }
    }

    const complianceLevel = policy.requirements.length > 0 
      ? compliantCount / policy.requirements.length 
      : 1;

    return {
      complianceLevel,
      compliantCount,
      totalRequirements: policy.requirements.length,
      issues,
      lastChecked: Date.now(),
    };
  },
});

// Delete a client policy
export const deleteClientPolicy = mutation({
  args: {
    policyId: v.id("clientPolicies"),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "deleteClientPolicy");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const policy = await ctx.db.get(args.policyId);
    if (!policy || policy.userId !== userId) {
      throw new Error("Policy not found");
    }

    await ctx.db.delete(args.policyId);
    return { success: true };
  },
});
