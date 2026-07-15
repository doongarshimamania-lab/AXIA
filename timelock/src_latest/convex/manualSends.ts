// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ═════════════════════════════════════════════
// QUERIES
// ═════════════════════════════════════════════

/**
 * List all manual send logs for a given entity (proposal or invoice).
 */
export const listForEntity = query({
  args: {
    entityType: v.union(v.literal("proposal"), v.literal("invoice")),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const logs = await ctx.db
      .query("manualSendLogs")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .order("desc")
      .collect();

    // Only return logs owned by the current user (or in their workspace)
    return logs.filter(
      (l) => l.userId === userId // workspace access checks can be added here
    );
  },
});

/**
 * List recent manual send logs for the current user (for an activity feed).
 */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.min(args.limit ?? 25, 100);
    return await ctx.db
      .query("manualSendLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

// ═════════════════════════════════════════════
// MUTATIONS
// ═════════════════════════════════════════════

/**
 * Log a manual send for a PROPOSAL.
 *
 * This:
 *   1. Inserts a manualSendLog row (audit trail)
 *   2. Flips the proposal status to "sent" + sets sentAt
 *   3. Schedules the standard Day 3/7/14 follow-ups (same as the existing `send` flow)
 *   4. Optionally dismisses the triggering notification
 *
 * Why fold the status flip into this mutation (instead of calling proposals.sendProposal
 * separately)? Because if the user said "I sent it manually", we want one atomic action —
 * we don't want them to also have to click "Send" in the app for the status to update.
 */
export const logProposalManualSend = mutation({
  args: {
    proposalId: v.id("proposals"),
    channel: v.union(
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("sms"),
      v.literal("slack"),
      v.literal("telegram"),
      v.literal("in_person"),
      v.literal("phone"),
      v.literal("courier"),
      v.literal("other"),
    ),
    recipient: v.string(),
    subject: v.optional(v.string()),
    notes: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    triggeredByNotificationId: v.optional(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new ConvexError("Proposal not found");

    // Access check
    if (proposal.workspaceId) {
      // workspace access check would go here
    } else if (proposal.userId !== userId) {
      throw new ConvexError("Not authorized");
    }

    const now = Date.now();
    const sentAt = args.sentAt ?? now;

    // 1. Flip proposal to "sent" if it's still a draft
    if (proposal.status === "draft") {
      await ctx.db.patch(args.proposalId, {
        status: "sent",
        sentAt,
        updatedAt: now,
      });
    } else {
      // Already sent — just update updatedAt
      await ctx.db.patch(args.proposalId, { updatedAt: now });
    }

    // 2. Insert the manual send log
    const logId = await ctx.db.insert("manualSendLogs", {
      userId,
      workspaceId: proposal.workspaceId ?? undefined,
      entityType: "proposal",
      entityId: args.proposalId,
      channel: args.channel,
      recipient: args.recipient,
      subject: args.subject,
      notes: args.notes,
      sentAt,
      loggedAt: now,
      triggeredByNotificationId: args.triggeredByNotificationId,
    });

    // 3. Schedule the standard Day 3/7/14 follow-ups (if not already scheduled)
    if (proposal.status === "draft") {
      const followUpSchedule = [
        { day: 3, subject: `Following up: ${proposal.title}`, tone: "friendly" },
        { day: 7, subject: `Checking in: ${proposal.title}`, tone: "firm" },
        { day: 14, subject: `Final reminder: ${proposal.title}`, tone: "urgent" },
      ];
      for (const followUp of followUpSchedule) {
        await ctx.db.insert("proposalFollowUps", {
          userId,
          workspaceId: proposal.workspaceId ?? undefined,
          proposalId: args.proposalId,
          dayNumber: followUp.day,
          subject: followUp.subject,
          body: `Hi ${proposal.clientName || "there"},\n\nThis is a ${followUp.tone} reminder about the proposal "${proposal.title}" you sent on ${new Date(sentAt).toLocaleDateString()}.\n\nPlease reach out if you have any questions.\n\nBest regards`,
          channel: "email",
          status: "scheduled",
          scheduledAt: now + followUp.day * 24 * 60 * 60 * 1000,
          createdAt: now,
        });
      }
    }

    // 4. Dismiss the triggering notification (if any)
    if (args.triggeredByNotificationId) {
      const n = await ctx.db.get(args.triggeredByNotificationId);
      if (n && n.userId === userId) {
        await ctx.db.patch(args.triggeredByNotificationId, {
          read: true,
          readAt: now,
          dismissed: true,
          dismissedAt: now,
        });
      }
    }

    return { logId, proposalId: args.proposalId };
  },
});

/**
 * Log a manual send for an INVOICE.
 *
 * Same flow as logProposalManualSend but for invoices — flips status to "sent",
 * schedules Day 3/7/14 payment reminders, and dismisses the triggering notification.
 */
export const logInvoiceManualSend = mutation({
  args: {
    invoiceId: v.id("invoices"),
    channel: v.union(
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("sms"),
      v.literal("slack"),
      v.literal("telegram"),
      v.literal("in_person"),
      v.literal("phone"),
      v.literal("courier"),
      v.literal("other"),
    ),
    recipient: v.string(),
    subject: v.optional(v.string()),
    notes: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    triggeredByNotificationId: v.optional(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");

    // Access check
    if (invoice.workspaceId) {
      // workspace access check
    } else if (invoice.userId !== userId) {
      throw new ConvexError("Not authorized");
    }

    const now = Date.now();
    const sentAt = args.sentAt ?? now;

    // 1. Flip invoice to "sent"
    if (invoice.status === "draft") {
      await ctx.db.patch(args.invoiceId, {
        status: "sent",
        sentAt,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.invoiceId, { updatedAt: now });
    }

    // 2. Insert the manual send log
    const logId = await ctx.db.insert("manualSendLogs", {
      userId,
      workspaceId: invoice.workspaceId ?? undefined,
      entityType: "invoice",
      entityId: args.invoiceId,
      channel: args.channel,
      recipient: args.recipient,
      subject: args.subject,
      notes: args.notes,
      sentAt,
      loggedAt: now,
      triggeredByNotificationId: args.triggeredByNotificationId,
    });

    // 3. Schedule Day 3/7/14 payment reminders (if it was a draft before)
    if (invoice.status === "draft") {
      const reminderSchedule = [
        { day: 3, tone: "friendly" as const, subject: `Friendly reminder: Invoice ${invoice.invoiceNumber}` },
        { day: 7, tone: "firm" as const, subject: `Payment reminder: Invoice ${invoice.invoiceNumber}` },
        { day: 14, tone: "urgent" as const, subject: `URGENT: Invoice ${invoice.invoiceNumber} is overdue` },
      ];
      for (const r of reminderSchedule) {
        await ctx.db.insert("paymentReminders", {
          userId,
          workspaceId: invoice.workspaceId ?? undefined,
          invoiceId: args.invoiceId,
          dayNumber: r.day,
          sequenceDay: r.day,
          subject: r.subject,
          body: `Hi ${invoice.clientName || "there"},\n\nThis is a ${r.tone} reminder that invoice ${invoice.invoiceNumber} for ${invoice.total} ${invoice.currency || "USD"} ${r.tone === "urgent" ? "is now overdue." : "is due soon."}\n\nPlease remit payment at your earliest convenience.\n\nBest regards`,
          channel: "email",
          tone: r.tone,
          status: "scheduled",
          scheduledAt: now + r.day * 24 * 60 * 60 * 1000,
          createdAt: now,
        });
      }
    }

    // 4. Dismiss triggering notification
    if (args.triggeredByNotificationId) {
      const n = await ctx.db.get(args.triggeredByNotificationId);
      if (n && n.userId === userId) {
        await ctx.db.patch(args.triggeredByNotificationId, {
          read: true,
          readAt: now,
          dismissed: true,
          dismissedAt: now,
        });
      }
    }

    return { logId, invoiceId: args.invoiceId };
  },
});
