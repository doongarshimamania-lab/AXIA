import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

import { rateLimitAuthenticated, RATE_LIMITS } from "./security/rateLimit";
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
    });

    await ctx.db.insert("clientActivityLog", {
      clientId,
      action: "client_registered",
      metadata: { companyName: args.companyName },
      timestamp: Date.now(),
    });

    return { clientId, success: true };
  },
});

// Get client profile (requires auth)
export const getClientProfile = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const client = await ctx.db
      .query("clientCompanies")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return client;
  },
});

// Update client profile (requires auth + ownership)
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

    const { clientId, ...updates } = args;
    
    const patchData: Record<string, string> = {};
    if (updates.companyName !== undefined) patchData.companyName = updates.companyName;
    if (updates.contactName !== undefined) patchData.contactName = updates.contactName;
    if (updates.industry !== undefined) patchData.industry = updates.industry;
    if (updates.companySize !== undefined) patchData.companySize = updates.companySize;
    if (updates.website !== undefined) patchData.website = updates.website;

    await ctx.db.patch(clientId, patchData);

    return { success: true };
  },
});
