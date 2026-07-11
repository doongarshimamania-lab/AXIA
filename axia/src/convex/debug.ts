import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./lib/auth";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

/**
 * Admin-only guard. Both `listAuthAccountsForEmail` and
 * `cleanOrphanedAuthAccounts` previously allowed ANY authenticated user to
 * enumerate auth accounts for any email, or DELETE auth accounts for any
 * user by email. Both are now admin-only (v5.4.0 security audit).
 */
async function requireAdmin(ctx: any): Promise<void> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
}

/**
 * List all authAccounts for a given email. ADMIN ONLY.
 * Usage: npx convex run debug:listAuthAccountsForEmail '{ "email": "dev@axia.app" }'
 *
 * ponytail: BA migration — authAccounts table no longer in app schema (lives
 * inside @convex-dev/better-auth component). This query is now a stub that
 * returns user info without account details. To restore full functionality,
 * use the BA admin API.
 */
export const listAuthAccountsForEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { found: false, userExists: false, authAccounts: [] };
    }

    return {
      found: true,
      userExists: true,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      isAnonymous: user.isAnonymous,
      accountCount: 0,
      authAccounts: [],
      note: "authAccounts table migrated to Better Auth component — use BA admin API to view accounts.",
    };
  },
});

/**
 * Clean up orphaned auth accounts for a given email. ADMIN ONLY.
 * Usage: npx convex run debug:cleanOrphanedAuthAccounts '{ "email": "dev@axia.app" }'
 *
 * ponytail: BA migration — authAccounts table no longer in app schema.
 * This mutation is now a no-op stub.
 */
export const cleanOrphanedAuthAccounts = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return {
      found: true,
      deleted: 0,
      accountCount: 0,
      note: "authAccounts table migrated to Better Auth component — use BA admin API to manage accounts.",
    };
  },
});

// Debug query to check user's tokens (self-only — returns caller's tokens)
export const checkMyTokens = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { error: "Not authenticated" };

    const tokens = await ctx.db
      .query("extensionTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    const now = Date.now();
    return {
      userId,
      totalTokens: tokens.length,
      tokens: tokens.map(t => ({
        tokenPrefix: t.token.substring(0, 8) + "...",
        tokenLength: t.token.length,
        createdAt: new Date(t.createdAt).toISOString(),
        expiresAt: new Date(t.expiresAt).toISOString(),
        isExpired: t.expiresAt <= now,
        lastUsed: t.lastUsed ? new Date(t.lastUsed).toISOString() : "Never",
      }))
    };
  },
});
