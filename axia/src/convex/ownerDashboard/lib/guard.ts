// convex/ownerDashboard/lib/guard.ts — Owner-only auth enforcement.
//
// This is the REAL enforcement layer for the owner dashboard. Every
// ownerDashboard query/action calls requireOwner(ctx) as its first line.
// The React route guard is just UX — this is the actual security gate.
//
// Auth flow:
//   1. Caller has a Better Auth session (validated by getAuthUserId)
//   2. We look up the users-table record
//   3. We check role === "owner"
//   4. If not owner, throw Forbidden (data never leaves the server)
//
// This replaces the old OWNER_PASSWORD env-var gate (insecure: shared
// password, no identity, no audit trail). Owner now logs in via Better Auth
// like every other user, but their users.role is set to "owner".

import { QueryCtx, MutationCtx, ActionCtx } from "../../_generated/server";
import { getAuthUserId } from "../../lib/auth";

export interface OwnerContext {
  userId: string;
  email?: string;
  name?: string;
}

/**
 * Require that the caller is authenticated AND has role === "owner".
 * Throws if not. Returns the owner's user ID + email on success.
 *
 * Use this as the FIRST line of every ownerDashboard query/action/mutation.
 */
export async function requireOwner(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<OwnerContext> {
  const userId = await getAuthUserId(ctx as any);
  if (!userId) {
    throw new Error("Unauthorized: Sign in required.");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("Unauthorized: User not found.");
  }

  if (user.role !== "owner") {
    throw new Error("Forbidden: Owner access required.");
  }

  return {
    userId,
    email: user.email ?? undefined,
    name: user.name ?? undefined,
  };
}

/**
 * Soft check — returns true if the caller is an owner, false otherwise.
 * Does NOT throw. Used for conditional UI (e.g., showing the owner dashboard
 * link in the sidebar only to owners).
 */
export async function isOwner(
  ctx: QueryCtx | MutationCtx
): Promise<boolean> {
  try {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    return user?.role === "owner";
  } catch {
    return false;
  }
}
