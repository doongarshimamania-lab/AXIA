// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { mutation, query, internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ═════════════════════════════════════════════
// QUERIES
// ═════════════════════════════════════════════

/**
 * List notifications for the current user, newest first.
 * Optionally filter by read state.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    includeRead: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.min(args.limit ?? 50, 100);
    const includeRead = args.includeRead ?? true;

    let q = ctx.db
      .query("notifications")
      .withIndex("by_user_and_created", (q) => q.eq("userId", userId));

    // We can't filter on read in the index easily — do it post-fetch.
    // For typical notification volumes (<500/user) this is fine.
    const all = await q.order("desc").take(limit * 2);

    const filtered = includeRead ? all : all.filter((n) => !n.read && !n.dismissed);
    return filtered.slice(0, limit);
  },
});

/**
 * Get unread + undismissed count for the bell badge.
 */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) => q.eq("userId", userId).eq("read", false))
      .filter((q) => q.eq(q.field("dismissed"), false))
      .collect();

    return all.length;
  },
});

/**
 * Get a single notification by ID (must belong to the caller).
 */
export const get = query({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const n = await ctx.db.get(args.notificationId);
    if (!n || n.userId !== userId) {
      throw new ConvexError("Notification not found");
    }
    return n;
  },
});

// ═════════════════════════════════════════════
// MUTATIONS — USER FACING
// ═════════════════════════════════════════════

/**
 * Mark a single notification as read.
 */
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const n = await ctx.db.get(args.notificationId);
    if (!n || n.userId !== userId) {
      throw new ConvexError("Notification not found");
    }

    if (n.read) return n;
    const now = Date.now();
    await ctx.db.patch(args.notificationId, { read: true, readAt: now });
    return { success: true };
  },
});

/**
 * Mark all notifications as read for the current user.
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const now = Date.now();
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) => q.eq("userId", userId).eq("read", false))
      .collect();

    let count = 0;
    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true, readAt: now });
      count++;
    }
    return { markedRead: count };
  },
});

/**
 * Dismiss a notification (removes it from the bell dropdown but keeps the row).
 */
export const dismiss = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const n = await ctx.db.get(args.notificationId);
    if (!n || n.userId !== userId) {
      throw new ConvexError("Notification not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.notificationId, {
      dismissed: true,
      dismissedAt: now,
      read: true,
      readAt: n.readAt ?? now,
    });
    return { success: true };
  },
});

/**
 * Delete a notification permanently.
 */
export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const n = await ctx.db.get(args.notificationId);
    if (!n || n.userId !== userId) {
      throw new ConvexError("Notification not found");
    }

    await ctx.db.delete(args.notificationId);
    return { success: true };
  },
});

/**
 * Create a notification for the current user (e.g. a self-reminder).
 * Useful for testing & manual triggers.
 */
export const create = mutation({
  args: {
    type: v.string(),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    entityType: v.optional(
      v.union(
        v.literal("proposal"),
        v.literal("invoice"),
        v.literal("client"),
        v.literal("project"),
        v.literal("follow_up"),
        v.literal("reminder"),
        v.literal("other"),
      )
    ),
    entityId: v.optional(v.string()),
    severity: v.optional(
      v.union(
        v.literal("info"),
        v.literal("success"),
        v.literal("warning"),
        v.literal("danger"),
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const now = Date.now();
    const id = await ctx.db.insert("notifications", {
      userId,
      type: args.type,
      title: args.title,
      body: args.body,
      link: args.link,
      entityType: args.entityType,
      entityId: args.entityId,
      severity: args.severity ?? "info",
      read: false,
      dismissed: false,
      createdAt: now,
    });
    return id;
  },
});

// ═════════════════════════════════════════════
// INTERNAL — called from cron jobs and other mutations
// ═════════════════════════════════════════════

/**
 * Internal helper — insert a notification without auth (for cron jobs).
 * Pass userId explicitly.
 */
export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    severity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("notifications", {
      userId: args.userId,
      workspaceId: args.workspaceId,
      type: args.type,
      title: args.title,
      body: args.body,
      link: args.link,
      entityType: args.entityType as any,
      entityId: args.entityId,
      severity: (args.severity as any) ?? "info",
      read: false,
      dismissed: false,
      createdAt: now,
    });
    return id;
  },
});

/**
 * Cron-driven: scan for drafts older than 7 days and remind the user.
 * Runs once per day.
 */
export const remindAboutStaleDrafts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoff = now - SEVEN_DAYS_MS;

    // ── Stale proposal drafts ──
    const staleProposals = await ctx.db
      .query("proposals")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .collect();

    let proposalReminders = 0;
    for (const p of staleProposals) {
      // Avoid duplicate notifications — check if we already notified about THIS draft in the last 7 days
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "proposal").eq("entityId", p._id)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("userId"), p.userId),
            q.eq(q.field("type"), "send_reminder"),
            q.gt(q.field("createdAt"), cutoff)
          )
        )
        .first();

      if (existing) continue;

      await ctx.db.insert("notifications", {
        userId: p.userId,
        workspaceId: p.workspaceId,
        type: "send_reminder",
        title: `Draft proposal "${p.title}" hasn't been sent yet`,
        body: `This proposal has been a draft for 7+ days. Download it as PDF and send it to your client, or mark it as sent manually.`,
        link: `/proposals`,
        entityType: "proposal",
        entityId: p._id,
        severity: "warning",
        read: false,
        dismissed: false,
        createdAt: now,
      });
      proposalReminders++;
    }

    // ── Stale invoice drafts ──
    const staleInvoices = await ctx.db
      .query("invoices")
      .withIndex("by_user_and_status") // we'll filter post-fetch
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "draft"),
          q.lt(q.field("createdAt"), cutoff)
        )
      )
      .collect();

    let invoiceReminders = 0;
    for (const inv of staleInvoices) {
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "invoice").eq("entityId", inv._id)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("userId"), inv.userId),
            q.eq(q.field("type"), "send_reminder"),
            q.gt(q.field("createdAt"), cutoff)
          )
        )
        .first();

      if (existing) continue;

      await ctx.db.insert("notifications", {
        userId: inv.userId,
        workspaceId: inv.workspaceId,
        type: "send_reminder",
        title: `Draft invoice ${inv.invoiceNumber} hasn't been sent yet`,
        body: `This invoice has been a draft for 7+ days. Send it to your client to start the payment clock.`,
        link: `/invoices`,
        entityType: "invoice",
        entityId: inv._id,
        severity: "warning",
        read: false,
        dismissed: false,
        createdAt: now,
      });
      invoiceReminders++;
    }

    return { proposalReminders, invoiceReminders };
  },
});
