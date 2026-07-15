import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { rateLimit, RATE_LIMITS } from "./security/rateLimit";

// ──────────────────────────────────────────────────────────────────────────────
// v5.5.0: Token storage is now IRREVERSIBLE.
//   - Plaintext token is shown ONCE at creation time, then discarded.
//   - DB stores only `tokenHash` (SHA-256 hex) + `tokenSuffix` (last 4 chars
//     for UI display).
//   - Lookup is by hash, never by plaintext.
//   - `getActiveToken` returns only metadata (no plaintext).
// ──────────────────────────────────────────────────────────────────────────────

// Helper: generate cryptographically secure random token (64-character hex = 32 bytes)
function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: SHA-256 hash a token to a hex string (irreversible)
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Get the user's active token metadata (NOT the plaintext) or null
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
      .take(1000);

    const active = tokens.find((t) => t.expiresAt > now);
    // v5.5.0: Return only metadata — never the plaintext token.
    return active
      ? { tokenSuffix: active.tokenSuffix, expiresAt: active.expiresAt, lastUsed: active.lastUsed, createdAt: active.createdAt }
      : null;
  },
});

// Generate a new pairing token.
// Returns the plaintext token ONCE — caller must store it; it cannot be retrieved again.
export const generateToken = mutation({
  args: {
    ttlDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // v5.5.0: Rate limit (5 token-regenerations per hour per user).
    await rateLimit(ctx, "generateExtensionToken", userId, { max: 5, windowMs: 3_600_000 });

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
      .take(1000);

    for (const t of existing) {
      await ctx.db.delete(t._id);
    }

    // Generate plaintext, hash it, store the hash
    const plaintext = randomToken().trim();
    const tokenHash = await hashToken(plaintext);
    const tokenSuffix = plaintext.slice(-4);

    await ctx.db.insert("extensionTokens", {
      userId,
      tokenHash,
      tokenSuffix,
      createdAt: now,
      expiresAt,
      lastUsed: undefined,
    });

    console.log("[generateToken] Token generated:", {
      tokenSuffix: `...${tokenSuffix}`,
      tokenLength: plaintext.length,
      userId,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    // Plaintext is returned ONCE. Caller must persist it locally.
    return { token: plaintext, expiresAt };
  },
});

// Revoke current token (immediate invalidation)
export const revokeToken = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "revokeToken");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.token && typeof args.token === "string") {
      // Revoke specific token (by hash, never by plaintext)
      const cleanToken = args.token.trim();
      const tokenHash = await hashToken(cleanToken);
      const tokenDoc = await ctx.db
        .query("extensionTokens")
        .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
        .first();

      if (tokenDoc && tokenDoc.userId === userId) {
        await ctx.db.delete(tokenDoc._id);
      }
    } else {
      // Revoke all user tokens
      const tokens = await ctx.db
        .query("extensionTokens")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(1000);

      for (const t of tokens) {
        await ctx.db.delete(t._id);
      }
    }

    return { success: true };
  },
});

// Validate token and update lastUsed (MUTATION because it writes)
export const validateToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // v5.5.0: Rate limit (60 validations per minute — covers extension polling).
    // Identifier = first 8 chars of hash (anonymized, can't reverse to user).
    const cleanToken = args.token.trim();
    const tokenHash = await hashToken(cleanToken);
    await rateLimit(ctx, "validateExtensionToken", tokenHash.slice(0, 16), RATE_LIMITS.DEFAULT);

    const tokenDoc = await ctx.db
      .query("extensionTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!tokenDoc || tokenDoc.expiresAt <= Date.now()) {
      return null;
    }

    // Update lastUsed timestamp (shows active protection)
    await ctx.db.patch(tokenDoc._id, { lastUsed: Date.now() });

    return { userId: tokenDoc.userId as Id<"users"> };
  },
});

/**
 * v5.5.0 — Per-token rate limit for /api/ai/predict HTTP endpoint.
 * Called from http.ts httpAction (which can't write directly).
 *
 * Limits: 10 AI predictions per hour per token (bounds OpenAI spend to
 * ~$0.0006 per token per hour at gpt-4o-mini rates).
 *
 * Identifier = first 16 chars of the token (NOT the hash — the httpAction
 * doesn't have time to hash before rate-limiting; this is acceptable since
 * the rate limit table is internal-only and never displayed).
 */
export const rateLimitAiPredict = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await rateLimit(ctx, "aiPredict", args.token.slice(0, 16), {
      max: 10,
      windowMs: 3_600_000,  // 1 hour
    });
  },
});

// Internal query for HTTP endpoints (read-only validation)
export const validateTokenReadOnly = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanToken = args.token.trim();
    const tokenHash = await hashToken(cleanToken);

    const tokenDoc = await ctx.db
      .query("extensionTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!tokenDoc) {
      console.error("[validateTokenReadOnly] Token not found or expired:", {
        receivedTokenHashPrefix: tokenHash.substring(0, 8) + "...",
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

    return { userId: tokenDoc.userId as Id<"users"> };
  },
});
