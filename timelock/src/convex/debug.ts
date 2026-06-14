import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all authAccounts for a given email.
 * Useful for debugging "InvalidSecret" errors.
 * Usage: npx convex run debug:listAuthAccountsForEmail '{ "email": "dev@axia.app" }'
 */
export const listAuthAccountsForEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // SECURITY: Require authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { found: false, userExists: false, authAccounts: [] };
    }

    // Find all auth accounts for this user (using userIdAndProvider index)
    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .collect();

    return {
      found: true,
      userExists: true,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      isAnonymous: user.isAnonymous,
      accountCount: authAccounts.length,
      authAccounts: authAccounts.map(a => ({
        _id: a._id,
        provider: a.provider,
        providerAccountId: a.providerAccountId,
        hasSecret: !!a.secret,
      })),
    };
  },
});

/**
 * Clean up orphaned auth accounts for a given email.
 * This removes authAccounts that have no matching secret (orphaned).
 * Usage: npx convex run debug:cleanOrphanedAuthAccounts '{ "email": "dev@axia.app" }'
 */
export const cleanOrphanedAuthAccounts = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // SECURITY: Require authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { found: false, deleted: 0 };
    }

    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .collect();

    let deleted = 0;
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
      deleted++;
    }

    return { found: true, deleted, accountCount: authAccounts.length };
  },
});

import { v } from "convex/values";

// Debug query to check user's tokens
export const checkMyTokens = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { error: "Not authenticated" };

    const tokens = await ctx.db
      .query("extensionTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
