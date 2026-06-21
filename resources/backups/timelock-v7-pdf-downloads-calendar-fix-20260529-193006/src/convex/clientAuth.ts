import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Register a new client company
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
      action: "client_registered",
      metadata: { companyName: args.companyName },
      timestamp: Date.now(),
    });

    return { clientId, success: true };
  },
});

// Get client profile
export const getClientProfile = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const client = await ctx.db
      .query("clientCompanies")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return client;
  },
});

// Update client profile
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
