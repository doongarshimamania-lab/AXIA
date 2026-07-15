import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get active protection plan
export const getActivePlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user || user.subscriptionTier !== "pro") return null;

    const plan = await ctx.db
      .query("protectionPlans")
      .withIndex("by_user_and_active", (q) =>
        q.eq("userId", userId).eq("isActive", true)
      )
      .first();

    return plan;
  },
});

// Create personalized protection plan
export const createPlan = mutation({
  args: {
    planName: v.string(),
    planType: v.union(
      v.literal("conservative"),
      v.literal("balanced"),
      v.literal("aggressive")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.subscriptionTier !== "pro") {
      throw new Error("PRO subscription required");
    }

    // Deactivate existing plans
    const existingPlans = await ctx.db
      .query("protectionPlans")
      .withIndex("by_user_and_active", (q) =>
        q.eq("userId", userId).eq("isActive", true)
      )
      .collect();

    for (const plan of existingPlans) {
      await ctx.db.patch(plan._id, { isActive: false });
    }

    // Create default rules based on plan type
    const customRules =
      args.planType === "aggressive"
        ? [
            {
              ruleId: "auto_screenshot",
              ruleName: "Auto Screenshot Every 5 Minutes",
              condition: "time_interval",
              action: "capture_screenshot",
              enabled: true,
            },
            {
              ruleId: "activity_monitor",
              ruleName: "Monitor All Activity",
              condition: "always",
              action: "log_activity",
              enabled: true,
            },
          ]
        : args.planType === "balanced"
        ? [
            {
              ruleId: "auto_screenshot",
              ruleName: "Auto Screenshot Every 10 Minutes",
              condition: "time_interval",
              action: "capture_screenshot",
              enabled: true,
            },
          ]
        : [
            {
              ruleId: "manual_screenshot",
              ruleName: "Manual Screenshot Reminders",
              condition: "user_prompt",
              action: "remind_screenshot",
              enabled: true,
            },
          ];

    const protectionGoals =
      args.planType === "aggressive"
        ? {
            targetDisputeRate: 0.5,
            minEvidenceQuality: 95,
            autoScreenshotFrequency: 5,
          }
        : args.planType === "balanced"
        ? {
            targetDisputeRate: 2,
            minEvidenceQuality: 85,
            autoScreenshotFrequency: 10,
          }
        : {
            targetDisputeRate: 5,
            minEvidenceQuality: 75,
            autoScreenshotFrequency: 15,
          };

    const planId = await ctx.db.insert("protectionPlans", {
      userId,
      planName: args.planName,
      planType: args.planType,
      customRules,
      protectionGoals,
      performance: {
        disputesAvoided: 0,
        hoursProtected: 0,
        incomeSecured: 0,
      },
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      isActive: true,
    });

    return planId;
  },
});

// Update plan performance
export const updatePlanPerformance = mutation({
  args: {
    planId: v.id("protectionPlans"),
    disputesAvoided: v.number(),
    hoursProtected: v.number(),
    incomeSecured: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== userId) {
      throw new Error("Plan not found");
    }

    await ctx.db.patch(args.planId, {
      performance: {
        disputesAvoided: plan.performance.disputesAvoided + args.disputesAvoided,
        hoursProtected: plan.performance.hoursProtected + args.hoursProtected,
        incomeSecured: plan.performance.incomeSecured + args.incomeSecured,
      },
      lastUpdated: Date.now(),
    });

    return { success: true };
  },
});
