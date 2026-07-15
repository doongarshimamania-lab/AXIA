import { QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ACCESS_HIERARCHY, AccessLevel } from "./sharedValidators";

/**
 * Get the user's role in a workspace.
 * Returns { role, workspaceId } or null if not a member.
 */
export async function getWorkspaceMembership(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">
) {
  // Check if owner
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) return null;
  if (workspace.ownerId === userId) {
    return { role: "owner" as const, workspaceId };
  }
  // Check membership
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_and_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .first();
  if (membership && membership.status === "active") {
    return { role: membership.role, workspaceId };
  }
  return null;
}

/**
 * Get all team IDs a user belongs to in a workspace.
 */
export async function getUserTeamIds(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">
) {
  const memberships = await ctx.db
    .query("teamMemberships")
    .withIndex("by_workspace_and_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .take(1000);
  return memberships.map((m) => m.teamId);
}

/**
 * Check if user is in a cross-team (like Management) that sees all data.
 */
export async function isCrossTeamMember(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">
) {
  const memberships = await ctx.db
    .query("teamMemberships")
    .withIndex("by_workspace_and_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .take(1000);

  for (const m of memberships) {
    const team = await ctx.db.get(m.teamId);
    if (team?.isCrossTeam) return true;
  }
  return false;
}

/**
 * Get the access level a user has on a specific record.
 * Uses the sharing array + team ownership + cross-team visibility.
 */
export async function getRecordAccess(
  ctx: QueryCtx,
  record: {
    workspaceId?: Id<"workspaces"> | null;
    teamId?: Id<"teams"> | null;
    sharing?: any[] | null;
    createdBy?: Id<"users"> | null;
  },
  userId: Id<"users">
): Promise<AccessLevel> {
  if (!record.workspaceId) return null;

  // 1. Check workspace membership
  const membership = await getWorkspaceMembership(
    ctx,
    record.workspaceId,
    userId
  );
  if (!membership) return null;

  // 2. Owner of workspace = owner access
  if (membership.role === "owner") return "owner";

  // 3. Check if in owning team
  if (record.teamId) {
    const userTeamIds = await getUserTeamIds(ctx, record.workspaceId, userId);
    if (userTeamIds.includes(record.teamId)) return "owner";

    // 4. Check cross-team
    if (await isCrossTeamMember(ctx, record.workspaceId, userId))
      return "owner";

    // 5. Check sharing entries
    const sharing = record.sharing || [];
    let maxAccess = 0;
    for (const entry of sharing) {
      if (entry.teamId && userTeamIds.includes(entry.teamId)) {
        maxAccess = Math.max(
          maxAccess,
          ACCESS_HIERARCHY[entry.access] || 0
        );
      }
      if (entry.userId === userId) {
        maxAccess = Math.max(
          maxAccess,
          ACCESS_HIERARCHY[entry.access] || 0
        );
      }
    }
    if (maxAccess > 0) {
      return (
        (Object.entries(ACCESS_HIERARCHY).find(
          ([, v]) => v === maxAccess
        )?.[0] as AccessLevel) ?? null
      );
    }

    return null; // Not in any team or sharing
  }

  // No teamId = company-wide, any workspace member can see
  if (membership.role === "manager") return "owner";
  return "collaborate";
}

/**
 * Require workspace access at a minimum role level.
 * Throws if user doesn't have access.
 */
export async function requireWorkspaceAccess(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  minimumRole: "owner" | "manager" | "member" = "member"
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const membership = await getWorkspaceMembership(ctx, workspaceId, userId);
  if (!membership) throw new Error("Not a member of this workspace");

  const roleHierarchy: Record<string, number> = {
    owner: 3,
    manager: 2,
    member: 1,
  };
  if (roleHierarchy[membership.role] < roleHierarchy[minimumRole]) {
    throw new Error(`Requires ${minimumRole} role or higher`);
  }

  return { userId, membership };
}

/**
 * Require a minimum access level on a specific record.
 * Throws if the user doesn't have sufficient access.
 *
 * Access hierarchy: read < comment < collaborate < full < owner
 *
 * - "read"/"comment" → cannot modify
 * - "collaborate" → can update fields but not delete or change sharing
 * - "full"/"owner" → can do everything
 */
export async function requireRecordAccess(
  ctx: QueryCtx,
  record: {
    workspaceId?: Id<"workspaces"> | null;
    teamId?: Id<"teams"> | null;
    sharing?: any[] | null;
    createdBy?: Id<"users"> | null;
  },
  minimumAccess: "read" | "comment" | "collaborate" | "full" | "owner"
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const access = await getRecordAccess(ctx, record, userId);
  if (!access) throw new Error("No access to this record");

  const hierarchy: Record<string, number> = {
    read: 1,
    comment: 2,
    collaborate: 3,
    full: 4,
    owner: 5,
  };
  if (hierarchy[access] < hierarchy[minimumAccess]) {
    throw new Error(`Requires ${minimumAccess} access, you have ${access}`);
  }
  return { userId, access };
}
