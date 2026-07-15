import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
