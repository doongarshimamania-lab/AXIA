import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// ─── QUERIES ──────────────────────────────────────────────────────────────

/**
 * Get all overdue invoices with their reminder status.
 * Returns invoices with status "overdue" along with any associated reminders.
 */
export const getOverdueInvoices = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const overdueInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "overdue")
      )
      .order("desc")
      .take(1000);

    // Enrich each invoice with its reminders
    const enriched = await Promise.all(
      overdueInvoices.map(async (inv) => {
        const reminders = await ctx.db
          .query("paymentReminders")
          .withIndex("by_invoice", (q) => q.eq("invoiceId", inv._id))
          .take(1000);

        const daysPastDue = Math.max(
          0,
          Math.floor((Date.now() - inv.dueDate) / (1000 * 60 * 60 * 24))
        );

        return {
          ...inv,
          daysPastDue,
          reminders: reminders.sort((a, b) => a.dayNumber - b.dayNumber),
          lastReminderSent: reminders
            .filter((r) => r.status === "sent")
            .sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))[0] ?? null,
          nextScheduledReminder: reminders
            .filter((r) => r.status === "scheduled")
            .sort((a, b) => a.scheduledAt - b.scheduledAt)[0] ?? null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get all sent reminders for a specific invoice.
 */
export const getReminderHistory = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, { invoiceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.userId !== userId) return [];

    const reminders = await ctx.db
      .query("paymentReminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .take(1000);

    return reminders.sort((a, b) => a.dayNumber - b.dayNumber);
  },
});

/**
 * Get all reminders for the current user across all invoices.
 */
export const getAllReminders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const reminders = await ctx.db
      .query("paymentReminders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    return reminders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get the user's reminder settings. Creates defaults if none exist.
 */
export const getReminderSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const settings = await ctx.db
      .query("reminderSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      // Return default settings without creating a record
      return {
        autoRemindersEnabled: true,
        day3Enabled: true,
        day7Enabled: true,
        day14Enabled: true,
        day21Enabled: false,
        defaultChannel: "email" as const,
      };
    }

    return settings;
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

/**
 * Send a manual reminder for an overdue invoice.
 * Creates a new reminder record marked as "sent".
 */
export const sendReminder = mutation({
  args: {
    invoiceId: v.id("invoices"),
    tone: v.optional(
      v.union(v.literal("friendly"), v.literal("firm"), v.literal("urgent"))
    ),
  },
  handler: async (ctx, { invoiceId, tone }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.userId !== userId)
      throw new Error("Not authorized");

    const daysPastDue = Math.max(
      0,
      Math.floor((Date.now() - invoice.dueDate) / (1000 * 60 * 60 * 24))
    );

    // Determine tone based on days overdue
    const reminderTone =
      tone ??
      (daysPastDue >= 21
        ? "urgent"
        : daysPastDue >= 14
          ? "urgent"
          : daysPastDue >= 7
            ? "firm"
            : "friendly");

    // Determine day number
    const dayNumber =
      daysPastDue >= 21 ? 21 : daysPastDue >= 14 ? 14 : daysPastDue >= 7 ? 7 : 3;

    const subject = getSubjectForTone(reminderTone, invoice.invoiceNumber);
    const body = getBodyForTone(
      reminderTone,
      invoice.clientName ?? "there",
      invoice.invoiceNumber,
      invoice.total,
      invoice.currency ?? "USD"
    );

    const now = Date.now();

    const reminderId = await ctx.db.insert("paymentReminders", {
      userId,
      invoiceId,
      dayNumber,
      channel: "email",
      tone: reminderTone,
      subject,
      body,
      status: "sent",
      scheduledAt: now,
      sentAt: now,
      createdAt: now,
    });

    return reminderId;
  },
});

/**
 * Auto-create reminders for all overdue invoices that don't have them yet.
 */
export const scheduleAutoReminders = mutation({
  args: {},
  handler: async (ctx) => {
    await rateLimitAuthenticated(ctx, "scheduleAutoReminders");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if auto-reminders are enabled
    const settings = await ctx.db
      .query("reminderSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (settings && !settings.autoRemindersEnabled) {
      return { scheduled: 0, reason: "Auto-reminders disabled" };
    }

    const overdueInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "overdue")
      )
      .take(1000);

    let scheduled = 0;
    const now = Date.now();

    for (const invoice of overdueInvoices) {
      const daysPastDue = Math.max(
        0,
        Math.floor((now - invoice.dueDate) / (1000 * 60 * 60 * 24))
      );

      const existingReminders = await ctx.db
        .query("paymentReminders")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id))
        .take(1000);

      const sentOrScheduledDays = new Set(
        existingReminders
          .filter((r) => r.status === "sent" || r.status === "scheduled")
          .map((r) => r.dayNumber)
      );

      const sentAt = invoice.sentAt ?? invoice.createdAt;

      // Define the reminder schedule
      const schedule: {
        day: number;
        tone: "friendly" | "firm" | "urgent";
        enabled: boolean;
      }[] = [
        { day: 3, tone: "friendly", enabled: settings?.day3Enabled ?? true },
        { day: 7, tone: "firm", enabled: settings?.day7Enabled ?? true },
        { day: 14, tone: "urgent", enabled: settings?.day14Enabled ?? true },
        { day: 21, tone: "urgent", enabled: settings?.day21Enabled ?? false },
      ];

      for (const config of schedule) {
        if (!config.enabled) continue;
        if (sentOrScheduledDays.has(config.day)) continue;
        if (daysPastDue < config.day) continue;

        const scheduledAt = sentAt + config.day * 24 * 60 * 60 * 1000;

        const subject = getSubjectForTone(config.tone, invoice.invoiceNumber);
        const body = getBodyForTone(
          config.tone,
          invoice.clientName ?? "there",
          invoice.invoiceNumber,
          invoice.total,
          invoice.currency ?? "USD"
        );

        await ctx.db.insert("paymentReminders", {
          userId,
          invoiceId: invoice._id,
          dayNumber: config.day,
          channel: "email",
          tone: config.tone,
          subject,
          body,
          status: "sent",
          scheduledAt,
          sentAt: now,
          createdAt: now,
        });

        scheduled++;
      }
    }

    return { scheduled };
  },
});

/**
 * Update the user's reminder settings. Creates if not exists.
 */
export const updateReminderSettings = mutation({
  args: {
    autoRemindersEnabled: v.optional(v.boolean()),
    day3Enabled: v.optional(v.boolean()),
    day7Enabled: v.optional(v.boolean()),
    day14Enabled: v.optional(v.boolean()),
    day21Enabled: v.optional(v.boolean()),
    defaultChannel: v.optional(
      v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp"))
    ),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "updateReminderSettings");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("reminderSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (args.autoRemindersEnabled !== undefined)
        updates.autoRemindersEnabled = args.autoRemindersEnabled;
      if (args.day3Enabled !== undefined) updates.day3Enabled = args.day3Enabled;
      if (args.day7Enabled !== undefined) updates.day7Enabled = args.day7Enabled;
      if (args.day14Enabled !== undefined) updates.day14Enabled = args.day14Enabled;
      if (args.day21Enabled !== undefined) updates.day21Enabled = args.day21Enabled;
      if (args.defaultChannel !== undefined)
        updates.defaultChannel = args.defaultChannel;

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    // Create new settings
    return await ctx.db.insert("reminderSettings", {
      userId,
      autoRemindersEnabled: args.autoRemindersEnabled ?? true,
      day3Enabled: args.day3Enabled ?? true,
      day7Enabled: args.day7Enabled ?? true,
      day14Enabled: args.day14Enabled ?? true,
      day21Enabled: args.day21Enabled ?? false,
      defaultChannel: args.defaultChannel ?? "email",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Skip a scheduled reminder.
 */
export const skipReminder = mutation({
  args: { reminderId: v.id("paymentReminders") },
  handler: async (ctx, { reminderId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reminder = await ctx.db.get(reminderId);
    if (!reminder || reminder.userId !== userId)
      throw new Error("Not authorized");

    if (reminder.status !== "scheduled")
      throw new Error("Only scheduled reminders can be skipped");

    await ctx.db.patch(reminderId, { status: "skipped" });
    return { success: true };
  },
});

// ─── HELPERS ──────────────────────────────────────────────────────────────

function getSubjectForTone(
  tone: "friendly" | "firm" | "urgent",
  invoiceNumber: string
): string {
  switch (tone) {
    case "friendly":
      return `Just a friendly reminder — Invoice ${invoiceNumber}`;
    case "firm":
      return `Payment reminder — Invoice ${invoiceNumber} is now past due`;
    case "urgent":
      return `URGENT: Final notice — Invoice ${invoiceNumber} is significantly overdue`;
  }
}

function getBodyForTone(
  tone: "friendly" | "firm" | "urgent",
  clientName: string,
  invoiceNumber: string,
  total: number,
  currency: string
): string {
  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(total);

  switch (tone) {
    case "friendly":
      return `Hi ${clientName},\n\nJust a friendly reminder that invoice ${invoiceNumber} for ${formattedTotal} is past due. If you've already processed the payment, please disregard this message.\n\nThank you!\nBest regards`;
    case "firm":
      return `Hi ${clientName},\n\nYour invoice ${invoiceNumber} for ${formattedTotal} is now past due. We kindly request that you process this payment at your earliest convenience.\n\nIf you have any questions, please don't hesitate to reach out.\n\nKind regards`;
    case "urgent":
      return `Hi ${clientName},\n\nThis is a final notice. Invoice ${invoiceNumber} for ${formattedTotal} is significantly overdue. We must insist on immediate payment to avoid any further action.\n\nIf payment has already been sent, please provide confirmation.\n\nSincerely`;
  }
}
