import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "../lib/auth";
import { getRecordAccess } from "../permissions";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
type ShareableRecord = {
  _id: any;
  workspaceId?: any;
  teamId?: any;
  sharing?: any[] | null;
  createdBy?: any;
  [key: string]: any;
};

/**
 * Share a record with a team or individual user.
 * Works for any table that has a `sharing` array field.
 */
export const shareRecord = mutation({
  args: {
    tableName: v.string(),
    recordId: v.string(),
    teamId: v.optional(v.id("teams")),
    userId: v.optional(v.id("users")),
    access: v.union(
      v.literal("read"),
      v.literal("comment"),
      v.literal("collaborate"),
      v.literal("full")
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "shareRecord");
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    // Get the record using generic ID
    const record = (await ctx.db.get(args.recordId as any)) as ShareableRecord | null;
    if (!record) throw new Error("Record not found");

    // Check caller has owner-level access
    const access = await getRecordAccess(ctx, record, callerId);
    if (!access || (access !== "owner" && access !== "full")) {
      throw new Error("Only record owners can share");
    }

    // Validate: if sharing at collaborate level, caller must have collaborate or higher
    if (
      args.access === "collaborate" &&
      access !== "owner" &&
      access !== "full" &&
      access !== "collaborate"
    ) {
      throw new Error(
        "Cannot share at a higher level than your own access"
      );
    }

    // Add sharing entry
    const newEntry = {
      teamId: args.teamId,
      userId: args.userId,
      access: args.access,
      grantedBy: callerId,
      grantedAt: Date.now(),
      note: args.note,
    };

    const existingSharing = record.sharing || [];

    // Check for duplicate
    const isDuplicate = existingSharing.some(
      (entry: any) =>
        entry.teamId === args.teamId && entry.userId === args.userId
    );
    if (isDuplicate)
      throw new Error("Already shared with this team/user");

    await ctx.db.patch(args.recordId as any, {
      sharing: [...existingSharing, newEntry],
    });

    return { success: true };
  },
});

/**
 * Remove sharing for a team or user from a record.
 */
export const unshareRecord = mutation({
  args: {
    tableName: v.string(),
    recordId: v.string(),
    teamId: v.optional(v.id("teams")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "unshareRecord");
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const record = (await ctx.db.get(args.recordId as any)) as ShareableRecord | null;
    if (!record) throw new Error("Record not found");

    const access = await getRecordAccess(ctx, record, callerId);
    if (!access || (access !== "owner" && access !== "full")) {
      throw new Error("Only record owners can unshare");
    }

    const existingSharing = record.sharing || [];
    const filtered = existingSharing.filter(
      (entry: any) =>
        !(entry.teamId === args.teamId && entry.userId === args.userId)
    );

    await ctx.db.patch(args.recordId as any, { sharing: filtered });
    return { success: true };
  },
});
