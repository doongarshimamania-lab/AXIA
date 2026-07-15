import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Create verification request
export const createVerificationRequest = mutation({
  args: {
    clientId: v.id("clientCompanies"),
    freelancerUserId: v.id("users"),
    projectName: v.string(),
    projectDescription: v.string(),
    workPeriodStart: v.number(),
    workPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const requestId = await ctx.db.insert("verificationRequests", {
      clientId: args.clientId,
      freelancerUserId: args.freelancerUserId,
      projectName: args.projectName,
      projectDescription: args.projectDescription,
      workPeriodStart: args.workPeriodStart,
      workPeriodEnd: args.workPeriodEnd,
      requestedAt: Date.now(),
      status: "pending",
    });

    // Log activity
    await ctx.db.insert("clientActivityLog", {
      clientId: args.clientId,
      action: "verification_request_created",
      targetFreelancerId: args.freelancerUserId,
      metadata: { requestId, projectName: args.projectName },
      timestamp: Date.now(),
    });

    return { requestId, success: true };
  },
});

// Get verification requests for client
export const getClientVerificationRequests = query({
  args: { clientId: v.id("clientCompanies") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("verificationRequests")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    return requests;
  },
});

// Get verification requests for freelancer
export const getFreelancerVerificationRequests = query({
  args: { freelancerUserId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("verificationRequests")
      .withIndex("by_freelancer", (q) => q.eq("freelancerUserId", args.freelancerUserId))
      .collect();

    return requests;
  },
});

// Freelancer responds to verification request
export const respondToVerificationRequest = mutation({
  args: {
    requestId: v.id("verificationRequests"),
    status: v.union(v.literal("accepted"), v.literal("rejected")),
    response: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      status: args.status,
      freelancerResponse: args.response,
      respondedAt: Date.now(),
    });

    return { success: true };
  },
});
