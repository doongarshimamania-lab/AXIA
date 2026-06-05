import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Auth helper — returns the authenticated userId or throws.
 * Uses the same pattern as the rest of the Axia codebase.
 */
export const auth = async (ctx: any) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
};
