// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireWorkspaceAccess, getWorkspaceMembership, getRecordAccess, requireRecordAccess } from "./permissions";
import { getUserVisibility, isRecordVisible } from "./workspaceFilter";

// ─────────────────────────────────────────────
// Helper: Email validation regex
// ─────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─────────────────────────────────────────────
// Address validator (shared between create & update)
// ─────────────────────────────────────────────
const addressValidator = v.optional(
  v.object({
    street: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    country: v.optional(v.string()),
  })
);

// ─────────────────────────────────────────────
// 1. CREATE
// ─────────────────────────────────────────────
export const create = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
    name: v.string(),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    industry: v.optional(v.string()),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    address: addressValidator,
    status: v.optional(
      v.union(v.literal("active"), v.literal("archived"), v.literal("lead"))
    ),
    avgPaymentDays: v.optional(v.number()),
    onTimeRate: v.optional(v.number()),
    totalPaid: v.optional(v.number()),
    totalInvoiced: v.optional(v.number()),
    lastPaymentAt: v.optional(v.number()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // If workspaceId provided, verify membership (at least "member" role)
    if (args.workspaceId) {
      await requireWorkspaceAccess(ctx, args.workspaceId, "member");
    }

    // Validate email format if provided
    if (args.email !== undefined && args.email !== "" && !EMAIL_REGEX.test(args.email)) {
      throw new ConvexError("Invalid email format");
    }

    // Validate onTimeRate is between 0 and 1 if provided
    if (args.onTimeRate !== undefined && (args.onTimeRate < 0 || args.onTimeRate > 1)) {
      throw new ConvexError("onTimeRate must be between 0 and 1");
    }

    const now = Date.now();
    const { workspaceId, teamId, ...rest } = args;

    const clientId = await ctx.db.insert("clients", {
      userId,
      workspaceId: workspaceId ?? undefined,
      createdBy: userId,
      teamId: teamId ?? undefined,
      ...rest,
      clientName: args.name, // keep canonical name in sync with CRM name
      status: args.status ?? "lead",
      createdAt: now,
      updatedAt: now,
    });

    return clientId;
  },
});

// ─────────────────────────────────────────────
// 2. UPDATE (partial)
// ─────────────────────────────────────────────
export const update = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    industry: v.optional(v.string()),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),
    address: addressValidator,
    status: v.optional(
      v.union(v.literal("active"), v.literal("archived"), v.literal("lead"))
    ),
    avgPaymentDays: v.optional(v.number()),
    onTimeRate: v.optional(v.number()),
    totalPaid: v.optional(v.number()),
    totalInvoiced: v.optional(v.number()),
    lastPaymentAt: v.optional(v.number()),
    source: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client not found");

    // Check workspace access or direct ownership
    if (client.workspaceId) {
      await requireRecordAccess(ctx, client, "collaborate");
    } else if (client.userId !== userId) {
      throw new ConvexError("Not authorized to update this client");
    }

    // Validate email format if provided
    if (args.email !== undefined && args.email !== "" && !EMAIL_REGEX.test(args.email)) {
      throw new ConvexError("Invalid email format");
    }

    // Validate onTimeRate is between 0 and 1 if provided
    if (args.onTimeRate !== undefined && (args.onTimeRate < 0 || args.onTimeRate > 1)) {
      throw new ConvexError("onTimeRate must be between 0 and 1");
    }

    // Build partial update object — only include fields that were explicitly provided
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) { updates.name = args.name; updates.clientName = args.name; }
    if (args.email !== undefined) updates.email = args.email;
    if (args.company !== undefined) updates.company = args.company;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.industry !== undefined) updates.industry = args.industry;
    if (args.website !== undefined) updates.website = args.website;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.hourlyRate !== undefined) updates.hourlyRate = args.hourlyRate;
    if (args.address !== undefined) updates.address = args.address;
    if (args.status !== undefined) updates.status = args.status;
    if (args.avgPaymentDays !== undefined) updates.avgPaymentDays = args.avgPaymentDays;
    if (args.onTimeRate !== undefined) updates.onTimeRate = args.onTimeRate;
    if (args.totalPaid !== undefined) updates.totalPaid = args.totalPaid;
    if (args.totalInvoiced !== undefined) updates.totalInvoiced = args.totalInvoiced;
    if (args.lastPaymentAt !== undefined) updates.lastPaymentAt = args.lastPaymentAt;
    if (args.source !== undefined) updates.source = args.source;
    if (args.teamId !== undefined) updates.teamId = args.teamId;

    await ctx.db.patch(args.clientId, updates);

    return args.clientId;
  },
});

// ─────────────────────────────────────────────
// 3. ARCHIVE
// ─────────────────────────────────────────────
export const archive = mutation({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client not found");

    // Check workspace access or direct ownership
    if (client.workspaceId) {
      await requireRecordAccess(ctx, client, "collaborate");
    } else if (client.userId !== userId) {
      throw new ConvexError("Not authorized to archive this client");
    }

    if (client.status === "archived") {
      throw new ConvexError("Client is already archived");
    }

    await ctx.db.patch(args.clientId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return args.clientId;
  },
});

// ─────────────────────────────────────────────
// 4. REMOVE (hard delete with safety checks)
// ─────────────────────────────────────────────
export const remove = mutation({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client not found");

    // Check workspace access (owner level) or direct ownership
    if (client.workspaceId) {
      await requireRecordAccess(ctx, client, "owner");
    } else if (client.userId !== userId) {
      throw new ConvexError("Not authorized to delete this client");
    }

    // Check for active deals linked to this client
    const activeDeals = await ctx.db
      .query("deals")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    const openDeals = activeDeals.filter((d) => d.lostReason === undefined);
    if (openDeals.length > 0) {
      throw new ConvexError(
        `Cannot delete client: ${openDeals.length} active deal(s) are linked to this client. Archive the client instead.`
      );
    }

    // Check for active proposals linked to this client
    const activeProposals = await ctx.db
      .query("proposals")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    const openProposals = activeProposals.filter(
      (p) => p.status === "draft" || p.status === "sent" || p.status === "viewed"
    );
    if (openProposals.length > 0) {
      throw new ConvexError(
        `Cannot delete client: ${openProposals.length} active proposal(s) are linked to this client. Archive the client instead.`
      );
    }

    // Check for active invoices linked to this client
    const activeInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    const openInvoices = activeInvoices.filter(
      (inv) =>
        inv.status === "draft" ||
        inv.status === "sent" ||
        inv.status === "viewed" ||
        inv.status === "partial" ||
        inv.status === "overdue"
    );
    if (openInvoices.length > 0) {
      throw new ConvexError(
        `Cannot delete client: ${openInvoices.length} active invoice(s) are linked to this client. Archive the client instead.`
      );
    }

    // Safe to delete — no active dependencies
    await ctx.db.delete(args.clientId);

    return { success: true, deletedId: args.clientId };
  },
});

// ─────────────────────────────────────────────
// 5. GET (single client by ID with access check)
// ─────────────────────────────────────────────
export const get = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client not found");

    // Check workspace membership or direct ownership
    if (client.workspaceId) {
      const access = await getRecordAccess(ctx, client, userId);
      if (!access) throw new ConvexError("Not authorized to view this client");
    } else if (client.userId !== userId) {
      throw new ConvexError("Not authorized to view this client");
    }

    return client;
  },
});

// ─────────────────────────────────────────────
// 6. LIST (workspace-aware, with optional status filter)
// ─────────────────────────────────────────────
export const list = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    status: v.optional(
      v.union(v.literal("active"), v.literal("archived"), v.literal("lead"))
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // If workspaceId provided, filter by workspace with team-aware visibility
    if (args.workspaceId) {
      const visibility = await getUserVisibility(ctx, args.workspaceId);
      if (!visibility) throw new ConvexError("Not a member of this workspace");

      const allClients = await ctx.db
        .query("clients")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();

      // Filter by team visibility
      let visible = allClients.filter((c) => isRecordVisible(c, visibility));

      // Apply status filter if provided
      if (args.status) {
        visible = visible.filter((c) => c.status === args.status);
      }

      return visible;
    }

    // Backward compat: no workspaceId → filter by userId
    if (args.status) {
      const clients = await ctx.db
        .query("clients")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", userId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
      return clients;
    }

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return clients;
  },
});

// ─────────────────────────────────────────────
// 7. GET BY ID (with access check — alias for get)
// ─────────────────────────────────────────────
export const getById = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const client = await ctx.db.get(args.clientId);
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

// ─────────────────────────────────────────────
// 8. SEARCH (workspace-aware, case-insensitive partial match on name or company)
// ─────────────────────────────────────────────
export const search = query({
  args: {
    query: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    let allClients;

    if (args.workspaceId) {
      const visibility = await getUserVisibility(ctx, args.workspaceId);
      if (!visibility) return [];

      const workspaceClients = await ctx.db
        .query("clients")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();

      allClients = workspaceClients.filter((c) => isRecordVisible(c, visibility));
    } else {
      allClients = await ctx.db
        .query("clients")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    // Perform case-insensitive partial matching on name and company
    const searchLower = args.query.toLowerCase();
    const results = allClients.filter((client) => {
      const nameMatch = client.name?.toLowerCase().includes(searchLower);
      const companyMatch = client.company?.toLowerCase().includes(searchLower) ?? false;
      return nameMatch || companyMatch;
    });

    return results;
  },
});

// ─────────────────────────────────────────────
// 9. GET STATS (workspace-aware, count of clients by status)
// ─────────────────────────────────────────────
export const getStats = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    let allClients;

    if (args.workspaceId) {
      const visibility = await getUserVisibility(ctx, args.workspaceId);
      if (!visibility) return { active: 0, archived: 0, lead: 0, total: 0 };

      const workspaceClients = await ctx.db
        .query("clients")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();

      allClients = workspaceClients.filter((c) => isRecordVisible(c, visibility));
    } else {
      allClients = await ctx.db
        .query("clients")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    const active = allClients.filter((c) => c.status === "active").length;
    const archived = allClients.filter((c) => c.status === "archived").length;
    const lead = allClients.filter((c) => c.status === "lead").length;

    return {
      active,
      archived,
      lead,
      total: allClients.length,
    };
  },
});

// ─────────────────────────────────────────────
// 10. UPDATE PAYMENT BEHAVIOR
// ─────────────────────────────────────────────
export const updatePaymentBehavior = mutation({
  args: {
    clientId: v.id("clients"),
    avgPaymentDays: v.optional(v.number()),
    onTimeRate: v.optional(v.number()),
    totalPaid: v.optional(v.number()),
    totalInvoiced: v.optional(v.number()),
    lastPaymentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client not found");

    // Check workspace access or direct ownership
    if (client.workspaceId) {
      await requireRecordAccess(ctx, client, "collaborate");
    } else if (client.userId !== userId) {
      throw new ConvexError("Not authorized to update this client");
    }

    // Validate onTimeRate is between 0 and 1 if provided
    if (args.onTimeRate !== undefined && (args.onTimeRate < 0 || args.onTimeRate > 1)) {
      throw new ConvexError("onTimeRate must be between 0 and 1");
    }

    // Validate avgPaymentDays is non-negative if provided
    if (args.avgPaymentDays !== undefined && args.avgPaymentDays < 0) {
      throw new ConvexError("avgPaymentDays must be non-negative");
    }

    // Validate totalPaid is non-negative if provided
    if (args.totalPaid !== undefined && args.totalPaid < 0) {
      throw new ConvexError("totalPaid must be non-negative");
    }

    // Validate totalInvoiced is non-negative if provided
    if (args.totalInvoiced !== undefined && args.totalInvoiced < 0) {
      throw new ConvexError("totalInvoiced must be non-negative");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.avgPaymentDays !== undefined) updates.avgPaymentDays = args.avgPaymentDays;
    if (args.onTimeRate !== undefined) updates.onTimeRate = args.onTimeRate;
    if (args.totalPaid !== undefined) updates.totalPaid = args.totalPaid;
    if (args.totalInvoiced !== undefined) updates.totalInvoiced = args.totalInvoiced;
    if (args.lastPaymentAt !== undefined) updates.lastPaymentAt = args.lastPaymentAt;

    await ctx.db.patch(args.clientId, updates);

    return args.clientId;
  },
});
