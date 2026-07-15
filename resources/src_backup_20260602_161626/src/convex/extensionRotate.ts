import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper: generate cryptographically secure random token (64-character hex = 32 bytes)
function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Atomic token rotation: revoke old + generate new in single transaction
export const rotateToken = mutation({
  args: {
    ttlDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // SECURITY: Block guest/anonymous users
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.isAnonymous === true) {
      throw new Error("Guest users cannot generate extension tokens. Please create a full account.");
    }

    const now = Date.now();
    const ttlMs = (args.ttlDays ?? 30) * 24 * 60 * 60 * 1000;
    const expiresAt = now + ttlMs;

    // Step 1: Delete all existing tokens (atomic with new token creation)
    const existing = await ctx.db
      .query("extensionTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (process.env.NODE_ENV === "development") console.log(`[rotateToken] Revoking ${existing.length} existing token(s)`);
    
    for (const t of existing) {
      await ctx.db.delete(t._id);
    }

    // Step 2: Generate and insert new token
    const token = randomToken().trim();
    
    const insertedId = await ctx.db.insert("extensionTokens", {
      userId,
      token,
      createdAt: now,
      expiresAt,
      lastUsed: undefined,
    });

    if (process.env.NODE_ENV === "development") console.log("[rotateToken] New token generated", { tokenLength: token.length });

    return { token, expiresAt, success: true };
  },
});
