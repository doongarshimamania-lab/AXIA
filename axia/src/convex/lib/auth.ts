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

// ─── Public API: createAccount (compatibility shim for seed scripts) ─────────
// Replaces @convex-dev/auth's createAccount. Used by seedTeamUsers.ts to
// provision test users with email+password. Creates a BA user + account
// record (password hashed by BA's scrypt config) and links the users-table
// record via ensureLinkedUser.
//
// ponytail: only used by dev seed scripts — not on the hot path. The shape
// mirrors the old createAccount so seedTeamUsers.ts works without changes.
export async function createAccount(
  ctx: MutationCtx,
  args: {
    provider: "password";
    account: { id: string; secret: string };
    profile: { email: string; name?: string; emailVerificationTime?: number };
    shouldLinkViaEmail?: boolean;
    shouldLinkViaPhone?: boolean;
  },
): Promise<{ user: { _id: Id<"users"> } }> {
  const { auth } = await getAuth(ctx);
  // ponytail: BA's signUpEmail creates user + account records in the BA
  // component tables (user, account, session). We then call ensureLinkedUser
  // to create/lookup the corresponding app users-table record.
  const signUpResult = await auth.api.signUpEmail({
    body: {
      email: args.profile.email,
      password: args.account.secret,
      name: args.profile.name ?? args.profile.email.split("@")[0],
    },
  });
  if (!signUpResult?.user?.id) {
    throw new Error(`createAccount: signUpEmail failed for ${args.profile.email}`);
  }
  const userId = await ensureLinkedUser(ctx, {
    id: signUpResult.user.id,
    email: signUpResult.user.email,
    name: signUpResult.user.name,
    image: signUpResult.user.image,
    emailVerified: Boolean(args.profile.emailVerificationTime),
  });
  return { user: { _id: userId } };
}
