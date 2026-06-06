// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

// ─────────────────────────────────────────────
// Shared validators
// ─────────────────────────────────────────────

const lineItemValidator = v.object({
  id: v.string(),
  description: v.string(),
  quantity: v.number(),
  rate: v.number(),
  amount: v.number(),
  type: v.optional(v.union(
    v.literal("service"),
    v.literal("product"),
    v.literal("time"),
    v.literal("expense"),
    v.literal("discount"),
  )),
});

const invoiceStatusValidator = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("viewed"),
  v.literal("paid"),
  v.literal("partial"),
  v.literal("overdue"),
  v.literal("cancelled"),
);

// ═════════════════════════════════════════════
// INVOICES
// ═════════════════════════════════════════════

// ─────────────────────────────────────────────
// 1. CREATE
// ─────────────────────────────────────────────
export const create = mutation({
  args: {
    clientId: v.id("clients"),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    lineItems: v.array(lineItemValidator),
    subtotal: v.number(),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    total: v.number(),
    currency: v.optional(v.string()),
    dueDate: v.number(),
    notes: v.optional(v.string()),
    terms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Validate client ownership
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client not found");
    if (client.userId !== userId) throw new ConvexError("Client does not belong to this user");

    // Validate project ownership if provided
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project) throw new ConvexError("Project not found");
      if (project.userId !== userId) throw new ConvexError("Project does not belong to this user");
    }

    // Validate proposal ownership if provided
    if (args.proposalId) {
      const proposal = await ctx.db.get(args.proposalId);
      if (!proposal) throw new ConvexError("Proposal not found");
      if (proposal.userId !== userId) throw new ConvexError("Proposal does not belong to this user");
    }

    // Validate line items are not empty
    if (args.lineItems.length === 0) {
      throw new ConvexError("Invoice must have at least one line item");
    }

    // Validate subtotal is non-negative
    if (args.subtotal < 0) {
      throw new ConvexError("Subtotal cannot be negative");
    }

    // Validate total is non-negative
    if (args.total < 0) {
      throw new ConvexError("Total cannot be negative");
    }

    // Validate taxRate is between 0 and 100 if provided
    if (args.taxRate !== undefined && (args.taxRate < 0 || args.taxRate > 100)) {
      throw new ConvexError("Tax rate must be between 0 and 100");
    }

    // Validate dueDate is in the future
    if (args.dueDate < Date.now()) {
      throw new ConvexError("Due date must be in the future");
    }

    // Auto-generate invoice number
    const invoiceNumber = await getNextInvoiceNumberInternal(ctx, userId);

    // Generate public token
    const publicToken = crypto.randomUUID();

    const now = Date.now();

    const invoiceId = await ctx.db.insert("invoices", {
      userId,
      clientId: args.clientId,
      projectId: args.projectId,
      proposalId: args.proposalId,
      invoiceNumber,
      lineItems: args.lineItems,
      subtotal: args.subtotal,
      taxRate: args.taxRate,
      taxAmount: args.taxAmount,
      discountAmount: args.discountAmount,
      total: args.total,
      currency: args.currency ?? "USD",
      status: "draft",
      dueDate: args.dueDate,
      sentAt: undefined,
      viewedAt: undefined,
      paidAt: undefined,
      paidAmount: undefined,
      stripePaymentIntentId: undefined,
      stripeInvoiceId: undefined,
      publicToken,
      notes: args.notes,
      terms: args.terms,
      createdAt: now,
      updatedAt: now,
    });

    return invoiceId;
  },
});

// ─────────────────────────────────────────────
// 2. UPDATE (only draft invoices)
// ─────────────────────────────────────────────
export const update = mutation({
  args: {
    invoiceId: v.id("invoices"),
    clientId: v.optional(v.id("clients")),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    lineItems: v.optional(v.array(lineItemValidator)),
    subtotal: v.optional(v.number()),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    total: v.optional(v.number()),
    currency: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    terms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized to update this invoice");

    // Only draft invoices can be edited
    if (invoice.status !== "draft") {
      throw new ConvexError("Only draft invoices can be edited");
    }

    // Validate client ownership if changing
    if (args.clientId !== undefined) {
      const client = await ctx.db.get(args.clientId);
      if (!client) throw new ConvexError("Client not found");
      if (client.userId !== userId) throw new ConvexError("Client does not belong to this user");
    }

    // Validate project ownership if changing
    if (args.projectId !== undefined) {
      const project = await ctx.db.get(args.projectId);
      if (!project) throw new ConvexError("Project not found");
      if (project.userId !== userId) throw new ConvexError("Project does not belong to this user");
    }

    // Validate proposal ownership if changing
    if (args.proposalId !== undefined) {
      const proposal = await ctx.db.get(args.proposalId);
      if (!proposal) throw new ConvexError("Proposal not found");
      if (proposal.userId !== userId) throw new ConvexError("Proposal does not belong to this user");
    }

    // Validate line items not empty if provided
    if (args.lineItems !== undefined && args.lineItems.length === 0) {
      throw new ConvexError("Invoice must have at least one line item");
    }

    // Validate numeric fields if provided
    if (args.subtotal !== undefined && args.subtotal < 0) {
      throw new ConvexError("Subtotal cannot be negative");
    }
    if (args.total !== undefined && args.total < 0) {
      throw new ConvexError("Total cannot be negative");
    }
    if (args.taxRate !== undefined && (args.taxRate < 0 || args.taxRate > 100)) {
      throw new ConvexError("Tax rate must be between 0 and 100");
    }

    // Build partial update object
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.clientId !== undefined) updates.clientId = args.clientId;
    if (args.projectId !== undefined) updates.projectId = args.projectId;
    if (args.proposalId !== undefined) updates.proposalId = args.proposalId;
    if (args.lineItems !== undefined) updates.lineItems = args.lineItems;
    if (args.subtotal !== undefined) updates.subtotal = args.subtotal;
    if (args.taxRate !== undefined) updates.taxRate = args.taxRate;
    if (args.taxAmount !== undefined) updates.taxAmount = args.taxAmount;
    if (args.discountAmount !== undefined) updates.discountAmount = args.discountAmount;
    if (args.total !== undefined) updates.total = args.total;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.terms !== undefined) updates.terms = args.terms;

    await ctx.db.patch(args.invoiceId, updates);

    return args.invoiceId;
  },
});

// ─────────────────────────────────────────────
// 3. SEND (draft → sent)
// ─────────────────────────────────────────────
export const send = mutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized to send this invoice");

    // Only draft invoices can be sent
    if (invoice.status !== "draft") {
      throw new ConvexError("Only draft invoices can be sent");
    }

    const now = Date.now();

    await ctx.db.patch(args.invoiceId, {
      status: "sent",
      sentAt: now,
      updatedAt: now,
    });

    // Schedule Day 3/7/14 payment reminders
    await scheduleRemindersInternal(ctx, args.invoiceId, userId, invoice, now);

    return args.invoiceId;
  },
});

// ─────────────────────────────────────────────
// 4. MARK VIEWED (publicToken-based, no auth)
// ─────────────────────────────────────────────
export const markViewed = mutation({
  args: {
    publicToken: v.string(),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_public_token", (q) => q.eq("publicToken", args.publicToken))
      .first();

    if (!invoice) throw new ConvexError("Invalid or expired invoice link");

    // Only sent or viewed invoices can be marked as viewed
    if (invoice.status !== "sent" && invoice.status !== "viewed") {
      throw new ConvexError("Invoice cannot be viewed in its current state");
    }

    const now = Date.now();

    await ctx.db.patch(invoice._id, {
      status: "viewed",
      viewedAt: invoice.viewedAt ?? now, // Keep first view time
      updatedAt: now,
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────
// 5. MARK PAID
// ─────────────────────────────────────────────
export const markPaid = mutation({
  args: {
    invoiceId: v.id("invoices"),
    paidAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized to update this invoice");

    // Only sent, viewed, or overdue invoices can be marked as paid
    if (!["sent", "viewed", "overdue", "partial"].includes(invoice.status)) {
      throw new ConvexError("This invoice cannot be marked as paid in its current state");
    }

    // Validate paidAmount is non-negative if provided
    if (args.paidAmount !== undefined && args.paidAmount < 0) {
      throw new ConvexError("Paid amount cannot be negative");
    }

    const now = Date.now();
    const paidAmount = args.paidAmount ?? invoice.total;

    // Determine status: paid in full or partial
    const newStatus = paidAmount >= invoice.total ? "paid" : "partial";

    await ctx.db.patch(args.invoiceId, {
      status: newStatus,
      paidAt: now,
      paidAmount,
      updatedAt: now,
    });

    // Cancel all pending reminders for this invoice
    await cancelRemindersInternal(ctx, args.invoiceId);

    // Update client payment behavior
    const client = await ctx.db.get(invoice.clientId);
    if (client && client.userId === userId) {
      const totalPaid = (client.totalPaid ?? 0) + paidAmount;
      const totalInvoiced = (client.totalInvoiced ?? 0) + invoice.total;

      // Calculate average payment days
      let avgPaymentDays = client.avgPaymentDays ?? 0;
      if (invoice.sentAt) {
        const paymentDays = (now - invoice.sentAt) / (1000 * 60 * 60 * 24);
        const previousPaymentCount = client.avgPaymentDays ? Math.round((client.totalPaid ?? 0) / Math.max(invoice.total, 1)) : 0;
        const totalCount = previousPaymentCount + 1;
        avgPaymentDays = ((avgPaymentDays * previousPaymentCount) + paymentDays) / totalCount;
      }

      // Determine if on time (paid before or on due date)
      const isOnTime = now <= invoice.dueDate;
      const currentOnTimeRate = client.onTimeRate ?? 0;
      const previousPaymentCount = client.totalPaid ? Math.round(client.totalPaid / Math.max(invoice.total, 1)) : 0;
      const newOnTimeRate = previousPaymentCount === 0
        ? (isOnTime ? 1 : 0)
        : ((currentOnTimeRate * previousPaymentCount) + (isOnTime ? 1 : 0)) / (previousPaymentCount + 1);

      await ctx.db.patch(invoice.clientId, {
        totalPaid,
        totalInvoiced,
        avgPaymentDays: Math.round(avgPaymentDays * 10) / 10,
        onTimeRate: Math.round(newOnTimeRate * 100) / 100,
        lastPaymentAt: now,
        updatedAt: now,
      });
    }

    return args.invoiceId;
  },
});

// ─────────────────────────────────────────────
// 6. MARK OVERDUE (batch — check overdue invoices)
// ─────────────────────────────────────────────
export const markOverdue = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all sent and viewed invoices
    // Note: by_user_and_status requires userId first, so we use full scan with filter
    const sentInvoices = await ctx.db
      .query("invoices")
      .filter((q) => q.eq(q.field("status"), "sent"))
      .collect();

    const viewedInvoices = await ctx.db
      .query("invoices")
      .filter((q) => q.eq(q.field("status"), "viewed"))
      .collect();

    const overdueEligible = [...sentInvoices, ...viewedInvoices];
    let overdueCount = 0;

    for (const invoice of overdueEligible) {
      if (invoice.dueDate < now) {
        await ctx.db.patch(invoice._id, {
          status: "overdue",
          updatedAt: now,
        });
        overdueCount++;
      }
    }

    return { overdueCount };
  },
});

// ─────────────────────────────────────────────
// 7. CANCEL
// ─────────────────────────────────────────────
export const cancel = mutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized to cancel this invoice");

    // Only draft or sent invoices can be cancelled
    if (invoice.status !== "draft" && invoice.status !== "sent") {
      throw new ConvexError("Only draft or sent invoices can be cancelled");
    }

    const now = Date.now();

    await ctx.db.patch(args.invoiceId, {
      status: "cancelled",
      updatedAt: now,
    });

    // Cancel all pending reminders for this invoice
    await cancelRemindersInternal(ctx, args.invoiceId);

    return args.invoiceId;
  },
});

// ─────────────────────────────────────────────
// 8. GET (by ID with ownership check)
// ─────────────────────────────────────────────
export const get = query({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized to view this invoice");

    return invoice;
  },
});

// ─────────────────────────────────────────────
// 9. LIST (with optional status filter)
// ─────────────────────────────────────────────
export const list = query({
  args: {
    status: v.optional(invoiceStatusValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    if (args.status) {
      const invoices = await ctx.db
        .query("invoices")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", userId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
      return invoices;
    }

    // No status filter — return all invoices for this user
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return invoices.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// ─────────────────────────────────────────────
// 10. GET BY PUBLIC TOKEN (client view, no auth)
// ─────────────────────────────────────────────
export const getByPublicToken = query({
  args: {
    publicToken: v.string(),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_public_token", (q) => q.eq("publicToken", args.publicToken))
      .first();

    if (!invoice) return null;

    // Only allow viewing sent/viewed/paid/partial/overdue invoices via public link
    if (invoice.status === "draft" || invoice.status === "cancelled") return null;

    // Return limited fields for client view
    return {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      lineItems: invoice.lineItems,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
      terms: invoice.terms,
      createdAt: invoice.createdAt,
      paidAt: invoice.paidAt,
      paidAmount: invoice.paidAmount,
    };
  },
});

// ─────────────────────────────────────────────
// 11. GET STATS
// ─────────────────────────────────────────────
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const allInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Total invoiced (excludes cancelled)
    const totalInvoiced = allInvoices
      .filter((inv) => inv.status !== "cancelled")
      .reduce((sum, inv) => sum + inv.total, 0);

    // Total paid
    const totalPaid = allInvoices
      .filter((inv) => inv.status === "paid" || inv.status === "partial")
      .reduce((sum, inv) => sum + (inv.paidAmount ?? 0), 0);

    // Outstanding (sent, viewed, overdue, partial — not yet fully paid)
    const outstanding = allInvoices
      .filter((inv) => ["sent", "viewed", "overdue", "partial"].includes(inv.status))
      .reduce((sum, inv) => sum + (inv.total - (inv.paidAmount ?? 0)), 0);

    // Overdue count
    const overdueCount = allInvoices.filter((inv) => inv.status === "overdue").length;

    // Average payment days (from sentAt to paidAt on paid invoices)
    const paidInvoicesWithDates = allInvoices.filter(
      (inv) => (inv.status === "paid" || inv.status === "partial") && inv.sentAt && inv.paidAt
    );
    const avgPaymentDays = paidInvoicesWithDates.length > 0
      ? paidInvoicesWithDates.reduce((sum, inv) => {
          const days = (inv.paidAt! - inv.sentAt!) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / paidInvoicesWithDates.length
      : 0;

    return {
      totalInvoiced,
      totalPaid,
      outstanding,
      overdueCount,
      avgPaymentDays: Math.round(avgPaymentDays * 10) / 10,
      counts: {
        draft: allInvoices.filter((i) => i.status === "draft").length,
        sent: allInvoices.filter((i) => i.status === "sent").length,
        viewed: allInvoices.filter((i) => i.status === "viewed").length,
        paid: allInvoices.filter((i) => i.status === "paid").length,
        partial: allInvoices.filter((i) => i.status === "partial").length,
        overdue: allInvoices.filter((i) => i.status === "overdue").length,
        cancelled: allInvoices.filter((i) => i.status === "cancelled").length,
        total: allInvoices.length,
      },
    };
  },
});

// ─────────────────────────────────────────────
// 12. GET NEXT INVOICE NUMBER
// ─────────────────────────────────────────────
export const getNextInvoiceNumber = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    return await getNextInvoiceNumberInternal(ctx, userId);
  },
});

// ─────────────────────────────────────────────
// 13. REMOVE (draft only)
// ─────────────────────────────────────────────
export const remove = mutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized to delete this invoice");

    // Only draft invoices can be deleted
    if (invoice.status !== "draft") {
      throw new ConvexError("Only draft invoices can be deleted");
    }

    // Delete all work links associated with this invoice
    const workLinks = await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    for (const link of workLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete all payment reminders associated with this invoice
    const reminders = await ctx.db
      .query("paymentReminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    for (const reminder of reminders) {
      await ctx.db.delete(reminder._id);
    }

    await ctx.db.delete(args.invoiceId);

    return { success: true, deletedId: args.invoiceId };
  },
});


// ═════════════════════════════════════════════
// INVOICE WORK LINKS (Validated Billing)
// ═════════════════════════════════════════════

// ─────────────────────────────────────────────
// 14. ADD WORK LINK
// ─────────────────────────────────────────────
export const addWorkLink = mutation({
  args: {
    invoiceId: v.id("invoices"),
    lineItemIndex: v.number(),
    workSessionId: v.optional(v.id("workSessions")),
    description: v.string(),
    evidenceUrl: v.optional(v.string()),
    type: v.union(
      v.literal("time"),
      v.literal("task"),
      v.literal("milestone"),
      v.literal("deliverable"),
      v.literal("expense"),
    ),
    hours: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Validate invoice ownership
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized: invoice belongs to another user");

    // Validate line item index is within bounds
    if (args.lineItemIndex < 0 || args.lineItemIndex >= invoice.lineItems.length) {
      throw new ConvexError("Line item index is out of bounds");
    }

    // Validate description is not empty
    if (args.description.trim().length === 0) {
      throw new ConvexError("Work link description cannot be empty");
    }

    // Validate hours is non-negative if provided
    if (args.hours !== undefined && args.hours < 0) {
      throw new ConvexError("Hours cannot be negative");
    }

    // Validate work session ownership if provided
    if (args.workSessionId) {
      const session = await ctx.db.get(args.workSessionId);
      if (!session) throw new ConvexError("Work session not found");
      if (session.userId !== userId) throw new ConvexError("Work session does not belong to this user");
    }

    const now = Date.now();

    const workLinkId = await ctx.db.insert("invoiceWorkLinks", {
      invoiceId: args.invoiceId,
      userId,
      lineItemIndex: args.lineItemIndex,
      workSessionId: args.workSessionId,
      description: args.description.trim(),
      evidenceUrl: args.evidenceUrl,
      type: args.type,
      hours: args.hours,
      completedAt: args.completedAt,
      createdAt: now,
    });

    return workLinkId;
  },
});

// ─────────────────────────────────────────────
// 15. REMOVE WORK LINK
// ─────────────────────────────────────────────
export const removeWorkLink = mutation({
  args: {
    workLinkId: v.id("invoiceWorkLinks"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const workLink = await ctx.db.get(args.workLinkId);
    if (!workLink) throw new ConvexError("Work link not found");
    if (workLink.userId !== userId) throw new ConvexError("Not authorized to delete this work link");

    await ctx.db.delete(args.workLinkId);

    return { success: true, deletedId: args.workLinkId };
  },
});

// ─────────────────────────────────────────────
// 16. GET WORK LINKS (all for an invoice)
// ─────────────────────────────────────────────
export const getWorkLinks = query({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Validate invoice ownership
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized to view this invoice");

    const workLinks = await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    return workLinks;
  },
});

// ─────────────────────────────────────────────
// 17. GET WORK LINKS BY LINE ITEM
// ─────────────────────────────────────────────
export const getWorkLinksByLineItem = query({
  args: {
    invoiceId: v.id("invoices"),
    lineItemIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Validate invoice ownership
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized to view this invoice");

    // Validate line item index
    if (args.lineItemIndex < 0 || args.lineItemIndex >= invoice.lineItems.length) {
      throw new ConvexError("Line item index is out of bounds");
    }

    const workLinks = await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    return workLinks.filter((link) => link.lineItemIndex === args.lineItemIndex);
  },
});


// ═════════════════════════════════════════════
// PAYMENT REMINDERS
// ═════════════════════════════════════════════

// ─────────────────────────────────────────────
// 18. SCHEDULE REMINDERS (Day 3/7/14)
// ─────────────────────────────────────────────
export const scheduleReminders = mutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized");

    if (invoice.status !== "sent" && invoice.status !== "viewed") {
      throw new ConvexError("Reminders can only be scheduled for sent or viewed invoices");
    }

    if (!invoice.sentAt) {
      throw new ConvexError("Invoice has not been sent yet");
    }

    await scheduleRemindersInternal(ctx, args.invoiceId, userId, invoice, invoice.sentAt);

    return { success: true };
  },
});

// ─────────────────────────────────────────────
// 19. PROCESS DUE REMINDERS (cron/manual)
// ─────────────────────────────────────────────
export const processDueReminders = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all scheduled reminders where scheduledFor < now
    const scheduledReminders = await ctx.db
      .query("paymentReminders")
      .withIndex("by_scheduled", (q) => q.lt("scheduledFor", now))
      .collect();

    let processedCount = 0;

    for (const reminder of scheduledReminders) {
      if (reminder.status === "scheduled") {
        await ctx.db.patch(reminder._id, {
          status: "sent",
          sentAt: now,
        });
        processedCount++;
      }
    }

    return { processedCount };
  },
});

// ─────────────────────────────────────────────
// 20. CANCEL REMINDERS
// ─────────────────────────────────────────────
export const cancelReminders = mutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized");

    await cancelRemindersInternal(ctx, args.invoiceId);

    return { success: true };
  },
});

// ─────────────────────────────────────────────
// 21. GET REMINDER HISTORY
// ─────────────────────────────────────────────
export const getReminderHistory = query({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Validate invoice ownership
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Not authorized to view this invoice");

    const reminders = await ctx.db
      .query("paymentReminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    // Sort by sequenceDay ascending
    return reminders.sort((a, b) => a.sequenceDay - b.sequenceDay);
  },
});


// ═════════════════════════════════════════════
// INTERNAL HELPERS
// ═════════════════════════════════════════════

/**
 * Generate the next sequential invoice number for a user.
 * Format: INV-001, INV-002, etc.
 */
async function getNextInvoiceNumberInternal(
  ctx: any,
  userId: string
): Promise<string> {
  // Get all invoices for this user ordered by invoice number
  const existingInvoices = await ctx.db
    .query("invoices")
    .withIndex("by_user_and_number", (q: any) => q.eq("userId", userId))
    .collect();

  // Find the highest existing number
  let maxNumber = 0;
  for (const inv of existingInvoices) {
    const match = inv.invoiceNumber.match(/^INV-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  }

  const nextNumber = maxNumber + 1;
  return `INV-${String(nextNumber).padStart(3, "0")}`;
}

/**
 * Schedule Day 3/7/14 payment reminders for an invoice.
 * Pre-writes content based on invoice details.
 */
async function scheduleRemindersInternal(
  ctx: any,
  invoiceId: string,
  userId: string,
  invoice: any,
  sentAt: number
): Promise<void> {
  const now = Date.now();

  const reminderConfigs = [
    {
      day: 3,
      tone: "friendly" as const,
      scheduledFor: sentAt + 3 * 24 * 60 * 60 * 1000,
      subject: `Friendly Reminder: Invoice ${invoice.invoiceNumber}`,
      body: `Hi there,\n\nThis is a friendly reminder that invoice ${invoice.invoiceNumber} for ${invoice.currency ?? "USD"} ${invoice.total.toFixed(2)} is approaching its due date. If you've already processed the payment, please disregard this message.\n\nThank you for your prompt attention!\n\nBest regards`,
    },
    {
      day: 7,
      tone: "professional" as const,
      scheduledFor: sentAt + 7 * 24 * 60 * 60 * 1000,
      subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
      body: `Dear Client,\n\nWe would like to remind you that invoice ${invoice.invoiceNumber} for ${invoice.currency ?? "USD"} ${invoice.total.toFixed(2)} is now past due. We kindly request that you process this payment at your earliest convenience.\n\nIf you have any questions regarding this invoice, please do not hesitate to reach out.\n\nKind regards`,
    },
    {
      day: 14,
      tone: "firm" as const,
      scheduledFor: sentAt + 14 * 24 * 60 * 60 * 1000,
      subject: `URGENT: Overdue Invoice ${invoice.invoiceNumber}`,
      body: `Dear Client,\n\nDespite our previous reminders, invoice ${invoice.invoiceNumber} for ${invoice.currency ?? "USD"} ${invoice.total.toFixed(2)} remains unpaid and is now significantly overdue.\n\nWe must insist on immediate payment to avoid any further action. If payment has already been sent, please provide confirmation so we may update our records.\n\nSincerely`,
    },
  ];

  for (const config of reminderConfigs) {
    // Only schedule if the scheduledFor time is still in the future
    if (config.scheduledFor > now) {
      await ctx.db.insert("paymentReminders", {
        invoiceId,
        userId,
        sequenceDay: config.day,
        channel: "email",
        tone: config.tone,
        status: "scheduled",
        subject: config.subject,
        body: config.body,
        scheduledFor: config.scheduledFor,
        sentAt: undefined,
        openedAt: undefined,
        createdAt: now,
      });
    }
  }
}

/**
 * Cancel all pending reminders for an invoice.
 */
async function cancelRemindersInternal(
  ctx: any,
  invoiceId: string
): Promise<void> {
  const reminders = await ctx.db
    .query("paymentReminders")
    .withIndex("by_invoice", (q: any) => q.eq("invoiceId", invoiceId))
    .collect();

  for (const reminder of reminders) {
    if (reminder.status === "scheduled") {
      await ctx.db.patch(reminder._id, {
        status: "cancelled",
      });
    }
  }
}
