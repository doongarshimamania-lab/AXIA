// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireWorkspaceAccess, getWorkspaceMembership, getRecordAccess } from "../permissions";

// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getClients = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (workspaceId) {
      // Verify workspace membership
      const membership = await getWorkspaceMembership(ctx, workspaceId, userId);
      if (!membership) return [];

      return await ctx.db
        .query("clients")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .collect();
    }
    return await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const client = await ctx.db.get(clientId);
    if (!client) return null;

    // Check workspace membership or direct ownership
    if (client.workspaceId) {
      const access = await getRecordAccess(ctx, client, userId);
      if (!access) return null;
    } else if (client.userId !== userId) {
      return null;
    }
    return client;
  },
});

export const getClientsEnriched = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (workspaceId) {
      const membership = await getWorkspaceMembership(ctx, workspaceId, userId);
      if (!membership) return [];
    }

    const clients = workspaceId
      ? await ctx.db.query("clients").withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId)).collect()
      : await ctx.db.query("clients").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    // Resolve assigned members
    const enriched = await Promise.all(
      clients.map(async (client) => {
        const assignedMembers = await Promise.all(
          (client.assignedMemberIds ?? []).map(async (memberId) => {
            const memberDoc = await ctx.db.get(memberId);
            if (!memberDoc) return null;
            const userDoc = await ctx.db.get(memberDoc.userId);
            return {
              id: memberDoc._id,
              name: userDoc?.name ?? userDoc?.email ?? "Unknown",
              email: userDoc?.email ?? "",
              image: userDoc?.image ?? null,
              role: memberDoc.role,
              title: memberDoc.title ?? null,
            };
          })
        );

        // Count projects
        const projects = await ctx.db
          .query("projects")
          .withIndex("by_client", (q) => q.eq("clientId", client._id))
          .collect();

        return {
          ...client,
          assignedMembers: assignedMembers.filter(Boolean),
          projectCount: projects.length,
          totalProjectValue: projects.reduce((sum, p) => sum + p.hourlyRate * 40, 0), // rough estimate
        };
      })
    );

    return enriched;
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

export const createClient = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
    clientName: v.string(),
    platform: v.union(
      v.literal("upwork"),
      v.literal("fiverr"),
      v.literal("toptal"),
      v.literal("freelancer"),
      v.literal("direct")
    ),
    hourlyRate: v.number(),
    contractType: v.union(v.literal("hourly"), v.literal("fixed")),
    riskLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    notes: v.optional(v.string()),
    assignedMemberIds: v.optional(v.array(v.id("workspaceMembers"))),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If workspaceId provided, verify workspace membership
    if (args.workspaceId) {
      await requireWorkspaceAccess(ctx, args.workspaceId, "member");
    }

    return await ctx.db.insert("clients", {
      userId,
      workspaceId: args.workspaceId,
      createdBy: userId,
      teamId: args.teamId,
      clientName: args.clientName,
      platform: args.platform,
      hourlyRate: args.hourlyRate,
      contractType: args.contractType,
      riskLevel: args.riskLevel ?? "medium",
      contactEmail: args.contactEmail,
      contactName: args.contactName,
      notes: args.notes,
      assignedMemberIds: args.assignedMemberIds,
      customFields: args.customFields,
      addedAt: Date.now(),
      lastActivityAt: Date.now(),
    });
  },
});

export const updateClient = mutation({
  args: {
    clientId: v.id("clients"),
    clientName: v.optional(v.string()),
    platform: v.optional(v.union(
      v.literal("upwork"),
      v.literal("fiverr"),
      v.literal("toptal"),
      v.literal("freelancer"),
      v.literal("direct")
    )),
    hourlyRate: v.optional(v.number()),
    contractType: v.optional(v.union(v.literal("hourly"), v.literal("fixed"))),
    riskLevel: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    notes: v.optional(v.string()),
    assignedMemberIds: v.optional(v.array(v.id("workspaceMembers"))),
    teamId: v.optional(v.id("teams")),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, { clientId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const client = await ctx.db.get(clientId);
    if (!client) throw new Error("Client not found");

    // Check workspace membership or direct ownership
    if (client.workspaceId) {
      const access = await getRecordAccess(ctx, client, userId);
      if (!access || access === "read" || access === "comment") {
        throw new Error("Not authorized — need collaborate or higher access");
      }
    } else if (client.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(clientId, { ...updates, lastActivityAt: Date.now() });
  },
});

export const deleteClient = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const client = await ctx.db.get(clientId);
    if (!client) throw new Error("Client not found");

    // Check workspace ownership or direct ownership
    if (client.workspaceId) {
      const access = await getRecordAccess(ctx, client, userId);
      if (access !== "owner") {
        throw new Error("Not authorized — only owners can delete clients");
      }
    } else if (client.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(clientId);
  },
});
