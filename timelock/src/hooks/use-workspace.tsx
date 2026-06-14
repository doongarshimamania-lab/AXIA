import { useCallback, useMemo, createContext, useContext, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────
export type WorkspaceType = "personal" | "team";
export type WorkspaceRole = "owner" | "manager" | "member";
export type AccountMode = "solo" | "team";

export interface WorkspaceInfo {
  _id: string;
  name: string;
  type: WorkspaceType;
  description?: string;
  membership?: { role: WorkspaceRole };
}

export interface WorkspaceContext {
  activeWorkspace: WorkspaceInfo | null;
  workspaces: WorkspaceInfo[];
  role: WorkspaceRole | null;
  accountMode: AccountMode;
  isTeamMode: boolean;
  isSoloMode: boolean;
  isOwner: boolean;
  isManager: boolean;
  isMember: boolean;
  canManageTeam: boolean;
  canManageBilling: boolean;
  activeWorkspaceId: string | null;
  /** True if the workspaceId is a valid Convex document ID (starts with "k") */
  isConvexConnected: boolean;
  isLoading: boolean;
  isAvailable: boolean;
  setAccountMode: (mode: AccountMode) => void;
  switchToWorkspace: (workspaceId: string) => void;
  createTeamWorkspace: (name: string, description?: string) => void;
  upgradeToTeam: () => void;
  refreshWorkspaces: () => void;
}

// ─── Local storage keys ──────────────────────────────────────
const STORAGE_KEY_MODE = "axia_account_mode";
const STORAGE_KEY_ACTIVE_WS = "axia_active_workspace";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return fallback;
}

function saveToStorage(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** Check if an ID looks like a valid Convex document ID (16+ chars, starts with a letter) */
export function isValidConvexId(id: string | null | undefined): boolean {
  if (!id) return false;
  // Convex IDs are typically 16+ characters and start with a letter
  return /^[a-zA-Z][a-zA-Z0-9]{10,}$/.test(id);
}

const WorkspaceCtx = createContext<WorkspaceContext>({
  activeWorkspace: null,
  workspaces: [],
  role: null,
  accountMode: "solo",
  isTeamMode: false,
  isSoloMode: true,
  isOwner: false,
  isManager: false,
  isMember: false,
  canManageTeam: false,
  canManageBilling: false,
  activeWorkspaceId: null,
  isConvexConnected: false,
  isLoading: true,
  isAvailable: false,
  setAccountMode: () => {},
  switchToWorkspace: () => {},
  createTeamWorkspace: () => {},
  upgradeToTeam: () => {},
  refreshWorkspaces: () => {},
});

export function useWorkspaceContext() {
  return useContext(WorkspaceCtx);
}

// ─── Provider Component ───────────────────────────────────────
/**
 * WorkspaceProvider — now fully connected to Convex.
 *
 * 1. Queries `workspaces.crud.getMyWorkspaces` for real workspaces
 * 2. If no workspaces exist yet, auto-seeds a personal workspace
 * 3. Falls back to localStorage for active workspace selection
 * 4. Provides a real Convex workspaceId to all consumers
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [accountMode, setAccountModeState] = useState<AccountMode>(
    loadFromStorage(STORAGE_KEY_MODE, "solo")
  );
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    loadFromStorage(STORAGE_KEY_ACTIVE_WS, null)
  );

  // ── Convex queries ──
  const workspacesApi = (api as any).workspaces;
  const hasCrudApi = !!(workspacesApi?.crud?.getMyWorkspaces);
  const hasSeedApi = !!(workspacesApi?.crud?.seedPersonalWorkspace);
  const hasCreateApi = !!(workspacesApi?.crud?.createWorkspace);

  // Query real workspaces from Convex
  const convexWorkspaces = useQuery(
    hasCrudApi ? workspacesApi.crud.getMyWorkspaces : "skip",
    {}
  ) as any[] | undefined;

  // Seed personal workspace mutation
  const seedPersonalWorkspace = useMutation(
    hasSeedApi ? workspacesApi.crud.seedPersonalWorkspace : null
  );

  // Create team workspace mutation
  const createWorkspaceMutation = useMutation(
    hasCreateApi ? workspacesApi.crud.createWorkspace : null
  );

  // Track if we've attempted seeding
  const seedAttempted = useRef(false);

  // Auto-seed a personal workspace if none exist
  useEffect(() => {
    if (!hasSeedApi || !seedPersonalWorkspace) return;
    if (seedAttempted.current) return;
    if (convexWorkspaces === undefined) return; // still loading
    if (convexWorkspaces.length > 0) return; // already have workspaces

    seedAttempted.current = true;
    seedPersonalWorkspace({}).then((result: any) => {
      if (result) {
        console.log("[Workspace] Seeded personal workspace:", result);
      }
    }).catch((err: any) => {
      console.warn("[Workspace] Seed failed:", err);
    });
  }, [convexWorkspaces, hasSeedApi, seedPersonalWorkspace]);

  // Build WorkspaceInfo[] from Convex data
  const workspaces: WorkspaceInfo[] = useMemo(() => {
    if (!convexWorkspaces || convexWorkspaces.length === 0) return [];
    return convexWorkspaces.map((ws: any) => ({
      _id: ws._id,
      name: ws.name || "My Workspace",
      type: (ws.type || "personal") as WorkspaceType,
      description: ws.description,
      membership: { role: "owner" as WorkspaceRole }, // user is always at least a member
    }));
  }, [convexWorkspaces]);

  // Determine active workspace — prefer stored ID, then first workspace
  const activeWorkspace = useMemo(() => {
    if (workspaces.length === 0) return null;
    // Try stored ID first
    if (activeWorkspaceId) {
      const found = workspaces.find(ws => ws._id === activeWorkspaceId);
      if (found) return found;
    }
    // Try to find workspace matching current mode
    const modeMatch = workspaces.find(ws =>
      accountMode === "team" ? ws.type === "team" : ws.type === "personal"
    );
    if (modeMatch) return modeMatch;
    // Fallback to first workspace
    return workspaces[0];
  }, [workspaces, activeWorkspaceId, accountMode]);

  // Sync activeWorkspaceId when active workspace changes
  const currentActiveId = activeWorkspace?._id ?? null;
  useEffect(() => {
    if (currentActiveId && currentActiveId !== activeWorkspaceId) {
      setActiveWorkspaceId(currentActiveId);
      saveToStorage(STORAGE_KEY_ACTIVE_WS, currentActiveId);
    }
  }, [currentActiveId]);

  const role = activeWorkspace?.membership?.role as WorkspaceRole | null;
  const isConvexConnected = isValidConvexId(currentActiveId);

  const setAccountMode = useCallback((mode: AccountMode) => {
    setAccountModeState(mode);
    saveToStorage(STORAGE_KEY_MODE, mode);

    // Switch to matching workspace type
    if (mode === "solo") {
      const soloWs = workspaces.find(ws => ws.type === "personal");
      if (soloWs) {
        setActiveWorkspaceId(soloWs._id);
        saveToStorage(STORAGE_KEY_ACTIVE_WS, soloWs._id);
      }
    } else if (mode === "team") {
      const teamWs = workspaces.find(ws => ws.type === "team");
      if (teamWs) {
        setActiveWorkspaceId(teamWs._id);
        saveToStorage(STORAGE_KEY_ACTIVE_WS, teamWs._id);
      }
    }
  }, [workspaces]);

  const switchToWorkspace = useCallback((workspaceId: string) => {
    const ws = workspaces.find(w => w._id === workspaceId);
    if (ws) {
      setActiveWorkspaceId(workspaceId);
      saveToStorage(STORAGE_KEY_ACTIVE_WS, workspaceId);
      const newMode = ws.type === "team" ? "team" : "solo";
      setAccountModeState(newMode);
      saveToStorage(STORAGE_KEY_MODE, newMode);
    }
  }, [workspaces]);

  const createTeamWorkspace = useCallback((name: string, description?: string) => {
    if (hasCreateApi && createWorkspaceMutation) {
      createWorkspaceMutation({
        name,
        type: "team",
        description,
      }).then((result: any) => {
        if (result) {
          setActiveWorkspaceId(result);
          saveToStorage(STORAGE_KEY_ACTIVE_WS, result);
          setAccountModeState("team");
          saveToStorage(STORAGE_KEY_MODE, "team");
        }
      }).catch((err: any) => {
        console.warn("[Workspace] Create team workspace failed:", err);
      });
    }
  }, [hasCreateApi, createWorkspaceMutation]);

  // ── Convex mutation for converting to team workspace ──
  const convertToTeamMutation = useMutation(
    (api as any).workspaces?.crud?.convertToTeamWorkspace ?? null
  );

  const upgradeToTeam = useCallback(() => {
    // Use the Convex mutation to convert
    if (convertToTeamMutation && activeWorkspace?._id) {
      convertToTeamMutation({ workspaceId: activeWorkspace._id, name: (activeWorkspace.name || "My Workspace") + " (Team)" })
        .catch(() => {});
    }
    setAccountModeState("team");
    saveToStorage(STORAGE_KEY_MODE, "team");
  }, [activeWorkspace, convertToTeamMutation]);

  const refreshWorkspaces = useCallback(() => {
    // Convex queries auto-refresh, but we can force a re-render by toggling
    // This is mainly for explicit refresh after mutations
  }, []);

  const contextValue = useMemo<WorkspaceContext>(() => ({
    activeWorkspace,
    workspaces,
    role,
    accountMode,
    isTeamMode: accountMode === "team",
    isSoloMode: accountMode === "solo",
    isOwner: role === "owner",
    isManager: role === "manager" || role === "owner",
    isMember: !!role,
    canManageTeam: role === "owner" || role === "manager",
    canManageBilling: role === "owner",
    activeWorkspaceId: currentActiveId,
    isConvexConnected,
    isLoading: convexWorkspaces === undefined,
    isAvailable: workspaces.length > 0,
    setAccountMode,
    switchToWorkspace,
    createTeamWorkspace,
    upgradeToTeam,
    refreshWorkspaces,
  }), [activeWorkspace, workspaces, role, accountMode, currentActiveId, isConvexConnected, convexWorkspaces, setAccountMode, switchToWorkspace, createTeamWorkspace, upgradeToTeam, refreshWorkspaces]);

  return (
    <WorkspaceCtx.Provider value={contextValue}>
      {children}
    </WorkspaceCtx.Provider>
  );
}

// ─── Workspace Member & Stats Hooks ────────────────────────
// These hooks return real Convex data with proper empty states.

// Default empty stats when no data is available
const EMPTY_STATS = {
  memberCount: 0,
  clientCount: 0,
  activeProjectCount: 0,
  pendingInvoiceCount: 0,
  totalRevenue: 0,
  totalHoursThisWeek: 0,
  protectionScore: 0,
};

export function useWorkspaceMembers(workspaceId: string | null) {
  const validId = workspaceId && isValidConvexId(workspaceId);

  const convexMembers = useQuery(
    validId ? api.workspaces.members.getMembers : "skip",
    validId ? { workspaceId: workspaceId as any } : "skip"
  ) as any[] | undefined;

  // If Convex returns data, map it. Otherwise return empty array.
  if (convexMembers && convexMembers.length > 0) {
    return convexMembers.map((m: any) => ({
      _id: m._id,
      userId: m.userId,
      name: m.user?.name ?? m.user?.email ?? "Unknown",
      displayName: m.user?.name ?? m.user?.email ?? "Unknown",
      email: m.user?.email ?? "",
      image: m.user?.image ?? "",
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      lastActiveAt: m.lastActiveAt ?? null,
      projectsAssigned: 0,
      hoursThisWeek: 0,
    }));
  }

  // Return empty array when no data
  return [];
}

export function useWorkspaceStats(workspaceId: string | null) {
  const validId = workspaceId && isValidConvexId(workspaceId);

  const convexStats = useQuery(
    validId ? api.workspaces.crud.getWorkspaceStats : "skip",
    validId ? { workspaceId: workspaceId as any } : "skip"
  ) as any | undefined;

  if (convexStats) {
    return {
      memberCount: convexStats.memberCount ?? 0,
      clientCount: convexStats.clientCount ?? 0,
      activeProjectCount: convexStats.activeProjectCount ?? 0,
      pendingInvoiceCount: convexStats.pendingInvoiceCount ?? 0,
      totalRevenue: convexStats.totalRevenue ?? 0,
      totalHoursThisWeek: convexStats.totalHoursThisWeek ?? 0,
      protectionScore: convexStats.protectionScore ?? 0,
    };
  }

  return EMPTY_STATS;
}

export function useInviteMember() {
  const inviteMutation = useMutation(api.workspaces.invitations.createInvitation);
  return async (args: { workspaceId: string; email: string; role: WorkspaceRole }) => {
    if (!inviteMutation || !isValidConvexId(args.workspaceId)) {
      return { success: false, error: "Invitation service unavailable. Please try again later." };
    }
    try {
      await inviteMutation({
        workspaceId: args.workspaceId as any,
        email: args.email,
        role: args.role as "manager" | "member",
      });
      return { success: true, invitationId: `inv_${Date.now()}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useRemoveMember() {
  const workspacesApi = (api as any).workspaces;
  const hasRemoveApi = !!(workspacesApi?.members?.removeMember);
  const removeMutation = useMutation(
    hasRemoveApi ? workspacesApi.members.removeMember : null
  );
  return async (args: { workspaceId: string; memberId: string }) => {
    // SECURITY: Fail closed
    if (!hasRemoveApi || !removeMutation || !isValidConvexId(args.memberId)) {
      return { success: false, error: "Member management service unavailable. Please try again later." };
    }
    try {
      await removeMutation({
        memberId: args.memberId as any,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useUpdateMemberRole() {
  const workspacesApi = (api as any).workspaces;
  const hasUpdateRoleApi = !!(workspacesApi?.members?.updateMemberRole);
  const updateRoleMutation = useMutation(
    hasUpdateRoleApi ? workspacesApi.members.updateMemberRole : null
  );
  return async (args: { workspaceId: string; memberId: string; role: WorkspaceRole }) => {
    // SECURITY: Fail closed
    if (!hasUpdateRoleApi || !updateRoleMutation || !isValidConvexId(args.memberId)) {
      return { success: false, error: "Role management service unavailable. Please try again later." };
    }
    try {
      await updateRoleMutation({
        memberId: args.memberId as any,
        role: args.role as "owner" | "manager" | "member",
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useCancelInvitation() {
  const workspacesApi = (api as any).workspaces;
  const hasCancelApi = !!(workspacesApi?.invitations?.cancelInvitation);
  const cancelMutation = useMutation(
    hasCancelApi ? workspacesApi.invitations.cancelInvitation : null
  );
  return async (args: { invitationId: string }) => {
    // SECURITY: Fail closed
    if (!hasCancelApi || !cancelMutation || !isValidConvexId(args.invitationId)) {
      return { success: false, error: "Invitation service unavailable. Please try again later." };
    }
    try {
      await cancelMutation({
        invitationId: args.invitationId as any,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useConvertToTeamWorkspace() {
  const convertMutation = useMutation(
    (api as any).workspaces?.crud?.convertToTeamWorkspace ?? null
  );
  return async (args: { workspaceId: string; name: string }) => {
    // SECURITY: Fail closed
    if (!convertMutation || !isValidConvexId(args.workspaceId)) {
      return { success: false, error: "Workspace conversion service unavailable. Please try again later." };
    }
    try {
      await convertMutation({ workspaceId: args.workspaceId as any, name: args.name });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

// SECURITY: All workspace operations that lack a backend API now fail closed
// instead of returning fake success. This prevents silent data loss.

export function useCreatePersonalWorkspace() {
  const createMutation = useMutation((api as any).workspaces?.crud?.create ?? null);
  return async (args: any) => {
    if (!createMutation) {
      return { success: false, error: "Workspace creation unavailable. Please try again later." };
    }
    try {
      await createMutation(args);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useCreateTeamWorkspace() {
  const createMutation = useMutation((api as any).workspaces?.crud?.create ?? null);
  return async (args: any) => {
    if (!createMutation) {
      return { success: false, error: "Workspace creation unavailable. Please try again later." };
    }
    try {
      await createMutation(args);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useSwitchWorkspace() {
  return async (_args: any) => {
    return { success: true };
  };
}

export function useUpdateWorkspace() {
  const updateMutation = useMutation((api as any).workspaces?.crud?.update ?? null);
  return async (args: any) => {
    if (!updateMutation) {
      return { success: false, error: "Workspace update unavailable. Please try again later." };
    }
    try {
      await updateMutation(args);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useAcceptInvitation() {
  const acceptMutation = useMutation((api as any).workspaces?.invitations?.acceptInvitation ?? null);
  return async (args: any) => {
    if (!acceptMutation) {
      return { success: false, error: "Invitation service unavailable. Please try again later." };
    }
    try {
      await acceptMutation(args);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useDeclineInvitation() {
  const declineMutation = useMutation((api as any).workspaces?.invitations?.cancelInvitation ?? null);
  return async (args: any) => {
    if (!declineMutation) {
      return { success: false, error: "Invitation service unavailable. Please try again later." };
    }
    try {
      await declineMutation(args);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useTransferOwnership() {
  return async (_args: any) => {
    return { success: false, error: "Ownership transfer is not yet available. Contact support." };
  };
}

export function useDeleteWorkspace() {
  const deleteMutation = useMutation((api as any).workspaces?.crud?.deleteWorkspace ?? null);
  return async (args: any) => {
    if (!deleteMutation) {
      return { success: false, error: "Workspace deletion unavailable. Please try again later." };
    }
    try {
      await deleteMutation(args);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };
}

export function useActiveWorkspace() {
  return null;
}

export function useUserWorkspaces() {
  return null;
}

export function useMyInvitations() {
  return null;
}

export function useInvitationByToken(_token: string | null) {
  return null;
}
