import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create verification request (requires auth)
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

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

// Get verification requests for client (requires auth)
export const getClientVerificationRequests = query({
  args: { clientId: v.id("clientCompanies") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("verificationRequests")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    return requests;
  },
});

// Get verification requests for freelancer (requires auth, only own requests)
export const getFreelancerVerificationRequests = query({
  args: { freelancerUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // SECURITY: Only allow users to see their own verification requests
    // Admin users can see any freelancer's requests
    const user = await ctx.db.get(userId);
    if (args.freelancerUserId !== userId && user?.role !== "admin") {
      return [];
    }

    const requests = await ctx.db
      .query("verificationRequests")
      .withIndex("by_freelancer", (q) => q.eq("freelancerUserId", args.freelancerUserId))
      .collect();

    return requests;
  },
});

// Freelancer responds to verification request (requires auth + ownership)
export const respondToVerificationRequest = mutation({
  args: {
    requestId: v.id("verificationRequests"),
    status: v.union(v.literal("accepted"), v.literal("rejected")),
    response: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // SECURITY: Verify the request belongs to this freelancer
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Verification request not found");
    if (request.freelancerUserId !== userId) throw new Error("Not authorized to respond to this request");

    await ctx.db.patch(args.requestId, {
      status: args.status,
      freelancerResponse: args.response,
      respondedAt: Date.now(),
    });

    return { success: true };
  },
});
