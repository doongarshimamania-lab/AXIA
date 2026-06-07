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

// ─── INVOICE TEMPLATES ─────────────────────────────────────────────────────

export const getInvoiceTemplates = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const systemTemplates = await ctx.db
      .query("invoiceTemplates")
      .withIndex("by_system", (q) => q.eq("isSystem", true))
      .collect();

    const userTemplates = userId
      ? await ctx.db
          .query("invoiceTemplates")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect()
      : [];

    return [...systemTemplates, ...userTemplates];
  },
});

export const saveUploadedInvoiceTemplate = mutation({
  args: {
    name: v.string(),
    sections: v.array(v.object({
      id: v.string(),
      type: v.union(
        v.literal("heading"),
        v.literal("text"),
        v.literal("line_items"),
        v.literal("subtotal"),
        v.literal("tax"),
        v.literal("terms"),
        v.literal("bank_details"),
        v.literal("divider")
      ),
      content: v.string(),
      metadata: v.optional(v.any()),
    })),
    industry: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { name, sections, industry, description }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("invoiceTemplates", {
      userId,
      name,
      sections,
      industry,
      description,
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const seedInvoiceTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("invoiceTemplates")
      .withIndex("by_system", (q) => q.eq("isSystem", true))
      .collect();

    if (existing.length > 0) return;

    const templates = [
      {
        name: "Standard Service Invoice",
        industry: "Technology",
        description: "Standard invoice template for service-based businesses",
        sections: [
          { id: "1", type: "heading" as const, content: "Invoice" },
          { id: "2", type: "text" as const, content: "Invoice Number: {{invoice_number}}\nDate: {{issue_date}}\nDue Date: {{due_date}}" },
          { id: "3", type: "text" as const, content: "Bill To:\n{{client_name}}\n{{client_email}}" },
          { id: "4", type: "line_items" as const, content: "Line Items" },
          { id: "5", type: "subtotal" as const, content: "Subtotal" },
          { id: "6", type: "tax" as const, content: "Tax" },
          { id: "7", type: "terms" as const, content: "Payment is due within 30 days of the invoice date. Late payments may be subject to a 1.5% monthly interest charge." },
          { id: "8", type: "bank_details" as const, content: "Bank Details:\nBank Name: {{bank_name}}\nAccount Name: {{account_name}}\nAccount Number: {{account_number}}\nRouting Number: {{routing_number}}" },
        ],
      },
      {
        name: "Hourly Consulting Invoice",
        industry: "Consulting",
        description: "Invoice template for hourly consulting work with time tracking",
        sections: [
          { id: "1", type: "heading" as const, content: "Consulting Invoice" },
          { id: "2", type: "text" as const, content: "Invoice #: {{invoice_number}}\nDate: {{issue_date}}\nDue: {{due_date}}" },
          { id: "3", type: "line_items" as const, content: "Time Entries" },
          { id: "4", type: "subtotal" as const, content: "Subtotal" },
          { id: "5", type: "tax" as const, content: "Tax" },
          { id: "6", type: "terms" as const, content: "Payment Terms: Net 15. Please reference invoice number in your payment." },
          { id: "7", type: "bank_details" as const, content: "Payment via bank transfer:\n{{bank_name}}\n{{account_number}}" },
        ],
      },
      {
        name: "Creative Services Invoice",
        industry: "Design",
        description: "Invoice template for design and creative agencies",
        sections: [
          { id: "1", type: "heading" as const, content: "Invoice" },
          { id: "2", type: "text" as const, content: "Project: {{project_name}}\nClient: {{client_name}}\nInvoice Date: {{issue_date}}" },
          { id: "3", type: "line_items" as const, content: "Services" },
          { id: "4", type: "subtotal" as const, content: "Subtotal" },
          { id: "5", type: "tax" as const, content: "Tax" },
          { id: "6", type: "terms" as const, content: "Payment due within 14 days. All deliverables remain the property of the designer until full payment is received." },
        ],
      },
    ];

    for (const t of templates) {
      await ctx.db.insert("invoiceTemplates", {
        name: t.name,
        industry: t.industry,
        description: t.description,
        sections: t.sections,
        isSystem: true,
        usageCount: 0,
        createdAt: Date.now(),
      });
    }
  },
});
