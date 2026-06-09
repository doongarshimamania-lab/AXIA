import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
