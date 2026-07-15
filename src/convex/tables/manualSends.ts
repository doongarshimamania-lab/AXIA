import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Manual send log — when a freelancer self-reports "I sent this externally".
 *
 * This is the audit trail for the manual-send workflow:
 *   1. User clicks "Mark as sent manually" on a proposal/invoice
 *   2. Picks a channel (email, whatsapp, slack, sms, in-person, other)
 *   3. Enters recipient + optional note
 *   4. We create a manualSendLog row AND flip the proposal/invoice status to "sent"
 *
 * A single proposal/invoice can have multiple manualSendLog rows (e.g. sent first via email,
 * then re-sent via WhatsApp 5 days later).
 */
export const manualSendTables = {
  manualSendLogs: defineTable({
    userId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    // What was sent
    entityType: v.union(
      v.literal("proposal"),
      v.literal("invoice"),
    ),
    entityId: v.string(), // proposalId or invoiceId (kept as string for flexibility)
    // How it was sent
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
    // Who it was sent to (free text — usually an email or phone number)
    recipient: v.string().maxLength(1000),
    // Optional: subject line (for email) or message context
    subject: v.optional(v.string().maxLength(1000)),
    // Optional: free-form notes ("I attached the PDF and CC'd their COO")
    notes: v.optional(v.string().maxLength(5000)),
    // When the user says they sent it (defaults to now, but can be backdated)
    sentAt: v.number(),
    loggedAt: v.number(),
    // Optional: link to a notification that prompted this send
    triggeredByNotificationId: v.optional(v.id("notifications")),
  })
    .index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user_and_entity", ["userId", "entityType"])
    .index("by_workspace", ["workspaceId"])
    .index("by_logged_at", ["loggedAt"]),
};
