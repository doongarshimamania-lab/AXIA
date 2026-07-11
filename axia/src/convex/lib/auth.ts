// convex/lib/auth.ts — Compatibility shim: Better Auth → existing getAuthUserId API.
//
// All 68 backend files that previously called:
//   import { getAuthUserId } from "@convex-dev/auth/server";
//   const userId = await getAuthUserId(ctx);
//
// now import from this file instead:
//   import { getAuthUserId } from "../lib/auth";  // (path varies)
//   const userId = await getAuthUserId(ctx);
//
// Signature is preserved: returns Id<"users"> | null.
// Behavior is preserved: returns null when not authenticated.
//
// Internal flow:
//   1. authComponent.getAuthUser(ctx) — validates the session JWT, returns
//      the Better Auth `user` record (id, email, name, image, etc.) or null.
//   2. Look up the linked users-table record by betterAuthUserId.
//   3. If no linked record exists yet (first sign-in via BA), create one
//      via ensureLinkedUser — copies name/email/image from BA.
//
// This is the only place that knows about the BA ↔ users-table linkage.
// All callers see the existing API surface unchanged.

import { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { authComponent, createAuth } from "../auth";

// ─── Linkage helper: ensure a users-table record exists for a BA user ──────
// Called on every authenticated request via getAuthUserId. Idempotent — if
// the linked record already exists, returns it without writing.
//
// ponytail: this is the smallest-working-diff way to keep the existing
// users table as the source of truth for app data (subscriptionTier,
// hourlyRate, vulnerabilityScore, etc.) while letting Better Auth own the
// auth-specific fields (password hash, OAuth tokens, sessions).
async function ensureLinkedUser(
  ctx: QueryCtx | MutationCtx,
  baUser: { id: string; email?: string | null; name?: string | null; image?: string | null; emailVerified?: boolean | null }
): Promise<Id<"users">> {
  // Fast path: lookup by betterAuthUserId index.
  const existing = await ctx.db
    .query("users")
    .withIndex("by_betterAuthUserId", (q) => q.eq("betterAuthUserId", baUser.id))
    .first();

  if (existing) return existing._id;

  // Fallback: lookup by email (covers users created before BA migration —
  // their users-table record exists but betterAuthUserId is unset).
  if (baUser.email) {
    const byEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", baUser.email!))
      .first();
    if (byEmail) {
      // Link the existing record to the new BA user ID.
      await ctx.db.patch(byEmail._id, { betterAuthUserId: baUser.id });
      return byEmail._id;
    }
  }

  // First-time user: create a new users-table record.
  // ponytail: only MutationCtx can patch. QueryCtx callers should never
  // reach this branch because the user must have signed in (mutation) to
  // have a BA session. If they do, we throw — caller should re-issue as
  // a mutation.
  if (!("db" in ctx) || typeof (ctx as any).db.patch !== "function") {
    throw new Error(
      "ensureLinkedUser: cannot create users record from QueryCtx — " +
      "first sign-in must happen via a mutation. BA user id: " + baUser.id
    );
  }

  const now = Date.now();
  const newId = await ctx.db.insert("users", {
    betterAuthUserId: baUser.id,
    email: baUser.email ?? undefined,
    name: baUser.name ?? undefined,
    image: baUser.image ?? undefined,
    emailVerificationTime: baUser.emailVerified ? now : undefined,
    role: "user",
    subscriptionTier: "free",
    joinedAt: now,
    onboardingComplete: false,
  });
  return newId;
}

// ─── Public API: getAuthUserId ──────────────────────────────────────────────
// Drop-in replacement for @convex-dev/auth/server's getAuthUserId.
// Returns the existing users-table Id (Id<"users">) or null.
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users"> | null> {
  const baUser = await authComponent.getAuthUser(ctx);
  if (!baUser) return null;

  // ponytail: self-check — BA user must have an ID.
  if (!baUser.id) {
    console.error("getAuthUserId: BA user has no id field", baUser);
    return null;
  }

  return await ensureLinkedUser(ctx, baUser);
}

// ─── Public API: getBetterAuthUser ──────────────────────────────────────────
// Returns the raw Better Auth user record (id, email, name, image, etc.)
// for callers that need BA fields directly (rare — most should use getAuthUserId).
export async function getBetterAuthUser(ctx: QueryCtx | MutationCtx) {
  return await authComponent.getAuthUser(ctx);
}

// ─── Public API: getAuth + headers (for BA API calls from mutations) ────────
// Used by accountSettings.ts to call auth.api.changePassword etc.
// Mirrors the pattern in https://labs.convex.dev/better-auth/api/component-client#getauth
export async function getAuth(ctx: MutationCtx) {
  return await authComponent.getAuth(createAuth, ctx);
}
