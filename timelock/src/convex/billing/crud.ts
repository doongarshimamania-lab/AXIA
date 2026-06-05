import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getInvoices = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (status) {
      return await ctx.db
        .query("invoices")
        .withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("status", status as any))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.userId !== userId) return null;
    return invoice;
  },
});

export const getInvoiceByToken = query({
  args: { publicToken: v.string() },
  handler: async (ctx, { publicToken }) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_public_token", (q) => q.eq("publicToken", publicToken))
      .first();
  },
});

export const getWorkLinks = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    return await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .collect();
  },
});

export const getPaymentReminders = query({
  args: { invoiceId: v.optional(v.id("invoices")) },
  handler: async (ctx, { invoiceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (invoiceId) {
      return await ctx.db
        .query("paymentReminders")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
        .collect();
    }

    return await ctx.db
      .query("paymentReminders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getInvoiceStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, paid: 0, pending: 0, overdue: 0, totalRevenue: 0, withProof: 0 };

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      total: invoices.length,
      paid: invoices.filter(i => i.status === "paid").length,
      pending: invoices.filter(i => i.status === "sent" || i.status === "viewed").length,
      overdue: invoices.filter(i => i.status === "overdue").length,
      draft: invoices.filter(i => i.status === "draft").length,
      totalRevenue: invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0),
      totalOutstanding: invoices.filter(i => ["sent", "viewed", "overdue"].includes(i.status)).reduce((s, i) => s + i.total, 0),
      withProof: invoices.filter(i => (i.proofCount ?? 0) > 0).length,
    };
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

function generateInvoiceNumber(existing: any[]): string {
  const nums = existing.map(inv => {
    const match = inv.invoiceNumber?.match(/INV-(\d+)/);
    return match ? parseInt(match[1]) : 0;
  });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `INV-${String(max + 1).padStart(3, "0")}`;
}

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export const createInvoice = mutation({
  args: {
    clientId: v.optional(v.id("clients")),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    lineItems: v.array(v.object({
      id: v.string(),
      description: v.string(),
      quantity: v.number(),
      rate: v.number(),
      amount: v.number(),
      workLinkId: v.optional(v.string()),
      hasProof: v.optional(v.boolean()),
    })),
    subtotal: v.number(),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    total: v.number(),
    dueDate: v.number(),
    issueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const invoiceNumber = generateInvoiceNumber(existing);
    const proofCount = args.lineItems.filter(li => li.hasProof).length;

    return await ctx.db.insert("invoices", {
      userId,
      ...args,
      invoiceNumber,
      publicToken: generateToken(),
      status: "draft",
      issueDate: args.issueDate ?? Date.now(),
      proofCount,
      hasValidatedBilling: proofCount > 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    lineItems: v.optional(v.array(v.object({
      id: v.string(),
      description: v.string(),
      quantity: v.number(),
      rate: v.number(),
      amount: v.number(),
      workLinkId: v.optional(v.string()),
      hasProof: v.optional(v.boolean()),
    }))),
    subtotal: v.optional(v.number()),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    total: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { invoiceId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.userId !== userId) throw new Error("Not authorized");

    if (updates.lineItems) {
      const proofCount = updates.lineItems.filter(li => li.hasProof).length;
      (updates as any).proofCount = proofCount;
      (updates as any).hasValidatedBilling = proofCount > 0;
    }

    await ctx.db.patch(invoiceId, { ...updates, updatedAt: Date.now() });
  },
});

export const sendInvoice = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.userId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(invoiceId, {
      status: "sent",
      sentAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule payment reminders
    const reminderSchedule = [
      { day: 3, tone: "friendly" as const, subject: `Invoice ${invoice.invoiceNumber} - Friendly Reminder` },
      { day: 7, tone: "firm" as const, subject: `Invoice ${invoice.invoiceNumber} - Payment Due` },
      { day: 14, tone: "urgent" as const, subject: `Invoice ${invoice.invoiceNumber} - URGENT: Overdue Payment` },
    ];

    for (const reminder of reminderSchedule) {
      const body = reminder.tone === "friendly"
        ? `Hi ${invoice.clientName || "there"},\n\nJust a friendly reminder that invoice ${invoice.invoiceNumber} for $${invoice.total} is due.\n\nThank you!`
        : reminder.tone === "firm"
        ? `Hi ${invoice.clientName || "there"},\n\nInvoice ${invoice.invoiceNumber} for $${invoice.total} is now past due. Please process payment at your earliest convenience.\n\nThank you.`
        : `Hi ${invoice.clientName || "there"},\n\nInvoice ${invoice.invoiceNumber} for $${invoice.total} is significantly overdue. Please process payment immediately.\n\nThank you.`;

      await ctx.db.insert("paymentReminders", {
        userId,
        invoiceId,
        dayNumber: reminder.day,
        channel: "email",
        tone: reminder.tone,
        subject: reminder.subject,
        body,
        status: "scheduled",
        scheduledAt: Date.now() + reminder.day * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
      });
    }
  },
});

export const markInvoicePaid = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.userId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(invoiceId, {
      status: "paid",
      paidDate: Date.now(),
      updatedAt: Date.now(),
    });

    // Cancel remaining reminders
    const reminders = await ctx.db
      .query("paymentReminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .collect();

    for (const r of reminders) {
      if (r.status === "scheduled") {
        await ctx.db.patch(r._id, { status: "cancelled" });
      }
    }
  },
});

export const deleteInvoice = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.userId !== userId) throw new Error("Not authorized");

    // Delete work links and reminders
    const workLinks = await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .collect();
    for (const wl of workLinks) await ctx.db.delete(wl._id);

    const reminders = await ctx.db
      .query("paymentReminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .collect();
    for (const r of reminders) await ctx.db.delete(r._id);

    await ctx.db.delete(invoiceId);
  },
});

// ─── WORK LINKS ───────────────────────────────────────────────────────────

export const addWorkLink = mutation({
  args: {
    invoiceId: v.id("invoices"),
    lineItemId: v.string(),
    proofType: v.union(
      v.literal("time_entry"),
      v.literal("task_completion"),
      v.literal("milestone_delivery"),
      v.literal("deliverable_file"),
      v.literal("deliverable_url"),
      v.literal("expense_record")
    ),
    title: v.string(),
    description: v.optional(v.string()),
    hours: v.optional(v.number()),
    date: v.number(),
    value: v.optional(v.number()),
    url: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== userId) throw new Error("Not authorized");

    const workLinkId = await ctx.db.insert("invoiceWorkLinks", {
      userId,
      ...args,
      verified: false,
      createdAt: Date.now(),
    });

    // Update the line item's hasProof flag
    const updatedLineItems = invoice.lineItems.map(li =>
      li.id === args.lineItemId ? { ...li, hasProof: true, workLinkId: workLinkId.toString() } : li
    );
    const proofCount = updatedLineItems.filter(li => li.hasProof).length;

    await ctx.db.patch(args.invoiceId, {
      lineItems: updatedLineItems,
      proofCount,
      hasValidatedBilling: proofCount > 0,
      updatedAt: Date.now(),
    });

    return workLinkId;
  },
});

export const removeWorkLink = mutation({
  args: { workLinkId: v.id("invoiceWorkLinks") },
  handler: async (ctx, { workLinkId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workLink = await ctx.db.get(workLinkId);
    if (!workLink || workLink.userId !== userId) throw new Error("Not authorized");

    const invoice = await ctx.db.get(workLink.invoiceId);
    if (invoice) {
      const updatedLineItems = invoice.lineItems.map(li =>
        li.id === workLink.lineItemId ? { ...li, hasProof: false, workLinkId: undefined } : li
      );
      const proofCount = updatedLineItems.filter(li => li.hasProof).length;
      await ctx.db.patch(invoice._id, {
        lineItems: updatedLineItems,
        proofCount,
        hasValidatedBilling: proofCount > 0,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.delete(workLinkId);
  },
});

// ─── SEED MOCK DATA ───────────────────────────────────────────────────────

export const seedMockInvoices = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existing.length > 0) return { seeded: false, count: existing.length };

    const now = Date.now();
    const day = 86400000;

    const mockInvoices = [
      {
        clientName: "Acme Corp",
        clientEmail: "billing@acmecorp.com",
        status: "paid" as const,
        lineItems: [
          { id: "li1", description: "Frontend Development - Homepage", quantity: 40, rate: 125, amount: 5000, hasProof: true },
          { id: "li2", description: "UI/UX Design - Dashboard", quantity: 20, rate: 150, amount: 3000, hasProof: true },
        ],
        subtotal: 8000, taxRate: 10, taxAmount: 800, total: 8800,
        issueDate: now - 30 * day, dueDate: now - 15 * day, paidDate: now - 12 * day,
        proofCount: 2, hasValidatedBilling: true,
      },
      {
        clientName: "TechStart Inc",
        clientEmail: "finance@techstart.io",
        status: "sent" as const,
        lineItems: [
          { id: "li1", description: "API Development - User Service", quantity: 60, rate: 150, amount: 9000, hasProof: true },
          { id: "li2", description: "Database Architecture", quantity: 15, rate: 175, amount: 2625, hasProof: false },
        ],
        subtotal: 11625, taxRate: 8, taxAmount: 930, total: 12555,
        issueDate: now - 5 * day, dueDate: now + 10 * day,
        proofCount: 1, hasValidatedBilling: true,
      },
      {
        clientName: "GlobalMedia",
        clientEmail: "accounts@globalmedia.com",
        status: "overdue" as const,
        lineItems: [
          { id: "li1", description: "Mobile App - iOS & Android", quantity: 80, rate: 125, amount: 10000, hasProof: true },
          { id: "li2", description: "QA Testing", quantity: 20, rate: 100, amount: 2000, hasProof: true },
          { id: "li3", description: "App Store Deployment", quantity: 5, rate: 200, amount: 1000, hasProof: false },
        ],
        subtotal: 13000, taxRate: 10, taxAmount: 1300, total: 14300,
        issueDate: now - 45 * day, dueDate: now - 15 * day,
        proofCount: 2, hasValidatedBilling: true,
      },
      {
        clientName: "DesignHub",
        clientEmail: "pay@designhub.co",
        status: "draft" as const,
        lineItems: [
          { id: "li1", description: "Brand Identity Package", quantity: 1, rate: 4500, amount: 4500, hasProof: false },
          { id: "li2", description: "Social Media Kit", quantity: 1, rate: 2000, amount: 2000, hasProof: false },
        ],
        subtotal: 6500, taxRate: 10, taxAmount: 650, total: 7150,
        issueDate: now, dueDate: now + 30 * day,
        proofCount: 0, hasValidatedBilling: false,
      },
    ];

    for (let i = 0; i < mockInvoices.length; i++) {
      const inv = mockInvoices[i];
      await ctx.db.insert("invoices", {
        userId,
        invoiceNumber: `INV-${String(i + 1).padStart(3, "0")}`,
        publicToken: generateToken(),
        currency: "USD",
        notes: "",
        sentAt: inv.status !== "draft" ? inv.issueDate : undefined,
        viewedAt: inv.status === "paid" ? inv.issueDate + day : undefined,
        createdAt: inv.issueDate,
        updatedAt: now,
        ...inv,
      });
    }

    return { seeded: true, count: mockInvoices.length };
  },
});

// ─── MULTI-CLIENT BILLING QUERIES ──────────────────────────────────────────

/** Get billing dashboard — aggregates invoice data across clients. */
export const getBillingDashboard = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    let invoices;
    if (args.workspaceId) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    // Aggregate by client
    const byClient: Record<string, {
      totalInvoiced: number;
      totalPaid: number;
      totalOutstanding: number;
      totalOverdue: number;
      invoiceCount: number;
      paidCount: number;
      overdueCount: number;
      avgPaymentDays: number;
      onTimeRate: number;
    }> = {};

    for (const inv of invoices) {
      const clientKey = inv.clientName || "Unknown";
      if (!byClient[clientKey]) {
        byClient[clientKey] = {
          totalInvoiced: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          totalOverdue: 0,
          invoiceCount: 0,
          paidCount: 0,
          overdueCount: 0,
          avgPaymentDays: 0,
          onTimeRate: 0,
        };
      }
      const c = byClient[clientKey];
      c.totalInvoiced += inv.total;
      c.invoiceCount += 1;

      if (inv.status === "paid") {
        c.totalPaid += inv.total;
        c.paidCount += 1;
      } else if (inv.status === "overdue") {
        c.totalOverdue += inv.total;
        c.overdueCount += 1;
      }

      if (["sent", "viewed", "overdue"].includes(inv.status)) {
        c.totalOutstanding += inv.total;
      }
    }

    // Calculate payment patterns
    for (const [clientName, data] of Object.entries(byClient)) {
      const clientInvoices = invoices.filter(
        (i) => (i.clientName || "Unknown") === clientName && i.status === "paid" && i.paidDate && i.issueDate
      );
      if (clientInvoices.length > 0) {
        const paymentDays = clientInvoices.map((i) =>
          Math.floor(((i.paidDate || 0) - i.issueDate) / (1000 * 60 * 60 * 24))
        );
        data.avgPaymentDays = Math.round(
          paymentDays.reduce((s, d) => s + d, 0) / paymentDays.length
        );
        const onTime = clientInvoices.filter((i) => (i.paidDate || 0) <= i.dueDate).length;
        data.onTimeRate = Math.round((onTime / clientInvoices.length) * 100);
      }
    }

    // Overall stats (by currency — Task 8 fix: don't mix currencies)
    const byCurrency: Record<string, {
      totalRevenue: number;
      totalOutstanding: number;
      totalOverdue: number;
      invoiceCount: number;
    }> = {};

    for (const inv of invoices) {
      const cur = inv.currency || "USD";
      if (!byCurrency[cur]) {
        byCurrency[cur] = { totalRevenue: 0, totalOutstanding: 0, totalOverdue: 0, invoiceCount: 0 };
      }
      byCurrency[cur].invoiceCount += 1;
      if (inv.status === "paid") {
        byCurrency[cur].totalRevenue += inv.total;
      }
      if (["sent", "viewed", "overdue"].includes(inv.status)) {
        byCurrency[cur].totalOutstanding += inv.total;
      }
      if (inv.status === "overdue") {
        byCurrency[cur].totalOverdue += inv.total;
      }
    }

    // Use byCurrency as the primary data source for totals — never mix currencies
    // Legacy single-currency totals are computed from the default (USD) bucket only
    const usdData = byCurrency["USD"] || { totalRevenue: 0, totalOutstanding: 0, totalOverdue: 0, invoiceCount: 0 };

    return {
      totalInvoices: invoices.length,
      // Per-currency breakdown (primary source of truth)
      byCurrency,
      // USD-only legacy totals for backward compatibility
      totalRevenue: usdData.totalRevenue,
      totalOutstanding: usdData.totalOutstanding,
      totalOverdue: usdData.totalOverdue,
      byClient,
      recentInvoices: invoices.slice(0, 10),
      paymentPattern: {
        avgPaymentDays: Object.values(byClient).length > 0
          ? Math.round(
              Object.values(byClient).reduce((s, c) => s + c.avgPaymentDays, 0) /
              Object.values(byClient).filter((c) => c.avgPaymentDays > 0).length
            )
          : 0,
        onTimeRate: Object.values(byClient).length > 0
          ? Math.round(
              Object.values(byClient).reduce((s, c) => s + c.onTimeRate, 0) /
              Object.values(byClient).filter((c) => c.onTimeRate > 0).length
            )
          : 100,
      },
    };
  },
});

/** Get work links for a specific invoice (proof for billing). */
export const getWorkLinksForInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== userId) return [];

    return await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();
  },
});

/** Get client billing summary — payment pattern analysis for a specific client. */
export const getClientBillingSummary = query({
  args: { clientName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("clientName"), args.clientName))
      .collect();

    const paid = invoices.filter((i) => i.status === "paid");
    const outstanding = invoices.filter((i) => ["sent", "viewed", "overdue"].includes(i.status));
    const overdue = invoices.filter((i) => i.status === "overdue");

    // Payment pattern
    const paymentDays = paid
      .filter((i) => i.paidDate && i.issueDate)
      .map((i) => Math.floor(((i.paidDate || 0) - i.issueDate) / (1000 * 60 * 60 * 24)));

    const avgPaymentDays = paymentDays.length > 0
      ? Math.round(paymentDays.reduce((s, d) => s + d, 0) / paymentDays.length)
      : 0;

    const onTimePayments = paid.filter((i) => (i.paidDate || 0) <= i.dueDate).length;
    const onTimeRate = paid.length > 0 ? Math.round((onTimePayments / paid.length) * 100) : 100;

    return {
      clientName: args.clientName,
      totalInvoiced: invoices.reduce((s, i) => s + i.total, 0),
      totalPaid: paid.reduce((s, i) => s + i.total, 0),
      totalOutstanding: outstanding.reduce((s, i) => s + i.total, 0),
      totalOverdue: overdue.reduce((s, i) => s + i.total, 0),
      invoiceCount: invoices.length,
      paidCount: paid.length,
      outstandingCount: outstanding.length,
      overdueCount: overdue.length,
      avgPaymentDays,
      onTimeRate,
      invoices: invoices.slice(0, 20),
    };
  },
});

// ─── BATCH OPERATIONS ───────────────────────────────────────────────────────

/** Send multiple invoices at once. */
export const batchSendInvoices = mutation({
  args: {
    invoiceIds: v.array(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const results: { invoiceId: string; success: boolean; error?: string }[] = [];

    for (const invoiceId of args.invoiceIds) {
      try {
        const invoice = await ctx.db.get(invoiceId);
        if (!invoice || invoice.userId !== userId) {
          results.push({ invoiceId: invoiceId as string, success: false, error: "Not authorized" });
          continue;
        }

        if (invoice.status !== "draft") {
          results.push({ invoiceId: invoiceId as string, success: false, error: "Not a draft" });
          continue;
        }

        await ctx.db.patch(invoiceId, {
          status: "sent",
          sentAt: Date.now(),
          updatedAt: Date.now(),
        });

        results.push({ invoiceId: invoiceId as string, success: true });
      } catch (err: any) {
        results.push({ invoiceId: invoiceId as string, success: false, error: err.message });
      }
    }

    return results;
  },
});

/** Mark multiple invoices as paid. */
export const batchMarkPaid = mutation({
  args: {
    invoiceIds: v.array(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const results: { invoiceId: string; success: boolean; error?: string }[] = [];

    for (const invoiceId of args.invoiceIds) {
      try {
        const invoice = await ctx.db.get(invoiceId);
        if (!invoice || invoice.userId !== userId) {
          results.push({ invoiceId: invoiceId as string, success: false, error: "Not authorized" });
          continue;
        }

        await ctx.db.patch(invoiceId, {
          status: "paid",
          paidDate: Date.now(),
          updatedAt: Date.now(),
        });

        // Cancel reminders
        const reminders = await ctx.db
          .query("paymentReminders")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
          .collect();

        for (const r of reminders) {
          if (r.status === "scheduled") {
            await ctx.db.patch(r._id, { status: "cancelled" });
          }
        }

        results.push({ invoiceId: invoiceId as string, success: true });
      } catch (err: any) {
        results.push({ invoiceId: invoiceId as string, success: false, error: err.message });
      }
    }

    return results;
  },
});

// ─── AGING REPORT ───────────────────────────────────────────────────────────

/** Get aging report — groups unpaid invoices by age buckets per client. */
export const getAgingReport = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get all non-paid, non-cancelled invoices
    let invoices;
    if (args.workspaceId) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .filter((q) => q.eq(q.field("userId"), userId))
        .filter((q) => q.neq(q.field("status"), "paid"))
        .filter((q) => q.neq(q.field("status"), "cancelled"))
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.neq(q.field("status"), "paid"))
        .filter((q) => q.neq(q.field("status"), "cancelled"))
        .collect();
    }

    const now = Date.now();
    const dayMs = 86400000;

    // Buckets with invoice arrays for detailed view
    const buckets = {
      current: [] as any[],
      days_0_30: [] as any[],
      days_31_60: [] as any[],
      days_61_90: [] as any[],
      days_90_plus: [] as any[],
    };

    // Per-client aging totals
    const byClient: Record<string, {
      current: number;
      days_0_30: number;
      days_31_60: number;
      days_61_90: number;
      days_90_plus: number;
      total: number;
      invoiceCount: number;
    }> = {};

    for (const inv of invoices) {
      const daysPastDue = Math.floor((now - inv.dueDate) / dayMs);
      let bucket: keyof typeof buckets;
      if (daysPastDue <= 0) bucket = "current";
      else if (daysPastDue <= 30) bucket = "days_0_30";
      else if (daysPastDue <= 60) bucket = "days_31_60";
      else if (daysPastDue <= 90) bucket = "days_61_90";
      else bucket = "days_90_plus";

      buckets[bucket].push(inv);

      const clientKey = inv.clientName || "Unknown";
      if (!byClient[clientKey]) {
        byClient[clientKey] = {
          current: 0, days_0_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0,
          total: 0, invoiceCount: 0,
        };
      }
      byClient[clientKey][bucket] += inv.total;
      byClient[clientKey].total += inv.total;
      byClient[clientKey].invoiceCount += 1;
    }

    // Summary totals
    const totals = {
      current: buckets.current.reduce((s, i) => s + i.total, 0),
      days_0_30: buckets.days_0_30.reduce((s, i) => s + i.total, 0),
      days_31_60: buckets.days_31_60.reduce((s, i) => s + i.total, 0),
      days_61_90: buckets.days_61_90.reduce((s, i) => s + i.total, 0),
      days_90_plus: buckets.days_90_plus.reduce((s, i) => s + i.total, 0),
    };

    return { buckets, byClient, totals, totalUnpaid: invoices.length };
  },
});

// ─── AUTO-LINK TIME LOGS (Task 4) ───────────────────────────────────────────

/** Auto-link time sessions to an invoice based on the invoice's client and date range. */
export const autoLinkTimeToInvoice = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.userId !== userId) throw new Error("Not authorized");

    if (!invoice.clientName) throw new Error("Invoice must have a client name to auto-link");

    // Find work sessions for this client within the invoice date range
    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const relevantSessions = sessions.filter(
      (s) =>
        s.clientName === invoice.clientName &&
        s.startTime >= invoice.issueDate &&
        s.startTime <= invoice.dueDate &&
        s.endTime !== undefined
    );

    // Get existing work links for this invoice
    const existingLinks = await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .collect();

    const existingSessionIds = new Set(existingLinks.map((l) => l.title));

    let linkedCount = 0;
    for (const session of relevantSessions) {
      const linkTitle = `Time: ${session.projectName} - ${new Date(session.startTime).toLocaleDateString()}`;
      if (existingSessionIds.has(linkTitle)) continue;

      // Create work link for this session
      await ctx.db.insert("invoiceWorkLinks", {
        userId,
        invoiceId,
        lineItemId: invoice.lineItems[0]?.id || "auto",
        proofType: "time_entry",
        title: linkTitle,
        description: session.memo || `${session.clientName} - ${session.projectName}`,
        hours: (session.totalMinutes || 0) / 60,
        date: session.startTime,
        value: ((session.totalMinutes || 0) / 60) * session.hourlyRate,
        verified: true,
        createdAt: Date.now(),
      });

      linkedCount++;
    }

    // Update invoice proof count
    const allLinks = await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .collect();

    const proofCount = allLinks.length;
    await ctx.db.patch(invoiceId, {
      proofCount,
      hasValidatedBilling: proofCount > 0,
      updatedAt: Date.now(),
    });

    return { linkedCount, totalSessions: relevantSessions.length };
  },
});

// ─── SHAREABLE PROOF LINKS (Task 7) ──────────────────────────────────────────

/** Get work proof by public token — public, no auth required. */
export const getWorkProofByToken = query({
  args: { publicToken: v.string() },
  handler: async (ctx, { publicToken }) => {
    const workLink = await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_public_token", (q) => q.eq("publicToken", publicToken))
      .first();

    if (!workLink) return null;

    // Also get the invoice info for context
    const invoice = await ctx.db.get(workLink.invoiceId);

    return {
      _id: workLink._id,
      title: workLink.title,
      description: workLink.description,
      proofType: workLink.proofType,
      hours: workLink.hours,
      date: workLink.date,
      value: workLink.value,
      url: workLink.url,
      fileName: workLink.fileName,
      verified: workLink.verified,
      invoiceNumber: invoice?.invoiceNumber,
      clientName: invoice?.clientName,
      invoiceTotal: invoice?.total,
      invoiceCurrency: invoice?.currency,
    };
  },
});

/** Generate a shareable public token for a work link. */
export const generateWorkLinkShareToken = mutation({
  args: { workLinkId: v.id("invoiceWorkLinks") },
  handler: async (ctx, { workLinkId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workLink = await ctx.db.get(workLinkId);
    if (!workLink || workLink.userId !== userId) throw new Error("Not authorized");

    if (workLink.publicToken) {
      return { token: workLink.publicToken, alreadyExisted: true };
    }

    const token = generateToken();
    await ctx.db.patch(workLinkId, { publicToken: token });

    return { token, alreadyExisted: false };
  },
});
