import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getClients = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) return null;
    return client;
  },
});

export const getClientStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalClients: 0, totalValue: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0, byPlatform: {}, byRiskLevel: {} };

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const byPlatform: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};

    for (const client of clients) {
      byPlatform[client.platform] = (byPlatform[client.platform] || 0) + 1;
      byRiskLevel[client.riskLevel] = (byRiskLevel[client.riskLevel] || 0) + 1;
    }

    return {
      totalClients: clients.length,
      totalValue: clients.reduce((sum, c) => sum + c.hourlyRate, 0),
      lowRisk: clients.filter(c => c.riskLevel === "low").length,
      mediumRisk: clients.filter(c => c.riskLevel === "medium").length,
      highRisk: clients.filter(c => c.riskLevel === "high").length,
      byPlatform,
      byRiskLevel,
    };
  },
});

export const getClientPolicies = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) return [];

    const policies = await ctx.db
      .query("clientPolicies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return policies.filter(p => p.clientName === client.clientName);
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

export const createClient = mutation({
  args: {
    clientName: v.string(),
    platform: v.union(v.literal("upwork"), v.literal("fiverr"), v.literal("toptal"), v.literal("freelancer"), v.literal("direct")),
    hourlyRate: v.number(),
    contractType: v.union(v.literal("hourly"), v.literal("fixed")),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("clients", {
      userId,
      clientName: args.clientName,
      platform: args.platform,
      hourlyRate: args.hourlyRate,
      contractType: args.contractType,
      riskLevel: args.riskLevel,
      addedAt: now,
      lastActivityAt: now,
    });
  },
});

export const updateClient = mutation({
  args: {
    clientId: v.id("clients"),
    clientName: v.optional(v.string()),
    platform: v.optional(v.union(v.literal("upwork"), v.literal("fiverr"), v.literal("toptal"), v.literal("freelancer"), v.literal("direct"))),
    hourlyRate: v.optional(v.number()),
    contractType: v.optional(v.union(v.literal("hourly"), v.literal("fixed"))),
    riskLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { clientId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) throw new Error("Not authorized");

    const patch: any = { ...updates, lastActivityAt: Date.now() };
    await ctx.db.patch(clientId, patch);
  },
});

export const deleteClient = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const client = await ctx.db.get(clientId);
    if (!client || client.userId !== userId) throw new Error("Not authorized");

    // Delete associated policies
    const policies = await ctx.db
      .query("clientPolicies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const policy of policies) {
      if (policy.clientName === client.clientName) {
        await ctx.db.delete(policy._id);
      }
    }

    await ctx.db.delete(clientId);
  },
});

export const seedMockClients = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existing.length > 0) return { seeded: false, count: existing.length };

    const now = Date.now();
    const hour = 3600000;

    const mockClients = [
      {
        clientName: "TechCorp Solutions",
        platform: "upwork" as const,
        hourlyRate: 85,
        contractType: "hourly" as const,
        riskLevel: "low" as const,
        lastActivityAt: now - 2 * hour,
      },
      {
        clientName: "StartupHub Inc",
        platform: "fiverr" as const,
        hourlyRate: 65,
        contractType: "fixed" as const,
        riskLevel: "medium" as const,
        lastActivityAt: now - 15 * 60 * 1000,
      },
      {
        clientName: "Global Enterprises",
        platform: "toptal" as const,
        hourlyRate: 120,
        contractType: "hourly" as const,
        riskLevel: "high" as const,
        lastActivityAt: now - 24 * hour,
      },
      {
        clientName: "Digital Marketing Co",
        platform: "freelancer" as const,
        hourlyRate: 45,
        contractType: "hourly" as const,
        riskLevel: "low" as const,
        lastActivityAt: now - 48 * hour,
      },
      {
        clientName: "Creative Studios",
        platform: "direct" as const,
        hourlyRate: 95,
        contractType: "fixed" as const,
        riskLevel: "medium" as const,
        lastActivityAt: now - 72 * hour,
      },
    ];

    for (const c of mockClients) {
      await ctx.db.insert("clients", {
        userId,
        clientName: c.clientName,
        platform: c.platform,
        hourlyRate: c.hourlyRate,
        contractType: c.contractType,
        riskLevel: c.riskLevel,
        addedAt: now - Math.floor(Math.random() * 30) * 86400000,
        lastActivityAt: c.lastActivityAt,
      });
    }

    return { seeded: true, count: mockClients.length };
  },
});
