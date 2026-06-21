import { v } from "convex/values";

/**
 * Sharing entry validator - used by all business data tables
 * that support team-level visibility and cross-team sharing.
 */
export const sharingEntry = v.object({
  teamId: v.optional(v.id("teams")),
  userId: v.optional(v.id("users")),
  access: v.union(
    v.literal("read"),
    v.literal("comment"),
    v.literal("collaborate"),
    v.literal("full"),
  ),
  grantedBy: v.id("users"),
  grantedAt: v.number(),
  note: v.optional(v.string()),
});

/**
 * Access hierarchy numeric values for comparison.
 */
export const ACCESS_HIERARCHY: Record<string, number> = {
  read: 1,
  comment: 2,
  collaborate: 3,
  full: 4,
};

export type AccessLevel = "owner" | "full" | "collaborate" | "comment" | "read" | null;
