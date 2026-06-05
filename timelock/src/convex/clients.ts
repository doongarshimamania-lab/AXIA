import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

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

    // Validate email format if provided
    if (args.email !== undefined && args.email !== "" && !EMAIL_REGEX.test(args.email)) {
      throw new ConvexError("Invalid email format");
    }

    // Validate onTimeRate is between 0 and 1 if provided
    if (args.onTimeRate !== undefined && (args.onTimeRate < 0 || args.onTimeRate > 1)) {
      throw new ConvexError("onTimeRate must be between 0 and 1");
    }

    const now = Date.now();

    const clientId = await ctx.db.insert("clients", {
      userId,
      name: args.name,
      email: args.email,
      company: args.company,
      phone: args.phone,
      industry: args.industry,
      website: args.website,
      notes: args.notes,
      hourlyRate: args.hourlyRate,
      address: args.address,
      status: args.status ?? "lead",
      avgPaymentDays: args.avgPaymentDays,
      onTimeRate: args.onTimeRate,
      totalPaid: args.totalPaid,
      totalInvoiced: args.totalInvoiced,
      lastPaymentAt: args.lastPaymentAt,
      source: args.source,
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Verify ownership
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client not found");
    if (client.userId !== userId) throw new ConvexError("Not authorized to update this client");

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

    if (args.name !== undefined) updates.name = args.name;
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
    if (client.userId !== userId) throw new ConvexError("Not authorized to archive this client");

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
    if (client.userId !== userId) throw new ConvexError("Not authorized to delete this client");

    // Check for active deals linked to this client
    const activeDeals = await ctx.db
      .query("deals")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    // A deal is considered "active" if it hasn't been lost/closed
    // (deals schema doesn't have an explicit "closed" or "lost" status,
    //  so we check for lostReason which indicates a closed-lost deal)
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
// 5. GET (single client by ID with ownership check)
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
    if (client.userId !== userId) throw new ConvexError("Not authorized to view this client");

    return client;
  },
});

// ─────────────────────────────────────────────
// 6. LIST (all clients for current user, with optional status filter)
// ─────────────────────────────────────────────
export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal("active"), v.literal("archived"), v.literal("lead"))
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    if (args.status) {
      // Use the by_user_and_status index for filtered queries
      const clients = await ctx.db
        .query("clients")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", userId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
      return clients;
    }

    // No status filter — return all clients for this user, ordered by createdAt desc
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return clients;
  },
});

// ─────────────────────────────────────────────
// 7. GET BY ID (with ownership check — alias for get)
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
    if (client.userId !== userId) throw new ConvexError("Not authorized to view this client");

    return client;
  },
});

// ─────────────────────────────────────────────
// 8. SEARCH (case-insensitive partial match on name or company)
// ─────────────────────────────────────────────
export const search = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Get all clients for this user first
    const allClients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Perform case-insensitive partial matching on name and company
    const searchLower = args.query.toLowerCase();
    const results = allClients.filter((client) => {
      const nameMatch = client.name.toLowerCase().includes(searchLower);
      const companyMatch = client.company?.toLowerCase().includes(searchLower) ?? false;
      return nameMatch || companyMatch;
    });

    return results;
  },
});

// ─────────────────────────────────────────────
// 9. GET STATS (count of clients by status)
// ─────────────────────────────────────────────
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const allClients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
    if (client.userId !== userId) throw new ConvexError("Not authorized to update this client");

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
