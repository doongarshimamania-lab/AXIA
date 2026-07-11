import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";
import { requireWorkspaceAccess, getWorkspaceMembership, getRecordAccess } from "../permissions";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getInvoices = query({
  args: { workspaceId: v.optional(v.id("workspaces")), status: v.optional(v.string()) },
  handler: async (ctx, { workspaceId, status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // ponytail: ceiling — `.take(1000)` is fine for the vast majority of
    // workspaces. If a workspace exceeds 1000 invoices, switch to cursor-based
    // pagination (`paginate`) and add a `by_workspace_and_status` index for
    // the status-filtered path. The current status filter is a JS-side
    // `.filter()` after the take, which is O(n) but avoids a second index.
    if (workspaceId) {
      const membership = await getWorkspaceMembership(ctx, workspaceId, userId);
      if (!membership) return [];

      const allInvoices = await ctx.db
        .query("invoices")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .order("desc")
        .take(1000);

      if (status) return allInvoices.filter((i: any) => i.status === status);
      return allInvoices;
    }

    if (status) {
      return await ctx.db
        .query("invoices")
        .withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("status", status as any))
        .order("desc")
        .take(1000);
    }
    return await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1000);
  },
});

export const getInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice) return null;

    // Check workspace membership or direct ownership
    if (invoice.workspaceId) {
      const access = await getRecordAccess(ctx, invoice, userId);
      if (!access) return null;
    } else if (invoice.userId !== userId) {
      return null;
    }
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

// ponytail: IDOR fix — `getWorkLinks` previously had NO auth check. Any
// authenticated user could pass any `invoiceId` and read the work-proof
// records (screenshots, time entries, file URLs) attached to anyone's
// invoice. This is the same workspace/owner gate used by `getInvoice`.
// At 1000-user scale this matters because Convex IDs aren't enumerable
// but ARE leaked via notification previews, search results, and any
// future admin/dashboard view — closing the door before someone walks in.
export const getWorkLinks = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const invoice = await ctx.db.get(invoiceId);
    if (!invoice) return [];

    // Same gate as getInvoice: workspace membership OR direct ownership
    if (invoice.workspaceId) {
      const access = await getRecordAccess(ctx, invoice, userId);
      if (!access) return [];
    } else if (invoice.userId !== userId) {
      return [];
    }

    return await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .take(1000);
  },
});

// ponytail: IDOR fix — `getPaymentReminders` checked `userId` exists but
// never verified that the passed `invoiceId` belongs to the caller. Any
// authenticated user could pass another user's invoiceId and read all
// reminder emails (subject + body containing client name, invoice number,
// dollar amount). Same workspace/owner gate as `getInvoice`.
export const getPaymentReminders = query({
  args: { invoiceId: v.optional(v.id("invoices")) },
  handler: async (ctx, { invoiceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (invoiceId) {
      // Verify caller has access to THIS invoice before returning its reminders
      const invoice = await ctx.db.get(invoiceId);
      if (!invoice) return [];

      if (invoice.workspaceId) {
        const access = await getRecordAccess(ctx, invoice, userId);
        if (!access) return [];
      } else if (invoice.userId !== userId) {
        return [];
      }

      return await ctx.db
        .query("paymentReminders")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
        .take(1000);
    }

    return await ctx.db
      .query("paymentReminders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);
  },
});

export const getInvoiceStats = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, paid: 0, pending: 0, overdue: 0, totalRevenue: 0, withProof: 0 };

    let invoices;
    if (workspaceId) {
      const membership = await getWorkspaceMembership(ctx, workspaceId, userId);
      if (!membership) return { total: 0, paid: 0, pending: 0, overdue: 0, totalRevenue: 0, withProof: 0 };
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(1000);
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(1000);
    }

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

// ponytail: ceiling — `generateInvoiceNumber` scans up to 1000 user invoices
// to find the max INV-NNN. At 1000 concurrent creates this is a hot read path
// but Convex handles it in <10ms. If this becomes a bottleneck, persist a
// `nextInvoiceNumber` counter on the workspace row and increment atomically.
// The current approach is O(n) per create but always correct (no race window
// between read-counter and write-counter).
function generateInvoiceNumber(existing: any[]): string {
  const nums = existing.map(inv => {
    const match = inv.invoiceNumber?.match(/INV-(\d+)/);
    return match ? parseInt(match[1]) : 0;
  });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `INV-${String(max + 1).padStart(3, "0")}`;
}

/**
 * Cryptographically secure token generator (see proposals/crud.ts).
 */
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const buf = new Uint32Array(32);
  crypto.getRandomValues(buf);
  let result = "";
  for (let i = 0; i < 32; i++) result += chars.charAt(buf[i] % chars.length);
  return result;
}

export const createInvoice = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
    clientId: v.id("clients"),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    lineItems: v.array(v.object({
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
      workLinkId: v.optional(v.string()),
      hasProof: v.optional(v.boolean()),
    })),
    subtotal: v.number(),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    total: v.number(),
    dueDate: v.number(),
    issueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    terms: v.optional(v.string()),
    currency: v.optional(v.string()),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "createInvoice");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If workspaceId provided, verify membership
    if (args.workspaceId) {
      await requireWorkspaceAccess(ctx, args.workspaceId, "member");
    }

    // Fetch client and derive clientName/clientEmail
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");
    // clientName is the canonical field; name is a CRM alias — try both
    const clientName = client.clientName || client.name;
    const clientEmail = client.email ?? client.contactEmail ?? undefined;

    const { workspaceId, teamId, customFields, ...invoiceArgs } = args;

    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const invoiceNumber = generateInvoiceNumber(existing);
    const proofCount = args.lineItems.filter(li => li.hasProof).length;

    return await ctx.db.insert("invoices", {
      userId,
      workspaceId: workspaceId ?? undefined,
      createdBy: userId,
      teamId: teamId ?? undefined,
      customFields: customFields ?? undefined,
      ...invoiceArgs,
      clientName,
      clientEmail,
      invoiceNumber,
      publicToken: generateToken(),
      status: "draft",
      issueDate: args.issueDate ?? Date.now(),
      proofCount,
      hasValidatedBilling: proofCount > 0,
      discountAmount: invoiceArgs.discountAmount ?? undefined,
      terms: invoiceArgs.terms ?? undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
    clientId: v.optional(v.id("clients")),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    lineItems: v.optional(v.array(v.object({
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
      workLinkId: v.optional(v.string()),
      hasProof: v.optional(v.boolean()),
    }))),
    subtotal: v.optional(v.number()),
    taxRate: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    total: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    terms: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, { invoiceId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invoice = await ctx.db.get(invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Check workspace membership or direct ownership
    if (invoice.workspaceId) {
      const access = await getRecordAccess(ctx, invoice, userId);
      if (!access || access === "read" || access === "comment") {
        throw new Error("Not authorized — need collaborate or higher access");
      }
    } else if (invoice.userId !== userId) {
      throw new Error("Not authorized");
    }

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
    if (!invoice) throw new Error("Invoice not found");

    // Check workspace membership or direct ownership
    if (invoice.workspaceId) {
      const access = await getRecordAccess(ctx, invoice, userId);
      if (!access || access === "read" || access === "comment") {
        throw new Error("Not authorized");
      }
    } else if (invoice.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(invoiceId, {
      status: "sent",
      sentAt: Date.now(),
      updatedAt: Date.now(),
    });

    // ponytail: ceiling — schedules 3 `paymentReminders` rows synchronously.
    // At 1000 concurrent sends this is 3000 inserts, still well within Convex's
    // transaction limits (each insert is ~1ms). If this becomes a bottleneck,
    // move reminder scheduling to a scheduled job (ctx.scheduler.runAt) that
    // fires AFTER the mutation commits, so the user sees "sent" instantly.
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
        workspaceId: invoice.workspaceId ?? undefined,
        createdBy: userId,
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
    if (!invoice) throw new Error("Invoice not found");

    // Check workspace membership or direct ownership
    if (invoice.workspaceId) {
      const access = await getRecordAccess(ctx, invoice, userId);
      if (!access || access === "read" || access === "comment") {
        throw new Error("Not authorized");
      }
    } else if (invoice.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(invoiceId, {
      status: "paid",
      paidDate: Date.now(),
      updatedAt: Date.now(),
    });

    // Cancel remaining reminders
    const reminders = await ctx.db
      .query("paymentReminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .take(1000);

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
    if (!invoice) throw new Error("Invoice not found");

    // Check workspace ownership or direct ownership
    if (invoice.workspaceId) {
      const access = await getRecordAccess(ctx, invoice, userId);
      if (access !== "owner") {
        throw new Error("Not authorized — only owners can delete invoices");
      }
    } else if (invoice.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Delete work links and reminders
    const workLinks = await ctx.db
      .query("invoiceWorkLinks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .take(1000);
    for (const wl of workLinks) await ctx.db.delete(wl._id);

    const reminders = await ctx.db
      .query("paymentReminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .take(1000);
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
    await rateLimitAuthenticated(ctx, "addWorkLink");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Check workspace membership or direct ownership
    if (invoice.workspaceId) {
      const access = await getRecordAccess(ctx, invoice, userId);
      if (!access || access === "read" || access === "comment") {
        throw new Error("Not authorized");
      }
    } else if (invoice.userId !== userId) {
      throw new Error("Not authorized");
    }

    const workLinkId = await ctx.db.insert("invoiceWorkLinks", {
      userId,
      workspaceId: invoice.workspaceId ?? undefined,
      createdBy: userId,
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
    if (!workLink) throw new Error("Work link not found");

    // Check workspace membership or direct ownership
    if (workLink.workspaceId) {
      const access = await getRecordAccess(ctx, workLink, userId);
      if (!access || access === "read" || access === "comment") {
        throw new Error("Not authorized");
      }
    } else if (workLink.userId !== userId) {
      throw new Error("Not authorized");
    }

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
// ponytail: `seedMockInvoices` removed. It inserted invoices with NO
// workspaceId and FAKE clientId strings (`"mock_client_1" as Id<"clients">`),
// making them invisible to the workspace-scoped `getInvoices` query and
// unjoinable to real client rows. At 1000-user scale this also bypassed the
// `createInvoice` validation (client existence check, workspace membership).
// The "Bulk Import" CSV flow remains as the legitimate batch-entry path.

// ─── INVOICE TEMPLATES ─────────────────────────────────────────────────────

// ponytail: IDOR fix — previously when `workspaceId` was provided we queried
// the `by_workspace` index WITHOUT verifying membership. Any authenticated
// user could pass another workspace's ID and read all its invoice templates
// (which may contain bank details, terms, custom line items). Now we gate
// with `getWorkspaceMembership` and only return system templates if the
// caller is not a member. System templates remain public (by design — they
// are the seed templates shipped to every account).
export const getInvoiceTemplates = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    const systemTemplates = await ctx.db
      .query("invoiceTemplates")
      .withIndex("by_system", (q) => q.eq("isSystem", true))
      .take(1000);

    let userTemplates: any[] = [];
    if (userId) {
      if (workspaceId) {
        // ponytail: verify caller is a member of this workspace before
        // returning its templates. Non-members only get system templates.
        const membership = await getWorkspaceMembership(ctx, workspaceId, userId);
        if (!membership) return systemTemplates;

        userTemplates = await ctx.db
          .query("invoiceTemplates")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .take(1000);
        // Also get user's own templates
        const personalTemplates = await ctx.db
          .query("invoiceTemplates")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(1000);
        const ids = new Set(userTemplates.map((t: any) => t._id));
        for (const t of personalTemplates) {
          if (!ids.has(t._id)) userTemplates.push(t);
        }
      } else {
        userTemplates = await ctx.db
          .query("invoiceTemplates")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(1000);
      }
    }

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
        v.literal("discount"),
        v.literal("terms"),
        v.literal("bank_details"),
        v.literal("divider"),
        v.literal("client_info"),
        v.literal("sender_info"),
        v.literal("invoice_meta"),
        v.literal("total"),
        v.literal("notes")
      ),
      content: v.string(),
      metadata: v.optional(v.any()),
    })),
    industry: v.optional(v.string()),
    description: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, { name, sections, industry, description, workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If workspaceId provided, verify membership
    if (workspaceId) {
      await requireWorkspaceAccess(ctx, workspaceId, "member");
    }

    return await ctx.db.insert("invoiceTemplates", {
      userId,
      workspaceId: workspaceId ?? undefined,
      createdBy: userId,
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
    await rateLimitAuthenticated(ctx, "seedInvoiceTemplates");
    const existing = await ctx.db
      .query("invoiceTemplates")
      .withIndex("by_system", (q) => q.eq("isSystem", true))
      .take(1000);

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
