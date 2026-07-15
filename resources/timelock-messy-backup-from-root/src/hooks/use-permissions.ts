"use client";

import { useMemo } from "react";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceContext } from "@/hooks/use-workspace";

/**
 * Access levels matching the backend sharedValidators.ts
 */
export type AccessLevel = "owner" | "full" | "collaborate" | "comment" | "read" | null;

const ACCESS_HIERARCHY: Record<string, number> = {
  read: 1,
  comment: 2,
  collaborate: 3,
  full: 4,
  owner: 5,
};

/**
 * A record that supports sharing-based access control.
 * This interface matches the common shape of business records
 * (deals, projects, invoices, proposals, etc.) that include
 * workspaceId, teamId, sharing entries, and a createdBy field.
 */
export interface RecordWithSharing {
  workspaceId?: string | null;
  teamId?: string | null;
  sharing?: Array<{
    teamId?: string;
    userId?: string;
    access: "read" | "comment" | "collaborate" | "full";
    grantedBy: string;
    grantedAt: number;
    note?: string;
  }> | null;
  createdBy?: string | null;
}

/**
 * Result of a permission check on a record.
 */
export interface PermissionResult {
  accessLevel: AccessLevel;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  isOwner: boolean;
}

/**
 * No-access sentinel returned when the user has no permissions on a record.
 */
const NO_ACCESS: PermissionResult = {
  accessLevel: null,
  canView: false,
  canEdit: false,
  canDelete: false,
  canShare: false,
  isOwner: false,
};

/**
 * usePermissions — determines the current user's access level for a
 * specific record, based on workspace membership, team ownership, and
 * sharing entries.
 *
 * The logic mirrors the backend `getRecordAccess` in `permissions.ts`
 * but runs client-side so we can show/hide UI elements without a server
 * round-trip.
 *
 * Resolution order:
 * 1. No workspace context → no access
 * 2. Workspace owner → "owner"
 * 3. Workspace manager → "full"
 * 4. Record in active workspace with sharing entries → max sharing level
 * 5. Record in active workspace but no sharing → "read" (members can view)
 * 6. Record not in active workspace → no access
 */
export function usePermissions(record: RecordWithSharing | null | undefined): PermissionResult {
  const {
    activeWorkspaceId,
    isOwner,
    isManager,
    isConvexConnected,
    role,
  } = useWorkspaceContext();

  // ── Fetch workspace members (to identify the current user's ID) ──
  const hasMembersApi = !!(api as any).workspaces?.members?.getMembers;
  const members = useQuery(
    hasMembersApi && isConvexConnected && activeWorkspaceId
      ? (api as any).workspaces.members.getMembers
      : "skip",
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as any } : "skip"
  ) as any[] | undefined;

  // ── Fetch teams for this workspace (to check team membership) ──
  const hasTeamsApi = !!(api as any).teams?.crud?.getTeams;
  const teams = useQuery(
    hasTeamsApi && isConvexConnected && activeWorkspaceId
      ? (api as any).teams.crud.getTeams
      : "skip",
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as any } : "skip"
  ) as any[] | undefined;

  // ── Compute access level ──
  const accessLevel: AccessLevel = useMemo(() => {
    if (!record || !activeWorkspaceId) return null;

    // Record must belong to the active workspace
    if (record.workspaceId && record.workspaceId !== activeWorkspaceId) return null;

    // Workspace owner has full access
    if (isOwner) return "owner";

    // Workspace manager has full access within workspace
    if (isManager) return "full";

    // Check sharing entries for members
    const sharing = record.sharing || [];

    if (sharing.length > 0) {
      let maxAccessValue = 0;

      // Build the set of team IDs the current user belongs to
      const userTeamIds = teams
        ? teams.map((t: any) => t._id as string)
        : [];

      for (const entry of sharing) {
        const entryLevel = ACCESS_HIERARCHY[entry.access] || 0;

        // Team-based sharing: check if the entry's teamId is one the user is in
        if (entry.teamId && userTeamIds.includes(entry.teamId)) {
          maxAccessValue = Math.max(maxAccessValue, entryLevel);
        }

        // Direct user-based sharing: check if the entry's userId matches
        // We try to identify the current user from the members list by looking
        // for the member whose role matches the workspace context role.
        // This is a best-effort client-side check.
        if (entry.userId && members) {
          const isCurrentUser = members.some(
            (m: any) => m.userId === entry.userId && (m.role === role || m.role === "member")
          );
          if (isCurrentUser) {
            maxAccessValue = Math.max(maxAccessValue, entryLevel);
          }
        }
      }

      if (maxAccessValue > 0) {
        // Find the matching access level from the hierarchy
        const level = Object.entries(ACCESS_HIERARCHY).find(
          ([, v]) => v === maxAccessValue
        )?.[0] as AccessLevel;
        if (level) return level;
      }
    }

    // If no sharing entries but record is in the active workspace,
    // members get read access (they are at least workspace members)
    if (record.workspaceId === activeWorkspaceId) {
      return "read";
    }

    // No access
    return null;
  }, [record, activeWorkspaceId, isOwner, isManager, role, teams, members]);

  // ── Compute boolean permission flags ──
  return useMemo(() => {
    if (!accessLevel) return NO_ACCESS;

    const rank = ACCESS_HIERARCHY[accessLevel] ?? 0;

    return {
      accessLevel,
      canView: rank >= ACCESS_HIERARCHY.read,
      canEdit: rank >= ACCESS_HIERARCHY.collaborate,
      canDelete: rank >= ACCESS_HIERARCHY.full,
      canShare: rank >= ACCESS_HIERARCHY.full,
      isOwner: accessLevel === "owner",
    };
  }, [accessLevel]);
}

/**
 * Simplified permission check that doesn't need Convex queries.
 * Uses workspace context role directly. Good for quick page-level gates.
 */
export function useWorkspacePermissions() {
  const { isOwner, isManager, canManageTeam, role } = useWorkspaceContext();

  return {
    isOwner,
    isManager,
    canManageTeam,
    canCreateRecords: true, // any workspace member can create
    canDeleteRecords: isOwner || isManager,
    canShareRecords: isOwner || isManager,
    canEditRecords: true, // any workspace member can edit their own
    role,
  };
}
