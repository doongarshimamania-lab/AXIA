import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Helper: generate cryptographically secure random token (64-character hex = 32 bytes)
// BRAND REQUIREMENT: Strong token = Axia's independent security authority
function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Get the user's active token (not expired) or null
export const getActiveToken = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    // SECURITY: Block guest/anonymous users from accessing tokens
    const user = await ctx.db.get(userId);
    if (!user || user.isAnonymous === true) return null;

    const now = Date.now();
    const tokens = await ctx.db
      .query("extensionTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const active = tokens.find((t) => t.expiresAt > now);
    return active ? { token: active.token, expiresAt: active.expiresAt, lastUsed: active.lastUsed } : null;
  },
});

// Generate a new pairing token
// BRAND REQUIREMENT: 30-day expiration = scarcity trigger (must reconnect monthly)
export const generateToken = mutation({
  args: {
    ttlDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // SECURITY: Block guest/anonymous users from generating tokens
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.isAnonymous === true) {
      throw new Error("Guest users cannot generate extension tokens. Please create a full account.");
    }

    const now = Date.now();
    // SPEC: Exactly 30 days (2,592,000,000 ms) for brand consistency
    const ttlMs = (args.ttlDays ?? 30) * 24 * 60 * 60 * 1000;
    const expiresAt = now + ttlMs;

    // Delete all existing tokens (clean slate for authority positioning)
    const existing = await ctx.db
      .query("extensionTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const t of existing) {
      await ctx.db.delete(t._id);
    }

    const token = randomToken();
    
    // CRITICAL FIX: Ensure token is stored as a clean string with no whitespace
    const cleanToken = token.trim();
    
    const insertedId = await ctx.db.insert("extensionTokens", {
      userId,
      token: cleanToken,
      createdAt: now,
      expiresAt,
      lastUsed: undefined,
    });

    if (process.env.NODE_ENV === "development") console.log("[generateToken] Token generated", { tokenLength: cleanToken.length });

    return { token: cleanToken, expiresAt };
  },
});

// Revoke current token (immediate invalidation)
export const revokeToken = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.token && typeof args.token === "string") {
      // Revoke specific token
      const tokenDoc = await ctx.db
        .query("extensionTokens")
        .withIndex("by_token", (q) => q.eq("token", args.token as string))
        .first();
      
      if (tokenDoc && tokenDoc.userId === userId) {
        await ctx.db.delete(tokenDoc._id);
      }
    } else {
      // Revoke all user tokens
      const tokens = await ctx.db
        .query("extensionTokens")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const t of tokens) {
        await ctx.db.delete(t._id);
      }
    }
    
    return { success: true };
  },
});

// Validate token and update lastUsed (MUTATION because it writes)
// BRAND REQUIREMENT: Track usage for authority metrics (show user their protection is active)
export const validateToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // CRITICAL FIX: Ensure we're querying with a clean token string
    const cleanToken = args.token.trim();
    
    const tokenDoc = await ctx.db
      .query("extensionTokens")
      .withIndex("by_token", (q) => q.eq("token", cleanToken))
      .first();

    if (!tokenDoc || tokenDoc.expiresAt <= Date.now()) {
      return null;
    }

    // Update lastUsed timestamp (shows active protection)
    await ctx.db.patch(tokenDoc._id, { lastUsed: Date.now() });

    return { userId: tokenDoc.userId as Id<"users"> };
  },
});

// Internal query for HTTP endpoints (read-only validation)
export const validateTokenReadOnly = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // CRITICAL FIX: Ensure we're querying with a clean token string
    const cleanToken = args.token.trim();
    
    if (process.env.NODE_ENV === "development") console.log("[validateTokenReadOnly] Validating token", { tokenLength: cleanToken.length });
    
    const tokenDoc = await ctx.db
      .query("extensionTokens")
      .withIndex("by_token", (q) => q.eq("token", cleanToken))
      .first();

    if (!tokenDoc) {
      if (process.env.NODE_ENV === "development") console.error("[validateTokenReadOnly] Token not found or expired", { receivedTokenLength: cleanToken.length });
      return null;
    }

    const now = Date.now();
    if (tokenDoc.expiresAt <= now) {
      if (process.env.NODE_ENV === "development") console.error("Token expired");
      return null;
    }

    if (process.env.NODE_ENV === "development") console.log("Token validation successful");
    return { userId: tokenDoc.userId as Id<"users"> };
  },
});