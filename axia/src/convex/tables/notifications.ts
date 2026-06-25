import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * In-app notification system.
 *
 * Notifications are lightweight, ephemeral signals shown in the sidebar bell.
 * They are NOT emails — they only fire when the user is logged in.
 *
 * Type taxonomy:
 *  - "send_reminder"     — Hey, you have a draft that hasn't been sent yet
 *  - "follow_up_due"     — A scheduled follow-up is due (manual send needed)
 *  - "payment_reminder"  — An invoice payment reminder is due
 *  - "proposal_viewed"   — Client opened the proposal
 *  - "proposal_signed"   — Client signed the proposal
 *  - "proposal_declined" — Client declined the proposal
 *  - "invoice_viewed"    — Client opened the invoice
 *  - "invoice_paid"      — Invoice marked paid
 *  - "invoice_overdue"   — Invoice is past due
 *  - "manual"            — Generic / custom
 */
export const notificationTables = {
  notifications: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    type: v.string().maxLength(50),
    title: v.string().maxLength(200),
    body: v.string().maxLength(20000),
    // Optional deep-link target
    link: v.optional(v.string().maxLength(2048)),
    // Optional related entity references
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
    entityId: v.optional(v.string().maxLength(1000)),
    // Severity drives icon + color
    severity: v.optional(
      v.union(
        v.literal("info"),
        v.literal("success"),
        v.literal("warning"),
        v.literal("danger"),
      )
    ),
    read: v.boolean(),
    readAt: v.optional(v.number()),
    // Soft-dismissal (separate from read — dismissed = removed from bell)
    dismissed: v.optional(v.boolean()),
    dismissedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "read"])
    .index("by_user_and_dismissed", ["userId", "dismissed"])
    .index("by_user_and_created", ["userId", "createdAt"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_workspace", ["workspaceId"]),
};
