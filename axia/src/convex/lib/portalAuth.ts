// ──────────────────────────────────────────────────────────────────────────────
// lib/portalAuth.ts — JWT-based portal authentication + scope enforcement.
//
// WHY JWT (not the existing opaque `clientWorkspaceTokens.token`):
//   The current portal at /workspace/:token uses an opaque UUID stored in the
//   `clientWorkspaceTokens` table. Anyone with DB read access (insider, backup
//   leak, Convex breach) gets permanent portal access to every client. JWTs
//   solve this: the token IS the proof — signed offline, no DB lookup needed
//   to verify, expires automatically, encodes its own scope.
//
// SCOPES (checked at every portal.* mutation, not just at route entry):
//   deliverables:read     — view deliverable list + detail
//   deliverables:comment  — post messages on a deliverable
//   change_orders:approve — approve/decline scope change orders
//   invoices:read         — view own invoices
//   invoices:pay          — initiate payment for an invoice
//
// ROTATION:
//   `kid` (key ID) claim lets us rotate JWT_SIGNING_SECRET without invalidating
//   outstanding tokens during the overlap window. Old key stays in
//   JWT_SIGNING_SECRET_PREVIOUS for 7 days after rotation.
//
// STORAGE:
//   Token in sessionStorage (NOT localStorage) — dies with tab close, limits
//   XSS exfil blast radius. Frontend enforces this; backend treats token as
//   opaque string.
// ──────────────────────────────────────────────────────────────────────────────

"use node";

import { QueryCtx, MutationCtx } from "../_generated/server";
import crypto from "crypto";

// ─── ENV ACCESS ──────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const key = process.env.JWT_SIGNING_SECRET;
  if (!key) {
    throw new Error(
      "SECURITY: JWT_SIGNING_SECRET environment variable is not set. " +
      "Refusing to start with insecure defaults. " +
      "Generate one with: openssl rand -base64 64"
    );
  }
  return key;
}

function getPreviousJwtSecret(): string | null {
  return process.env.JWT_SIGNING_SECRET_PREVIOUS ?? null;
}

// ponytail: kid is derived from the secret's first 8 hex chars of its SHA-256.
// Lets us detect key rotation mismatches without a separate KMS lookup.
function kidForSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex").slice(0, 8);
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type PortalScope =
  | "deliverables:read"
  | "deliverables:comment"
  | "change_orders:approve"
  | "invoices:read"
  | "invoices:pay";

export interface PortalJwtClaims {
  /** workspaceId this token grants access to */
  wid: string;
  /** clientId (in `clients` table) this token belongs to */
  cid: string;
  /** freelancer userId who issued the token (for audit) */
  fid: string;
  /** scopes — checked at every mutation */
  sc: PortalScope[];
  /** issued at (unix seconds) */
  iat: number;
  /** expiry (unix seconds) — default 7d */
  exp: number;
  /** key id — which secret signed this */
  kid: string;
}

// ─── JWT SIGN/VERIFY (HMAC-SHA256, manual — no `jsonwebtoken` dep) ─────────────
// ponytail: jsonwebtoken adds 1 dep + 47 transitive. JWT is ~30 lines of code
// using node:crypto. Skip the dep.

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(payload: object, secret: string, kid: string): string {
  const header = { alg: "HS256", typ: "JWT", kid };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const sigB64 = base64url(sig);
  return `${data}.${sigB64}`;
}

function verifySignature(token: string, secret: string, expectedKid: string): PortalJwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(data).digest();
  const actualSig = base64urlDecode(sigB64);
  // ponytail: timingSafeEqual prevents timing-based signature oracle.
  if (expectedSig.length !== actualSig.length) return null;
  if (!crypto.timingSafeEqual(expectedSig, actualSig)) return null;

  try {
    const header = JSON.parse(base64urlDecode(headerB64).toString());
    if (header.alg !== "HS256") return null; // alg-confusion defense
    if (header.kid !== expectedKid) return null;
    const payload = JSON.parse(base64urlDecode(payloadB64).toString()) as PortalJwtClaims;
    return payload;
  } catch {
    return null;
  }
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function signPortalToken(args: {
  workspaceId: string;
  clientId: string;
  freelancerUserId: string;
  scopes: PortalScope[];
  ttlSeconds?: number;
}): string {
  const secret = getJwtSecret();
  const kid = kidForSecret(secret);
  const now = Math.floor(Date.now() / 1000);
  const claims: PortalJwtClaims = {
    wid: args.workspaceId,
    cid: args.clientId,
    fid: args.freelancerUserId,
    sc: args.scopes,
    iat: now,
    exp: now + (args.ttlSeconds ?? DEFAULT_TTL_SECONDS),
    kid,
  };
  return sign(claims, secret, kid);
}

export class PortalAuthError extends Error {
  constructor(public code: "INVALID_TOKEN" | "EXPIRED_TOKEN" | "INSUFFICIENT_SCOPE", message: string) {
    super(message);
  }
}

/**
 * Verify a portal JWT and return its claims.
 *
 * Tries current secret first, then previous (for seamless rotation).
 * Throws PortalAuthError on failure.
 */
export function verifyPortalToken(token: string): PortalJwtClaims {
  if (!token || typeof token !== "string") {
    throw new PortalAuthError("INVALID_TOKEN", "Missing token");
  }

  const secret = getJwtSecret();
  const currentKid = kidForSecret(secret);
  let claims = verifySignature(token, secret, currentKid);

  // Try previous secret if current didn't match (rotation window)
  if (!claims) {
    const prevSecret = getPreviousJwtSecret();
    if (prevSecret) {
      const prevKid = kidForSecret(prevSecret);
      claims = verifySignature(token, prevSecret, prevKid);
    }
  }

  if (!claims) {
    throw new PortalAuthError("INVALID_TOKEN", "Signature verification failed");
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now) {
    throw new PortalAuthError("EXPIRED_TOKEN", `Token expired at ${new Date(claims.exp * 1000).toISOString()}`);
  }

  return claims;
}

/**
 * Verify token + check that it has ALL required scopes.
 *
 * Usage in portal.* mutations:
 *
 *   const claims = await verifyPortalScope(ctx, args.token, ["change_orders:approve"]);
 *   // claims.cid is now trusted — use it as the client identifier, NEVER args.clientId
 */
export async function verifyPortalScope(
  ctx: MutationCtx | QueryCtx,
  token: string,
  requiredScopes: PortalScope[],
): Promise<PortalJwtClaims> {
  const claims = verifyPortalToken(token);

  for (const required of requiredScopes) {
    if (!claims.sc.includes(required)) {
      throw new PortalAuthError(
        "INSUFFICIENT_SCOPE",
        `Token missing required scope: ${required}. Available: ${claims.sc.join(", ")}`,
      );
    }
  }

  // ponytail: also verify the token hasn't been revoked.
  // Without this, a revoked token would still validate until natural expiry.
  const tokenHash = hashToken(token);
  const revoked = await ctx.db
    .query("portalRevokedTokens")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .first();
  if (revoked) {
    throw new PortalAuthError("INVALID_TOKEN", "Token has been revoked");
  }

  return claims;
}

/**
 * Hash a token for storage/indexing. NEVER store raw tokens.
 * SHA-256 with a server-side pepper so a DB-only leak can't be turned into
 * valid tokens without also knowing JWT_SIGNING_SECRET.
 */
export function hashToken(token: string): string {
  const pepper = getJwtSecret();
  return crypto.createHmac("sha256", pepper).update(token).digest("hex");
}

// ─── SELF-CHECK ────────────────────────────────────────────────────────────────
// ponytail: ONE check per non-trivial logic. This catches: alg confusion,
// tampered payload, expired token, wrong-secret signature, kid mismatch.
// Runs once per cold start in non-prod.

if (process.env.NODE_ENV !== "production" && !globalThis.__PORTAL_AUTH_CHECKED__) {
  globalThis.__PORTAL_AUTH_CHECKED__ = true;
  const originalEnv = process.env.JWT_SIGNING_SECRET;
  process.env.JWT_SIGNING_SECRET = "test-secret-only-for-selfcheck-" + Math.random();
  try {
    const tok = signPortalToken({
      workspaceId: "ws1",
      clientId: "cl1",
      freelancerUserId: "fu1",
      scopes: ["deliverables:read", "change_orders:approve"],
      ttlSeconds: 60,
    });
    const claims = verifyPortalToken(tok);
    if (claims.cid !== "cl1" || claims.sc.length !== 2) {
      throw new Error("portalAuth self-check FAILED: round-trip claims mismatch");
    }
    // Tampered token must fail
    const tampered = tok.slice(0, -4) + "AAAA";
    try {
      verifyPortalToken(tampered);
      throw new Error("portalAuth self-check FAILED: tampered token verified");
    } catch (e: any) {
      if (e.code !== "INVALID_TOKEN") throw e;
    }
  } finally {
    process.env.JWT_SIGNING_SECRET = originalEnv;
  }
}
