// ──────────────────────────────────────────────────────────────────────────────
// portal/tokens.ts — Freelancer-facing mutations for issuing/revoking portal
// tokens. These are AUTHENTICATED (freelancer must be logged in), NOT token-based.
//
// Lifecycle:
//   1. Freelancer clicks "Generate portal link" on a client record
//   2. issueToken mutation creates a signed JWT (7d TTL) with full scope
//   3. Frontend stores the URL /workspace/:token and shows it to freelancer
//   4. Freelancer emails/Shares the link to client
//   5. Client opens link → portal queries verify token + scope
//   6. When freelancer wants to cut off access: revokeToken mutation
//      → adds tokenHash to portalRevokedTokens → next portal query fails
//
// SECURITY:
//   - Only the freelancer who OWNS the client can issue/revoke tokens
//   - Tokens are signed offline (no DB lookup needed to verify)
//   - Tokens encode their own scope + expiry
//   - Revocation is checked on every portal.* call (verifyPortalScope)
// ──────────────────────────────────────────────────────────────────────────────

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../users";
import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
import { signPortalToken, hashToken, PortalScope } from "../lib/portalAuth";

const DEFAULT_SCOPES: PortalScope[] = [
  "deliverables:read",
  "deliverables:comment",
  "change_orders:approve",
  "invoices:read",
  "invoices:pay",
];

const ALL_VALID_SCOPES: PortalScope[] = [
  "deliverables:read",
  "deliverables:comment",
  "change_orders:approve",
  "invoices:read",
  "invoices:pay",
];

/**
 * Issue a portal token for a client.
 * Returns the signed JWT string — frontend constructs /workspace/:token URL.
 */
export const issueToken = mutation({
  args: {
    clientId: v.id("clients"),
    scopes: v.optional(v.array(v.string())),
    ttlSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "portal_issueToken", RATE_LIMITS.SEND_INVITATION);
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Fetch client + verify ownership
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");
    if (client.userId !== user._id && client.userId !== user.tokenIdentifier) {
      throw new Error("Not authorized: you do not own this client");
    }

    // ponytail: validate scopes against the known set — never trust client input blindly
    const requestedScopes = (args.scopes ?? DEFAULT_SCOPES) as PortalScope[];
    const validScopes = requestedScopes.filter((s) =>
      ALL_VALID_SCOPES.includes(s as PortalScope)
    ) as PortalScope[];
    if (validScopes.length === 0) {
      throw new Error("No valid scopes requested");
    }

    // Issue the JWT (signed offline via lib/portalAuth.ts)
    // ponytail: signPortalToken is now async (Web Crypto API)
    const token = await signPortalToken({
      workspaceId: (client.workspaceId as any) ?? user._id,
      clientId: client._id,
      freelancerUserId: user._id,
      scopes: validScopes,
      ttlSeconds: args.ttlSeconds ?? 7 * 24 * 60 * 60,
    });

    // Revoke older active tokens for this client (single active token per client)
    const existing = await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .take(50);

    await Promise.all(
      existing
        .filter((t) => !t.revoked)
        .map((t) => ctx.db.patch(t._id, { revoked: true })),
    );

    // Insert new token record (HASH only — raw token only lives in the JWT)
    // ponytail: hashToken is now async (Web Crypto API)
    await ctx.db.insert("clientWorkspaceTokens", {
      token: await hashToken(token),
      clientId: client._id,
      clientName: client.clientName,
      contactEmail: client.contactEmail,
      workspaceId: client.workspaceId,
      freelancerUserId: user._id,
      createdAt: Date.now(),
      lastAccessedAt: undefined,
      accessCount: 0,
      revoked: false,
    });

    return { token, expiresAt: Date.now() + (args.ttlSeconds ?? 7 * 24 * 60 * 60) * 1000 };
  },
});

/**
 * Revoke all portal tokens for a client.
 * Adds each tokenHash to portalRevokedTokens so verifyPortalScope() rejects it
 * on the very next call (no waiting for natural JWT expiry).
 */
export const revokeTokensForClient = mutation({
  args: {
    clientId: v.id("clients"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "portal_revokeToken", RATE_LIMITS.UPDATE_RECORD);
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");
    if (client.userId !== user._id && client.userId !== user.tokenIdentifier) {
      throw new Error("Not authorized: you do not own this client");
    }

    const tokens = await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .take(100);

    const now = Date.now();
    const maxTtlMs = 30 * 24 * 60 * 60 * 1000; // 30d max — beyond this, JWT would be expired anyway
    let revokedCount = 0;

    for (const t of tokens) {
      if (t.revoked) continue;
      await ctx.db.patch(t._id, { revoked: true });

      await ctx.db.insert("portalRevokedTokens", {
        tokenHash: t.token, // already a hash
        clientId: client._id,
        revokedBy: user._id,
        reason: args.reason ?? "manual_revoke",
        revokedAt: now,
        expiresAt: now + maxTtlMs,
      });
      revokedCount++;
    }

    return { revokedCount };
  },
});

/**
 * List tokens for a client (metadata only — no raw tokens).
 */
export const listTokensForClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");
    if (client.userId !== user._id && client.userId !== user.tokenIdentifier) {
      throw new Error("Not authorized");
    }

    return await ctx.db
      .query("clientWorkspaceTokens")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .take(50);
  },
});
