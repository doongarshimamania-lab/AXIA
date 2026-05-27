import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Helper: generate cryptographically secure random token (64-character hex = 32 bytes)
// BRAND REQUIREMENT: Strong token = TIMELock's independent security authority
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

    console.log("✅ [generateToken] Token generated and stored:", {
      tokenPrefix: cleanToken.substring(0, 8) + "...",
      tokenSuffix: "..." + cleanToken.substring(cleanToken.length - 8),
      tokenLength: cleanToken.length,
      tokenCharCodes: cleanToken.split('').slice(0, 10).map((c: string) => c.charCodeAt(0)).join(','),
      userId,
      expiresAt: new Date(expiresAt).toISOString(),
      insertedId,
      fullTokenForDebug: cleanToken // TEMPORARY: Remove after debugging
    });

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
    
    console.log("🔍 [validateTokenReadOnly] Validating token:", {
      tokenLength: cleanToken.length,
      tokenPrefix: cleanToken.substring(0, 8) + "...",
      tokenSuffix: "..." + cleanToken.substring(cleanToken.length - 8),
      tokenCharCodes: cleanToken.split('').slice(0, 10).map((c: string) => c.charCodeAt(0)).join(','),
      receivedTokenForDebug: cleanToken // TEMPORARY: Remove after debugging
    });
    
    const tokenDoc = await ctx.db
      .query("extensionTokens")
      .withIndex("by_token", (q) => q.eq("token", cleanToken))
      .first();

    if (!tokenDoc) {
      // Enhanced debugging: Let's check if ANY tokens exist
      const allTokens = await ctx.db.query("extensionTokens").collect();
      console.error("❌ [validateTokenReadOnly] Token not found in database:", {
        receivedTokenPrefix: cleanToken.substring(0, 8) + "...",
        receivedTokenSuffix: "..." + cleanToken.substring(cleanToken.length - 8),
        receivedTokenLength: cleanToken.length,
        receivedCharCodes: cleanToken.split('').slice(0, 10).map((c: string) => c.charCodeAt(0)).join(','),
        totalTokensInDB: allTokens.length,
        tokensInDB: allTokens.map(t => ({
          prefix: t.token.substring(0, 8) + "...",
          suffix: "..." + t.token.substring(t.token.length - 8),
          length: t.token.length,
          charCodes: t.token.split('').slice(0, 10).map((c: string) => c.charCodeAt(0)).join(','),
          expired: t.expiresAt <= Date.now(),
          exactMatch: t.token === cleanToken,
          // Character-by-character comparison for first 10 chars
          charComparison: Array.from({length: Math.min(10, t.token.length)}).map((_, i) => ({
            pos: i,
            stored: t.token[i],
            storedCode: t.token.charCodeAt(i),
            received: cleanToken[i] || 'missing',
            receivedCode: cleanToken[i]?.charCodeAt(0) || 'missing',
            match: t.token[i] === cleanToken[i]
          }))
        })),
        searchedAt: new Date().toISOString()
      });
      return null;
    }

    const now = Date.now();
    if (tokenDoc.expiresAt <= now) {
      console.error("Token expired:", {
        expiresAt: new Date(tokenDoc.expiresAt).toISOString(),
        now: new Date(now).toISOString(),
        diffMs: now - tokenDoc.expiresAt
      });
      return null;
    }

    console.log("Token validation successful:", {
      userId: tokenDoc.userId,
      lastUsed: tokenDoc.lastUsed ? new Date(tokenDoc.lastUsed).toISOString() : "never"
    });
    return { userId: tokenDoc.userId as Id<"users"> };
  },
});