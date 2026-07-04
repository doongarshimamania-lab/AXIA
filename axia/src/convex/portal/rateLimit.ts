// ──────────────────────────────────────────────────────────────────────────────
// portal/rateLimit.ts — Rate limiter that uses the JWT's clientId as the key.
//
// Why a separate helper instead of reusing security/rateLimit.ts?
//   security/rateLimit.rateLimitAuthenticated() reads from ctx.auth.getUserId(),
//   which is null for portal calls (clients have no user account). We need to
//   rate-limit by the *token's* clientId instead.
//
// Implementation is a thin wrapper around the same rateLimits table + bucket
// math, so portal and authenticated rate limits share the same GC path.
// ──────────────────────────────────────────────────────────────────────────────

import { MutationCtx } from "../_generated/server";
import { rateLimit } from "../security/rateLimit";

export const RATE_LIMITS_PORTAL = {
  // Same defaults as authenticated mutations
  POST_MESSAGE: { max: 60, windowMs: 60_000 },     // 60/min per client
  SEND_MESSAGE: { max: 60, windowMs: 60_000 },
  APPROVE_CO: { max: 20, windowMs: 60_000 },        // 20/min — unusual to approve faster
  INITIATE_PAYMENT: { max: 10, windowMs: 60_000 },  // 10/min — bounds payment-spam
  DEFAULT: { max: 60, windowMs: 60_000 },
} as const;

/**
 * Rate-limit a portal call by the clientId encoded in the JWT.
 *
 * Usage:
 *   const claims = await verifyPortalScope(ctx, args.token, SCOPES);
 *   await rateLimitByToken(ctx, "portal_postMessage", claims.cid, RATE_LIMITS_PORTAL.POST_MESSAGE);
 */
export async function rateLimitByToken(
  ctx: MutationCtx,
  action: string,
  clientId: string,
  config: { max: number; windowMs: number } = RATE_LIMITS_PORTAL.DEFAULT,
): Promise<void> {
  // ponytail: prefix with "portal:" so portal buckets don't collide with
  // authenticated buckets that might use the same action name
  await rateLimit(ctx, `portal:${action}`, `cid:${clientId}`, config);
}
