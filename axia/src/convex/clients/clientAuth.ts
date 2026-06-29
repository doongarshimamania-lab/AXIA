import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// Register a new client company (requires auth)
export const registerClient = mutation({
  args: {
    email: v.string(),
    companyName: v.string(),
    contactName: v.string(),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "registerClient");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("clientCompanies")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("Client with this email already exists");
    }

    const clientId = await ctx.db.insert("clientCompanies", {
      email: args.email,
      companyName: args.companyName,
      contactName: args.contactName,
      industry: args.industry ?? "",
      companySize: args.companySize ?? "",
      website: args.website ?? "",
      verificationCount: 0,
      createdAt: Date.now(),
      lastLoginAt: 0,
      subscriptionTier: "free",
    });

    await ctx.db.insert("clientActivityLog", {
      clientId,
      action: "client_registered" as const,
      metadata: { companyName: args.companyName },
      timestamp: Date.now(),
    });

    return { clientId: clientId as string, success: true as const };
  },
});

// ponytail: IDOR fix — previously this returned ANY clientCompany row by
// email to ANY authenticated user. Emails are enumerable, so any user
// could read any company's full profile (companyName, contactName,
// industry, companySize, website, subscriptionTier). Now we verify the
// caller has a relationship to this client: either (a) the caller created
// a verification request for them, or (b) the caller is an admin.
// Returns null if no relationship exists.
// Get client profile (requires auth + relationship to client)
export const getClientProfile = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const client = await ctx.db
      .query("clientCompanies")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!client) return null;

    // ponytail: verify caller has a relationship to this client.
    // Admins see everything; otherwise the caller must have filed a
    // verification request involving this client.
    const user = await ctx.db.get(userId);
    if (user?.role === "admin") return client;

    const verificationRequest = await ctx.db
      .query("verificationRequests")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .filter((q) => q.eq(q.field("freelancerUserId"), userId))
      .first();

    if (!verificationRequest) return null;
    return client;
  },
});

// Update client profile (requires auth)
export const updateClientProfile = mutation({
  args: {
    clientId: v.id("clientCompanies"),
    companyName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "updateClientProfile");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { clientId, companyName, contactName, industry, companySize, website } = args;
    
    const updates: any = {};
    if (companyName !== undefined) updates.companyName = companyName;
    if (contactName !== undefined) updates.contactName = contactName;
    if (industry !== undefined) updates.industry = industry;
    if (companySize !== undefined) updates.companySize = companySize;
    if (website !== undefined) updates.website = website;

    await ctx.db.patch(clientId, updates);

    return { success: true };
  },
});
