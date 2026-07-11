// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getWorkspaceMembership, getUserTeamIds, isCrossTeamMember } from "./permissions";
import { getAuthUserId } from "./lib/auth";

/**
 * Get the list of team IDs and visibility scope for a user in a workspace.
 * Returns: { teamIds, isCrossTeam, role, userId } or null if not a member
 */
export async function getUserVisibility(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const membership = await getWorkspaceMembership(ctx, workspaceId, userId);
  if (!membership) return null;

  const teamIds = await getUserTeamIds(ctx, workspaceId, userId);
  const crossTeam = await isCrossTeamMember(ctx, workspaceId, userId);

  return { userId, teamIds, isCrossTeam: crossTeam, role: membership.role };
}

/**
 * Filter records based on user visibility.
 * Cross-team members see everything.
 * Regular members see: own team's data + company-wide data (no teamId) + shared data.
 */
export function isRecordVisible(
  record: { teamId?: string | null; sharing?: any[] | null; createdBy?: string | null },
  visibility: { teamIds: string[]; isCrossTeam: boolean; userId: string }
): boolean {
  // Cross-team sees everything
  if (visibility.isCrossTeam) return true;
  // No teamId = company-wide, visible to all workspace members
  if (!record.teamId) return true;
  // Same team
  if (visibility.teamIds.includes(record.teamId)) return true;
  // Check sharing entries
  const sharing = record.sharing || [];
  for (const entry of sharing) {
    if (entry.teamId && visibility.teamIds.includes(entry.teamId)) return true;
    if (entry.userId === visibility.userId) return true;
  }
  return false;
}

/**
 * Filter an array of records by user visibility within a workspace.
 * Fetches visibility info once, then filters.
 */
export async function filterByVisibility<
  T extends { teamId?: string | null; sharing?: any[] | null; createdBy?: string | null }
>(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  records: T[]
): Promise<T[]> {
  const visibility = await getUserVisibility(ctx, workspaceId);
  if (!visibility) return [];
  return records.filter((r) => isRecordVisible(r, visibility));
}
